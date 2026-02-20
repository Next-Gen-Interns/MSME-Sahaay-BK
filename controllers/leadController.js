import { PrismaClient } from "../generated/prisma/index.js";
import { checkUsageLimit, incrementUsage } from "./subscriptionController.js";
const prisma = new PrismaClient();

// Create a new lead (Buyer sends inquiry to seller)
// export const createLead = async (req, res) => {
//   try {
//     if (req.user.role !== "buyer") {
//       return res.status(403).json({ error: "Only buyers can create leads" });
//     }

//     // const usageCheck = await checkUsageLimit(req.user.user_id, "lead_creation");
//     // if (!usageCheck.allowed) {
//     //   return res.status(403).json({
//     //     error: usageCheck.reason,
//     //     code: "USAGE_LIMIT_EXCEEDED",
//     //     requiresUpgrade: usageCheck.requiresUpgrade,
//     //   });
//     // }

//     const {
//       listing_id,
//       project_title,
//       project_description,
//       budget_range,
//       timeline,
//       contact_preference,
//       custom_requirements,
//       is_urgent = false,
//     } = req.body;

//     // Verify buyer profile exists
//     const buyerProfile = await prisma.buyerProfile.findUnique({
//       where: { user_id: req.user.user_id },
//     });

//     if (!buyerProfile) {
//       return res.status(400).json({
//         error:
//           "Buyer profile not found. Please complete your buyer profile first.",
//       });
//     }

//     // Verify listing exists and get seller info
//     const listing = await prisma.serviceListing.findUnique({
//       where: { listing_id: parseInt(listing_id) },
//       include: {
//         seller: true,
//       },
//     });

//     if (!listing) {
//       return res.status(404).json({ error: "Listing not found" });
//     }

//     if (listing.status !== "active") {
//       return res.status(400).json({ error: "This listing is not active" });
//     }

//     // Create the lead
//     const lead = await prisma.lead.create({
//       data: {
//         project_title: project_title || `Inquiry for ${listing.title}`,
//         project_description,
//         budget_range,
//         timeline,
//         contact_preference,
//         custom_requirements,
//         is_urgent,
//         status: "new",
//         listing_id: parseInt(listing_id),
//         buyer_id: buyerProfile.buyer_id,
//         seller_id: listing.seller_id,
//       },
//       include: {
//         listing: {
//           include: {
//             category: true,
//             seller: {
//               include: {
//                 user: {
//                   select: {
//                     user_id: true,
//                     email: true,
//                     phone: true,
//                     fullname: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//         buyer: {
//           include: {
//             user: {
//               select: {
//                 user_id: true,
//                 email: true,
//                 phone: true,
//                 fullname: true,
//               },
//             },
//           },
//         },
//         conversations: {
//           orderBy: {
//             created_at: "asc",
//           },
//         },
//       },
//     });

//     // Increment lead count on the listing
//     await prisma.serviceListing.update({
//       where: { listing_id: parseInt(listing_id) },
//       data: { lead_count: { increment: 1 } },
//     });

//     // Increment leads received on seller profile
//     await prisma.sellerProfile.update({
//       where: { seller_id: listing.seller_id },
//       data: { leads_received: { increment: 1 } },
//     });

//     // await incrementUsage(req.user.user_id, "lead_creation");

//     res.status(201).json({
//       message: "Lead created successfully",
//       lead,
//       // usage: {
//       //   used: usageCheck.used + 1,
//       //   limit: usageCheck.limit,
//       //   isFreePlan: usageCheck.isFreePlan,
//       // },
//     });
//   } catch (error) {
//     console.error("Error creating lead:", error);

//     if (error.code === "P2003") {
//       return res.status(400).json({ error: "Invalid listing ID" });
//     }

