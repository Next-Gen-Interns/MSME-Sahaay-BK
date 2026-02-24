// import express from "express";
// import meiliClient from "../config/meili.js";
// import prisma from "../config/prisma.js";

// const router = express.Router();

// router.get("/", async (req, res) => {
//   try {
//     const {
//       q,
//       page = 1,
//       limit = 12,
//       suggestion = "false",
//       category,
//       country,
//       serviceType,
//       pricingModel,
//       minPrice,
//       maxPrice,
//       featured,
//       verified,
//       sort
//     } = req.query;

//     if (!q || !q.trim()) {
//       return res.json({
//         success: true,
//         total: 0,
//         results: [],
//       });
//     }

//     const pageNumber = Number(page);
//     const limitNumber = Number(limit);
//     const isSuggestion = suggestion === "true";

//     const searchOptions = {
//       limit: limitNumber,
//       offset: (pageNumber - 1) * limitNumber,
//     };

//     const filters = [];

//     // 🔹 Category (multi)
//     if (category) {
//       const categories = category.split(",");
//       filters.push(`category_id IN [${categories.join(",")}]`);
//     }

//     // 🔹 Country (multi)
//     if (country) {
//       const countries = country.split(",");
//       const countryFilter = countries
//         .map(c => `service_countries = "${c}"`)
//         .join(" OR ");
//       filters.push(`(${countryFilter})`);
//     }

//     // 🔹 Service Type (multi)
//     if (serviceType) {
//       const types = serviceType.split(",");
//       const typeFilter = types
//         .map(t => `service_type = "${t}"`)
//         .join(" OR ");
//       filters.push(`(${typeFilter})`);
//     }

//     // 🔹 Pricing Model (multi)
//     if (pricingModel) {
//       const models = pricingModel.split(",");
//       const modelFilter = models
//         .map(m => `pricing_model = "${m}"`)
//         .join(" OR ");
//       filters.push(`(${modelFilter})`);
//     }

//     // 🔹 Price Range
//     if (minPrice && maxPrice) {
//       filters.push(`min_price >= ${minPrice} AND max_price <= ${maxPrice}`);
//     }

//     // 🔹 Featured Only
//     if (featured === "true") {
//       filters.push(`featured = true`);
//     }

//     // 🔹 Verified Seller Only
//     if (verified === "true") {
//       filters.push(`seller.verification_status = "verified"`);
//     }

//     if (filters.length > 0) {
//       searchOptions.filter = filters.join(" AND ");
//     }

//     // 🔹 Sorting
//     if (sort === "price_asc") {
//       searchOptions.sort = ["max_price:asc"];
//     }

//     if (sort === "price_desc") {
//       searchOptions.sort = ["max_price:desc"];
//     }

//     if (sort === "newest") {
//       searchOptions.sort = ["created_at:desc"];
//     }

//     // 🔎 Step 1 — Meili Search
//     const searchResults = await meiliClient
//       .index("services")
//       .search(q, searchOptions);

//     const listingIds = searchResults.hits.map(hit => hit.listing_id);

//     if (listingIds.length === 0) {
//       return res.json({
//         success: true,
//         total: 0,
//         results: [],
//       });
//     }

//     // 🔹 Suggestion Mode (lightweight)
//     if (isSuggestion) {
//       const listings = await prisma.serviceListing.findMany({
//         where: {
//           listing_id: { in: listingIds },
//           status: "active",
//         },
//         select: {
//           listing_id: true,
//           title: true,
//           max_price: true,
//           service_countries: true,
//           listing_media: { take: 1 },
//         },
//       });

//       const ordered = listingIds.map(id =>
//         listings.find(l => l.listing_id === id)
//       );

//       return res.json({
//         success: true,
//         results: ordered,
//       });
//     }

//     // 🔹 Full Search Mode
//     const listings = await prisma.serviceListing.findMany({
//       where: {
//         listing_id: { in: listingIds },
//         status: "active",
//       },
//       include: {
//         listing_media: true,
//         seller: true,
//         category: true,
//       },
//     });

//     const orderedListings = listingIds.map(id =>
//       listings.find(l => l.listing_id === id)
//     );

//     res.json({
//       success: true,
//       total: searchResults.estimatedTotalHits,
//       results: orderedListings,
//       page: pageNumber,
//       totalPages: Math.ceil(searchResults.estimatedTotalHits / limitNumber),
//     });

