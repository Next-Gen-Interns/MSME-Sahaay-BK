// controllers/smartSearchController.js
import { PrismaClient } from "../generated/prisma/index.js";
import axios from "axios";

const prisma = new PrismaClient();

export const smartSearchListings = async (req, res) => {
  try {
    const {
      search,
      category_id,
      service_type,
      min_price,
      max_price,
      city,
      latitude,
      longitude,
      page = 1,
      limit = 12,
      sort_by = "relevance",
      featured,
    } = req.body;

    // Build base where clause
    const where = { status: "active" };

    // Text search
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Category filter
    if (category_id) where.category_id = parseInt(category_id);

    // Service type filter
    if (service_type) where.service_type = service_type;

    // Price range filter
    if (min_price) where.min_price = { gte: parseFloat(min_price) };
    if (max_price) where.max_price = { lte: parseFloat(max_price) };

    // Featured filter
    if (featured !== undefined) where.featured = featured === "true";

    // Location-based filtering - ONLY CITY
    let detectedCity = null;

    // If coordinates provided, detect city
    if (latitude && longitude) {
      try {
        const locationData = await detectLocationFromCoords(
          latitude,
          longitude
        );
        detectedCity = locationData.city;

        // Use detected city for filtering
        if (detectedCity) {
          where.service_cities = {
            array_contains: [detectedCity],
          };
        }
      } catch (error) {
        console.error("Location detection failed:", error);
        // Continue without location filtering
      }
    }

    // Manual city filter (override detected city if provided)
    if (city) {
      where.service_cities = { array_contains: [city] };
      detectedCity = city; // Use manual city for display
    }

    // Build orderBy based on sort option
    let orderBy = {};
    switch (sort_by) {
      case "price_low":
        orderBy = { min_price: "asc" };
        break;
      case "price_high":
        orderBy = { min_price: "desc" };
        break;
      case "rating":
        orderBy = { seller: { overall_rating: "desc" } };
        break;
      case "newest":
        orderBy = { created_at: "desc" };
        break;
      case "popular":
        orderBy = { view_count: "desc" };
        break;
      default: // relevance
        orderBy = [
          { featured: "desc" },
          { seller: { overall_rating: "desc" } },
          { view_count: "desc" },
        ];
        break;
    }

    // Execute query
    const listings = await prisma.serviceListing.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        seller: {
          include: {
            user: {
              select: {
                user_id: true,
                email: true,
                phone: true,
                country: true,
                state: true,
                city: true,
                avatar_url: true,
              },
            },
            business_addresses: {
              where: { is_primary: true },
              take: 1,
            },
          },
        },
        listing_media: true,
        _count: { select: { leads: true } },
      },
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.serviceListing.count({ where });

    // Add URLs to media
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const listingsWithUrls = listings.map((listing) => ({
      ...listing,
      listing_media: listing.listing_media.map((media) => {
        const cleanPath = media.file_path.replace(/^\/+/, "");
        return {
          ...media,
          url: `${BASE_URL}/uploads/${cleanPath}`,
        };
      }),
    }));

    res.status(200).json({
      success: true,
      listings: listingsWithUrls,
      detectedCity: detectedCity,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error in smart search:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

// Helper function to detect location from coordinates
const detectLocationFromCoords = async (latitude, longitude) => {
  try {
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
        timeout: 5000,
        headers: {
          "User-Agent": "MSMEGuru/1.0",
        },
      }
    );

    const data = response.data;
    if (!data.address) {
      throw new Error("Location not found");
    }

    const address = data.address;
    return {
      city:
        address.city || address.town || address.village || address.county || "",
      state: address.state || "",
      country: address.country || "",
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };
  } catch (error) {
    console.error("Location detection error:", error);
    throw error;
  }
};
