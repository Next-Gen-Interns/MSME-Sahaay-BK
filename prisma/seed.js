// prisma/seed.js
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Seed categories
  await seedCategories();

  // Seed subscription plans
  await seedSubscriptionPlans();

  console.log("✅ All seeds completed successfully!");
}

async function seedCategories() {
  console.log("📁 Seeding categories...");

  const categoriesData = [
    {
      category_id: 1,
      category_name: "Home Services",
      description:
        "This category covers services related to the maintenance, repair, and improvement of residential and commercial properties.",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:29:39.370",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771478979343-705009139.png",
    },
    {
      category_id: 2,
      category_name: "Business & Professional Services",
      description:
        "Services that other businesses (B2B) typically require to operate and grow",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:30:48.777",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479048771-890421974.jpg",
    },
    {
      category_id: 3,
      category_name: "Creative & Design",
      description:
        "Services focused on visual communication, branding, and content creation",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:31:24.258",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479084254-50149603.avif",
    },
    {
      category_id: 4,
      category_name: "Technology & IT",
      description:
        "Specialized technical services for software, infrastructure, and support",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:32:08.052",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479128047-516453674.jpg",
    },
    {
      category_id: 5,
      category_name: "Learning & Education",
      description:
        "Services centered on skill development, tutoring, and personal enrichment",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:32:44.808",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479164800-338966235.png",
    },
    {
      category_id: 6,
      category_name: "Health & Wellness",
      description: "Services aimed at improving physical and mental well-being",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:33:33.454",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479213450-181425808.jpg",
    },
    {
      category_id: 7,
      category_name: "Lifestyle & Personal Care",
      description:
        "Daily tasks and personal errands that improve quality of life.",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:35:39.984",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479339979-331772706.avif",
    },
    {
      category_id: 8,
      category_name: "Automotive Services",
      description:
        "Services related to vehicle maintenance, repair, and enhancement",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:36:29.534",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479389526-281094699.webp",
    },
    {
      category_id: 9,
      category_name: "Specialized & Niche Services",
      description:
        "A catch-all category for unique services that don't fit neatly elsewhere",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:37:10.518",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479430510-326472193.jpg",
    },
    {
      category_id: 10,
      category_name: "Other",
      description: "Other",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:37:43.011",
      parent_category_id: 0,
      image_url: "/uploads/categories/category-1771479463001-806621891.jpg",
    },
    {
      category_id: 11,
      category_name: "Cleaning",
      description: "Professional residential and commercial cleaning services",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:40:53.086",
      parent_category_id: 1,
      image_url: "/uploads/categories/category-1771479653078-64549035.avif",
    },
    {
      category_id: 12,
      category_name: "Repairs & Maintenance",
      description: "Fixing and maintaining home systems and appliances",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:41:41.356",
      parent_category_id: 1,
      image_url: "/uploads/categories/category-1771479701349-701652578.jpg",
    },
    {
      category_id: 13,
      category_name: "Renovation & Remodeling",
      description: "Home improvement and transformation projects\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:42:24.860",
      parent_category_id: 1,
      image_url: "/uploads/categories/category-1771479744784-420257543.webp",
    },
    {
      category_id: 14,
      category_name: "Consulting",
      description: "Expert advice to improve business performance\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:43:06.595",
      parent_category_id: 2,
      image_url: "/uploads/categories/category-1771479786590-449043115.webp",
    },
    {
      category_id: 15,
      category_name: "Accounting & Finance",
      description: "Financial management and tax preparation\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:44:00.626",
      parent_category_id: 2,
      image_url: "/uploads/categories/category-1771479840622-77160959.jpg",
    },
    {
      category_id: 16,
      category_name: "Legal",
      description: "Professional legal counsel and documentation",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:44:43.479",
      parent_category_id: 2,
      image_url: "/uploads/categories/category-1771479883474-317791008.jpg",
    },
    {
      category_id: 17,
      category_name: "Graphic Design",
      description: "Visual branding and creative asset creation\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:45:33.936",
      parent_category_id: 3,
      image_url: "/uploads/categories/category-1771479933929-661554566.avif",
    },
    {
      category_id: 18,
      category_name: "Photography & Videography",
      description: "Professional image and video capture",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:46:11.581",
      parent_category_id: 3,
      image_url: "/uploads/categories/category-1771479971576-100261913.webp",
    },
    {
      category_id: 20,
      category_name: "Writing & Translation",
      description: "Content creation and language services",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:48:25.132",
      parent_category_id: 3,
      image_url: "/uploads/categories/category-1771480105125-638667593.jpg",
    },
    {
      category_id: 21,
      category_name: "Software Development",
      description: "Custom application and software building",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:49:01.038",
      parent_category_id: 4,
      image_url: "/uploads/categories/category-1771480141034-934355603.jpg",
    },
    {
      category_id: 22,
      category_name: "IT Support & Networking",
      description: "Technical infrastructure and assistance",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:49:54.492",
      parent_category_id: 4,
      image_url: "/uploads/categories/category-1771480194482-901825031.jpg",
    },
    {
      category_id: 23,
      category_name: "Data & AI",
      description: "Data analysis and artificial intelligence solutions",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:50:25.168",
      parent_category_id: 4,
      image_url: "/uploads/categories/category-1771480225161-238836790.webp",
    },
    {
      category_id: 24,
      category_name: "Cybersecurity",
      description: "Protection against digital threats",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:51:00.488",
      parent_category_id: 4,
      image_url: "/uploads/categories/category-1771480260480-678173597.jpg",
    },
    {
      category_id: 25,
      category_name: "Cloud Services",
      description: "Cloud computing and storage solutions",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:51:41.430",
      parent_category_id: 4,
      image_url: "/uploads/categories/category-1771480301426-144790734.png",
    },
    {
      category_id: 26,
      category_name: "Tutoring & Academic Support",
      description: "One-on-one academic assistance",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:52:28.100",
      parent_category_id: 5,
      image_url: "/uploads/categories/category-1771480348092-641582152.jpg",
    },
    {
      category_id: 27,
      category_name: "Professional Development",
      description: "Career advancement training",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:54:40.105",
      parent_category_id: 5,
      image_url: "/uploads/categories/category-1771480480077-492440343.jpg",
    },
    {
      category_id: 28,
      category_name: "Music & Arts Classes",
      description: "Creative skill development lessons\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:55:48.754",
      parent_category_id: 5,
      image_url: "/uploads/categories/category-1771480548750-578348315.png",
    },
    {
      category_id: 29,
      category_name: "Fitness Training",
      description: "Personal exercise and workout guidance",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:56:37.385",
      parent_category_id: 6,
      image_url: "/uploads/categories/category-1771480597371-767640016.avif",
    },
    {
      category_id: 30,
      category_name: "Mental Health",
      description: "Emotional and psychological support",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:58:49.535",
      parent_category_id: 6,
      image_url: "/uploads/categories/category-1771480729527-369022615.webp",
    },
    {
      category_id: 31,
      category_name: "Alternative Medicine",
      description: "Non-traditional healing practices",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 05:59:34.021",
      parent_category_id: 6,
      image_url: "/uploads/categories/category-1771480774011-222576932.jpg",
    },
    {
      category_id: 32,
      category_name: "Event Services",
      description: "Planning and executing special occasions",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:01:02.596",
      parent_category_id: 7,
      image_url: "/uploads/categories/category-1771480862560-39725116.jpeg",
    },
    {
      category_id: 33,
      category_name: "Personal Assistance",
      description: "Help with daily tasks and errands\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:01:47.672",
      parent_category_id: 7,
      image_url: "/uploads/categories/category-1771480907668-205558065.png",
    },
    {
      category_id: 34,
      category_name: "Pet Services",
      description: "Care and support for animal companions",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:02:35.261",
      parent_category_id: 7,
      image_url: "/uploads/categories/category-1771480955255-970387671.jpg",
    },
    {
      category_id: 35,
      category_name: "Detailing & Cleaning",
      description: "Thorough car cleaning and restoration",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:03:18.715",
      parent_category_id: 8,
      image_url: "/uploads/categories/category-1771480998700-812057616.webp",
    },
    {
      category_id: 36,
      category_name: "Specialized Services",
      description: "Custom auto enhancements and specialty work\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:04:05.104",
      parent_category_id: 8,
      image_url: "/uploads/categories/category-1771481045099-274534398.webp",
    },
    {
      category_id: 37,
      category_name: "Repair & Maintenance",
      description: "Vehicle upkeep and problem fixing\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:05:11.322",
      parent_category_id: 8,
      image_url: "/uploads/categories/category-1771481111312-830344840.jpg",
    },
    {
      category_id: 38,
      category_name: "Spiritual & Religious",
      description: "Guidance and services for spiritual needs",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:06:11.775",
      parent_category_id: 9,
      image_url: "/uploads/categories/category-1771481171771-298092469.jpg",
    },
    {
      category_id: 39,
      category_name: "Rare Trades",
      description: "Unique and hard-to-find specialized skills\r\n\r\n",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:07:17.845",
      parent_category_id: 9,
      image_url: "/uploads/categories/category-1771481237839-794534603.jpg",
    },
    {
      category_id: 40,
      category_name: "N/A",
      description: "No Required Category Found!",
      icon: "",
      sort_order: 0,
      is_active: 1,
      created_at: "2026-02-19 06:09:02.740",
      parent_category_id: 10,
      image_url: "/uploads/categories/category-1771481342721-8061471.png",
    },
  ];

  await prisma.category.deleteMany();

  const parentMap = {};

  // Insert parent categories
  for (const cat of categoriesData.filter((c) => c.parent_category_id === 0)) {
    const created = await prisma.category.create({
      data: {
        category_name: cat.category_name,
        description: cat.description,
        image_url: cat.image_url,
        icon: cat.icon || null,
        sort_order: cat.sort_order,
        is_active: Boolean(cat.is_active),
        parent_category_id: null,
      },
    });

    parentMap[cat.category_id] = created.category_id;
  }

  // Insert child categories
  for (const cat of categoriesData.filter((c) => c.parent_category_id !== 0)) {
    await prisma.category.create({
      data: {
        category_name: cat.category_name,
        description: cat.description,
        image_url: cat.image_url,
        icon: cat.icon || null,
        sort_order: cat.sort_order,
        is_active: Boolean(cat.is_active),
        parent_category_id: parentMap[cat.parent_category_id] || null,
      },
    });
  }

  console.log("✅ Categories seeded successfully!");
}

