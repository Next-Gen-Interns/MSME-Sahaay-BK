import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Utility for pagination
const getPagination = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
};

// USERS
export const getAllUsers = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { role, status, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data: users, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, buyers, sellers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { role: "buyer" } }),
      prisma.user.count({ where: { role: "seller" } }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      buyers,
      sellers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createUserWithProfiles = async (req, res) => {
  try {
    const {
      email,
      password,
      fullname,
      phone,
      role = "buyer",
      status,
      avatar_url,
      bio,
      country,
      state,
      city,
      address,
      pincode,
      is_verified = false,
      buyerprofile,
      sellerprofile,
      business_address,
    } = req.body;

    if (!email || !password || !fullname) {
      return res.status(400).json({
        success: false,
        error: "email, password and fullname are required",
      });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res
        .status(409)
        .json({ success: false, error: "User with this email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        fullname,
        phone,
        role,
        status,
        avatar_url,
        bio,
        country,
        state,
        city,
        address,
        pincode,
        is_verified,
        // nested create buyerprofile / sellerprofile if provided
        buyerprofile: buyerprofile
          ? {
              create: {
                full_name: buyerprofile.full_name ?? fullname,
                company_name: buyerprofile.company_name ?? null,
                // UPDATED: Replace location with new address fields
                address: buyerprofile.address ?? null,
                city: buyerprofile.city ?? null,
                state: buyerprofile.state ?? null,
                country: buyerprofile.country ?? null,
              },
            }
          : undefined,
        sellerprofile: sellerprofile
          ? {
              create: {
                business_name:
                  sellerprofile.business_name ?? `${fullname}'s Business`,
                business_description:
                  sellerprofile.business_description ?? null,
                product_categories: sellerprofile.product_categories ?? null,
                certifications: sellerprofile.certifications ?? null,
                verification_status:
                  sellerprofile.verification_status ?? "pending",
                subscription_plan: sellerprofile.subscription_plan ?? "free",
                profile_views: sellerprofile.profile_views ?? 0,
                leads_received: sellerprofile.leads_received ?? 0,
                overall_rating: sellerprofile.overall_rating ?? 0,
                average_response_time:
                  sellerprofile.average_response_time ?? null,
                business_type_id: sellerprofile.business_type_id ?? null,
                years_in_business: sellerprofile.years_in_business ?? null,
                // NEW: Create business address automatically
                businessaddress: business_address
                  ? {
                      create: {
                        business_country:
                          business_address.business_country ?? country,
                        business_state:
                          business_address.business_state ?? state,
                        business_city: business_address.business_city ?? city,
                        business_address:
                          business_address.business_address ?? address,
                        is_primary: true,
                      },
                    }
                  : undefined,
              },
            }
          : undefined,
      },
      include: {
        buyerprofile: true,
        sellerprofile: true,
        // NEW: Include business addresses for sellers
        sellerprofile: true,
      },
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error("createUserWithProfiles error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const updateUserWithProfiles = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId))
      return res.status(400).json({ success: false, error: "Invalid user id" });

    const {
      email,
      password,
      fullname,
      phone,
      role,
      status,
      avatar_url,
      bio,
      country,
      state,
      city,
      address,
      pincode,
      is_verified,
      buyerprofile,
      sellerprofile,
      business_address,
    } = req.body;

    const updateData = {};
    if (email) updateData.email = email;
    if (fullname) updateData.fullname = fullname;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (bio !== undefined) updateData.bio = bio;
    if (country !== undefined) updateData.country = country;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (address !== undefined) updateData.address = address;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    // Update user basic fields
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: updateData,
      include: {
        buyerprofile: true,
        sellerprofile: true,
      },
    });

    // Buyer profile upsert (create or update separate to keep logic explicit)
    if (buyerprofile) {
      const existingBuyer = await prisma.buyerProfile.findUnique({
        where: { user_id: userId },
      });

      if (existingBuyer) {
        await prisma.buyerProfile.update({
          where: { buyer_id: existingBuyer.buyer_id },
          data: {
            full_name: buyerprofile.full_name ?? existingBuyer.full_name,
            company_name:
              buyerprofile.company_name ?? existingBuyer.company_name,
            // UPDATED: Replace location with new address fields
            address: buyerprofile.address ?? existingBuyer.address,
            city: buyerprofile.city ?? existingBuyer.city,
            state: buyerprofile.state ?? existingBuyer.state,
            country: buyerprofile.country ?? existingBuyer.country,
          },
        });
      } else {
        await prisma.buyerProfile.create({
          data: {
            user_id: userId,
            full_name: buyerprofile.full_name ?? fullname ?? "Buyer",
            company_name: buyerprofile.company_name ?? null,
            // UPDATED: Replace location with new address fields
            address: buyerprofile.address ?? null,
            city: buyerprofile.city ?? null,
            state: buyerprofile.state ?? null,
            country: buyerprofile.country ?? null,
          },
        });
      }
    }

    // Seller profile upsert
    if (sellerprofile) {
      const existingSeller = await prisma.sellerProfile.findUnique({
        where: { user_id: userId },
      });
      if (existingSeller) {
        await prisma.sellerProfile.update({
          where: { seller_id: existingSeller.seller_id },
          data: {
            business_name:
              sellerprofile.business_name ?? existingSeller.business_name,
            business_description:
              sellerprofile.business_description ??
              existingSeller.business_description,
            product_categories:
              sellerprofile.product_categories ??
              existingSeller.product_categories,
            certifications:
              sellerprofile.certifications ?? existingSeller.certifications,
            verification_status:
              sellerprofile.verification_status ??
              existingSeller.verification_status,
            subscription_plan:
              sellerprofile.subscription_plan ??
              existingSeller.subscription_plan,
            profile_views:
              sellerprofile.profile_views ?? existingSeller.profile_views,
            leads_received:
              sellerprofile.leads_received ?? existingSeller.leads_received,
            overall_rating:
              sellerprofile.overall_rating ?? existingSeller.overall_rating,
            average_response_time:
              sellerprofile.average_response_time ??
              existingSeller.average_response_time,
            business_type_id:
              sellerprofile.business_type_id ?? existingSeller.business_type_id,
            years_in_business:
              sellerprofile.years_in_business ??
              existingSeller.years_in_business,
            businessaddress: business_address
              ? {
                  upsert: {
                    where: {
                      address_id:
                        existingSeller.businessaddress[0]?.address_id || -1,
                    },
                    create: {
                      business_country:
                        business_address.business_country ?? country,
                      business_state: business_address.business_state ?? state,
                      business_city: business_address.business_city ?? city,
                      business_address:
                        business_address.business_address ?? address,
                      is_primary: true,
                    },
                    update: {
                      business_country:
                        business_address.business_country ??
                        existingSeller.businessaddress[0]?.business_country,
                      business_state:
                        business_address.business_state ??
                        existingSeller.businessaddress[0]?.business_state,
                      business_city:
                        business_address.business_city ??
                        existingSeller.businessaddress[0]?.business_city,
                      business_address:
                        business_address.business_address ??
                        existingSeller.businessaddress[0]?.business_address,
                    },
                  },
                }
              : undefined,
          },
        });
      } else {
        await prisma.sellerProfile.create({
          data: {
            user_id: userId,
            business_name:
              sellerprofile.business_name ??
              `${fullname ?? "Seller"}'s Business`,
            business_description: sellerprofile.business_description ?? null,
            product_categories: sellerprofile.product_categories ?? null,
            certifications: sellerprofile.certifications ?? null,
            verification_status: sellerprofile.verification_status ?? "pending",
            subscription_plan: sellerprofile.subscription_plan ?? "free",
            profile_views: sellerprofile.profile_views ?? 0,
            leads_received: sellerprofile.leads_received ?? 0,
            overall_rating: sellerprofile.overall_rating ?? 0,
            average_response_time: sellerprofile.average_response_time ?? null,
            business_type_id: sellerprofile.business_type_id ?? null,
            years_in_business: sellerprofile.years_in_business ?? null,
            businessaddress: business_address
              ? {
                  create: {
                    business_country:
                      business_address.business_country ?? country,
                    business_state: business_address.business_state ?? state,
                    business_city: business_address.business_city ?? city,
                    business_address:
                      business_address.business_address ?? address,
                    is_primary: true,
                  },
                }
              : undefined,
          },
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        buyerprofile: true,
        sellerprofile: {
          include: {
            businessaddress: true, // NEW: Include business addresses
          },
        },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateUserWithProfiles error:", err);
    if (err.code === "P2025")
      return res.status(404).json({ success: false, error: "User not found" });
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(req.params.id) },
      include: {
        buyerprofile: true,
        sellerprofile: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await prisma.user.update({
      where: { user_id: parseInt(req.params.id) },
      data: { status },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { user_id: parseInt(req.params.id) } });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// BUYERS & SELLERS
export const getAllBuyers = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { company_name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } }, // NEW: Search in address
        { city: { contains: search, mode: "insensitive" } }, // NEW: Search in city
      ];
    }
    const [buyers, total] = await Promise.all([
      prisma.buyerProfile.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { user: true },
      }),
      prisma.buyerProfile.count({ where }),
    ]);
    res.json({ data: buyers, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllSellers = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { business_name: { contains: search, mode: "insensitive" } },
        { business_description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [sellers, total] = await Promise.all([
      prisma.sellerProfile.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          user: true,
          businessaddress: true, // NEW: Include business addresses
        },
      }),
      prisma.sellerProfile.count({ where }),
    ]);
    res.json({ data: sellers, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LISTINGS
export const getAllListings = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { status, category_id, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category_id) where.category_id = parseInt(category_id);
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { seller: true, category: true },
      }),
      prisma.serviceListing.count({ where }),
    ]);
    res.json({ data: listings, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getListingById = async (req, res) => {
  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { listing_id: parseInt(req.params.id) },
      include: {
        seller: true,
        category: true,
        listing_media: true,
      },
    });
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await prisma.serviceListing.update({
      where: { listing_id: parseInt(req.params.id) },
      data: { status },
    });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category_id,
      seller_id,
      status = "active",
      service_cities, // NEW: JSON array of cities
      service_states, // NEW: JSON array of states
      service_countries, // NEW: JSON array of countries
      ...otherFields
    } = req.body;

    const listing = await prisma.serviceListing.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        category_id: parseInt(category_id),
        seller_id: parseInt(seller_id),
        status,
        // NEW: Include service area fields
        service_cities: service_cities ? JSON.parse(service_cities) : null,
        service_states: service_states ? JSON.parse(service_states) : null,
        service_countries: service_countries
          ? JSON.parse(service_countries)
          : null,
        ...otherFields,
      },
      include: {
        seller: true,
        category: true,
      },
    });

    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    console.error("createListing error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// NEW: Update listing with service areas
export const updateListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const { service_cities, service_states, service_countries, ...updateData } =
      req.body;

    // Handle JSON fields
    if (service_cities !== undefined) {
      updateData.service_cities = service_cities
        ? JSON.parse(service_cities)
        : null;
    }
    if (service_states !== undefined) {
      updateData.service_states = service_states
        ? JSON.parse(service_states)
        : null;
    }
    if (service_countries !== undefined) {
      updateData.service_countries = service_countries
        ? JSON.parse(service_countries)
        : null;
    }

    const listing = await prisma.serviceListing.update({
      where: { listing_id: listingId },
      data: updateData,
      include: {
        seller: true,
        category: true,
      },
    });

    res.json({ success: true, data: listing });
  } catch (err) {
    console.error("updateListing error:", err);
    if (err.code === "P2025")
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const deleteListing = async (req, res) => {
  try {
    await prisma.serviceListing.delete({
      where: { listing_id: parseInt(req.params.id) },
    });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CATEGORIES
export const getAllCategories = async (req, res) => {
  try {
    const { search, is_active } = req.query;
    const where = {};
    if (search) where.category_name = { contains: search, mode: "insensitive" };
    if (is_active !== undefined) where.is_active = is_active === "true";
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { sort_order: "asc" },
      }),
      prisma.category.count({ where }),
    ]);
    res.json({ data: categories, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const {
      category_name,
      description,
      sort_order,
      is_active,
      parent_category_id,
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Category image is required",
      });
    }

    const image_url = `/uploads/categories/${req.file.filename}`;

    const category = await prisma.category.create({
      data: {
        category_name,
        description,
        image_url,
        sort_order: sort_order ? parseInt(sort_order) : 0,
        is_active:
          is_active === "true" ? true : is_active === "false" ? false : true,
        parent_category_id: parent_category_id
          ? parseInt(parent_category_id)
          : null,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const {
      category_name,
      description,
      sort_order,
      is_active,
      parent_category_id,
    } = req.body;

    const updateData = {
      category_name,
      description,
      sort_order: sort_order ? parseInt(sort_order) : undefined,
      is_active: is_active !== undefined ? is_active === "true" : undefined,
      parent_category_id: parent_category_id
        ? parseInt(parent_category_id)
        : undefined,
    };

    // Only add image_url to update if a new file was uploaded
    if (req.file) {
      updateData.image_url = `/uploads/categories/${req.file.filename}`;
    }

    const category = await prisma.category.update({
      where: { category_id: parseInt(req.params.id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await prisma.category.delete({
      where: { category_id: parseInt(req.params.id) },
    });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LEADS
export const getAllLeads = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { project_title: { contains: search, mode: "insensitive" } },
        { project_description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { buyer: true, seller: true, listing: true },
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({ data: leads, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { lead_id: parseInt(req.params.id) },
      include: {
        buyer: true,
        seller: true,
        listing: true,
        conversations: true,
        reviews: true,
      },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// REVIEWS
export const getAllReviews = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [{ review_text: { contains: search, mode: "insensitive" } }];
    }
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          buyer: true,
          seller: true,
          lead: true,
          reviewer: true,
          reviewed_user: true,
        },
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ data: reviews, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const review = await prisma.review.update({
      where: { review_id: parseInt(req.params.id) },
      data: { status },
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    await prisma.review.delete({
      where: { review_id: parseInt(req.params.id) },
    });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DOCUMENTS
export const getAllDocuments = async (req, res) => {
  try {
    const { skip, take } = getPagination(req);
    const { verified, search } = req.query;
    const where = {};
    if (verified !== undefined) where.verified = verified === "true";
    if (search) {
      where.OR = [
        { document_name: { contains: search, mode: "insensitive" } },
        { document_type: { contains: search, mode: "insensitive" } },
      ];
    }
    const [documents, total] = await Promise.all([
      prisma.userDocument.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { user: true },
      }),
      prisma.userDocument.count({ where }),
    ]);
    res.json({ data: documents, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDocumentStatus = async (req, res) => {
  try {
    const { verified, verified_by } = req.body;
    const document = await prisma.userDocument.update({
      where: { id: parseInt(req.params.id) },
      data: {
        verified,
        verified_by,
        verified_at: verified ? new Date() : null,
      },
    });
    res.json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SUBSCRIPTIONS
export const getAllSubscriptions = async (req, res) => {
  try {
    const currentMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const subs = await prisma.userSubscription.findMany({
      include: {
        user: {
          select: { user_id: true, email: true, fullname: true, role: true },
        },
        plan: true,
        usage: {
          where: {
            reset_date: { gte: currentMonth },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json({ success: true, data: subs });
  } catch (error) {
    console.error("getAllSubscriptions error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const {
      plan_type, // optional filter, e.g. ?plan_type=seller
      is_active, // optional filter, e.g. ?is_active=true
      sort = "asc", // default sort order
    } = req.query;

    const where = {};

    if (plan_type) where.plan_type = plan_type;
    if (is_active !== undefined) where.is_active = is_active === "true";

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { sort_order: sort.toLowerCase() === "desc" ? "desc" : "asc" },
    });

    // Parse JSON fields if stored as strings
    const parsedPlans = plans.map((plan) => ({
      ...plan,
      features:
        typeof plan.features === "string"
          ? JSON.parse(plan.features)
          : plan.features,
      limits:
        typeof plan.limits === "string" ? JSON.parse(plan.limits) : plan.limits,
    }));

    res.json({ success: true, data: parsedPlans });
  } catch (error) {
    console.error("getAllSubscriptionPlans error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const updateSubscriptionStatus = async (req, res) => {
  try {
    const subId = parseInt(req.params.id);
    const { status } = req.body;

    const sub = await prisma.userSubscription.update({
      where: { subscription_id: subId },
      data: {
        status,
        cancel_at_period_end: status === "canceled" ? true : undefined,
        canceled_at: status === "canceled" ? new Date() : undefined,
      },
      include: { user: true, plan: true },
    });

    // If canceled and plan was seller, optionally downgrade user role or sellerprofile.subscription_plan
    if (status === "canceled" && sub.plan?.plan_type) {
      if (sub.plan.plan_type === "seller") {
        // Downgrade seller's legacy flag if needed
        const sellerProfile = await prisma.sellerProfile.findUnique({
          where: { user_id: sub.user.user_id },
        });
        if (sellerProfile) {
          await prisma.sellerProfile.update({
            where: { seller_id: sellerProfile.seller_id },
            data: { subscription_plan: "free" },
          });
        }
        // Optionally keep user role as seller (business decision). Not forcing role change here.
      }
    }

    res.json({ success: true, data: sub });
  } catch (error) {
    console.error("updateSubscriptionStatus error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// SUBSCRIPTION PLANS
export const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      name,
      description = null,
      price = 0,
      currency = "USD",
      billing_cycle = "monthly",
      plan_type,
      features = {},
      limits = {},
      is_active = true,
      sort_order = 0,
    } = req.body;

    // Ensure plan_type and billing_cycle are valid if needed (basic)
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        currency,
        billing_cycle,
        plan_type,
        features:
          typeof features === "string" ? JSON.parse(features) : features,
        limits: typeof limits === "string" ? JSON.parse(limits) : limits,
        is_active,
        sort_order,
      },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error("createSubscriptionPlan error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const getSubscriptionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    // 1️⃣ Try to fetch by userSubscription (if someone purchased it)
    let subscription = await prisma.userSubscription.findUnique({
      where: { subscription_id: id },
      include: { plan: true },
    });

    if (subscription) {
      // Parse JSON fields
      if (subscription.plan) {
        subscription.plan.features =
          typeof subscription.plan.features === "string"
            ? JSON.parse(subscription.plan.features)
            : subscription.plan.features;

        subscription.plan.limits =
          typeof subscription.plan.limits === "string"
            ? JSON.parse(subscription.plan.limits)
            : subscription.plan.limits;
      }

      return res.json({ success: true, data: subscription });
    }

    // 2️⃣ If NOT found → treat the ID as subscription PLAN ID
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { plan_id: id },
    });

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, error: "Subscription or Plan not found" });
    }

    // Parse JSON fields
    plan.features =
      typeof plan.features === "string"
        ? JSON.parse(plan.features)
        : plan.features;

    plan.limits =
      typeof plan.limits === "string" ? JSON.parse(plan.limits) : plan.limits;

    return res.json({
      success: true,
      data: {
        subscription_id: null, // not bought
        user_id: null,
        status: "not_purchased",
        plan,
      },
    });
  } catch (error) {
    console.error("getSubscriptionById error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const updateSubscriptionPlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const update = { ...req.body };

    if (update.features && typeof update.features === "string")
      update.features = JSON.parse(update.features);
    if (update.limits && typeof update.limits === "string")
      update.limits = JSON.parse(update.limits);
    if (update.price) update.price = parseFloat(update.price);

    const plan = await prisma.subscriptionPlan.update({
      where: { plan_id: planId },
      data: update,
    });

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error("updateSubscriptionPlan error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    await prisma.subscriptionPlan.delete({ where: { plan_id: planId } });

    res.json({ success: true, message: "Plan deleted" });
  } catch (error) {
    console.error("deleteSubscriptionPlan error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const getUserUsage = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const usages = await prisma.subscriptionUsage.findMany({
      where: { user_id: userId },
      orderBy: { reset_date: "desc" },
    });
    res.json({ success: true, data: usages });
  } catch (error) {
    console.error("getUserUsage error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Admin: reset user's usage for current month (sets usage_count=0)
export const resetUserUsage = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    // Either update existing records for the month or create blank entries
    await prisma.subscriptionUsage.updateMany({
      where: { user_id: userId, reset_date: currentMonth },
      data: { usage_count: 0 },
    });

    res.json({ success: true, message: "Usage reset for current month" });
  } catch (error) {
    console.error("resetUserUsage error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Admin: adjust a specific usage record (e.g., manual support correction)
export const adjustUsage = async (req, res) => {
  try {
    const usageId = parseInt(req.params.usageId);
    const { usage_count } = req.body;

    const usage = await prisma.subscriptionUsage.update({
      where: { usage_id: usageId },
      data: { usage_count: parseInt(usage_count) },
    });

    res.json({ success: true, data: usage });
  } catch (error) {
    console.error("adjustUsage error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Admin: assign a plan to a user (create subscription)
export const assignSubscriptionToUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      plan_id,
      status = "active",
      current_period_start = new Date(),
      current_period_end,
    } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { plan_id: parseInt(plan_id) },
    });
    if (!plan)
      return res.status(404).json({ success: false, error: "Plan not found" });

    // If existing active subscription, update/replace
    const existing = await prisma.userSubscription.findFirst({
      where: { user_id: userId },
    });

    let sub;
    if (existing) {
      sub = await prisma.userSubscription.update({
        where: { subscription_id: existing.subscription_id },
        data: {
          plan_id: plan.plan_id,
          status,
          current_period_start: new Date(current_period_start),
          current_period_end: current_period_end
            ? new Date(current_period_end)
            : null,
          canceled_at: status === "canceled" ? new Date() : null,
        },
        include: { plan: true, user: true },
      });
    } else {
      sub = await prisma.userSubscription.create({
        data: {
          user_id: userId,
          plan_id: plan.plan_id,
          status,
          current_period_start: new Date(current_period_start),
          current_period_end: current_period_end
            ? new Date(current_period_end)
            : undefined,
          stripe_subscription_id: `admin_assign_${Date.now()}`,
          stripe_customer_id: `admin_assign_cus_${Date.now()}`,
        },
        include: { plan: true, user: true },
      });
    }

    // If plan is seller or both, ensure user role is seller and sellerprofile subscription_plan updated if exists
    if (plan.plan_type === "seller" || plan.plan_type === "both") {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { user_id: userId },
      });
      if (sellerProfile) {
        await prisma.sellerProfile.update({
          where: { seller_id: sellerProfile.seller_id },
          data: { subscription_plan: "premium" }, // keep mapping to LegacyPlanLevel
        });
      }
      await prisma.user.update({
        where: { user_id: userId },
        data: { role: "seller" },
      });
    }

    res.json({ success: true, data: sub });
  } catch (error) {
    console.error("assignSubscriptionToUser error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
