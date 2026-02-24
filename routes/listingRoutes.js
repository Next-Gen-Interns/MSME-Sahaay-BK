import express from "express";
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  getUserListings,
  addListingMedia,
  removeListingMedia,
  updateListingStatus,
  getAllCategories,
  getSubcategoriesByParent,
  getListingsByIds
} from "../controllers/listingController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getListings);
router.get("/:id", getListingById);

// Protected routes (seller only)
router.post("/", authenticate, createListing);
router.get("/user/my-listings", authenticate, getUserListings);
router.put("/:id", authenticate, updateListing);
router.delete("/:id", authenticate, deleteListing);
router.patch("/:id/status", authenticate, updateListingStatus);

router.get("/categories/parent", getAllCategories);
router.get(
  "/categories/:parentId/subcategories",
  authenticate,
  getSubcategoriesByParent
);

// Media management
router.post(
  "/:id/media",
  authenticate,
  upload.array("media", 5),
  addListingMedia
);
router.delete("/:id/media/:mediaId", authenticate, removeListingMedia);

//for favourites post
router.post("/by-ids", getListingsByIds);

export default router;
