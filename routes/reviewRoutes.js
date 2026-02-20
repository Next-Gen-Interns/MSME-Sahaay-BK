import express from "express";
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getUserReviews,
  getSellerReviews,
  getBuyerReviews,
  updateReviewStatus,
  flagReview,
  bulkModerateReviews,
  getPendingReviews,
  getReviewStats,
} from "../controllers/reviewController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getReviews);
router.get("/seller/:sellerId", getSellerReviews);
router.get("/buyer/:buyerId", getBuyerReviews);
router.get("/:id", getReviewById);

// Protected user routes
router.post("/", authenticate, createReview);
router.get("/user/my-reviews", authenticate, getUserReviews);
router.put("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);
router.post("/:id/flag", authenticate, flagReview);

// Admin routes
router.get("/admin/pending", authenticate, getPendingReviews);
router.get("/admin/stats", authenticate, getReviewStats);
router.patch("/:id/status", authenticate, updateReviewStatus);
router.post("/admin/bulk-moderate", authenticate, bulkModerateReviews);

export default router;