//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
// Create a new lead (Any user can send inquiry to seller)
export const createLead = async (req, res) => {
  try {
    // Remove the buyer-only restriction
    // Allow all authenticated users to create leads

    // const usageCheck = await checkUsageLimit(req.user.user_id, "lead_creation");
    // if (!usageCheck.allowed) {
    //   return res.status(403).json({
    //     error: usageCheck.reason,
    //     code: "USAGE_LIMIT_EXCEEDED",
    //     requiresUpgrade: usageCheck.requiresUpgrade,
    //   });
    // }

    const {
      listing_id,
      project_title,
      project_description,
      budget_range,
      timeline,
      contact_preference,
      custom_requirements,
      is_urgent = false,
    } = req.body;

    // Check if user has a buyer profile, if not create one automatically
    let buyerProfile = await prisma.buyerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    // If no buyer profile exists, create one automatically
    if (!buyerProfile) {
      try {
        buyerProfile = await prisma.buyerProfile.create({
          data: {
            user_id: req.user.user_id,
            // Add default values for required fields
            // Adjust these based on your BuyerProfile model requirements
            preferred_contact_method: contact_preference || "email",
            // Add other default fields as needed
          },
        });
      } catch (profileError) {
        console.error("Error creating buyer profile:", profileError);
        return res.status(400).json({
          error:
            "Could not create buyer profile automatically. Please complete your profile first.",
          requiresProfileSetup: true,
        });
      }
    }

    // Verify listing exists and get seller info
    const listing = await prisma.serviceListing.findUnique({
      where: { listing_id: parseInt(listing_id) },
      include: {
        seller: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (listing.status !== "active") {
      return res.status(400).json({ error: "This listing is not active" });
    }

    // Prevent users from creating leads on their own listings
    if (listing.seller.user_id === req.user.user_id) {
      return res.status(400).json({
        error: "You cannot create a lead on your own listing",
      });
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        project_title: project_title || `Inquiry for ${listing.title}`,
        project_description,
        budget_range,
        timeline,
        contact_preference,
        custom_requirements,
        is_urgent,
        status: "new",
        listing_id: parseInt(listing_id),
        buyer_id: buyerProfile.buyer_id,
        seller_id: listing.seller_id,
      },
      include: {
        listing: {
          include: {
            category: true,
            seller: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    email: true,
                    phone: true,
                    fullname: true,
                  },
                },
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                fullname: true,
                role: true, // Include role to identify user type
              },
            },
          },
        },
        conversations: {
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });

    // Increment lead count on the listing
    await prisma.serviceListing.update({
      where: { listing_id: parseInt(listing_id) },
      data: { lead_count: { increment: 1 } },
    });

    // Increment leads received on seller profile
    await prisma.sellerProfile.update({
      where: { seller_id: listing.seller_id },
      data: { leads_received: { increment: 1 } },
    });

    // await incrementUsage(req.user.user_id, "lead_creation");

    // Add a note about the user's role in the first conversation (optional)
    if (req.user.role !== "buyer") {
      await prisma.leadConversation.create({
        data: {
          message_type: "system",
          message_text: `This inquiry was sent by a ${req.user.role}.`,
          internal_notes: true, // Make it internal note for seller only
          lead_id: lead.lead_id,
          participant_id: req.user.user_id,
        },
      });
    }

    res.status(201).json({
      message: "Lead created successfully",
      lead,
      // usage: {
      //   used: usageCheck.used + 1,
      //   limit: usageCheck.limit,
      //   isFreePlan: usageCheck.isFreePlan,
      // },
    });
  } catch (error) {
    console.error("Error creating lead:", error);

    if (error.code === "P2003") {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Get buyer's own leads
export const getBuyerLeads = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res
        .status(403)
        .json({ error: "Only buyers can view their leads" });
    }

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!buyerProfile) {
      return res.status(400).json({ error: "Buyer profile not found" });
    }

    const { page = 1, limit = 10, status } = req.query;

    const where = {
      buyer_id: buyerProfile.buyer_id,
    };

    if (status) {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        listing: {
          include: {
            category: true,
            seller: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    email: true,
                    phone: true,
                    fullname: true,
                  },
                },
              },
            },
            listing_media: {
              take: 1,
              orderBy: { sort_order: "asc" },
            },
          },
        },
        conversations: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.lead.count({ where });

    res.status(200).json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching buyer leads:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get seller's incoming leads
