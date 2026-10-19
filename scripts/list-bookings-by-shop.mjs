import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({ select: { id: true, name: true } });
  for (const s of shops) {
    const count = await prisma.booking.count({ where: { shopId: s.id } });
    if (count === 0) continue;
    console.log(`SHOP: ${s.id} - ${s.name} => ${count} bookings`);
    const items = await prisma.booking.findMany({ where: { shopId: s.id }, take: 5, orderBy: { createdAt: 'desc' } });
    items.forEach((b) => {
      console.log(`  - ${b.id} | ${b.itemName} | ${b.customerName} | ${b.customerPhone} | ${b.startAt}`);
    });
  }
}

main().catch((e)=>{console.error(e); process.exit(1)}).finally(()=>prisma.$disconnect());
