import express from "express";
import { submitSupportFeedback } from "../controllers/supportController.js";

const router = express.Router();

router.post("/feedback", submitSupportFeedback);

export default router;
