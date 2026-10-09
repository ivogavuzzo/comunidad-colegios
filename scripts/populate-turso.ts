process.env.TURSO_DATABASE_URL =
  'libsql://comunidad-colegios-igavuzzo.aws-sa-east-1.turso.io';
process.env.TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MDc0NDcsImlkIjoiMDFhMTFlMmEtMTAwMS03MjlmLWExMTktNGVkMDg1MWNiNzYzIiwia2lkIjoicXpWRVl6M1d5S2dIb29SOExjYk5XOG9sUWgxaUpxZy1qbV9TeE1objc4SSIsInJpZCI6IjhkNTYwNGY5LTM4ZTUtNGY2Ny1iZWQyLTExODk5YTEzODUwZiJ9.kUXA5IZ_6FLSCOVYKOW4X7XqhRAty7NInoL9jkiBJssDeeAQBcdja_TJ7iEVFPYnGHciMWQPqyK1x5fUmmdvBA';

async function main() {
  const { prisma } = await import('../src/lib/prisma');
  const { seedTaxonomyAndCriana } = await import('../prisma/seed');
  const { runEtl } = await import('./etl-schools');

  console.log('[TURSO-POPULATE] Iniciando población en Turso...');
  await seedTaxonomyAndCriana();

  console.log('[TURSO-POPULATE] Limpiando colegios previos si existieran...');
  await prisma.school.deleteMany({});

  console.log('[TURSO-POPULATE] Ejecutando ETL de colegios AMBA...');
  await runEtl();

  const schoolCount = await prisma.school.count();
  const categoryCount = await prisma.category.count();
  const subcategoryCount = await prisma.subcategory.count();
  const listingCount = await prisma.listing.count();

  console.log('\n--- RESUMEN EN TURSO ---');
  console.log(`Colegios en Turso: ${schoolCount}`);
  console.log(`Categorías en Turso: ${categoryCount}`);
  console.log(`Subcategorías en Turso: ${subcategoryCount}`);
  console.log(`Listings (Criana incluido): ${listingCount}`);
  console.log('--- TURSO LISTO Y POBLADO ---\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[TURSO-POPULATE] Error:', e);
    process.exit(1);
  });
