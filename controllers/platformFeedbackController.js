import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

// ==================== CREATE ====================

export const createPlatformFeedback = async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      userType,
      feedbackType,
      rating,
      subject,
      message,
      consent,
    } = req.body;

    if (!subject || !message || !consent) {
      return res.status(400).json({
        error: "Subject, message and consent are required",
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
      });
    }

    const fileUrl = req.file ? req.file.path : null;

    const feedback = await prisma.platformFeedback.create({
      data: {
        user_id: req.user.user_id, // 🔒 only from token
        name,
        email,
        company,
        user_type: userType,
        feedback_type: feedbackType,
        rating: rating ? parseInt(rating) : null,
        subject,
        message,
        file_url: fileUrl,
        consent: consent === "true" || consent === true,
      },
    });

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ==================== ADMIN: GET ALL ====================

export const getAllPlatformFeedback = async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { page = 1, limit = 20, status } = req.query;

    const where = {};
    if (status) where.status = status;

    const feedbacks = await prisma.platformFeedback.findMany({
      where,
      include: {
        user: {
          select: {
            user_id: true,
            fullname: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.platformFeedback.count({ where });

    res.status(200).json({
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ==================== ADMIN: UPDATE STATUS ====================

export const updatePlatformFeedbackStatus = async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "reviewed", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await prisma.platformFeedback.update({
      where: { feedback_id: parseInt(id) },
      data: { status },
    });

    res.status(200).json({
      message: "Feedback status updated",
      feedback: updated,
    });
  } catch (error) {
    console.error("Update feedback error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ==================== ADMIN: DELETE ====================

export const deletePlatformFeedback = async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    await prisma.platformFeedback.delete({
      where: { feedback_id: parseInt(id) },
    });

    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};