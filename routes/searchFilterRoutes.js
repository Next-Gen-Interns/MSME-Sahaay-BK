import express from "express";
import { getSearchFilters } from "../controllers/searchFilterController.js";

const router = express.Router();

router.get("/", getSearchFilters);

export default router;