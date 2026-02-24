// routes/search.js

import express from "express";
import meiliClient from "../config/meili.js";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q || !q.trim()) {
      return res.json({
        success: true,
        total: 0,
        results: [],
      });
    }

    // 🔎 Step 1: Search Meilisearch
    const searchResults = await meiliClient
      .index("services")
      .search(q, {
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

    const listingIds = searchResults.hits.map(hit => hit.listing_id);

    if (listingIds.length === 0) {
      return res.json({
        success: true,
        total: 0,
        results: [],
      });
    }

    // 🗄 Step 2: Fetch full listing data from DB
    const listings = await prisma.serviceListing.findMany({
      where: {
        listing_id: { in: listingIds },
        status: "active",
      },
      include: {
        listing_media: true,
        seller: true,
        category: true,
      },
    });

    // ⚠ Preserve Meili ranking order
    const orderedListings = listingIds.map(id =>
      listings.find(l => l.listing_id === id)
    );

    res.json({
      success: true,
      total: searchResults.estimatedTotalHits,
      results: orderedListings,
      page: Number(page),
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
});

export default router;