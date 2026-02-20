import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

const MODERATION_CONFIG = {
  // Auto-approval rules
  AUTO_APPROVE: {
    MIN_RATING: 4,
    MIN_TRUST_SCORE: 0.7,
    MIN_REVIEW_LENGTH: 10,
    MAX_REVIEW_LENGTH: 1000,
  },

  // Auto-rejection rules
  AUTO_REJECT: {
    BANNED_WORDS: [
      "spam",
      "scam",
      "fraud",
      "cheat",
      "fake",
      "bullshit",
      "fuck",
      "shit",
      "asshole",
      "bastard",
      "idiot",
      "stupid",
    ],
    MIN_RATING_FOR_REJECTION: 1,
    MAX_FLAGS: 3,
  },

  // Trust score calculation weights
  TRUST_WEIGHTS: {
    VERIFIED_USER: 0.3,
    COMPLETED_LEADS: 0.2,
    POSITIVE_REVIEWS: 0.3,
    ACCOUNT_AGE: 0.2,
  },
};

const detectSpam = (reviewText) => {
  const spamPatterns = [
    reviewText.length < MODERATION_CONFIG.AUTO_APPROVE.MIN_REVIEW_LENGTH,
    reviewText.length > MODERATION_CONFIG.AUTO_APPROVE.MAX_REVIEW_LENGTH,
    reviewText.includes("http://") || reviewText.includes("https://"),
    /[0-9]{10,}/.test(reviewText),
    MODERATION_CONFIG.AUTO_REJECT.BANNED_WORDS.some((word) =>
      reviewText.toLowerCase().includes(word)
    ),
    (reviewText.match(/\$/g) || []).length > 3,
    (reviewText.match(/!/g) || []).length > 5,
  ];

  return spamPatterns.some((pattern) => pattern === true);
};

const analyzeSentiment = (text) => {
  const positiveWords = [
    "excellent",
    "great",
    "good",
    "awesome",
    "amazing",
    "professional",
    "recommend",
    "outstanding",
    "perfect",
    "fantastic",
    "satisfied",
    "happy",
  ];
  const negativeWords = [
    "terrible",
    "bad",
    "poor",
    "awful",
    "horrible",
    "waste",
    "avoid",
    "disappointed",
    "useless",
    "worst",
    "never",
    "rubbish",
    "garbage",
  ];

  let score = 0;
  const words = text.toLowerCase().split(/\s+/);

  words.forEach((word) => {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (positiveWords.includes(cleanWord)) score += 1;
    if (negativeWords.includes(cleanWord)) score -= 1;
  });

  return score > 2
    ? "very_positive"
    : score > 0
    ? "positive"
    : score < -2
    ? "very_negative"
    : score < 0
    ? "negative"
    : "neutral";
};

const calculateUserTrustScore = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        sent_reviews: {
          where: { status: "approved" },
        },
        leads: true,
      },
    });

    let score = 0.5; // Base score

    // Account age (more than 30 days = trusted)
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    if (daysOld > 30) score += MODERATION_CONFIG.TRUST_WEIGHTS.ACCOUNT_AGE;

    // Verified user
    if (user.is_verified)
      score += MODERATION_CONFIG.TRUST_WEIGHTS.VERIFIED_USER;

    // Completed leads
    const completedLeads = user.leads.filter((lead) =>
      ["won", "lost"].includes(lead.status)
    ).length;
    if (completedLeads > 2)
      score += MODERATION_CONFIG.TRUST_WEIGHTS.COMPLETED_LEADS;

    // Positive review history
    const positiveReviews = user.sent_reviews.filter(
      (review) => review.rating >= 4
    ).length;
    if (positiveReviews > 0)
      score += MODERATION_CONFIG.TRUST_WEIGHTS.POSITIVE_REVIEWS;

    return Math.min(Math.max(score, 0), 1.0); // Clamp between 0 and 1
  } catch (error) {
    console.error("Error calculating trust score:", error);
    return 0.5; // Default medium trust
  }
};

