// scripts/setupMeili.js
import meiliClient from "../config/meili.js";

async function setup() {
  try {
    await meiliClient.createIndex("services", {
      primaryKey: "listing_id",
    });

    console.log("✅ Services index created");
  } catch (error) {
    console.log("Index may already exist:", error.message);
  }
}

setup();
