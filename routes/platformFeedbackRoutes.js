import express from "express";
import {
  createPlatformFeedback,
  getAllPlatformFeedback,
  updatePlatformFeedbackStatus,
  deletePlatformFeedback,
} from "../controllers/platformFeedbackController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js"; // your multer

const router = express.Router();

// Public (with optional auth)
router.post(
  "/",
  authenticate,
  upload.single("attachFile"),
  createPlatformFeedback,
);
// Admin only
router.get("/", authenticate, getAllPlatformFeedback);
router.patch("/:id/status", authenticate, updatePlatformFeedbackStatus);
router.delete("/:id", authenticate, deletePlatformFeedback);

export default router;
