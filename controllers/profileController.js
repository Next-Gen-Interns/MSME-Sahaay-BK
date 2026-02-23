import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

// Helper function to calculate user profile completion
const calculateUserProfileCompletion = (user) => {
  const userProfileFields = [
    user.phone,
    user.country,
    user.city,
    user.address,
    user.fullname,
    user.avatar_url,
    user.bio,
    user.state,
    user.pincode,
  ];
  const completedUserFields = userProfileFields.filter(
    (field) => field && field !== "",
  ).length;
  return Math.round((completedUserFields / userProfileFields.length) * 100);
};

// Helper function to calculate buyer profile completion
const calculateBuyerProfileCompletion = (buyerProfile) => {
  if (!buyerProfile) return 0;

  const buyerProfileFields = [
    buyerProfile.full_name,
    buyerProfile.address, // CHANGED: location -> address
    buyerProfile.city, // NEW
    buyerProfile.state, // NEW
    buyerProfile.country, // NEW
    buyerProfile.company_name,
  ];
  const completedBuyerFields = buyerProfileFields.filter(
    (field) => field && field !== "",
  ).length;
  return Math.round((completedBuyerFields / buyerProfileFields.length) * 100);
};

// Helper function to calculate seller profile completion
const calculateSellerProfileCompletion = (sellerProfile) => {
  if (!sellerProfile) return 0;

  const sellerProfileFields = [
    sellerProfile.business_name,
    sellerProfile.business_description,
    sellerProfile.product_categories,
    sellerProfile.years_in_business,
    sellerProfile.certifications,
  ];
  const completedSellerFields = sellerProfileFields.filter(
    (field) => field && field !== "",
  ).length;
  return Math.round((completedSellerFields / sellerProfileFields.length) * 100);
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { phone, country, state, address, bio, pincode, fullname, city } =
      req.body;

    const updateData = {
      phone,
      country,
      state,
      city,
      address,
      bio,
      pincode,
      fullname,
    };

    // Only update avatar_url if a new file is uploaded
    if (req.file) {
      updateData.avatar_url = `/avatars/${req.file.filename}`;
    }

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: updateData,
    });

    res.json(user);
  } catch (error) {
    console.error("Error updating User profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        phone: true,
        role: true,
        fullname: true,
        last_login: true,
        status: true,
        avatar_url: true,
        bio: true,
        country: true,
        state: true,
        city: true,
        address: true,
        pincode: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
        buyerprofile: req.user.role === "buyer",
        sellerprofile: req.user.role === "seller",
        user_documents: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Calculate profile completion percentages
    const userProfileCompletion = calculateUserProfileCompletion(user);

    let roleProfileCompletion = 0;
    let totalProfileCompletion = userProfileCompletion;

    if (req.user.role === "buyer" && user.buyerprofile) {
      roleProfileCompletion = calculateBuyerProfileCompletion(
        user.buyerprofile,
      );
      // Weighted average: 60% user profile + 40% buyer profile
      totalProfileCompletion = Math.round(
        userProfileCompletion * 0.6 + roleProfileCompletion * 0.4,
      );
    } else if (req.user.role === "seller" && user.sellerprofile) {
      roleProfileCompletion = calculateSellerProfileCompletion(
        user.sellerprofile,
      );
      // Weighted average: 50% user profile + 50% seller profile
      totalProfileCompletion = Math.round(
        userProfileCompletion * 0.5 + roleProfileCompletion * 0.5,
      );
    }

    res.json({
      success: true,
      data: {
        ...user,
        profile_completion: {
          user_profile: userProfileCompletion,
          role_profile: roleProfileCompletion,
          total: totalProfileCompletion,
        },
        role_profile_exists: !!(
          (req.user.role === "buyer" && user.buyerprofile) ||
          (req.user.role === "seller" && user.sellerprofile)
        ),
        has_complete_profile: totalProfileCompletion >= 80,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// NEW: Create buyer profile
export const createBuyerProfile = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if User profile is complete
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!user.phone || !user.country || !user.city || !user.address) {
      return res.status(400).json({
        error:
          "Complete your general profile first (phone, country, city, address required)",
      });
    }

    // Check if buyer profile already exists
    const existingProfile = await prisma.buyerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (existingProfile) {
      return res
        .status(400)
        .json({ error: "Buyer profile already exists. Use PUT to update." });
    }

    const {
      full_name,
      company_name,
      address, // CHANGED: location -> address
      city, // NEW
      state, // NEW
      country,
    } = req.body;

    // !full_name ||

    if (!address || !city || !state || !country) {
      return res.status(400).json({
        error: "Address, city, state, and country are required",
      });
    }

    const profile = await prisma.buyerProfile.create({
      data: {
        user_id: req.user.user_id,
        full_name,
        company_name,
        address, // CHANGED: location -> address
        city, // NEW
        state, // NEW
        country,
      },
    });

    // Calculate completion percentage for the response
    const buyerProfileCompletion = calculateBuyerProfileCompletion(profile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.6 + buyerProfileCompletion * 0.4,
    );

    res.status(201).json({
      ...profile,
      profile_completion: {
        buyer_profile: buyerProfileCompletion,
        total: totalCompletion,
      },
    });
  } catch (error) {
    console.error("Error creating buyer profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBuyerProfile = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    let profile = await prisma.buyerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!profile) {
      return res.status(404).json({
        error: "Buyer profile not found. Please create one first.",
        exists: false,
      });
    }

    // Get user data to calculate overall completion
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        phone: true,
        country: true,
        address: true,
        fullname: true,
        avatar_url: true,
        bio: true,
        state: true,
        pincode: true,
      },
    });

    const buyerProfileCompletion = calculateBuyerProfileCompletion(profile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.6 + buyerProfileCompletion * 0.4,
    );

    res.status(200).json({
      ...profile,
      profile_completion: {
        user_profile: userProfileCompletion,
        buyer_profile: buyerProfileCompletion,
        total: totalCompletion,
      },
    });
  } catch (error) {
    console.error("Error fetching buyer profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateBuyerProfile = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if buyer profile exists
    const existingProfile = await prisma.buyerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!existingProfile) {
      return res
        .status(404)
        .json({ error: "Buyer profile not found. Use POST to create first." });
    }

    const { full_name, company_name, address, city, state, country } = req.body;

    const profile = await prisma.buyerProfile.update({
      where: { user_id: req.user.user_id },
      data: {
        full_name,
        company_name,
        address, // CHANGED: location -> address
        city, // NEW
        state, // NEW
        country, // NEW
      },
    });

    // Get user data to calculate overall completion
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        phone: true,
        country: true,
        address: true,
        fullname: true,
        avatar_url: true,
        bio: true,
        state: true,
        pincode: true,
      },
    });

    const buyerProfileCompletion = calculateBuyerProfileCompletion(profile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.6 + buyerProfileCompletion * 0.4,
    );

    res.json({
      ...profile,
      profile_completion: {
        user_profile: userProfileCompletion,
        buyer_profile: buyerProfileCompletion,
        total: totalCompletion,
      },
    });
  } catch (error) {
    console.error("Error updating buyer profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// NEW: Create seller profile
export const createSellerProfile = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Step 1: Validate that the general user profile is complete
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!user.phone || !user.country || !user.city || !user.address) {
      return res.status(400).json({
        error:
          "Complete your general profile first (phone, country, city, and address are required)",
      });
    }

    // Step 2: Check if seller profile already exists
    const existingProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (existingProfile) {
      return res
        .status(400)
        .json({ error: "Seller profile already exists. Use PUT to update." });
    }

    // Step 3: Extract data from request
    const {
      business_name,
      business_description,
      product_categories,
      certifications,
      years_in_business,
      business_address, // expected as an object
    } = req.body;

    if (!business_name) {
      return res.status(400).json({ error: "business_name is required" });
    }

    // Step 4: Validate business_address fields
    let addressData = undefined;
    if (business_address) {
      const {
        business_country,
        business_state,
        business_city,
        business_address: addressLine,
        is_primary,
      } = business_address;

      if (
        !business_country ||
        !business_state ||
        !business_city ||
        !addressLine
      ) {
        return res.status(400).json({
          error:
            "All fields (business_country, business_state, business_city, business_address) are required for business_address",
        });
      }

      addressData = {
        create: {
          business_country,
          business_state,
          business_city,
          business_address: addressLine,
          is_primary: is_primary ?? true,
        },
      };
    }

    // Step 5: Create seller profile and linked business address
    const profile = await prisma.sellerProfile.create({
      data: {
        user_id: req.user.user_id,
        business_name,
        business_description,
        product_categories,
        certifications,
        years_in_business,
        business_addresses: addressData, // ✅ relation name matches schema
      },
      include: {
        business_addresses: true, // include created address
      },
    });

    // Step 6: Calculate profile completion
    const sellerProfileCompletion = calculateSellerProfileCompletion(profile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.5 + sellerProfileCompletion * 0.5,
    );

    res.status(201).json({
      success: true,
      message: "Seller profile created successfully",
      data: {
        ...profile,
        profile_completion: {
          seller_profile: sellerProfileCompletion,
          total: totalCompletion,
        },
      },
    });
  } catch (error) {
    console.error("Error creating seller profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getSellerProfile = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const profile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
      include: {
        business_addresses: true, // FIXED: Use business_addresses (plural)
      },
    });

    if (!profile) {
      return res.status(404).json({
        error: "Seller profile not found. Please create one first.",
        exists: false,
      });
    }

    // Get user data to calculate overall completion
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        phone: true,
        country: true,
        address: true,
        fullname: true,
        avatar_url: true,
        bio: true,
        state: true,
        pincode: true,
      },
    });

    const sellerProfileCompletion = calculateSellerProfileCompletion(profile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.5 + sellerProfileCompletion * 0.5,
    );

    res.status(200).json({
      ...profile,
      profile_completion: {
        user_profile: userProfileCompletion,
        seller_profile: sellerProfileCompletion,
        total: totalCompletion,
      },
    });
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateSellerProfile = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if seller profile exists
    const existingProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
      include: {
        business_addresses: true,
      },
    });

    if (!existingProfile) {
      return res
        .status(404)
        .json({ error: "Seller profile not found. Use POST to create first." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Validation: Check if business_address is included in the request
    if (req.body.business_address) {
      return res.status(400).json({
        error: "Business address cannot be updatable",
        code: "BUSINESS_ADDRESS_UPDATE_NOT_ALLOWED",
      });
    }

    // Define allowed fields for seller profile update
    const allowedFields = [
      "business_name",
      "business_description",
      "product_categories",
      "certifications",
      "years_in_business",
    ];

    // Filter out any fields that are not allowed
    const sellerData = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        sellerData[key] = req.body[key];
      }
    });

    // Check if there are any valid fields to update
    if (Object.keys(sellerData).length === 0) {
      return res.status(400).json({
        error:
          "No valid fields provided for update. Allowed fields: " +
          allowedFields.join(", "),
        allowed_fields: allowedFields,
      });
    }

    // Update only seller profile fields (no business address updates)
    const profile = await prisma.sellerProfile.update({
      where: { user_id: req.user.user_id },
      data: sellerData,
    });

    // Get updated profile with addresses
    const updatedProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
      include: {
        business_addresses: true,
      },
    });

    // Get user data to calculate overall completion
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        phone: true,
        country: true,
        address: true,
        fullname: true,
        avatar_url: true,
        bio: true,
        state: true,
        pincode: true,
      },
    });

    const sellerProfileCompletion =
      calculateSellerProfileCompletion(updatedProfile);
    const userProfileCompletion = calculateUserProfileCompletion(user);
    const totalCompletion = Math.round(
      userProfileCompletion * 0.5 + sellerProfileCompletion * 0.5,
    );

    res.status(200).json({
      success: true,
      message: "Seller profile updated successfully",
      data: {
        ...updatedProfile,
        profile_completion: {
          user_profile: userProfileCompletion,
          seller_profile: sellerProfileCompletion,
          total: totalCompletion,
        },
      },
    });
  } catch (error) {
    console.error("Error updating seller profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
