import express from "express";
import {
  getSubcategories,
  getListingsBySubcategory,
  getListingsByParentCategory,
  getMainCategories,
} from "../controllers/categoryController.js";

const router = express.Router();

router.get("/:parent_category_id/subcategories", getSubcategories);

router.get("/all", getMainCategories);

router.get("/subcategory/:subcategory_id/listings", getListingsBySubcategory);

router.get("/:parent_category_id/listings", getListingsByParentCategory);

export default router;
