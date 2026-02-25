import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "./generated/prisma/index.js";
import authRoutes from "./routes/authRoutes.js";
import homeRoutes from "./routes/homeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import ListingRoutes from "./routes/listingRoutes.js";
import LeadRoutes from "./routes/leadRoutes.js";
import ReviewRoutes from "./routes/reviewRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import smartSearchRoutes from "./routes/smartSearch.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import platformFeedbackRoutes from "./routes/platformFeedbackRoutes.js";
import favouriteRoutes from "./routes/favouriteRoutes.js";
import searchRoutes from "./routes/search.js";
import supportRoutes from "./routes/supportRoutes.js";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();
const Ip = process.env.IP;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "https://msmeguru.crmnextgen.in",
      "http://localhost:3000",
      "http://localhost:3001",
      Ip,
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: [
      "https://msmeguru.crmnextgen.in",
      "http://localhost:3000",
      "http://localhost:3001",
      Ip,
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/listings", express.static(path.join(__dirname, "public/listings")));
app.set("io", io);

app.get("/", (req, res) => {
  res.send("MSME Guru Backend is running 🚀");
});
app.use("/api/home", homeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listing", ListingRoutes);
app.use("/api/lead", LeadRoutes);
app.use("/api/reviews", ReviewRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/get", smartSearchRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/feedback", platformFeedbackRoutes);
app.use("/api/favourites", favouriteRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/support", supportRoutes);

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    console.log("token", token);
    if (!token) {
      console.log("🔴 Socket connection rejected: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    const cleanToken = token.replace("Bearer ", "");

    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        email: true,
        role: true,
        status: true,
        fullname: true,
      },
    });

    if (!user) {
      console.log("🔴 Socket connection rejected: User not found");
      return next(new Error("Authentication error: User not found"));
    }

    if (user.status !== "active") {
      console.log("🔴 Socket connection rejected: User inactive");
      return next(new Error("Authentication error: User account is inactive"));
    }

    // Attach user to socket for later use
    socket.user = user;
    console.log(
      `✅ Socket authenticated for user: ${user.email} (${user.user_id})`,
    );

    next();
  } catch (error) {
    console.error("🔴 Socket authentication error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return next(new Error("Authentication error: Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      return next(new Error("Authentication error: Token expired"));
    } else {
      return next(new Error("Authentication error: Token verification failed"));
    }
  }
});

// Socket connection handler (now with authenticated users)
io.on("connection", (socket) => {
  console.log(
    "🟢 New socket connected:",
    socket.id,
    "User:",
    socket.user.email,
  );

  socket.on("join_lead", async ({ leadId }) => {
    try {
      if (!leadId) {
        socket.emit("error", { message: "leadId is required" });
        return;
      }

      // Use the authenticated user from socket
      const userId = socket.user.user_id;

      // Verify user has access to this lead
      const lead = await prisma.lead.findUnique({
        where: { lead_id: parseInt(leadId) },
        include: {
          buyer: { include: { user: true } },
          seller: { include: { user: true } },
        },
      });

      if (!lead) {
        socket.emit("error", { message: "Lead not found" });
        return;
      }

      const isBuyer = lead.buyer.user.user_id === userId;
      const isSeller = lead.seller.user.user_id === userId;

      if (!isBuyer && !isSeller) {
        socket.emit("error", { message: "Not authorized to join this lead" });
        return;
      }

      socket.join(`lead_${leadId}`);
      console.log(`User ${userId} joined lead_${leadId}`);

      socket.emit("joined", {
        room: `lead_${leadId}`,
        lead_id: leadId,
      });

      // Notify others that user joined
      socket.to(`lead_${leadId}`).emit("user_joined", {
        user_id: userId,
        user_email: socket.user.email,
        user_name: socket.user.fullname,
        lead_id: leadId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error joining lead:", error);
      socket.emit("error", { message: "Internal server error" });
    }
  });

  socket.on("leave_lead", ({ leadId }) => {
    socket.leave(`lead_${leadId}`);
    console.log(`User ${socket.user.user_id} left lead_${leadId}`);
  });

  socket.on("typing", ({ leadId, typing }) => {
    // Use authenticated user info
    socket.to(`lead_${leadId}`).emit("typing", {
      leadId,
      userId: socket.user.user_id,
      userEmail: socket.user.email,
      userName: socket.user.fullname,
      typing,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "🔴 Socket disconnected:",
      socket.id,
      "User:",
      socket.user?.email,
      "Reason:",
      reason,
    );
  });

  socket.on("error", (error) => {
    console.error(
      "Socket error for user:",
      socket.user?.email,
      "Error:",
      error,
    );
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}
startServer();

// sanitize host (remove protocol and trailing slash) and provide default
const rawHost = process.env.IP_PORT || "localhost";
const HOST = String(rawHost)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

// handle listen errors explicitly
server.on("error", (err) => {
  console.error("❌ Server listen error:", err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Server started on http://${HOST}:${PORT}`);
});
