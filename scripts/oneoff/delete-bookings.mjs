import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const idsToDelete = [
  'cmpvw4iz00001v6j88w3cw1vb'
];

async function main() {
  console.log('Deleting bookings:', idsToDelete);
  const res = await prisma.booking.deleteMany({ where: { id: { in: idsToDelete } } });
  console.log('Deleted count:', res.count);

  // show remaining bookings for the shop
  const shopId = 'cmpqw8beb0002v6kg68tiuq5r';
  const remaining = await prisma.booking.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } });
  console.log(`Remaining bookings for shop ${shopId}: ${remaining.length}`);
  remaining.forEach((b) => console.log(` - ${b.id} | ${b.itemName} | ${b.customerName} | ${b.customerPhone} | ${b.startAt}`));
}

main().catch((e)=>{console.error(e); process.exit(1)}).finally(()=>prisma.$disconnect());
