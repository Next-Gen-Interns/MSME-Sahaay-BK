import express from "express";
import {
  getHomePageData,
  getSearchSuggestions,
  detectUserLocation,
  getCategories,
  getPromotedListings,
  getRecentListings,
  getPopularListings,
  getRecentReviews,
  getPlatformStats,
  getPopularTagsWithListings,
  getListingsByTag,
} from "../controllers/homeController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Home page
router.get("/", getHomePageData);

// Live search suggestions
router.get("/search-suggestions", getSearchSuggestions);

// Detect location
router.post("/detect-location", detectUserLocation);

// Get all categories (this works directly)
router.get("/categories", async (req, res) => {
  const data = await getCategories();
  res.json({ success: true, data });
});

// Promoted listings
router.get("/promoted/listings", async (req, res) => {
  const { country = "", state = "", city = "" } = req.query;
  const data = await getPromotedListings(country, state, city);
  res.json({ success: true, data });
});

// Recent listings (with pagination)
router.get("/recent/listings", async (req, res) => {
  const {
    search = "",
    category = "",
    country = "",
    state = "",
    city = "",
    page = 1,
    limit = 20,
  } = req.query;

  const skip = (page - 1) * limit;

  const data = await getRecentListings(
    search,
    category,
    country,
    state,
    city,
    skip,
    parseInt(limit)
  );

  res.json({ success: true, data });
});

// Popular listings
router.get("/popular/listings", async (req, res) => {
  const { country = "", state = "", city = "" } = req.query;
  const data = await getPopularListings(country, state, city);

  res.json({ success: true, data });
});

router.get("/recent/reviews", async (req, res) => {
  const data = await getRecentReviews();
  res.json({ success: true, data });
});

router.get("/platform/stats", async (req, res) => {
  const data = await getPlatformStats();
  res.json({ success: true, data });
});

router.get("/personalized", authenticate, getHomePageData);

router.get("/popular-tags", getPopularTagsWithListings);

// Get listings by specific tag
router.get("/tag/:tag/listings", getListingsByTag);

export default router;