const autoModerateReview = async (reviewData) => {
  try {
    const { rating, review_text, reviewer_id } = reviewData;

    // === AUTO-REJECTION CHECKS ===

    // Check for spam
    if (detectSpam(review_text)) {
      return { status: "rejected", reason: "spam_detected" };
    }

    // Auto-reject extremely low ratings from new users
    const trustScore = await calculateUserTrustScore(reviewer_id);
    if (
      rating <= MODERATION_CONFIG.AUTO_REJECT.MIN_RATING_FOR_REJECTION &&
      trustScore < 0.3
    ) {
      return { status: "rejected", reason: "low_rating_new_user" };
    }

    // Check sentiment for very negative reviews
    const sentiment = analyzeSentiment(review_text);
    if (sentiment === "very_negative" && rating <= 2) {
      return { status: "pending", reason: "needs_manual_review_negative" };
    }

    // === AUTO-APPROVAL CHECKS ===

    // High ratings from trusted users
    if (
      rating >= MODERATION_CONFIG.AUTO_APPROVE.MIN_RATING &&
      trustScore >= MODERATION_CONFIG.AUTO_APPROVE.MIN_TRUST_SCORE
    ) {
      return { status: "approved", reason: "high_rating_trusted_user" };
    }

    // Positive sentiment with decent rating
    if (sentiment === "very_positive" && rating >= 4) {
      return { status: "approved", reason: "positive_sentiment" };
    }

    // === DEFAULT: MANUAL REVIEW ===
    return { status: "pending", reason: "needs_manual_review" };
  } catch (error) {
    console.error("Auto-moderation error:", error);
    return { status: "pending", reason: "moderation_error" };
  }
};

// ==================== MAIN REVIEW CONTROLLERS ====================

