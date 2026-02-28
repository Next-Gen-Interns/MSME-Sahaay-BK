import express from "express";
import {
  register,
  login,
  requestPasswordReset,
  verifyOTP,
  resetPassword,
  logout,
  switchProfile
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/logout", authenticate, logout);
router.post("/switch-profile", authenticate, switchProfile);

export default router;
