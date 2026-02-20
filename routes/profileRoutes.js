import express from "express";
import {
  createBuyerProfile,
  createSellerProfile,
  getBuyerProfile,
  getSellerProfile,
  getUserProfile,
  updateBuyerProfile,
  updateSellerProfile,
  updateUserProfile,
} from "../controllers/profileController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import uploadAvatar from "../middleware/uploadAvatar.js";

const router = express.Router();

router.put(
  "/user",
  authenticate,
  uploadAvatar.single("avatar"),
  updateUserProfile
);
router.get("/user", authenticate, getUserProfile);

router.get("/buyer", authenticate, getBuyerProfile);
router.post("/buyer", authenticate, createBuyerProfile);
router.put("/buyer", authenticate, updateBuyerProfile);

router.get("/seller", authenticate, getSellerProfile);
router.post("/seller", authenticate, createSellerProfile);
router.put("/seller", authenticate, updateSellerProfile);

export default router;
