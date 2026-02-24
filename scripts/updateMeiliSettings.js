import meiliClient from "../config/meili.js";

async function updateSettings() {
  try {
    const index = meiliClient.index("services");

    console.log("⚙ Updating Meilisearch settings...");

    // 🔎 Filterable attributes
     await index.updateFilterableAttributes([
    "category_id",
    "service_countries",
    "service_states",
    "service_cities",
    "service_type",
    "pricing_model",
    "featured",
    "seller_verification_status",
    "seller_verified",
    "min_price",
    "max_price",
  ]);

  await index.updateSortableAttributes([
    "max_price",
    "min_price",
    "created_at",
    "view_count",
  ]);

  await index.updateSearchableAttributes([
    "title",
    "description",
    "category_name",
    "seller_name",
    "business_description",
    "certifications",
    "tags",
    "service_cities",
    "service_states",
    "service_countries",
    "service_type",
  ]);

    console.log("✅ Meilisearch settings upgraded successfully");
  } catch (error) {
    console.error("❌ Error updating Meili settings:", error);
  }
}

updateSettings();