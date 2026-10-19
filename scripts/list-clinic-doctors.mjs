import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({ select: { id: true, name: true, pageDesign: true } });
  for (const s of shops) {
    const pd = s.pageDesign || {};
    const docs = Array.isArray(pd.clinicDoctorsList) ? pd.clinicDoctorsList : [];
    if (docs.length > 0) {
      console.log(`SHOP: ${s.id} - ${s.name}`);
      docs.forEach((d, i) => {
        console.log(`  [${i}] ${JSON.stringify(d)}`);
      });
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
