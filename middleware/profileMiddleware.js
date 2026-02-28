import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const requireBuyer = async (req, res, next) => {
  if (req.activeProfile !== "buyer") {
    return res.status(403).json({ error: "Switch to buyer mode" });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: req.user.user_id },
    include: { buyerprofile: true },
  });

  if (!user?.buyerprofile) {
    return res.status(403).json({ error: "Buyer profile not found" });
  }

  next();
};

export const requireSeller = async (req, res, next) => {
  if (req.activeProfile !== "seller") {
    return res.status(403).json({ error: "Switch to seller mode" });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: req.user.user_id },
    include: { sellerprofile: true },
  });

  if (!user?.sellerprofile) {
    return res.status(403).json({ error: "Seller profile not found" });
  }

  next();
};