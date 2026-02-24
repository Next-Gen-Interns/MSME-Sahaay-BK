import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function run() {
  console.log("🎨 Fixing Category Images...");

  const categories = await prisma.category.findMany();

  for (const category of categories) {
    const randomImageNumber = Math.floor(Math.random() * 11) + 1;

    await prisma.category.update({
      where: { category_id: category.category_id },
      data: {
        image_url: `/uploads/categories/category${randomImageNumber}.jpg`,
      },
    });
  }

  console.log("✅ All categories now use images 1–11 randomly!");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });