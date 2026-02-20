import express from "express";
import {
  getSubscriptionPlans,
  getUserSubscription,
  createSubscription,
  cancelSubscription,
  getFreePlanInfo,
  checkMultipleFeaturesEndpoint,
  getUsageAlerts,
} from "../controllers/subscriptionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/plans", getSubscriptionPlans);

// Protected routes
router.get("/my-subscription", authenticate, getUserSubscription);
router.post("/subscribe", authenticate, createSubscription);
router.post("/cancel", authenticate, cancelSubscription);

// Add these to your routes
router.get("/free-plan", getFreePlanInfo);
router.post(
  "/check-multiple-features",
  authenticate,
  checkMultipleFeaturesEndpoint
);
router.get("/usage-alerts", authenticate, getUsageAlerts);
export default router;
