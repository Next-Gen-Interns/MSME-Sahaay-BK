import meiliClient from "../config/meili.js";

async function updateSettings() {
  await meiliClient.index("services").updateSettings({
    searchableAttributes: [
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
      "service_type"
    ],
    sortableAttributes: [
      "view_count",
      "min_price",
      "max_price"
    ]
  });

  console.log("✅ Meilisearch settings upgraded");
}

updateSettings();