async function seedSubscriptionPlans() {
  console.log("💳 Seeding Default Seller Subscription Plans...");

  // Optional: delete existing plans (use only in dev)
  await prisma.subscriptionPlan.deleteMany();

  const plans = [
    {
      name: "Free Seller",
      description: "Basic plan for new sellers",
      price: 0,
      currency: "INR",
      billing_cycle: "monthly",
      plan_type: "seller",
      features: {
        analytics_access: false,
        premium_support: false,
      },
      limits: {
        service_listings: 2,
        featured_listings: 0,
        lead_access: 5,
      },
      is_active: true,
      sort_order: 1,
    },
    {
      name: "Starter Seller",
      description: "Best for small growing businesses",
      price: 999,
      currency: "INR",
      billing_cycle: "monthly",
      plan_type: "seller",
      features: {
        analytics_access: true,
        premium_support: false,
      },
      limits: {
        service_listings: 10,
        featured_listings: 1,
        lead_access: 50,
      },
      is_active: true,
      sort_order: 2,
    },
    {
      name: "Growth Seller",
      description: "Scale your business",
      price: 2499,
      currency: "INR",
      billing_cycle: "monthly",
      plan_type: "seller",
      features: {
        analytics_access: true,
        premium_support: true,
      },
      limits: {
        service_listings: 50,
        featured_listings: 5,
        lead_access: -1,
      },
      is_active: true,
      sort_order: 3,
    },
  ];

  await prisma.subscriptionPlan.createMany({
    data: plans,
  });

  console.log("✅ Default Seller Plans Seeded Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    0;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
