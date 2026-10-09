import { prisma } from '../src/lib/prisma';
import { GET as getSchoolsRoute } from '../src/app/api/schools/route';
import { GET as getListingsRoute } from '../src/app/api/listings/route';
import { NextRequest } from 'next/server';

async function main() {
  console.log('=== EMPIRICAL PROBE FOR M2 API ENDPOINTS ===');

  // 1. Check CABA Comunas in DB
  const cabaDeptos = await prisma.school.groupBy({
    by: ['departamento'],
    where: { jurisdiccion: 'CABA' },
  });
  const cabaList = cabaDeptos.map(d => d.departamento).sort();
  console.log('\n--- 1. CABA Comunas in DB ---');
  console.log(`Count: ${cabaList.length}`);
  console.log('List:', cabaList);

  // 2. Check GBA Partidos in DB
  const gbaDeptos = await prisma.school.groupBy({
    by: ['departamento'],
    where: { jurisdiccion: 'GBA' },
  });
  const gbaList = gbaDeptos.map(d => d.departamento).sort();
  console.log('\n--- 2. GBA Partidos in DB ---');
  console.log(`Count: ${gbaList.length}`);
  console.log('List:', gbaList);

  // 3. Test /api/schools with mode=departamentos
  const reqCabaDeptos = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=CABA&mode=departamentos');
  const resCabaDeptos = await getSchoolsRoute(reqCabaDeptos);
  const jsonCabaDeptos = await resCabaDeptos.json();
  console.log('\n--- 3. /api/schools?jurisdiccion=CABA&mode=departamentos ---');
  console.log('Status:', resCabaDeptos.status, 'Count:', jsonCabaDeptos.length);

  const reqGbaDeptos = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=GBA&mode=departamentos');
  const resGbaDeptos = await getSchoolsRoute(reqGbaDeptos);
  const jsonGbaDeptos = await resGbaDeptos.json();
  console.log('\n--- 4. /api/schools?jurisdiccion=GBA&mode=departamentos ---');
  console.log('Status:', resGbaDeptos.status, 'Count:', jsonGbaDeptos.length);

  // 5. Test cascading schools per Comuna 1..15 and per 24 Partidos
  console.log('\n--- 5. Cascading query per Comuna 1..15 ---');
  for (let i = 1; i <= 15; i++) {
    const comuna = `Comuna ${i}`;
    const req = new NextRequest(`http://localhost:3000/api/schools?jurisdiccion=CABA&departamento=${encodeURIComponent(comuna)}`);
    const res = await getSchoolsRoute(req);
    const schools = await res.json();
    console.log(`CABA -> ${comuna}: ${schools.length} schools (status: ${res.status})`);
  }

  console.log('\n--- 6. Cascading query per GBA 24 Partidos ---');
  for (const p of gbaList) {
    const req = new NextRequest(`http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=${encodeURIComponent(p)}`);
    const res = await getSchoolsRoute(req);
    const schools = await res.json();
    console.log(`GBA -> ${p}: ${schools.length} schools (status: ${res.status})`);
  }

  console.log('\n--- 6b. Accented vs Unaccented Departamento queries ---');
  const deptoVariants = [
    { canonical: 'Moron', variant: 'Morón' },
    { canonical: 'Jose C. Paz', variant: 'José C. Paz' },
    { canonical: 'Lanus', variant: 'Lanús' },
    { canonical: 'Vicente Lopez', variant: 'Vicente López' },
    { canonical: 'General San Martin', variant: 'General San Martín' },
    { canonical: 'Ituzaingo', variant: 'Ituzaingó' },
    { canonical: 'Esteban Echeverria', variant: 'Esteban Echeverría' },
    { canonical: 'Moron', variant: 'moron' },
  ];

  for (const v of deptoVariants) {
    const resCanon = await getSchoolsRoute(new NextRequest(`http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=${encodeURIComponent(v.canonical)}`));
    const jsonCanon = await resCanon.json();
    const resVar = await getSchoolsRoute(new NextRequest(`http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=${encodeURIComponent(v.variant)}`));
    const jsonVar = await resVar.json();
    console.log(`Depto [${v.canonical}] (${jsonCanon.length} schools) vs [${v.variant}] (${jsonVar.length} schools)`);
  }

  // 7. Test Diacritics & Accents Search
  console.log('\n--- 7. Diacritics & Accents Search Tests ---');

  // Check how many schools have 'Martín' vs 'Martin' in their official name
  const allMartin = await prisma.school.findMany({
    where: {
      OR: [
        { nombre: { contains: 'Martín' } },
        { nombre: { contains: 'Martin' } },
      ],
    },
    select: { id: true, nombre: true },
  });

  const withAccMartin = allMartin.filter(s => s.nombre.includes('Martín'));
  const withoutAccMartin = allMartin.filter(s => s.nombre.includes('Martin') && !s.nombre.includes('Martín'));
  console.log(`Total Martin schools in DB: ${allMartin.length}`);
  console.log(` - With accent (Martín): ${withAccMartin.length}`);
  console.log(` - Without accent (Martin): ${withoutAccMartin.length}`);

  // Querying with 'San Martín' via API
  const resSanMartinAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=San%20Mart%C3%ADn'));
  const listSanMartinAcc = await resSanMartinAcc.json();

  // Querying with 'San Martin' via API
  const resSanMartinNoAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=San%20Martin'));
  const listSanMartinNoAcc = await resSanMartinNoAcc.json();

  console.log(`API ?q=San Martín: returned ${listSanMartinAcc.length}`);
  console.log(`API ?q=San Martin: returned ${listSanMartinNoAcc.length}`);

  // Check overlap
  const accIds = new Set(listSanMartinAcc.map((s: any) => s.id));
  const noAccIds = new Set(listSanMartinNoAcc.map((s: any) => s.id));
  const intersection = listSanMartinAcc.filter((s: any) => noAccIds.has(s.id));
  console.log(`Intersection between ?q=San Martín and ?q=San Martin: ${intersection.length}`);
  if (intersection.length === 0) {
    console.log('NOTICE: In SQLite, "Martín" and "Martin" do NOT match each other! They return disjoint sets!');
  }

  // Check Peña vs Pena
  const allPena = await prisma.school.findMany({
    where: {
      OR: [
        { nombre: { contains: 'Peña' } },
        { nombre: { contains: 'Pena' } },
      ],
    },
    select: { id: true, nombre: true },
  });
  console.log(`Total Peña/Pena in DB: ${allPena.length}`);
  console.log(` - Containing 'Peña': ${allPena.filter(s => s.nombre.includes('Peña')).length}`);
  console.log(` - Containing 'Pena' (excluding Peña): ${allPena.filter(s => s.nombre.includes('Pena') && !s.nombre.includes('Peña')).length}`);

  const resPenaAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=Pe%C3%B1a'));
  const listPenaAcc = await resPenaAcc.json();
  const resPenaNoAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=Pena'));
  const listPenaNoAcc = await resPenaNoAcc.json();
  console.log(`API ?q=Peña: ${listPenaAcc.length} results`);
  console.log(`API ?q=Pena: ${listPenaNoAcc.length} results`);

  // Check José vs Jose
  const allJose = await prisma.school.findMany({
    where: {
      OR: [
        { nombre: { contains: 'José' } },
        { nombre: { contains: 'Jose' } },
      ],
    },
    select: { id: true, nombre: true },
  });
  console.log(`Total José/Jose in DB: ${allJose.length}`);
  console.log(` - Containing 'José': ${allJose.filter(s => s.nombre.includes('José')).length}`);
  console.log(` - Containing 'Jose' (excluding José): ${allJose.filter(s => s.nombre.includes('Jose') && !s.nombre.includes('José')).length}`);

  const resJoseAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=Jos%C3%A9'));
  const listJoseAcc = await resJoseAcc.json();
  const resJoseNoAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=Jose'));
  const listJoseNoAcc = await resJoseNoAcc.json();
  console.log(`API ?q=José: ${listJoseAcc.length} results`);
  console.log(`API ?q=Jose: ${listJoseNoAcc.length} results`);
  // Check case sensitivity with accented letters in SQLite
  console.log('\n--- Accent Case Sensitivity in SQLite ---');
  const countTitleMartin = await prisma.school.count({ where: { nombre: { contains: 'San Martín' } } });
  const countLowerMartin = await prisma.school.count({ where: { nombre: { contains: 'san martín' } } });
  console.log(`San Martín (Title): ${countTitleMartin} vs san martín (lowercase): ${countLowerMartin}`);

  const countTitleJose = await prisma.school.count({ where: { nombre: { contains: 'José' } } });
  const countLowerJose = await prisma.school.count({ where: { nombre: { contains: 'josé' } } });
  console.log(`José (Title): ${countTitleJose} vs josé (lowercase): ${countLowerJose}`);

  const countTitlePena = await prisma.school.count({ where: { nombre: { contains: 'Peña' } } });
  const countLowerPena = await prisma.school.count({ where: { nombre: { contains: 'peña' } } });
  console.log(`Peña (Title): ${countTitlePena} vs peña (lowercase): ${countLowerPena}`);

  // 8. Test Criana profile pinning in /api/listings
  console.log('\n--- 8. Criana Profile Pinning in /api/listings ---');
  const catChildcare = await prisma.category.findUnique({ where: { slug: 'cuidado-infantil' }, include: { subcategories: true } });
  console.log('Cuidado Infantil Category ID:', catChildcare?.id);

  // Case A: Query by slug
  const reqCatSlug = new NextRequest('http://localhost:3000/api/listings?categoryId=cuidado-infantil');
  const resCatSlug = await getListingsRoute(reqCatSlug);
  const listingsCatSlug = await resCatSlug.json();
  console.log('Listings by slug (cuidado-infantil): Count =', listingsCatSlug.length);
  if (listingsCatSlug.length > 0) {
    console.log('Item 0 ID:', listingsCatSlug[0].id, 'Title:', listingsCatSlug[0].title);
  }

  // Case B: Query by subcategory in Cuidado Infantil (not Criana's primary subcategory)
  const otherSub = catChildcare?.subcategories.find(s => s.slug !== 'nineras-babysitters');
  if (otherSub) {
    const reqSub = new NextRequest(`http://localhost:3000/api/listings?categoryId=cuidado-infantil&subcategoryId=${otherSub.slug}`);
    const resSub = await getListingsRoute(reqSub);
    const listingsSub = await resSub.json();
    console.log(`Listings by other subcategory (${otherSub.slug}): Count = ${listingsSub.length}`);
    if (listingsSub.length > 0) {
      console.log('Item 0 ID:', listingsSub[0].id, 'Title:', listingsSub[0].title);
    }
  }

  // Case C: Query by schoolId in Cuidado Infantil
  const aSchool = await prisma.school.findFirst();
  if (aSchool) {
    const reqSchool = new NextRequest(`http://localhost:3000/api/listings?categoryId=cuidado-infantil&schoolId=${aSchool.id}`);
    const resSchool = await getListingsRoute(reqSchool);
    const listingsSchool = await resSchool.json();
    console.log(`Listings by schoolId (${aSchool.id}): Count = ${listingsSchool.length}`);
    if (listingsSchool.length > 0) {
      console.log('Item 0 ID:', listingsSchool[0].id, 'Title:', listingsSchool[0].title);
    }
  }

  // Case D: Query without category (all listings)
  const reqAll = new NextRequest('http://localhost:3000/api/listings');
  const resAll = await getListingsRoute(reqAll);
  const listingsAll = await resAll.json();
  console.log('All Listings: Count =', listingsAll.length);
  if (listingsAll.length > 0) {
    console.log('Item 0 ID:', listingsAll[0].id, 'Title:', listingsAll[0].title);
  }

  // Case E: Other categories (e.g., apoyo-escolar)
  const reqOther = new NextRequest('http://localhost:3000/api/listings?categoryId=apoyo-escolar');
  const resOther = await getListingsRoute(reqOther);
  const listingsOther = await resOther.json();
  console.log('Listings for apoyo-escolar: Count =', listingsOther.length);
  const crianaInOther = listingsOther.find((l: any) => l.id === 'criana-official-featured');
  console.log('Criana in apoyo-escolar?', !!crianaInOther);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
