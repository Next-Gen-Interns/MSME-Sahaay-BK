import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const buildImage = (img) => (img ? `${BASE_URL}${img}` : null);

// 1️⃣ API — Get all subcategories of a specific parent category
export const getSubcategories = async (req, res) => {
  try {
    const { parent_category_id } = req.params;

    if (!parent_category_id) {
      return res.status(400).json({
        success: false,
        error: "Parent category ID is required",
      });
    }

    const parentId = parseInt(parent_category_id);

    // Fetch parent category
    const parentCategory = await prisma.category.findUnique({
      where: { category_id: parentId },
      select: {
        category_id: true,
        category_name: true,
        image_url: true,
        description: true,
      },
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: "Parent category not found",
      });
    }

    // Fetch subcategories
    const subcategories = await prisma.category.findMany({
      where: {
        parent_category_id: parentId,
        is_active: true,
      },
      include: {
        _count: {
          select: {
            service_listings: { where: { status: "active" } },
            subcategory_listings: { where: { status: "active" } },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    const formattedSubcategories = subcategories.map((subcat) => ({
      id: subcat.category_id.toString(),
      name: subcat.category_name,
      description: subcat.description,
      image: subcat.image_url ? buildImage(subcat.image_url) : null,
      listing_count:
        subcat._count.service_listings + subcat._count.subcategory_listings,
    }));

    // ⭐ RETURN parent + subcategories both
    res.json({
      success: true,
      data: {
        parent_category: {
          id: parentCategory.category_id,
          name: parentCategory.category_name,
          description: parentCategory.description,
          image: parentCategory.image_url
            ? buildImage(parentCategory.image_url)
            : null,
        },
        subcategories: formattedSubcategories,
      },
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getMainCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parent_category_id: null,
        is_active: true,
      },
      include: {
        child_categories: {
          where: { is_active: true },
          select: { category_id: true },
        },
        _count: {
          select: {
            service_listings: { where: { status: "active" } },
            subcategory_listings: { where: { status: "active" } },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    const formattedCategories = categories.map((cat) => ({
      id: cat.category_id,
      name: cat.category_name,
      description: cat.description,
      image: cat.image_url ? buildImage(cat.image_url) : null,

      // Correct relation mapping
      subcategories_count: cat.child_categories.length,

      listing_count:
        cat._count.service_listings + cat._count.subcategory_listings,
    }));

    res.json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching main categories:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getListingsBySubcategory = async (req, res) => {
  try {
    const { subcategory_id } = req.params;
    const {
      page = 1,
      limit = 20,
      country = "",
      state = "",
      city = "",
      search = "",
    } = req.query;

    if (!subcategory_id) {
      return res.status(400).json({
        success: false,
        error: "Subcategory ID is required",
      });
    }

    const skip = (page - 1) * limit;

    const where = {
      status: "active",
      OR: [
        { subcategory_id: parseInt(subcategory_id) },
        { category_id: parseInt(subcategory_id) }, // if used as direct category
      ],
    };

    // Search filter
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { tags: { path: "$", string_contains: search } },
          ],
        },
      ];
    }

    // Location filtering
    const locationFilter = [];
    if (country)
      locationFilter.push({
        service_countries: { path: ["$"], array_contains: [country] },
      });
    if (state)
      locationFilter.push({
        service_states: { path: ["$"], array_contains: [state] },
      });
    if (city)
      locationFilter.push({
        service_cities: { path: ["$"], array_contains: [city] },
      });

    if (locationFilter.length)
      where.AND = [...(where.AND || []), { OR: locationFilter }];

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
          category: true,
          subcategory: true,
          listing_media: {
            orderBy: { sort_order: "asc" },
            take: 1,
          },
          _count: { select: { leads: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.serviceListing.count({ where }),
    ]);

    const formattedListings = listings.map((listing) => ({
      id: listing.listing_id,
      title: listing.title,
      description: listing.description || "No description available",

      category: listing.category?.category_name || null,
      category_image: buildImage(listing.category?.image_url),

      subcategory: listing.subcategory?.category_name || null,
      subcategory_image: buildImage(listing.subcategory?.image_url),

      price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
      pricing_model: listing.pricing_model,
      service_type: listing.service_type,

      seller: listing.seller.business_name || listing.seller.user.fullname,
      seller_id: listing.seller.seller_id,

      location: listing.service_cities,

      image:
        listing.listing_media.length > 0
          ? `${BASE_URL}/uploads${listing.listing_media[0].file_path}`
          : "https://source.unsplash.com/400x300?business",

      rating: listing.seller.overall_rating || 0,
      views: listing.view_count,
      leads: listing.lead_count,
      featured: listing.featured,
      created_at: listing.created_at,
    }));

    res.json({
      success: true,
      data: {
        listings: formattedListings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching subcategory listings:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// 3️⃣ API — Get all listings that belong to a parent category (including all its subcategories)
export const getListingsByParentCategory = async (req, res) => {
  try {
    const { parent_category_id } = req.params;
    const {
      page = 1,
      limit = 20,
      country = "",
      state = "",
      city = "",
      search = "",
    } = req.query;

    if (!parent_category_id) {
      return res.status(400).json({
        success: false,
        error: "Parent category ID is required",
      });
    }

    const skip = (page - 1) * limit;

    // First, get all subcategory IDs for this parent category
    const subcategories = await prisma.category.findMany({
      where: {
        parent_category_id: parseInt(parent_category_id),
        is_active: true,
      },
      select: {
        category_id: true,
      },
    });

    const subcategoryIds = subcategories.map((subcat) => subcat.category_id);

    // Include the parent category itself in the search
    const allCategoryIds = [parseInt(parent_category_id), ...subcategoryIds];

    const where = {
      status: "active",
      OR: [
        { category_id: { in: allCategoryIds } },
        { subcategory_id: { in: allCategoryIds } },
      ],
    };

    // Search filter
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { tags: { path: "$", string_contains: search } },
        ],
      });
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
          category: true,
          subcategory: true,
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
        take: parseInt(limit),
      }),
      prisma.serviceListing.count({ where }),
    ]);

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    const formattedListings = listings.map((listing) => ({
      id: listing.listing_id.toString(),
      title: listing.title,
      description: listing.description || "No description available",
      category: listing.category?.category_name || "General",
      subcategory: listing.subcategory?.category_name || null,
      price: listing.min_price ? `₹${listing.min_price}` : "Ask for quote",
      pricing_model: listing.pricing_model,
      service_type: listing.service_type,
      seller: listing.seller.business_name || listing.seller.user.fullname,
      seller_id: listing.seller.seller_id.toString(),
      location: listing.service_cities,
      image:
        listing.listing_media.length > 0
          ? `${BASE_URL}/uploads/${listing.listing_media[0].file_path}`
          : "https://source.unsplash.com/400x300?business",
      rating: listing.seller.overall_rating || 0,
      views: listing.view_count || 0,
      leads: listing.lead_count || 0,
      featured: listing.featured,
      created_at: listing.created_at,
      category_type:
        listing.category_id === parseInt(parent_category_id)
          ? "parent"
          : "subcategory",
    }));

    res.json({
      success: true,
      data: {
        listings: formattedListings,
        parent_category_id,
        subcategories_count: subcategories.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching parent category listings:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
