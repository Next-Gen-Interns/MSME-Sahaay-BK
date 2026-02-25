import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  applyAsExpert,
  getExperts,
  
  getMyExpertStatus
} from "../controllers/expertController.js";

const router = express.Router();

// Public
router.get("/", getExperts);

// Seller
router.post("/apply", authenticate, applyAsExpert);

router.get("/me", authenticate, getMyExpertStatus);

export default router;