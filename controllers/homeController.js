import axios from "axios";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Home page data aggregator
export const getHomePageData = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const userLocation = req.query.userLocation || "";
    const searchQuery = req.query.search || "";
    const categoryFilter = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get user's location for personalized results
    let userCountry = "";
    let userState = "";
    let userCity = "";

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { country: true, state: true, city: true },
      });
      userCountry = user?.country || "";
      userState = user?.state || "";
      userCity = user?.city || "";
    }

    // Execute all data fetches in parallel for performance
    const [
      categories,
      // promotedListings,
      recentListings,
      popularListings,
      reviews,
      stats,
    ] = await Promise.all([
      getCategories(),
      // getPromotedListings(userCountry, userState, userCity),
      getRecentListings(
        searchQuery,
        categoryFilter,
        userCountry,
        userState,
        userCity,
        skip,
        limit,
      ),
      getPopularListings(userCountry, userState, userCity),
      getRecentReviews(),
      getPlatformStats(),
    ]);

    res.json({
      success: true,
      data: {
        categories,
        // promoted: promotedListings,
        listings: recentListings.listings,
        popularListings: popularListings,
        reviews,
        stats,
        pagination: recentListings.pagination,
      },
    });
  } catch (error) {
    console.error("Error fetching home page data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Get categories with listing counts
export const getCategories = async () => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parent_category_id: null, // Only parent categories
        is_active: true,
      },
      include: {
        _count: {
          select: {
            service_listings: {
              where: { status: "active" },
            },
          },
        },
        child_categories: {
          where: { is_active: true },
          select: {
            category_id: true,
            category_name: true,
            image_url: true,
          },
        },
      },
      orderBy: { sort_order: "asc" },
      take: 12,
    });

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    return categories.map((cat) => ({
      id: cat.category_id.toString(),
      name: cat.category_name,
      count: cat._count.service_listings,
      image_url: cat.image_url
        ? `${BASE_URL}${cat.image_url}`
        : `${BASE_URL}/uploads/categories/default-category.jpg`,
      subcategories: cat.child_categories.map((sub) => ({
        id: sub.category_id.toString(),
        name: sub.category_name,
        image_url: sub.image_url
          ? `${BASE_URL}${sub.image_url}`
          : `${BASE_URL}/uploads/categories/default-subcategory.jpg`,
      })),
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

// Get promoted/featured listings
export const getPromotedListings = async (country, state, city) => {
  try {
    const where = {
      status: "active",
      featured: true,
    };

    // Add location filtering if available
    if (country || state || city) {
      where.OR = [];

      if (country) {
        where.OR.push({
          service_countries: {
            path: ["$"],
            array_contains: [country],
          },
        });
      }

      if (state) {
        where.OR.push({
          service_states: {
            path: ["$"],
            array_contains: [state],
          },
        });
      }

      if (city) {
        where.OR.push({
          service_cities: {
            path: ["$"],
            array_contains: [city],
          },
        });
      }
    }

    const promoted = await prisma.serviceListing.findMany({
      where,
      include: {
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                country: true,
                state: true,
                city: true,
              },
            },
            business_addresses: {
              where: { is_primary: true },
              take: 1,
            },
          },
        },
        category: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true, // NEW: Include category image
          },
        },
        subcategory: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true, // NEW: Include subcategory image
          },
        },
        listing_media: {
          orderBy: { sort_order: "asc" },
          take: 1,
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 6,
    });

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    return promoted.map((listing) => ({
      id: listing.listing_id.toString(),
      title: listing.title,
      price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
      seller: listing.seller.business_name || listing.seller.user.fullname,
      category: listing.category?.category_name || "General",
      category_image: listing.category?.image_url
        ? `${BASE_URL}${listing.category.image_url}`
        : `${BASE_URL}/uploads/categories/default-category.jpg`,
      subcategory: listing.subcategory?.category_name || null,
      subcategory_image: listing.subcategory?.image_url
        ? `${BASE_URL}${listing.subcategory.image_url}`
        : listing.subcategory
          ? `${BASE_URL}/uploads/categories/default-subcategory.jpg`
          : null,

      image:
        listing.listing_media.length > 0
          ? `${BASE_URL}/uploads/${listing.listing_media[0].file_path}`
          : "https://source.unsplash.com/900x600?product",
      rating: listing.seller.overall_rating || 4.5,
      reviews: Math.floor(Math.random() * 50) + 10, // Mock review count
      location:
        listing.seller.business_addresses[0]?.business_city ||
        listing.seller.user.city ||
        "Multiple locations",
      promoted: true,
    }));
  } catch (error) {
    console.error("Error fetching promoted listings:", error);
    return [];
  }
};

