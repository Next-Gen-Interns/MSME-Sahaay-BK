import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  getAllExpertsAdmin,
  getPendingExperts,
  getExpertByIdAdmin,
  updateExpertStatus,
} from "../controllers/expertController.js";

const router = express.Router();

router.get("/", authenticate, getAllExpertsAdmin);
router.get("/pending", authenticate, getPendingExperts);
router.get("/:id", authenticate, getExpertByIdAdmin);
router.patch("/:id/status", authenticate, updateExpertStatus);
export default router;