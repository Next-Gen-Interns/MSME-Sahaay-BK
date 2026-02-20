// routes/smartSearch.js
import express from "express";
import { smartSearchListings } from "../controllers/smartSearchController.js";
import { detectUserLocation } from "../controllers/homeController.js";

const router = express.Router();

router.post("/smart-search", smartSearchListings);
router.post("/detect-location", detectUserLocation);

export default router;
