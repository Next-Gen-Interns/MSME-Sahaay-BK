// scripts/syncServices.js

import meiliClient from "../config/meili.js";
import prisma from "../config/prisma.js";

async function syncServices() {
  try {
    const services = await prisma.serviceListing.findMany({
      where: { status: "active" },
      include: {
        seller: true,
        category: true,
      },
    });

    const formattedServices = services.map((service) => ({
  listing_id: service.listing_id,

  // Core
  title: service.title,
  description: service.description,

  // Pricing
  min_price: service.min_price,
  max_price: service.max_price,
  pricing_model: service.pricing_model,

  // Type
  service_type: service.service_type,

  // Location
  service_cities: service.service_cities || [],
  service_states: service.service_states || [],
  service_countries: service.service_countries || [],

  // Tags
  tags: service.tags || [],

  // Seller info
  seller_name: service.seller?.business_name,
  business_description: service.seller?.business_description,
  certifications: service.seller?.certifications,

  // 👇 IMPORTANT
  seller_verification_status: service.seller?.verification_status,
  seller_verified:
    service.seller?.verification_status === "verified",

  // Category
  category_name: service.category?.category_name,
  category_id: service.category_id,   // 👈 IMPORTANT (for category filter)

  // Ranking
  featured: service.featured,
  view_count: service.view_count,
  created_at: service.created_at,     // 👈 required for newest sort
}));

    // Clear old documents before re-adding
    await meiliClient.index("services").deleteAllDocuments();

    await meiliClient.index("services").addDocuments(formattedServices);

    console.log("✅ Services synced with upgraded fields");
  } catch (error) {
    console.error("❌ Sync failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncServices();