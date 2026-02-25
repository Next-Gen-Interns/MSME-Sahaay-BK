import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

/* ===============================
   ADD TO FAVOURITE
=============================== */
export const addFavourite = async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);

    if (!listingId || isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const favourite = await prisma.favourite.create({
      data: {
        user: {
          connect: { user_id: req.user.user_id },
        },
        listing: {
          connect: { listing_id: listingId },
        },
      },
    });

    res.status(201).json({ message: "Added to favourites", favourite });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Already in favourites" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ===============================
   REMOVE FROM FAVOURITE
=============================== */
export const removeFavourite = async (req, res) => {
  try {
    const { listingId } = req.params;

    await prisma.favourite.delete({
      where: {
        user_id_listing_id: {
          user_id: req.user.user_id,
          listing_id: parseInt(listingId),
        },
      },
    });

    res.status(200).json({ message: "Removed from favourites" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ===============================
   GET MY FAVOURITES
=============================== */
export const getMyFavourites = async (req, res) => {
  try {
    const favourites = await prisma.favourite.findMany({
      where: {
        user_id: req.user.user_id,
      },
      select: {
        listing_id: true,
      },
    });

    res.status(200).json(favourites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMyFavouritesDetailed = async (req, res) => {
  try {
    const { page = 1, limit = 6 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const favourites = await prisma.favourite.findMany({
      where: {
        user_id: req.user.user_id,
      },
      orderBy: {
        created_at: "desc", // newest saved first
      },
      skip,
      take: parseInt(limit),
      include: {
        listing: {
          include: {
            category: true,
            subcategory: true,
            seller: {
              include: {
                user: true,
              },
            },
            listing_media: {
              orderBy: { sort_order: "asc" },
            },
          },
        },
      },
    });

    const total = await prisma.favourite.count({
      where: { user_id: req.user.user_id },
    });

    res.status(200).json({
      favourites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