// Get recent listings with filters
export const getRecentListings = async (
  search,
  category,
  country,
  state,
  city,
  skip,
  limit,
) => {
  try {
    const where = {
      status: "active",
    };

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { path: "$", string_contains: search } },
      ];
    }

    // Category filter
    if (category) {
      const categoryId = parseInt(category);
      where.OR = [{ category_id: categoryId }, { subcategory_id: categoryId }];
    }

    // Location filtering
    if (country || state || city) {
      where.AND = where.AND || [];

      const locationConditions = [];

      if (country) {
        locationConditions.push({
          service_countries: {
            path: ["$"],
            array_contains: [country],
          },
        });
      }

      if (state) {
        locationConditions.push({
          service_states: {
            path: ["$"],
            array_contains: [state],
          },
        });
      }

      if (city) {
        locationConditions.push({
          service_cities: {
            path: ["$"],
            array_contains: [city],
          },
        });
      }

      if (locationConditions.length > 0) {
        where.AND.push({ OR: locationConditions });
      }
    }

    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: {
                  user_id: true,
                  fullname: true,
                  country: true,
                  state: true,
                  city: true,
                },
              },
              business_addresses: {
                where: { is_primary: true },
                take: 1,
              },
            },
          },
          category: {
            select: {
              category_id: true,
              category_name: true,
              image_url: true, // NEW: Include category image
            },
          },
          subcategory: {
            select: {
              category_id: true,
              category_name: true,
              image_url: true, // NEW: Include subcategory image
            },
          },

          listing_media: {
            orderBy: { sort_order: "asc" },
            take: 1,
          },
          _count: {
            select: {
              leads: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.serviceListing.count({ where }),
    ]);

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    const formattedListings = listings.map((listing) => {
      return {
        id: listing.listing_id.toString(),
        title: listing.title,
        category: listing.category?.category_name || "General",
        category_image: listing.category?.image_url
          ? `${BASE_URL}${listing.category.image_url}`
          : `${BASE_URL}/uploads/categories/default-category.jpg`,
        subcategory: listing.subcategory?.category_name || null,
        subcategory_image: listing.subcategory?.image_url
          ? `${BASE_URL}${listing.subcategory.image_url}`
          : listing.subcategory
            ? `${BASE_URL}/uploads/categories/default-subcategory.jpg`
            : null,
        desc: listing.description || "No description available",
        location: listing.service_cities,
        price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
        rating: listing?.seller?.overall_rating,
        view: listing.view_count || 0,
        image:
          listing.listing_media.length > 0
            ? `${BASE_URL}/uploads${listing.listing_media[0].file_path}`
            : "https://source.unsplash.com/400x300?business",
        promoted: listing.featured,
      };
    });

    return {
      listings: formattedListings,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching recent listings:", error);
    return { listings: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  }
};

// Get popular listings (based on views and leads)
export const getPopularListings = async (country, state, city) => {
  try {
    const where = {
      status: "active",
      OR: [{ view_count: { gt: 0 } }, { lead_count: { gt: 0 } }],
    };

    // Add location filtering if available
    if (country || state || city) {
      where.AND = where.AND || [];

      const locationConditions = [];

      if (country) {
        locationConditions.push({
          service_countries: {
            path: ["$"],
            array_contains: [country],
          },
        });
      }

      if (state) {
        locationConditions.push({
          service_states: {
            path: ["$"],
            array_contains: [state],
          },
        });
      }

      if (city) {
        locationConditions.push({
          service_cities: {
            path: ["$"],
            array_contains: [city],
          },
        });
      }

      if (locationConditions.length > 0) {
        where.AND.push({ OR: locationConditions });
      }
    }

    const popular = await prisma.serviceListing.findMany({
      where,
      include: {
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
              },
            },
          },
        },
        category: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true, // NEW: Include category image
          },
        },
        subcategory: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true, // NEW: Include subcategory image
          },
        },

        listing_media: {
          orderBy: { sort_order: "asc" },
          take: 1,
        },
      },
      orderBy: [{ view_count: "desc" }, { lead_count: "desc" }],
      take: 8,
    });

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    return popular.map((listing) => ({
      id: listing.listing_id.toString(),
      title: listing.title,
      price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
      seller: listing.seller.business_name || listing.seller.user.fullname,
      location: listing.service_cities,
      category: listing.category?.category_name || "General",
      category_image: listing.category?.image_url
        ? `${BASE_URL}${listing.category.image_url}`
        : `${BASE_URL}/uploads/categories/default-category.jpg`,
      subcategory: listing.subcategory?.category_name || null,
      subcategory_image: listing.subcategory?.image_url
        ? `${BASE_URL}${listing.subcategory.image_url}`
        : listing.subcategory
          ? `${BASE_URL}/uploads/categories/default-subcategory.jpg`
          : null,
      image:
        listing.listing_media.length > 0
          ? `${BASE_URL}/uploads${listing.listing_media[0].file_path}`
          : "https://source.unsplash.com/400x300?popular",
      rating: listing.seller.overall_rating,
      views: listing.view_count,
      leads: listing.lead_count,
    }));
  } catch (error) {
    console.error("Error fetching popular listings:", error);
    return [];
  }
};

