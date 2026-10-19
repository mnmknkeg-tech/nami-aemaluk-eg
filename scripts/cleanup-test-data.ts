/**
 * Cleanup script for test shops/products prefixed with TEST-20260315
 * Usage: npx ts-node scripts/cleanup-test-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PREFIX = 'TEST-20260315';

async function cleanup() {
  console.log(`🔍 Searching for test data with prefix: ${TEST_PREFIX}...`);

  try {
    // Find test shops
    const testShops = await prisma.shop.findMany({
      where: {
        OR: [
          { name: { startsWith: TEST_PREFIX } },
          { slug: { startsWith: TEST_PREFIX.toLowerCase() } },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    console.log(`📊 Found ${testShops.length} test shops`);

    if (testShops.length === 0) {
      console.log('✅ No test shops found to clean up');
      return;
    }

    // Show what will be deleted
    console.log('\n📋 Test shops to be deleted:');
    testShops.forEach((shop, i) => {
      console.log(`  ${i + 1}. ${shop.name} (${shop.slug}) - ID: ${shop.id}`);
    });

    // Find products from test shops
    const testProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { startsWith: TEST_PREFIX } },
          { shop: { name: { startsWith: TEST_PREFIX } } },
        ],
      },
      select: { id: true, name: true, shopId: true },
    });

    console.log(`\n📊 Found ${testProducts.length} test products`);

    // Delete in correct order (products first, then shops)
    // This respects foreign key constraints

    // Delete products
    if (testProducts.length > 0) {
      console.log('\n🗑️ Deleting test products...');
      const productResult = await prisma.product.deleteMany({
        where: {
          OR: [
            { name: { startsWith: TEST_PREFIX } },
            { shopId: { in: testShops.map(s => s.id) } },
          ],
        },
      });
      console.log(`  ✅ Deleted ${productResult.count} products`);
    }

    // Delete related records for test shops
    const shopIds = testShops.map(s => s.id);

    // Delete shop gallery
    const galleryResult = await prisma.shopGallery.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${galleryResult.count} gallery images`);

    // Delete shop analytics
    const analyticsResult = await prisma.shopAnalytics.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${analyticsResult.count} analytics records`);

    // Delete shop theme
    const themeResult = await prisma.shopTheme.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${themeResult.count} theme records`);

    // Delete shop image maps
    const mapsResult = await prisma.shopImageMap.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${mapsResult.count} image maps`);

    // Delete shop module upgrade requests
    const moduleResult = await prisma.shopModuleUpgradeRequest.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${moduleResult.count} module requests`);

    // Delete orders for test shops
    const ordersResult = await prisma.order.deleteMany({
      where: { shopId: { in: shopIds } },
    });
    console.log(`  ✅ Deleted ${ordersResult.count} orders`);

    // Finally delete shops
    console.log('\n🗑️ Deleting test shops...');
    const shopResult = await prisma.shop.deleteMany({
      where: {
        OR: [
          { name: { startsWith: TEST_PREFIX } },
          { slug: { startsWith: TEST_PREFIX.toLowerCase() } },
        ],
      },
    });
    console.log(`  ✅ Deleted ${shopResult.count} shops`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Shops deleted: ${shopResult.count}`);
    console.log(`  - Products deleted: ${testProducts.length}`);
    console.log(`  - Related records deleted: ${galleryResult.count + analyticsResult.count + themeResult.count + mapsResult.count + moduleResult.count + ordersResult.count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanup()
  .then(() => {
    console.log('\n👋 Script finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Script failed:', err);
    process.exit(1);
  });