export const getSellerLeads = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can view incoming leads" });
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!sellerProfile) {
      return res.status(400).json({ error: "Seller profile not found" });
    }

    const { page = 1, limit = 10, status } = req.query;

    const where = {
      seller_id: sellerProfile.seller_id,
    };

    if (status) {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        listing: {
          include: {
            category: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                fullname: true,
                avatar_url: true,
                country: true,
                state: true,
                city: true,
                address: true,
              },
            },
          },
        },
        conversations: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.lead.count({ where });

    res.status(200).json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching seller leads:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get single lead by ID (with access control)
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    let where = { lead_id: parseInt(id) };

    // Add access control based on user role
    if (req.user.role === "buyer") {
      const buyerProfile = await prisma.buyerProfile.findUnique({
        where: { user_id: req.user.user_id },
      });
      where.buyer_id = buyerProfile.buyer_id;
    } else if (req.user.role === "seller") {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { user_id: req.user.user_id },
      });
      where.seller_id = sellerProfile.seller_id;
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        listing: {
          include: {
            category: true,
            seller: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    email: true,
                    phone: true,
                    fullname: true,
                    country: true, // NEW
                    state: true, // NEW
                    city: true,
                  },
                },
              },
            },
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                fullname: true,
                country: true, // NEW
                state: true, // NEW
                city: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                fullname: true,
                country: true, // NEW
                state: true, // NEW
                city: true,
              },
            },
          },
        },
        conversations: {
          orderBy: {
            created_at: "asc",
          },
          include: {
            participant: {
              select: {
                user_id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found or access denied" });
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update lead status (Seller only)
export const updateLeadStatus = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can update lead status" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "new",
      "contacted",
      "qualified",
      "proposal_sent",
      "negotiation",
      "won",
      "lost",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    const lead = await prisma.lead.findFirst({
      where: {
        lead_id: parseInt(id),
        seller_id: sellerProfile.seller_id,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found or access denied" });
    }

    const updatedLead = await prisma.lead.update({
      where: { lead_id: parseInt(id) },
      data: { status },
      include: {
        listing: {
          include: {
            category: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                fullname: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      message: "Lead status updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add conversation to lead - FIXED VERSION
export const addLeadConversation = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = parseInt(req.params.id, 10);
    const {
      message_text,
      message_type = "text",
      attachments,
      internal_notes = false,
    } = req.body;

    if (!message_text || message_text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Message text is required",
      });
    }

    // Verify lead exists and user has permission using proper relationships
    const lead = await prisma.lead.findUnique({
      where: { lead_id: leadId },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
        listing: {
          include: {
            seller: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }

    // Check if user is participant in this lead using proper user_id relationships
    const isBuyer = lead.buyer.user.user_id === userId;
    const isSeller = lead.seller.user.user_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to participate in this lead",
      });
    }

    // Create message
    const message = await prisma.leadConversation.create({
      data: {
        message_type,
        message_text: message_text.trim(),
        attachments: attachments || null,
        internal_notes,
        lead_id: leadId,
        participant_id: userId, // This is user_id from User model
        created_at: new Date(),
      },
      include: {
        participant: {
          select: {
            user_id: true,
            email: true,
            fullname: true,
            role: true,
            avatar_url: true,
          },
        },
      },
    });

    // Real-time notification
    const io = req.app.get("io");
    if (io) {
      const payload = {
        conversation_id: message.conversation_id,
        message_type: message.message_type,
        message_text: message.message_text,
        attachments: message.attachments,
        internal_notes: message.internal_notes,
        participant: message.participant,
        participant_id: message.participant_id,
        created_at: message.created_at,
        lead_id: message.lead_id,
        is_read: message.is_read,
        delivered_at: message.delivered_at,
      };

      // Emit to all participants in the lead room
      io.to(`lead_${leadId}`).emit("new_message", payload);

      // Mark as delivered for all participants except sender
      await prisma.leadConversation.update({
        where: { conversation_id: message.conversation_id },
        data: { delivered_at: new Date() },
      });
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error("addLeadConversation error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Get lead conversations - FIXED VERSION
export const getLeadConversations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const offset = (page - 1) * limit;

    // Verify lead and permissions
    const lead = await prisma.lead.findUnique({
      where: { lead_id: leadId },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }

    // Check permissions using proper user relationships
    const isBuyer = lead.buyer.user.user_id === userId;
    const isSeller = lead.seller.user.user_id === userId;
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view these conversations",
      });
    }

    // Get messages with participant info
    const messages = await prisma.leadConversation.findMany({
      where: { lead_id: leadId },
      include: {
        participant: {
          select: {
            user_id: true,
            email: true,
            fullname: true,
            role: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: "asc" }, // Chronological order
      skip: offset,
      take: limit,
    });

    const total = await prisma.leadConversation.count({
      where: { lead_id: leadId },
    });

    // Mark messages as read for this user (except their own)
    if (messages.length > 0) {
      const unreadMessageIds = messages
        .filter((msg) => msg.participant_id !== userId && !msg.is_read)
        .map((msg) => msg.conversation_id);

      if (unreadMessageIds.length > 0) {
        await prisma.leadConversation.updateMany({
          where: {
            conversation_id: { in: unreadMessageIds },
            lead_id: leadId,
          },
          data: {
            is_read: true,
            read_at: new Date(),
          },
        });

        // Emit read receipts for real-time updates
        const io = req.app.get("io");
        if (io) {
          io.to(`lead_${leadId}`).emit("messages_read", {
            lead_id: leadId,
            read_by: userId,
            read_at: new Date(),
            message_ids: unreadMessageIds,
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("getLeadConversations error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = parseInt(req.params.id, 10);
    const conversationId = parseInt(req.params.conversationId, 10);

    // Validate IDs
    if (isNaN(leadId) || isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing lead_id or conversation_id",
      });
    }

    // Find conversation and ensure it belongs to the lead
    const conversation = await prisma.leadConversation.findFirst({
      where: {
        conversation_id: conversationId,
        lead_id: leadId,
      },
      select: {
        conversation_id: true,
        lead_id: true,
        participant_id: true,
        is_read: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found or does not belong to this lead",
      });
    }

    // Prevent marking own message as read
    if (conversation.participant_id === userId) {
      return res.status(200).json({
        success: true,
        message: "Cannot mark your own message as read",
      });
    }

    // Update read status
    const updatedConversation = await prisma.leadConversation.update({
      where: { conversation_id: conversationId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Message marked as read successfully",
      data: updatedConversation,
    });
  } catch (error) {
    console.error("markConversationRead error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Get unread message count for a lead
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = parseInt(req.params.id, 10);

    const lead = await prisma.lead.findUnique({
      where: { lead_id: leadId },
      include: {
        buyer: { include: { user: true } },
        seller: { include: { user: true } },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }

    const isBuyer = lead.buyer.user.user_id === userId;
    const isSeller = lead.seller.user.user_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
      });
    }

    const unreadCount = await prisma.leadConversation.count({
      where: {
        lead_id: leadId,
        participant_id: { not: userId }, // Messages from other participants
        is_read: false,
      },
    });

    return res.json({
      success: true,
      data: {
        lead_id: leadId,
        unread_count: unreadCount,
      },
    });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
