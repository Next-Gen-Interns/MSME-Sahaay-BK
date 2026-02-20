import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllBuyers,
  getAllSellers,
  getAllListings,
  getListingById,
  updateListingStatus,
  deleteListing,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllLeads,
  getLeadById,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getAllDocuments,
  updateDocumentStatus,
  getAllSubscriptions,
  updateSubscriptionStatus,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getUserStats,
  getAllSubscriptionPlans,
  getUserUsage,
  resetUserUsage,
  adjustUsage,
  assignSubscriptionToUser,
  getSubscriptionById,
  createUserWithProfiles,
  updateUserWithProfiles,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";
import uploadCategory from "../middleware/uploadCategory.js";

const router = express.Router();

router.use(authenticate, isAdmin);

// User Management
router.get("/users", getAllUsers);
router.get("/stats", getUserStats);
router.post("/users", createUserWithProfiles);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUserWithProfiles);
router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

// Buyer/Seller Profile Management
router.get("/buyers", getAllBuyers);
router.get("/sellers", getAllSellers);

// Listing Management
router.get("/listings", getAllListings);
router.get("/listings/:id", getListingById);
router.patch("/listings/:id/status", updateListingStatus);
router.delete("/listings/:id", deleteListing);

// Category Management
router.get("/categories", getAllCategories);
router.post("/categories", uploadCategory.single("image"), createCategory);
router.put("/categories/:id", uploadCategory.single("image"), updateCategory);
router.delete("/categories/:id", deleteCategory);

// Lead Management
router.get("/leads", getAllLeads);
router.get("/leads/:id", getLeadById);

// Review Management
router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/status", updateReviewStatus);
router.delete("/reviews/:id", deleteReview);

// Document/Verification Management
router.get("/documents", getAllDocuments);
router.patch("/documents/:id/status", updateDocumentStatus);

// Subscription Management
router.get("/subscriptions", getAllSubscriptions);
router.get("/subscriptions/plans", getAllSubscriptionPlans);
router.post("/subscription-plans", createSubscriptionPlan);
router.get("/subscriptions/:id", getSubscriptionById);
router.put("/subscription-plans/:id", updateSubscriptionPlan);
router.delete("/subscription-plans/:id", deleteSubscriptionPlan);

// Admin usage / assignment controls
router.get("/subscriptions/usage/:userId", getUserUsage); // view usage for user
router.post("/subscriptions/usage/:userId/reset", resetUserUsage); // reset usage for user for current month
router.patch("/subscriptions/usage/:usageId", adjustUsage); // adjust a particular usage record
router.patch("/subscriptions/:id/assign", assignSubscriptionToUser); // assign/replace plan for a user
router.patch("/subscriptions/:id/status", updateSubscriptionStatus); // existing mapping

export default router;
