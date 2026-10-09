import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function deepDive() {
  console.log('--- DEEP DIVE & INTEGRITY CHECKS ---');

  // 1. SQLite PRAGMA integrity_check
  const integrity = await prisma.$queryRaw<Array<{ integrity_check: string }>>`PRAGMA integrity_check;`;
  console.log('PRAGMA integrity_check:', integrity);

  // 2. PRAGMA foreign_key_check
  const fkCheck = await prisma.$queryRaw<any[]>`PRAGMA foreign_key_check;`;
  console.log('PRAGMA foreign_key_check:', fkCheck);

  // 3. Database file size
  const stats = fs.statSync('./prisma/dev.db');
  console.log(`dev.db file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 4. Contact coverage
  const withPhone = await prisma.school.count({ where: { telefono: { not: null } } });
  const withMail = await prisma.school.count({ where: { mail: { not: null } } });
  const withCp = await prisma.school.count({ where: { codigoPostal: { not: null } } });
  console.log(`Schools with phone: ${withPhone} (${((withPhone / 11823) * 100).toFixed(1)}%)`);
  console.log(`Schools with mail:  ${withMail} (${((withMail / 11823) * 100).toFixed(1)}%)`);
  console.log(`Schools with CP:    ${withCp} (${((withCp / 11823) * 100).toFixed(1)}%)`);

  // 5. CUE-Anexo suffix distribution
  const mainCampuses = await prisma.school.count({ where: { cueanexo: { endsWith: '00' } } });
  const annexes = 11823 - mainCampuses;
  console.log(`Main campuses (suffix 00): ${mainCampuses}, Annexes (suffix != 00): ${annexes}`);

  // 6. Check Criana listing details
  const criana = await prisma.listing.findUnique({
    where: { id: 'criana-official-featured' },
    include: {
      category: true,
      subcategory: true,
      user: true,
      images: true,
    },
  });
  console.log('Criana listing verification:', {
    id: criana?.id,
    title: criana?.title,
    pinnedPosition: criana?.pinnedPosition,
    isPermanentFeatured: criana?.isPermanentFeatured,
    category: criana?.category.name,
    subcategory: criana?.subcategory.name,
    whatsapp: criana?.whatsapp,
    email: criana?.email,
    webUrl: criana?.webUrl,
    userName: criana?.user.name,
    userRole: criana?.user.role,
    userEmail: criana?.user.email,
    imagesCount: criana?.images.length,
  });

  await prisma.$disconnect();
}

deepDive().catch(console.error);