// Get all reviews (with filters)
export const getReviews = async (req, res) => {
  try {
    const {
      review_type,
      status = "approved", // Default to approved reviews
      rating,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {
      status: status,
      is_public: true, // Only return public reviews
    };

    // Apply filters
    if (review_type) where.review_type = review_type;
    if (rating) where.rating = parseInt(rating);

    const reviews = await prisma.review.findMany({
      where,
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                company_name: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                // business_name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.review.count({ where });

    res.status(200).json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get reviews for a specific seller
export const getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { seller_id: parseInt(sellerId) },
    });

    if (!sellerProfile) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const reviews = await prisma.review.findMany({
      where: {
        seller_id: parseInt(sellerId),
        review_type: "buyer_to_seller",
        status: "approved",
        is_public: true,
      },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                company_name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.review.count({
      where: {
        seller_id: parseInt(sellerId),
        review_type: "buyer_to_seller",
        status: "approved",
        is_public: true,
      },
    });

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: {
        seller_id: parseInt(sellerId),
        review_type: "buyer_to_seller",
        status: "approved",
        is_public: true,
      },
      _avg: {
        rating: true,
      },
    });

    res.status(200).json({
      reviews,
      seller: {
        seller_id: sellerProfile.seller_id,
        business_name: sellerProfile.business_name,
        overall_rating: sellerProfile.overall_rating,
        average_rating: avgRating._avg.rating || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching seller reviews:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get reviews for a specific buyer
export const getBuyerReviews = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { buyer_id: parseInt(buyerId) },
    });

    if (!buyerProfile) {
      return res.status(404).json({ error: "Buyer not found" });
    }

    const reviews = await prisma.review.findMany({
      where: {
        buyer_id: parseInt(buyerId),
        review_type: "seller_to_buyer",
        status: "approved",
        is_public: true,
      },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                // business_name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.review.count({
      where: {
        buyer_id: parseInt(buyerId),
        review_type: "seller_to_buyer",
        status: "approved",
        is_public: true,
      },
    });

    res.status(200).json({
      reviews,
      buyer: {
        buyer_id: buyerProfile.buyer_id,
        full_name: buyerProfile.full_name,
        company_name: buyerProfile.company_name,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching buyer reviews:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get single review by ID
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { review_id: parseInt(id) },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
                seller: {
                  include: {
                    user: {
                      select: {
                        user_id: true,
                        fullname: true,
                        // business_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                company_name: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                // business_name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
        reviewed_user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
        flags: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Only return public reviews or reviews where user is involved
    if (
      !review.is_public &&
      req.user?.user_id !== review.reviewer_id &&
      req.user?.user_id !== review.reviewed_user_id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get current user's reviews (both given and received)
export const getUserReviews = async (req, res) => {
  try {
    const { type = "all", page = 1, limit = 10 } = req.query;

    let where = {};

    if (type === "given") {
      where.reviewer_id = req.user.user_id;
    } else if (type === "received") {
      where.reviewed_user_id = req.user.user_id;
    } else {
      where.OR = [
        { reviewer_id: req.user.user_id },
        { reviewed_user_id: req.user.user_id },
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
        reviewed_user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.review.count({ where });

    res.status(200).json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update review (only by reviewer)
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review_text, is_public } = req.body;

    // Verify review belongs to current user
    const existingReview = await prisma.review.findFirst({
      where: {
        review_id: parseInt(id),
        reviewer_id: req.user.user_id,
      },
    });

    if (!existingReview) {
      return res
        .status(404)
        .json({ error: "Review not found or access denied" });
    }

    // Can't update approved reviews
    if (existingReview.status === "approved") {
      return res
        .status(400)
        .json({ error: "Cannot update an approved review" });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const updatedReview = await prisma.review.update({
      where: { review_id: parseInt(id) },
      data: {
        ...(rating && { rating }),
        ...(review_text && { review_text }),
        ...(is_public !== undefined && { is_public }),
        status: "pending", // Reset to pending after update for re-moderation
      },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
        reviewed_user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    // Re-run auto-moderation in background
    setTimeout(async () => {
      try {
        const moderationResult = await autoModerateReview({
          rating: updatedReview.rating,
          review_text: updatedReview.review_text,
          reviewer_id: updatedReview.reviewer_id,
        });

        await prisma.review.update({
          where: { review_id: parseInt(id) },
          data: { status: moderationResult.status },
        });

        // Update seller rating if auto-approved
        if (
          moderationResult.status === "approved" &&
          updatedReview.review_type === "buyer_to_seller"
        ) {
          await updateSellerRating(updatedReview.seller_id);
        }
      } catch (error) {
        console.error("Error in background moderation:", error);
      }
    }, 0);

    res.status(200).json({
      message: "Review updated successfully and sent for re-moderation",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete review (only by reviewer or admin)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify review belongs to current user or user is admin
    const existingReview = await prisma.review.findFirst({
      where: {
        review_id: parseInt(id),
        OR: [
          { reviewer_id: req.user.user_id },
          { reviewed_user_id: req.user.user_id },
        ],
      },
      include: {
        seller: true,
      },
    });

    if (!existingReview && req.user.role !== "admin") {
      return res
        .status(404)
        .json({ error: "Review not found or access denied" });
    }

    await prisma.review.delete({
      where: { review_id: parseInt(id) },
    });

    // Update seller rating if it was a buyer-to-seller review
    if (existingReview.review_type === "buyer_to_seller") {
      await updateSellerRating(existingReview.seller_id);
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update review status (admin only)
export const updateReviewStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can update review status" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const review = await prisma.review.findUnique({
      where: { review_id: parseInt(id) },
      include: {
        seller: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const updatedReview = await prisma.review.update({
      where: { review_id: parseInt(id) },
      data: { status },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
        reviewed_user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    // Update seller rating if status changed to/from approved for buyer-to-seller reviews
    if (review.review_type === "buyer_to_seller") {
      await updateSellerRating(review.seller_id);
    }

    res.status(200).json({
      message: "Review status updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Create review with auto-moderation
export const createReview = async (req, res) => {
  try {
    const {
      lead_id,
      rating,
      review_text,
      review_type,
      is_public = true,
    } = req.body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Verify lead exists and get related information
    const lead = await prisma.lead.findUnique({
      where: { lead_id: parseInt(lead_id) },
      include: {
        buyer: { include: { user: true } },
        seller: { include: { user: true } },
        listing: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check if lead is completed
    if (!["won", "lost"].includes(lead.status)) {
      return res.status(400).json({
        error:
          "Can only review completed leads. Lead status must be 'won' or 'lost'.",
      });
    }

    // Check if review already exists for this lead and type
    const existingReview = await prisma.review.findFirst({
      where: {
        lead_id: parseInt(lead_id),
        review_type: review_type,
      },
    });

    if (existingReview) {
      return res.status(400).json({
        error: `A ${review_type} review already exists for this lead`,
      });
    }

    // Determine reviewer and reviewed user
    let reviewer_id, reviewed_user_id, buyer_id, seller_id;

    if (review_type === "buyer_to_seller") {
      if (req.user.user_id !== lead.buyer.user.user_id) {
        return res
          .status(403)
          .json({ error: "Only the buyer can submit buyer-to-seller reviews" });
      }
      reviewer_id = lead.buyer.user.user_id;
      reviewed_user_id = lead.seller.user.user_id;
      buyer_id = lead.buyer_id;
      seller_id = lead.seller_id;
    } else if (review_type === "seller_to_buyer") {
      if (req.user.user_id !== lead.seller.user.user_id) {
        return res.status(403).json({
          error: "Only the seller can submit seller-to-buyer reviews",
        });
      }
      reviewer_id = lead.seller.user.user_id;
      reviewed_user_id = lead.buyer.user.user_id;
      buyer_id = lead.buyer_id;
      seller_id = lead.seller_id;
    } else {
      return res.status(400).json({ error: "Invalid review type" });
    }

    // Auto-moderation
    const moderationResult = await autoModerateReview({
      rating,
      review_text,
      reviewer_id,
    });

    // Create the review
    const review = await prisma.review.create({
      data: {
        rating,
        review_text,
        review_type,
        is_public,
        status: moderationResult.status,
        lead_id: parseInt(lead_id),
        buyer_id,
        seller_id,
        reviewer_id,
        reviewed_user_id,
      },
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                email: true,
                avatar_url: true,
                // business_name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    // Update seller rating if auto-approved
    if (
      moderationResult.status === "approved" &&
      review_type === "buyer_to_seller"
    ) {
      await updateSellerRating(lead.seller_id);
    }

    // Prepare response message based on moderation result
    let message = "Review submitted successfully";
    if (moderationResult.status === "approved") {
      message = "Review submitted and approved automatically";
    } else if (moderationResult.status === "pending") {
      message = "Review submitted and is pending moderation";
    } else if (moderationResult.status === "rejected") {
      message = "Review was rejected by our moderation system";
    }

    res.status(201).json({
      message,
      moderation_reason: moderationResult.reason,
      review,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Flag a review for moderation
export const flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await prisma.review.findUnique({
      where: { review_id: parseInt(id) },
      include: {
        flags: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if user already flagged this review
    const existingFlag = await prisma.reviewFlag.findFirst({
      where: {
        review_id: parseInt(id),
        user_id: req.user.user_id,
      },
    });

    if (existingFlag) {
      return res
        .status(400)
        .json({ error: "You have already flagged this review" });
    }

    // Create flag
    await prisma.reviewFlag.create({
      data: {
        review_id: parseInt(id),
        user_id: req.user.user_id,
        reason: reason || "inappropriate",
      },
    });

    // Check if flag threshold is reached
    const flagCount = review.flags.length + 1;
    if (flagCount >= MODERATION_CONFIG.AUTO_REJECT.MAX_FLAGS) {
      // Auto-hide the review
      await prisma.review.update({
        where: { review_id: parseInt(id) },
        data: { status: "rejected" },
      });

      // Update seller rating if it was a buyer-to-seller review
      if (review.review_type === "buyer_to_seller") {
        await updateSellerRating(review.seller_id);
      }

      return res.status(200).json({
        message:
          "Review flagged and automatically hidden due to multiple reports",
        auto_hidden: true,
      });
    }

    res.status(200).json({
      message: "Review flagged for moderation",
      flag_count: flagCount,
    });
  } catch (error) {
    console.error("Error flagging review:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Bulk moderate reviews (Admin only)
export const bulkModerateReviews = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { action, review_ids, filters } = req.body;

    if (!["approved", "rejected"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action. Use 'approved' or 'rejected'" });
    }

    let where = { status: "pending" };

    // Apply filters if provided
    if (filters) {
      if (filters.review_type) where.review_type = filters.review_type;
      if (filters.min_rating) where.rating = { gte: filters.min_rating };
      if (filters.max_rating)
        where.rating = { ...where.rating, lte: filters.max_rating };
      if (filters.has_text === true) where.review_text = { not: null };
      if (filters.has_text === false) where.review_text = null;
    }

    // Specific reviews or all filtered reviews
    if (review_ids && review_ids.length > 0) {
      where.review_id = { in: review_ids.map((id) => parseInt(id)) };
    }

    const result = await prisma.review.updateMany({
      where,
      data: { status: action },
    });

    // Update seller ratings for approved buyer-to-seller reviews
    if (action === "approved") {
      const approvedReviews = await prisma.review.findMany({
        where: { ...where, review_type: "buyer_to_seller" },
        select: { seller_id: true },
      });

      const uniqueSellerIds = [
        ...new Set(approvedReviews.map((r) => r.seller_id)),
      ];

      for (const sellerId of uniqueSellerIds) {
        await updateSellerRating(sellerId);
      }
    }

    res.status(200).json({
      message: `Bulk moderation completed: ${result.count} reviews ${action}`,
      affected_count: result.count,
    });
  } catch (error) {
    console.error("Error in bulk moderation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get pending reviews for admin dashboard
export const getPendingReviews = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { page = 1, limit = 50, filter } = req.query;

    let where = { status: "pending" };

    // Apply additional filters
    if (filter === "negative") {
      where.rating = { lte: 2 };
    } else if (filter === "positive") {
      where.rating = { gte: 4 };
    } else if (filter === "text") {
      where.review_text = { not: null };
    } else if (filter === "no_text") {
      where.review_text = null;
    }

    const pendingReviews = await prisma.review.findMany({
      where,
      include: {
        lead: {
          include: {
            listing: {
              include: {
                category: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            is_verified: true,
            created_at: true,
          },
        },
        reviewed_user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
          },
        },
        flags: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
              },
            },
          },
        },
        _count: {
          select: {
            flags: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.review.count({ where });

    res.status(200).json({
      reviews: pendingReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get review statistics for admin dashboard
export const getReviewStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const stats = await prisma.review.aggregate({
      _count: {
        review_id: true,
      },
      _avg: {
        rating: true,
      },
      where: {
        status: "approved",
      },
    });

    const statusCounts = await prisma.review.groupBy({
      by: ["status"],
      _count: {
        review_id: true,
      },
    });

    const recentFlags = await prisma.reviewFlag.count({
      where: {
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    res.status(200).json({
      total_reviews: stats._count.review_id,
      average_rating: stats._avg.rating,
      status_breakdown: statusCounts,
      recent_flags: recentFlags,
      auto_moderation_enabled: true,
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Helper function to update seller's overall rating
async function updateSellerRating(seller_id) {
  try {
    const ratingStats = await prisma.review.aggregate({
      where: {
        seller_id: seller_id,
        review_type: "buyer_to_seller",
        status: "approved",
        is_public: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const averageRating = ratingStats._avg.rating
      ? Math.round(ratingStats._avg.rating)
      : 0;

    await prisma.sellerProfile.update({
      where: { seller_id: seller_id },
      data: { overall_rating: averageRating },
    });

    return averageRating;
  } catch (error) {
    console.error("Error updating seller rating:", error);
    throw error;
  }
}
