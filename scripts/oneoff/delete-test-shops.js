const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestShops() {
  try {
    console.log('Finding test shops...');
    
    // Find test shops
    const testShops = await prisma.shop.findMany({
      where: {
        OR: [
          { email: { contains: 'dev-merchant' } },
          { email: { contains: '@ray.local' } },
          { name: { contains: 'Dev' } }
        ]
      }
    });

    console.log(`Found ${testShops.length} test shops:`, testShops.map(s => s.name));

    // Delete related data first
    for (const shop of testShops) {
      console.log(`Deleting shop: ${shop.name} (${shop.id})`);
      
      // Delete in correct order to respect foreign key constraints
      await prisma.orderReturn.deleteMany({ where: { shopId: shop.id } });
      await prisma.orderCourierOffer.deleteMany({ where: { order: { shopId: shop.id } } });
      await prisma.orderItem.deleteMany({ where: { order: { shopId: shop.id } } });
      await prisma.order.deleteMany({ where: { shopId: shop.id } });
      await prisma.product.deleteMany({ where: { shopId: shop.id } });
      await prisma.customer.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopFollower.deleteMany({ where: { shopId: shop.id } });
      await prisma.message.deleteMany({ where: { shopId: shop.id } });
      await prisma.notification.deleteMany({ where: { shopId: shop.id } });
      await prisma.offer.deleteMany({ where: { shopId: shop.id } });
      await prisma.booking.deleteMany({ where: { shopId: shop.id } });
      await prisma.reservation.deleteMany({ where: { shopId: shop.id } });
      await prisma.feedback.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopGallery.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopAnalytics.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopTheme.deleteMany({ where: { shopId: shop.id } });
      await prisma.bookingResource.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopImageHotspot.deleteMany({ where: { map: { shopId: shop.id } } });
      await prisma.shopImageSection.deleteMany({ where: { map: { shopId: shop.id } } });
      await prisma.shopImageMap.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopModuleUpgradeRequest.deleteMany({ where: { shopId: shop.id } });
      await prisma.merchantPushSubscription.deleteMany({ where: { shopId: shop.id } });
      
      // Delete the shop owner user
      if (shop.ownerId) {
        await prisma.courierState.deleteMany({ where: { userId: shop.ownerId } });
        await prisma.notificationPreference.deleteMany({ where: { userId: shop.ownerId } });
        await prisma.accountingInvoice.deleteMany({ where: { createdById: shop.ownerId } });
        await prisma.user.delete({ where: { id: shop.ownerId } });
      }
      
      // Finally delete the shop
      await prisma.shop.delete({ where: { id: shop.id } });
      
      console.log(`✅ Deleted: ${shop.name}`);
    }

    console.log('🎉 All test shops deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting test shops:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestShops();
