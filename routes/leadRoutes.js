import express from "express";
import {
  createLead,
  getBuyerLeads,
  getSellerLeads,
  getLeadById,
  updateLeadStatus,
  addLeadConversation,
  getLeadConversations,
  markConversationRead,
  getUnreadCount,
} from "../controllers/leadController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authenticate, createLead);
router.get("/buyer/my-leads", authenticate, getBuyerLeads);
router.get("/buyer/:id", authenticate, getLeadById);

router.get("/seller/incoming-leads", authenticate, getSellerLeads);
router.get("/seller/:id", authenticate, getLeadById);
router.patch("/:id/status", authenticate, updateLeadStatus);

router.get("/:id/conversations", authenticate, getLeadConversations);
router.post("/:id/conversations", authenticate, addLeadConversation);
router.patch(
  "/:id/conversations/:conversationId/read",
  authenticate,
  markConversationRead
);
router.get("/:id/unread-count", authenticate, getUnreadCount);

export default router;