//   } catch (error) {
//     console.error("Search error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Search failed",
//     });
//   }
// });

// export default router;



import express from "express";
import meiliClient from "../config/meili.js";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 12,
      suggestion = "false",
      category,
      country,
      state,
      city,
      serviceType,
      pricingModel,
      minPrice,
      maxPrice,
      featured,
      verified,
      sort
    } = req.query;

    if (!q || !q.trim()) {
      return res.json({
        success: true,
        total: 0,
        results: [],
      });
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const isSuggestion = suggestion === "true";

    const searchOptions = {
      limit: limitNumber,
      offset: (pageNumber - 1) * limitNumber,
    };

    const filters = [];

    // 🔹 Category (multi)
    if (category) {
      const categories = category.split(",");
      filters.push(`category_id IN [${categories.join(",")}]`);
    }

    // 🔹 Country (multi)
    if (country) {
      const countries = country.split(",");
      const countryFilter = countries
        .map(c => `service_countries = "${c}"`)
        .join(" OR ");
      filters.push(`(${countryFilter})`);
    }

    // 🔹 State (multi)
    if (state) {
      const states = state.split(",");
      const stateFilter = states
        .map(s => `service_states = "${s}"`)
        .join(" OR ");
      filters.push(`(${stateFilter})`);
    }

    // 🔹 City (multi)
    if (city) {
      const cities = city.split(",");
      const cityFilter = cities
        .map(c => `service_cities = "${c}"`)
        .join(" OR ");
      filters.push(`(${cityFilter})`);
    }

    // 🔹 Service Type
    if (serviceType) {
      const types = serviceType.split(",");
      const typeFilter = types
        .map(t => `service_type = "${t}"`)
        .join(" OR ");
      filters.push(`(${typeFilter})`);
    }

    // 🔹 Pricing Model
    if (pricingModel) {
      const models = pricingModel.split(",");
      const modelFilter = models
        .map(m => `pricing_model = "${m}"`)
        .join(" OR ");
      filters.push(`(${modelFilter})`);
    }

    // 🔹 Price Range (improved logic)
    if (minPrice) {
      filters.push(`max_price >= ${minPrice}`);
    }

    if (maxPrice) {
      filters.push(`min_price <= ${maxPrice}`);
    }

    // 🔹 Featured
    if (featured === "true") {
      filters.push(`featured = true`);
    }

    // 🔹 Verified Seller (IMPORTANT FIX BELOW)
    if (verified === "true") {
      filters.push(`seller_verification_status = "verified"`);
    }

    if (filters.length > 0) {
      searchOptions.filter = filters.join(" AND ");
    }

    // 🔹 Sorting
    if (sort === "price_asc") {
      searchOptions.sort = ["max_price:asc"];
    }

    if (sort === "price_desc") {
      searchOptions.sort = ["max_price:desc"];
    }

    if (sort === "newest") {
      searchOptions.sort = ["created_at:desc"];
    }

    // 🔎 Step 1 — Meili Search
    const searchResults = await meiliClient
      .index("services")
      .search(q, searchOptions);

    const listingIds = searchResults.hits.map(hit => hit.listing_id);

    if (listingIds.length === 0) {
      return res.json({
        success: true,
        total: 0,
        results: [],
      });
    }

    // 🔹 Suggestion Mode (lightweight)
    if (isSuggestion) {
      const listings = await prisma.serviceListing.findMany({
        where: {
          listing_id: { in: listingIds },
          status: "active",
        },
        select: {
          listing_id: true,
          title: true,
          max_price: true,
          service_countries: true,
          listing_media: { take: 1 },
        },
      });

      const ordered = listingIds.map(id =>
        listings.find(l => l.listing_id === id)
      );

      return res.json({
        success: true,
        results: ordered,
      });
    }

    // 🔹 Full Search Mode
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

    const orderedListings = listingIds.map(id =>
      listings.find(l => l.listing_id === id)
    );

    res.json({
      success: true,
      total: searchResults.estimatedTotalHits,
      results: orderedListings,
      page: pageNumber,
      totalPages: Math.ceil(
        searchResults.estimatedTotalHits / limitNumber
      ),
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