// Get recent reviews
export const getRecentReviews = async () => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        status: "approved",
        is_public: true,
      },
      include: {
        reviewer: {
          select: {
            user_id: true,
            fullname: true,
            avatar_url: true,
          },
        },
        seller: {
          include: {
            user: {
              select: {
                fullname: true,
              },
            },
          },
        },
        lead: {
          include: {
            listing: {
              select: {
                title: true,
                listing_id: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 6,
    });

    return reviews.map((review) => ({
      id: review.review_id.toString(),
      user: review.reviewer.fullname,
      rating: review.rating,
      text: review.review_text || "Great service!",
      listingId: review.lead?.listing?.listing_id.toString() || "1",
      listingTitle: review.lead?.listing?.title || "Business Service",
    }));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
};

// Get platform statistics
export const getPlatformStats = async () => {
  try {
    const [totalListings, totalSellers, totalBuyers, totalLeads] =
      await Promise.all([
        prisma.serviceListing.count({ where: { status: "active" } }),
        prisma.sellerProfile.count(),
        prisma.buyerProfile.count(),
        prisma.lead.count(),
      ]);

    return {
      totalListings,
      totalSellers,
      totalBuyers,
      totalLeads,
      successStories: Math.floor(totalLeads * 0.3), // Mock 30% success rate
    };
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return {
      totalListings: 0,
      totalSellers: 0,
      totalBuyers: 0,
      totalLeads: 0,
      successStories: 0,
    };
  }
};

// Quick search suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const [categories, listings, sellers] = await Promise.all([
      // Category suggestions
      prisma.category.findMany({
        where: {
          category_name: {
            contains: query,
          },
          is_active: true,
        },
        select: {
          category_id: true,
          category_name: true,
          image_url: true,
        },
        take: 5,
      }),

      // Listing suggestions
      prisma.serviceListing.findMany({
        where: {
          status: "active",
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          listing_id: true,
          title: true,
          category: {
            select: {
              category_name: true,
              image_url: true,
            },
          },
        },
        take: 5,
      }),

      // Seller suggestions
      prisma.sellerProfile.findMany({
        where: {
          business_name: {
            contains: query,
          },
        },
        include: {
          user: {
            select: {
              city: true,
              state: true,
            },
          },
        },
        take: 5,
      }),
    ]);

    const suggestions = [
      ...categories.map((cat) => ({
        type: "category",
        id: cat.category_id,
        name: cat.category_name,
        image_url: cat.image_url
          ? `${BASE_URL}${cat.image_url}`
          : `${BASE_URL}/uploads/categories/default-category.jpg`,
        display: `Category: ${cat.category_name}`,
      })),
      ...listings.map((listing) => ({
        type: "listing",
        id: listing.listing_id,
        name: listing.title,
        image_url: listing.category?.image_url
          ? `${BASE_URL}${listing.category.image_url}`
          : `${BASE_URL}/uploads/categories/default-category.jpg`,
        display: `${listing.title} (${listing.category.category_name})`,
      })),
      ...sellers.map((seller) => ({
        type: "seller",
        id: seller.seller_id,
        name: seller.business_name,
        display: `Seller: ${seller.business_name} - ${seller.user.city || ""}`,
      })),
    ];

    res.json({
      success: true,
      data: suggestions.slice(0, 10), // Limit to 10 total suggestions
    });
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Get user location based on IP or coordinates
export const detectUserLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required",
      });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: "Invalid coordinates provided",
      });
    }

    // Validate coordinate ranges
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        error: "Coordinates out of valid range",
      });
    }

    // Use OpenStreetMap Nominatim API (free, no API key required)
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: "json",
          addressdetails: 1,
          "accept-language": "en",
        },
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent": "YourAppName/1.0 (your-email@domain.com)", // Required by Nominatim
        },
      },
    );

    const data = response.data;

    if (!data.address) {
      return res.status(404).json({
        success: false,
        error: "Location not found",
      });
    }

    // Extract location information from the response
    const address = data.address;
    console.log("loca", address);
    const locationData = {
      city: address.state_district || address.city || address.county || "",
      state: address.state || address.region || "",
      country: address.country || "",
      countryCode: address.country_code?.toUpperCase() || "",
      postcode: address.postcode || "",
      displayName: data.display_name || "",
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    // Validate that we have at least basic location data
    if (!locationData.city && !locationData.state && !locationData.country) {
      return res.status(404).json({
        success: false,
        error: "Insufficient location data found",
      });
    }

    res.json({
      success: true,
      data: locationData,
    });
  } catch (error) {
    console.error("Error detecting location:", error);

    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        return res.status(408).json({
          success: false,
          error: "Location service timeout",
        });
      }

      if (error.response?.status === 429) {
        return res.status(429).json({
          success: false,
          error: "Too many location requests. Please try again later.",
        });
      }

      return res.status(502).json({
        success: false,
        error: "Location service unavailable",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getPopularTagsWithListings = async (req, res) => {
  try {
    const {
      limit = 20,
      minUsageCount = 1,
      maxListings = 50,
      category = "",
      popularityWeight = 0.6, // Weight for popularity vs usage (0-1)
    } = req.query;

    // Parse parameters
    const limitInt = parseInt(limit);
    const minUsageCountInt = parseInt(minUsageCount);
    const maxListingsInt = parseInt(maxListings);
    const popularityWeightFloat = parseFloat(popularityWeight);

    // Step 1: Extract and count all tags from listings
    const allListings = await prisma.serviceListing.findMany({
      where: {
        status: "active",
        ...(category && {
          OR: [
            { category_id: parseInt(category) },
            { subcategory_id: parseInt(category) },
          ],
        }),
      },
      select: {
        listing_id: true,
        tags: true,
        view_count: true,
        lead_count: true,
        featured: true,
        created_at: true,
      },
    });

    // Step 2: Process tags and calculate metrics
    const tagStats = {};

    allListings.forEach((listing) => {
      if (listing.tags && Array.isArray(listing.tags)) {
        listing.tags.forEach((tag) => {
          if (!tagStats[tag]) {
            tagStats[tag] = {
              tag: tag,
              usageCount: 0,
              totalViews: 0,
              totalLeads: 0,
              featuredCount: 0,
              listingIds: new Set(), // Use Set to avoid duplicates
              popularityScore: 0,
            };
          }

          tagStats[tag].usageCount++;
          tagStats[tag].totalViews += listing.view_count || 0;
          tagStats[tag].totalLeads += listing.lead_count || 0;
          tagStats[tag].listingIds.add(listing.listing_id);

          if (listing.featured) {
            tagStats[tag].featuredCount++;
          }
        });
      }
    });

    // Step 3: Calculate popularity score for each tag
    Object.keys(tagStats).forEach((tag) => {
      const stats = tagStats[tag];

      // Normalize metrics
      const maxUsage = Math.max(
        ...Object.values(tagStats).map((t) => t.usageCount),
      );
      const maxViews = Math.max(
        ...Object.values(tagStats).map((t) => t.totalViews),
      );
      const maxLeads = Math.max(
        ...Object.values(tagStats).map((t) => t.totalLeads),
      );

      const usageScore = maxUsage > 0 ? stats.usageCount / maxUsage : 0;
      const viewScore = maxViews > 0 ? stats.totalViews / maxViews : 0;
      const leadScore = maxLeads > 0 ? stats.totalLeads / maxLeads : 0;
      const featuredScore = stats.featuredCount / stats.usageCount;

      // Calculate weighted popularity score
      stats.popularityScore =
        usageScore * (1 - popularityWeightFloat) +
        viewScore * popularityWeightFloat * 0.4 +
        leadScore * popularityWeightFloat * 0.4 +
        featuredScore * popularityWeightFloat * 0.2;
    });

    // Step 4: Sort tags by popularity score and usage count
    const sortedTags = Object.values(tagStats)
      .filter((tag) => tag.usageCount >= minUsageCountInt)
      .sort((a, b) => {
        // Primary sort by popularity score
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
        // Secondary sort by usage count
        return b.usageCount - a.usageCount;
      })
      .slice(0, limitInt);

    // Step 5: Collect all unique listing IDs from top tags
    const uniqueListingIds = new Set();
    const listingTagScores = {}; // Track which tags and scores each listing has

    sortedTags.forEach((tag) => {
      tag.listingIds.forEach((listingId) => {
        uniqueListingIds.add(listingId);

        // Initialize or update listing tag score
        if (!listingTagScores[listingId]) {
          listingTagScores[listingId] = {
            listing_id: listingId,
            tagCount: 0,
            maxTagPopularity: 0,
            avgTagPopularity: 0,
            tags: [],
          };
        }

        listingTagScores[listingId].tagCount++;
        listingTagScores[listingId].maxTagPopularity = Math.max(
          listingTagScores[listingId].maxTagPopularity,
          tag.popularityScore,
        );
        listingTagScores[listingId].tags.push({
          tag: tag.tag,
          popularity: tag.popularityScore,
        });
      });
    });

    // Calculate average tag popularity for each listing
    Object.values(listingTagScores).forEach((listing) => {
      listing.avgTagPopularity =
        listing.tags.reduce((sum, t) => sum + t.popularity, 0) /
        listing.tags.length;
    });

    // Step 6: Fetch complete listing details for all unique listings
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    const listings = await prisma.serviceListing.findMany({
      where: {
        listing_id: { in: Array.from(uniqueListingIds) },
        status: "active",
      },
      include: {
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                country: true,
                state: true,
                city: true,
              },
            },
            business_addresses: {
              where: { is_primary: true },
              take: 1,
            },
          },
        },
        category: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true,
          },
        },
        subcategory: {
          select: {
            category_id: true,
            category_name: true,
            image_url: true,
            description: true,
          },
        },
        listing_media: {
          orderBy: { sort_order: "asc" },
          take: 3,
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    // Step 7: Calculate combined relevance score and format listings
    const formattedListings = listings.map((listing) => {
      const tagInfo = listingTagScores[listing.listing_id] || {
        tagCount: 0,
        maxTagPopularity: 0,
        avgTagPopularity: 0,
        tags: [],
      };

      // Calculate combined relevance score
      // Factors: tag popularity, listing views, leads, featured status, and recency
      const viewScore = Math.min((listing.view_count || 0) / 100, 1); // Normalize views
      const leadScore = Math.min((listing.lead_count || 0) / 10, 1); // Normalize leads
      const featuredBoost = listing.featured ? 0.2 : 0;

      // Recency score (more recent = higher score)
      const daysSinceCreation = Math.max(
        1,
        Math.floor(
          (new Date() - new Date(listing.created_at)) / (1000 * 60 * 60 * 24),
        ),
      );
      const recencyScore = Math.max(0, 1 - daysSinceCreation / 365); // Decay over year

      // Combined relevance score
      const relevanceScore =
        tagInfo.avgTagPopularity * 0.4 + // Tag influence (40%)
        viewScore * 0.2 + // Views (20%)
        leadScore * 0.2 + // Leads (20%)
        featuredBoost * 0.1 + // Featured boost (10%)
        recencyScore * 0.1; // Recency (10%)

      return {
        id: listing.listing_id.toString(),
        title: listing.title,
        description: listing.description,
        price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
        pricing_model: listing.pricing_model,
        service_type: listing.service_type,
        category: listing.category?.category_name || "General",
        category_id: listing.category?.category_id.toString(),
        category_image: listing.category?.image_url
          ? `${BASE_URL}${listing.category.image_url}`
          : `${BASE_URL}/uploads/categories/default-category.jpg`,
        subcategory: listing.subcategory?.category_name || null,
        subcategory_id: listing.subcategory?.category_id?.toString(),
        subcategory_description: listing.subcategory?.description?.toString(),
        subcategory_image: listing.subcategory?.image_url
          ? `${BASE_URL}${listing.subcategory.image_url}`
          : listing.subcategory
            ? `${BASE_URL}/uploads/categories/default-subcategory.jpg`
            : null,
        seller: {
          id: listing.seller.seller_id.toString(),
          name: listing.seller.business_name || listing.seller.user.fullname,
          rating: listing.seller.overall_rating,
          location:
            listing.seller.business_addresses[0]?.business_city ||
            listing.seller.user.city ||
            "Multiple locations",
        },
        images: listing.listing_media.map(
          (media) => `${BASE_URL}/uploads/${media.file_path}`,
        ),
        stats: {
          views: listing.view_count,
          leads: listing.lead_count,
          featured: listing.featured,
        },
        tags: listing.tags || [],
        tag_analysis: {
          matched_tags: tagInfo.tags.map((t) => t.tag),
          tag_count: tagInfo.tagCount,
          max_tag_popularity: parseFloat(tagInfo.maxTagPopularity.toFixed(4)),
          avg_tag_popularity: parseFloat(tagInfo.avgTagPopularity.toFixed(4)),
          relevance_score: parseFloat(relevanceScore.toFixed(4)),
        },
        created_at: listing.created_at,
        updated_at: listing.updated_at,
      };
    });

    // Step 8: Sort listings by relevance score
    const sortedListings = formattedListings
      .sort((a, b) => {
        // Primary sort by relevance score
        if (b.tag_analysis.relevance_score !== a.tag_analysis.relevance_score) {
          return (
            b.tag_analysis.relevance_score - a.tag_analysis.relevance_score
          );
        }
        // Secondary sort by views
        if (b.stats.views !== a.stats.views) {
          return b.stats.views - a.stats.views;
        }
        // Tertiary sort by leads
        if (b.stats.leads !== a.stats.leads) {
          return b.stats.leads - a.stats.leads;
        }
        // Final sort by creation date
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(0, maxListingsInt);

    // Step 9: Prepare response with ranking criteria
    const response = {
      success: true,
      data: {
        tags: sortedTags.map((tag) => ({
          tag: tag.tag,
          metrics: {
            usage_count: tag.usageCount,
            total_views: tag.totalViews,
            total_leads: tag.totalLeads,
            featured_count: tag.featuredCount,
            popularity_score: parseFloat(tag.popularityScore.toFixed(4)),
            average_views_per_listing: parseFloat(
              (tag.totalViews / tag.usageCount).toFixed(2),
            ),
            average_leads_per_listing: parseFloat(
              (tag.totalLeads / tag.usageCount).toFixed(2),
            ),
            associated_listings_count: tag.listingIds.size,
          },
        })),
        listings: sortedListings,
        criteria: {
          total_tags_analyzed: Object.keys(tagStats).length,
          total_listings_analyzed: allListings.length,
          unique_listings_found: sortedListings.length,
          tag_ranking_algorithm: "weighted_popularity_score",
          listing_ranking_algorithm: "combined_relevance_score",
          tag_weights: {
            usage_frequency: (1 - popularityWeightFloat).toFixed(2),
            view_popularity: (popularityWeightFloat * 0.4).toFixed(2),
            lead_popularity: (popularityWeightFloat * 0.4).toFixed(2),
            featured_boost: (popularityWeightFloat * 0.2).toFixed(2),
          },
          listing_weights: {
            tag_popularity_influence: "0.4",
            view_count: "0.2",
            lead_count: "0.2",
            featured_boost: "0.1",
            recency: "0.1",
          },
          filters_applied: {
            min_usage_count: minUsageCountInt,
            category_filter: category || "none",
            tag_limit: limitInt,
            max_listings: maxListingsInt,
          },
          tag_sort_order: [
            "popularity_score (descending)",
            "usage_count (descending)",
          ],
          listing_sort_order: [
            "relevance_score (descending)",
            "view_count (descending)",
            "lead_count (descending)",
            "created_at (descending)",
          ],
        },
        summary: {
          top_performing_tags: sortedTags.slice(0, 5).map((t) => t.tag),
          most_used_tag: sortedTags[0]?.tag || "none",
          highest_popularity_score: sortedTags[0]?.popularityScore || 0,
          listings_with_most_tags: sortedListings.slice(0, 3).map((l) => ({
            id: l.id,
            title: l.title,
            tag_count: l.tag_analysis.tag_count,
          })),
          average_relevance_score: parseFloat(
            (
              sortedListings.reduce(
                (sum, listing) => sum + listing.tag_analysis.relevance_score,
                0,
              ) / sortedListings.length
            ).toFixed(4),
          ),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching popular tags with listings:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

// Get listings by specific tag
export const getListingsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = "popular", // popular, recent, featured, price_low, price_high
      category = "",
    } = req.query;

    if (!tag) {
      return res.status(400).json({
        success: false,
        error: "Tag parameter is required",
      });
    }

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Build where clause for tag search
    const where = {
      status: "active",
      tags: {
        path: ["$"],
        array_contains: [tag],
      },
      ...(category && {
        OR: [
          { category_id: parseInt(category) },
          { subcategory_id: parseInt(category) },
        ],
      }),
    };

    // Build orderBy based on sort parameter
    let orderBy = {};
    switch (sortBy) {
      case "recent":
        orderBy = { created_at: "desc" };
        break;
      case "featured":
        orderBy = [{ featured: "desc" }, { created_at: "desc" }];
        break;
      case "price_low":
        orderBy = { min_price: "asc" };
        break;
      case "price_high":
        orderBy = { min_price: "desc" };
        break;
      case "popular":
      default:
        orderBy = [
          { view_count: "desc" },
          { lead_count: "desc" },
          { created_at: "desc" },
        ];
        break;
    }

    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: {
                  user_id: true,
                  fullname: true,
                  country: true,
                  state: true,
                  city: true,
                },
              },
              business_addresses: {
                where: { is_primary: true },
                take: 1,
              },
            },
          },
          category: {
            select: {
              category_id: true,
              category_name: true,
              image_url: true,
            },
          },
          subcategory: {
            select: {
              category_id: true,
              category_name: true,
              image_url: true,
            },
          },
          listing_media: {
            orderBy: { sort_order: "asc" },
            take: 3,
          },
          _count: {
            select: {
              leads: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitInt,
      }),
      prisma.serviceListing.count({ where }),
    ]);

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    const formattedListings = listings.map((listing) => ({
      id: listing.listing_id.toString(),
      title: listing.title,
      description: listing.description,
      price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
      pricing_model: listing.pricing_model,
      service_type: listing.service_type,
      category: listing.category?.category_name || "General",
      category_id: listing.category?.category_id.toString(),
      category_image: listing.category?.image_url
        ? `${BASE_URL}${listing.category.image_url}`
        : `${BASE_URL}/uploads/categories/default-category.jpg`,
      subcategory: listing.subcategory?.category_name || null,
      subcategory_id: listing.subcategory?.category_id?.toString(),
      subcategory_image: listing.subcategory?.image_url
        ? `${BASE_URL}${listing.subcategory.image_url}`
        : listing.subcategory
          ? `${BASE_URL}/uploads/categories/default-subcategory.jpg`
          : null,
      seller: {
        id: listing.seller.seller_id.toString(),
        name: listing.seller.business_name || listing.seller.user.fullname,
        rating: listing.seller.overall_rating,
        location:
          listing.seller.business_addresses[0]?.business_city ||
          listing.seller.user.city ||
          "Multiple locations",
      },
      images: listing.listing_media.map(
        (media) => `${BASE_URL}/uploads/${media.file_path}`,
      ),
      stats: {
        views: listing.view_count,
        leads: listing.lead_count,
        featured: listing.featured,
      },
      tags: listing.tags || [],
      created_at: listing.created_at,
      updated_at: listing.updated_at,
    }));

    res.json({
      success: true,
      data: {
        tag,
        listings: formattedListings,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          pages: Math.ceil(total / limitInt),
        },
        sort: {
          by: sortBy,
          description: getSortDescription(sortBy),
        },
        filters: {
          category: category || "none",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching listings by tag:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

// Helper function for sort descriptions
function getSortDescription(sortBy) {
  const descriptions = {
    popular: "Sorted by view count, lead count, and recency",
    recent: "Sorted by creation date (newest first)",
    featured: "Sorted by featured status and recency",
    price_low: "Sorted by price (lowest first)",
    price_high: "Sorted by price (highest first)",
  };
  return descriptions[sortBy] || descriptions.popular;
}
