import { PrismaClient } from "../generated/prisma/index.js";
import { checkUsageLimit, incrementUsage } from "./subscriptionController.js";
import path from "path";

import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// Create new service listing
export const createListing = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can create listings" });
    }

    // const usageCheck = await checkUsageLimit(
    //   req.user.user_id,
    //   "service_listings"
    // );
    // if (!usageCheck.allowed) {
    //   return res.status(403).json({
    //     error: usageCheck.reason,
    //     code: "USAGE_LIMIT_EXCEEDED",
    //     requiresUpgrade: usageCheck.requiresUpgrade,
    //   });
    // }

    const {
      title,
      description,
      service_type,
      pricing_model,
      min_price,
      max_price,
      estimated_timeline,
      service_areas,
      service_countries,
      service_states,
      service_cities,
      tags,
      category_id,
      subcategory_id,
    } = req.body;

    // Verify seller profile exists
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!sellerProfile) {
      return res.status(400).json({
        error:
          "Seller profile not found. Please complete your seller profile first.",
      });
    }

    if (subcategory_id) {
      const subcategory = await prisma.category.findUnique({
        where: { category_id: parseInt(subcategory_id) },
      });

      if (
        !subcategory ||
        subcategory.parent_category_id !== parseInt(category_id)
      ) {
        return res
          .status(400)
          .json({ error: "Invalid subcategory for selected category" });
      }
    }

    const parseJsonField = (field) => {
      if (!field) return null;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (error) {
          return field; // Return as is if parsing fails
        }
      }
      return Array.isArray(field) ? field : null;
    };

    const listing = await prisma.serviceListing.create({
      data: {
        title,
        description: description || "",
        service_type,
        pricing_model,
        min_price: min_price ? parseFloat(min_price) : null,
        max_price: max_price ? parseFloat(max_price) : null,
        estimated_timeline: estimated_timeline || "",
        service_countries:
          typeof service_countries === "string"
            ? JSON.parse(service_countries)
            : Array.isArray(service_countries)
            ? service_countries
            : [],
        service_states:
          typeof service_states === "string"
            ? JSON.parse(service_states)
            : Array.isArray(service_states)
            ? service_states
            : [],
        service_cities:
          typeof service_cities === "string"
            ? JSON.parse(service_cities)
            : Array.isArray(service_cities)
            ? service_cities
            : [],
        tags:
          typeof tags === "string"
            ? JSON.parse(tags)
            : Array.isArray(tags)
            ? tags
            : [],
        status: "draft",
        featured: false,
        view_count: 0,
        lead_count: 0,
        seller_id: sellerProfile.seller_id,
        category_id: parseInt(category_id),
        subcategory_id: subcategory_id ? parseInt(subcategory_id) : null, // ✅ added
      },
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
              },
            },
          },
        },
        listing_media: true,
      },
    });

    // Increment usage after successful creation
    // await incrementUsage(req.user.user_id, "service_listings");

    res.status(201).json({
      message: "Listing created successfully",
      listing,
      // usage: {
      //   used: usageCheck.used + 1,
      //   limit: usageCheck.limit,
      //   isFreePlan: usageCheck.isFreePlan,
      // },
    });
  } catch (error) {
    console.error("Error creating listing:", error);
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ error: "Invalid category or subcategory ID" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getListings = async (req, res) => {
  try {
    const {
      category_id,
      service_type,
      pricing_model,
      min_price,
      max_price,
      search,
      country,
      state,
      city,
      page = 1,
      limit = 10,
      status = "active",
    } = req.query;

    const where = { status };

    if (category_id) where.category_id = parseInt(category_id);
    if (service_type) where.service_type = service_type;
    if (pricing_model) where.pricing_model = pricing_model;
    if (min_price) where.min_price = { gte: parseFloat(min_price) };
    if (max_price) where.max_price = { lte: parseFloat(max_price) };

    // ✅ FIXED: Location filtering using JSON search
    if (country || state || city) {
      where.AND = where.AND || [];

      if (country) {
        where.AND.push({
          service_countries: {
            equals: `["${country}"]`, // Search for country in JSON array
          },
        });
      }

      if (state) {
        where.AND.push({
          service_states: {
            equals: `["${state}"]`, // Search for state in JSON array
          },
        });
      }

      if (city) {
        where.AND.push({
          service_cities: {
            equals: `["${city}"]`, // Search for city in JSON array
          },
        });
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const listings = await prisma.serviceListing.findMany({
      where,
      include: {
        category: true,
        subcategory: true, // ✅ Added subcategory
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
      orderBy: { created_at: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    const total = await prisma.serviceListing.count({ where });

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    const listingsWithUrls = listings.map((listing) => ({
      ...listing,
      listing_media: listing.listing_media.map((media) => {
        const cleanPath = media.file_path.replace(/^\/+/, ""); // remove leading slash
        return {
          ...media,
          url: `${BASE_URL}/uploads/${cleanPath}`, // always prepend /uploads
        };
      }),
    }));

    res.status(200).json({
      listings: listingsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.serviceListing.findUnique({
      where: { listing_id: parseInt(id) },
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
                bio: true,
              },
            },
            business_addresses: {
              // ✅ Include all business addresses
              orderBy: { is_primary: "desc" },
            },
          },
        },
        listing_media: {
          orderBy: { sort_order: "asc" },
        },
        leads: {
          include: {
            buyer: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    email: true,
                    phone: true,
                    country: true,
                    state: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const BASE_URL = process.env.BASE_URL || "http://192.168.2.64:5000";
    listing.listing_media = listing.listing_media.map((media) => ({
      ...media,
      url: `${BASE_URL}/${media.file_path.replace(/\\/g, "/")}`,
    }));

    if (req.user?.user_id !== listing.seller.user.user_id) {
      await prisma.serviceListing.update({
        where: { listing_id: parseInt(id) },
        data: { view_count: { increment: 1 } },
      });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("❌ Error fetching listing:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get current user's listings
export const getUserListings = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can view their listings" });
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!sellerProfile) {
      return res.status(400).json({ error: "Seller profile not found" });
    }

    const listings = await prisma.serviceListing.findMany({
      where: { seller_id: sellerProfile.seller_id },
      include: {
        category: true,
        subcategory: true, // ✅ Added subcategory
        listing_media: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update listing
export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      subcategory_id,
      service_countries,
      service_states,
      service_cities,
      ...otherFields
    } = req.body;

    const existingListing = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(id),
        seller: { user_id: req.user.user_id },
      },
    });

    if (!existingListing) {
      return res
        .status(404)
        .json({ error: "Listing not found or access denied" });
    }

    if (category_id && subcategory_id) {
      const subcategory = await prisma.category.findUnique({
        where: { category_id: parseInt(subcategory_id) },
      });

      if (
        !subcategory ||
        subcategory.parent_category_id !== parseInt(category_id)
      ) {
        return res
          .status(400)
          .json({ error: "Invalid subcategory for selected category" });
      }
    }

    const parseJsonField = (field) => {
      if (!field) return undefined;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (error) {
          return field;
        }
      }
      return Array.isArray(field) ? field : undefined;
    };

    // ✅ FIXED: Create proper update data object
    const updateData = {
      ...otherFields,
      category_id: category_id ? parseInt(category_id) : undefined,
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : undefined,
    };

    // Handle numeric fields
    if (updateData.min_price !== undefined) {
      updateData.min_price = updateData.min_price
        ? parseFloat(updateData.min_price)
        : null;
    }
    if (updateData.max_price !== undefined) {
      updateData.max_price = updateData.max_price
        ? parseFloat(updateData.max_price)
        : null;
    }

    // Handle location fields
    if (service_countries !== undefined) {
      updateData.service_countries = parseJsonField(service_countries);
    }
    if (service_states !== undefined) {
      updateData.service_states = parseJsonField(service_states);
    }
    if (service_cities !== undefined) {
      updateData.service_cities = parseJsonField(service_cities);
    }

    // Handle tags field
    if (updateData.tags !== undefined) {
      updateData.tags = parseJsonField(updateData.tags);
    }

    const updatedListing = await prisma.serviceListing.update({
      where: { listing_id: parseInt(id) },
      data: updateData, // ✅ FIXED: Use the properly constructed updateData
      include: {
        category: true,
        subcategory: true, // ✅ include for response
        listing_media: true,
      },
    });

    res.status(200).json({
      message: "Listing updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete listing
export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify listing belongs to current user
    const existingListing = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(id),
        seller: {
          user_id: req.user.user_id,
        },
      },
    });

    if (!existingListing) {
      return res
        .status(404)
        .json({ error: "Listing not found or access denied" });
    }

    await prisma.serviceListing.delete({
      where: { listing_id: parseInt(id) },
    });

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update listing status
export const updateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify listing belongs to current user
    const existingListing = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(id),
        seller: {
          user_id: req.user.user_id,
        },
      },
    });

    if (!existingListing) {
      return res
        .status(404)
        .json({ error: "Listing not found or access denied" });
    }

    const updatedListing = await prisma.serviceListing.update({
      where: { listing_id: parseInt(id) },
      data: { status },
      include: {
        category: true,
        listing_media: true,
      },
    });

    res.status(200).json({
      message: "Listing status updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Error updating listing status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add media to listing
// export const addListingMedia = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const files = req.files;

//     if (!files || files.length === 0) {
//       return res.status(400).json({ error: "No files uploaded" });
//     }

//     // Verify listing belongs to current user
//     const existingListing = await prisma.serviceListing.findFirst({
//       where: {
//         listing_id: parseInt(id),
//         seller: {
//           user_id: req.user.user_id,
//         },
//       },
//     });

//     if (!existingListing) {
//       return res
//         .status(404)
//         .json({ error: "Listing not found or access denied" });
//     }

//     // Get current max sort_order
//     const currentMedia = await prisma.listingMedia.findMany({
//       where: { listing_id: parseInt(id) },
//       orderBy: { sort_order: "desc" },
//       take: 1,
//     });

//     let nextSortOrder = 0;
//     if (currentMedia.length > 0) {
//       nextSortOrder = currentMedia[0].sort_order + 1;
//     }

//     const mediaRecords = await Promise.all(
//       files.map((file, index) =>
//         prisma.listingMedia.create({
//           data: {
//             file_path: file.path,
//             file_type: file.mimetype.startsWith("image/")
//               ? "image"
//               : file.mimetype.startsWith("video/")
//               ? "video"
//               : "document",
//             caption: req.body.captions ? req.body.captions[index] : "",
//             sort_order: nextSortOrder + index,
//             listing_id: parseInt(id),
//           },
//         })
//       )
//     );

//     res.status(201).json({
//       message: "Media added successfully",
//       media: mediaRecords,
//     });
//   } catch (error) {
//     console.error("Error adding listing media:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
export const addListingMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const existingListing = await prisma.serviceListing.findFirst({
      where: {
        listing_id: parseInt(id),
        seller: {
          user_id: req.user.user_id,
        },
      },
    });

    if (!existingListing) {
      return res
        .status(404)
        .json({ error: "Listing not found or access denied" });
    }

    const currentMedia = await prisma.listingMedia.findMany({
      where: { listing_id: parseInt(id) },
      orderBy: { sort_order: "desc" },
      take: 1,
    });

    let nextSortOrder =
      currentMedia.length > 0 ? currentMedia[0].sort_order + 1 : 0;

    const mediaRecords = await Promise.all(
      files.map((file, index) => {
        const relativePath =
          "/" + path.relative("uploads", file.path).replace(/\\/g, "/");
        return prisma.listingMedia.create({
          data: {
            file_path: relativePath, // ✅ Only starts from /listings/
            file_type: file.mimetype.startsWith("image/")
              ? "image"
              : file.mimetype.startsWith("video/")
              ? "video"
              : "document",
            caption: req.body.captions ? req.body.captions[index] : "",
            sort_order: nextSortOrder + index,
            listing_id: parseInt(id),
          },
        });
      })
    );

    res.status(201).json({
      message: "Media added successfully",
      media: mediaRecords,
    });
  } catch (error) {
    console.error("Error adding listing media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Remove media from listing
export const removeListingMedia = async (req, res) => {
  try {
    const { id, mediaId } = req.params;

    // Verify listing belongs to current user and media belongs to listing
    const media = await prisma.listingMedia.findFirst({
      where: {
        listing_media_id: parseInt(mediaId),
        listing: {
          listing_id: parseInt(id),
          seller: {
            user_id: req.user.user_id,
          },
        },
      },
    });

    if (!media) {
      return res
        .status(404)
        .json({ error: "Media not found or access denied" });
    }

    await prisma.listingMedia.delete({
      where: {
        listing_media_id: parseInt(mediaId),
      },
    });

    res.status(200).json({ message: "Media removed successfully" });
  } catch (error) {
    console.error("Error removing listing media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc    Get all parent categories only
 * @route   GET /api/categories
 * @access  Public
 */
export const getAllCategories = async (req, res) => {
  try {
    const parentCategories = await prisma.category.findMany({
      where: {
        parent_category_id: null,
        is_active: true,
      },
      include: {
        _count: {
          select: { service_listings: true },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    if (!parentCategories.length) {
      return res.status(404).json({
        success: false,
        message: "No active parent categories found",
      });
    }

    const formattedCategories = parentCategories.map((category) => ({
      id: category.category_id,
      name: category.category_name,
      description: category.description,
      icon: category.icon,
      listingCount: category._count?.service_listings || 0,
    }));

    return res.status(200).json({
      success: true,
      total: formattedCategories.length,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching parent categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch parent categories",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all subcategories by parent ID
 * @route   GET /api/categories/:parentId/subcategories
 * @access  Public
 */
export const getSubcategoriesByParent = async (req, res) => {
  const { parentId } = req.params;

  try {
    const parentIdNum = parseInt(parentId, 10);

    if (isNaN(parentIdNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent category ID",
      });
    }

    const subcategories = await prisma.category.findMany({
      where: {
        parent_category_id: parentIdNum,
        is_active: true,
      },
      include: {
        _count: {
          select: { service_listings: true },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    if (!subcategories.length) {
      return res.status(404).json({
        success: false,
        message: "No subcategories found for this parent ID",
      });
    }

    const formattedSubcategories = subcategories.map((sub) => ({
      id: sub.category_id,
      name: sub.category_name,
      description: sub.description,
      icon: sub.icon,
      listingCount: sub._count?.service_listings || 0,
    }));

    return res.status(200).json({
      success: true,
      parentId: parentIdNum,
      total: formattedSubcategories.length,
      subcategories: formattedSubcategories,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};


/* ===============================
   GET LISTINGS BY IDS (FOR FAVOURITES)
=============================== */
export const getListingsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid listing IDs" });
    }

    const listings = await prisma.serviceListing.findMany({
      where: {
        listing_id: {
          in: ids.map((id) => parseInt(id)),
        },
        status: "active",
      },
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
          },
        },
        listing_media: {
          orderBy: { sort_order: "asc" },
        },
      },
    });

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings by IDs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};