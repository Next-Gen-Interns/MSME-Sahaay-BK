import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

/**
 * APPLY AS EXPERT
 */
export const applyAsExpert = async (req, res) => {
  try {
    const {
      category,
      experience_years,
      expertise,
      consultation_fee,
      bio,
    } = req.body;

    if (req.user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can apply as expert" });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!seller) {
      return res.status(400).json({ error: "Seller profile not found" });
    }

    const existing = await prisma.expertProfile.findUnique({
      where: { seller_id: seller.seller_id },
    });

    if (existing) {
      return res.status(400).json({ error: "Already applied as expert" });
    }

    // 🔥 CREATE CONSULTATION LISTING AUTOMATICALLY
    const consultationListing = await prisma.serviceListing.create({
      data: {
        title: `${seller.business_name} Consultation`,
        description: bio || "Professional consultation service",
        service_type: "consultation",
        pricing_model: "fixed",
        min_price: consultation_fee || 0,
        status: "active",
        seller_id: seller.seller_id,
        category_id: 1, // ⚠️ replace with correct category id
      },
    });

    const expert = await prisma.expertProfile.create({
      data: {
        seller_id: seller.seller_id,
        category,
        experience_years,
        expertise,
        consultation_fee,
        bio,
        consultation_listing_id: consultationListing.listing_id,
      },
    });

    res.status(201).json({
      message: "Application submitted. Await admin approval.",
      expert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET VERIFIED EXPERTS
 */
export const getExperts = async (req, res) => {
  try {
    const { category, search } = req.query;

    const experts = await prisma.expertProfile.findMany({
      where: {
        is_verified: true,
        category: category || undefined,
      },
      include: {
        seller: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ADMIN VERIFY EXPERT
 */
export const updateExpertStatus = async (req, res) => {
  try {
    if (!["admin", "super_admin", "access_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { action } = req.body;

    if (action === "approve") {
      await prisma.expertProfile.update({
        where: { expert_id: parseInt(id) },
        data: { is_verified: true },
      });
    }

    if (action === "unverify") {
      await prisma.expertProfile.update({
        where: { expert_id: parseInt(id) },
        data: { is_verified: false },
      });
    }

    if (action === "reject") {
      await prisma.expertProfile.delete({
        where: { expert_id: parseInt(id) },
      });
    }

    res.json({ message: "Updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};



export const getMyExpertStatus = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers allowed" });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!seller) {
      return res.status(400).json({ error: "Seller profile not found" });
    }

    const expert = await prisma.expertProfile.findUnique({
      where: { seller_id: seller.seller_id },
    });

    if (!expert) {
      return res.json({ applied: false });
    }

    return res.json({
      applied: true,
      is_verified: expert.is_verified,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getAllExpertsAdmin = async (req, res) => {
  try {
    if (!["admin", "super_admin", "access_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const experts = await prisma.expertProfile.findMany({
      include: {
        seller: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPendingExperts = async (req, res) => {
  try {
    if (!["admin", "super_admin", "access_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const experts = await prisma.expertProfile.findMany({
      where: { is_verified: false },
      include: {
        seller: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getExpertByIdAdmin = async (req, res) => {
  try {
    if (!["admin", "super_admin", "access_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const expert = await prisma.expertProfile.findUnique({
      where: { expert_id: parseInt(id) },
      include: {
        seller: {
          include: {
            user: true,
            leads: true,
            reviews: true,
          },
        },
      },
    });

    if (!expert) {
      return res.status(404).json({ error: "Expert not found" });
    }

    res.json(expert);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};