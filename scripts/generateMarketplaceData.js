import { PrismaClient } from "../generated/prisma/index.js";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Generating Marketplace Data...");

  const hashedPassword = await bcrypt.hash("123456", 10);

  // ===== Create 10 Categories if not exist =====
  const categories = [];

  for (let i = 0; i < 10; i++) {
    const cat = await prisma.category.create({
      data: {
        category_name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        image_url: `/uploads/categories/category${i}.jpg`,
      },
    });

    categories.push(cat);
  }

  // ===== Create 30 Sellers =====
  const sellers = [];

  for (let i = 0; i < 30; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashedPassword,
        fullname: faker.person.fullName(),
        role: "seller",
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
      },
    });

    const sellerProfile = await prisma.sellerProfile.create({
  data: {
    user_id: user.user_id,
    business_name: faker.company.name(),
    business_description: faker.company.catchPhrase(),
    certifications: faker.helpers.arrayElement([
      "ISO 9001 Certified",
      "MSME Registered",
      "Startup India Recognized",
      "GST Registered",
      "Google Partner",
    ]),
    verification_status: "verified",
    years_in_business: faker.number.int({ min: 1, max: 10 }),
  },
});

    sellers.push(sellerProfile);
  }

  // ===== Create 200 Listings =====
  for (let i = 0; i < 200; i++) {
    const seller = faker.helpers.arrayElement(sellers);
    const category = faker.helpers.arrayElement(categories);

    const listing = await prisma.serviceListing.create({
      data: {
        title: faker.company.buzzPhrase(),
        description: faker.lorem.paragraph(),
        service_type: faker.helpers.arrayElement([
          "one_time",
          "ongoing",
          "consultation",
          "project_based",
        ]),
        pricing_model: faker.helpers.arrayElement([
          "fixed",
          "hourly",
          "daily",
          "custom_quote",
        ]),
        min_price: faker.number.int({ min: 1000, max: 5000 }),
        max_price: faker.number.int({ min: 6000, max: 50000 }),
        estimated_timeline: `${faker.number.int({ min: 5, max: 60 })} days`,
        service_cities: [faker.location.city()],
        service_states: [faker.location.state()],
        service_countries: [faker.location.country()],
        tags: faker.helpers.multiple(() => faker.word.noun(), { count: 3 }),
        status: "active",
        featured: faker.datatype.boolean(),
        view_count: faker.number.int({ min: 0, max: 1000 }),
        seller_id: seller.seller_id,
        category_id: category.category_id,
      },
    });

    // Add image from your demo files
    await prisma.listingMedia.create({
      data: {
        listing_id: listing.listing_id,
        file_path: `/listings/demo${faker.number.int({ min: 1, max: 5 })}.jpg`,
        file_type: "image",
      },
    });
  }

  console.log("✅ Marketplace Data Generated Successfully!");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });