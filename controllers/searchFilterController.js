import prisma from "../config/prisma.js";

export const getSearchFilters = async (req, res) => {
  try {
    // 1️⃣ Get categories
    const categoriesRaw = await prisma.category.findMany({
      where: { is_active: true },
      select: {
        category_id: true,
        category_name: true,
      },
      orderBy: {
        category_name: "asc",
      },
    });

    const categoryMap = new Map();

    categoriesRaw.forEach((cat) => {
      if (!categoryMap.has(cat.category_name)) {
        categoryMap.set(cat.category_name, cat);
      }
    });

    const categories = Array.from(categoryMap.values());

    // 2️⃣ Get countries & cities from active listings
    const listings = await prisma.serviceListing.findMany({
      where: { status: "active" },
     select: {
  service_countries: true,
  service_states: true,
  service_cities: true,
}
    });

    const countrySet = new Set();
    const citySet = new Set();
    const stateSet = new Set();

    listings.forEach((listing) => {
      listing.service_countries?.forEach((c) => countrySet.add(c));
      listing.service_cities?.forEach((c) => citySet.add(c));
      listing.service_states?.forEach((s) => stateSet.add(s));
    });

    res.json({
      categories,
      countries: Array.from(countrySet).sort(),
      cities: Array.from(citySet).sort(),
      states: Array.from(stateSet).sort(),
    });
  } catch (error) {
    console.error("Search filter error:", error);
    res.status(500).json({
      message: "Failed to fetch search filters",
    });
  }
};
