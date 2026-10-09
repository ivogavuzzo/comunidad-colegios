import { prisma } from '../src/lib/prisma';

export interface CheckResult {
  name: string;
  category: 'COUNTS' | 'GEOGRAPHY' | 'EXCLUSIONS' | 'INTEGRITY' | 'TAXONOMY' | 'CRIANA' | 'PERFORMANCE';
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const GBA_OFFICIAL_24 = [
  'ALMIRANTE BROWN',
  'AVELLANEDA',
  'BERAZATEGUI',
  'ESTEBAN ECHEVERRIA',
  'EZEIZA',
  'FLORENCIO VARELA',
  'GENERAL SAN MARTIN',
  'HURLINGHAM',
  'ITUZAINGO',
  'JOSE C. PAZ',
  'LA MATANZA',
  'LANUS',
  'LOMAS DE ZAMORA',
  'MALVINAS ARGENTINAS',
  'MERLO',
  'MORENO',
  'MORON',
  'QUILMES',
  'SAN FERNANDO',
  'SAN ISIDRO',
  'SAN MIGUEL',
  'TIGRE',
  'TRES DE FEBRERO',
  'VICENTE LOPEZ',
];

async function runAdversarialOracle() {
  console.log('='.repeat(80));
  console.log('CHALLENGER 1 — INDEPENDENT EMPIRICAL ORACLE & ADVERSARIAL STRESS TEST');
  console.log('Target Database: prisma/dev.db');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(80));

  const results: CheckResult[] = [];

  function record(result: CheckResult) {
    results.push(result);
    const badge = result.passed ? '[\x1b[32mPASS\x1b[0m]' : '[\x1b[31mFAIL\x1b[0m]';
    console.log(`${badge} ${result.name}`);
    if (!result.passed || result.details) {
      console.log(`       Expected: ${JSON.stringify(result.expected)}`);
      console.log(`       Actual:   ${JSON.stringify(result.actual)}`);
      if (result.details) console.log(`       Details:  ${result.details}`);
    }
  }

  try {
    await prisma.$connect();

    // ==========================================
    // 1. TOTAL SCHOOL COUNTS
    // ==========================================
    console.log('\n--- [1] TOTAL & JURISDICTION COUNTS ---');
    const totalSchools = await prisma.school.count();
    record({
      name: 'Total school count in SQLite is exactly 11,823',
      category: 'COUNTS',
      passed: totalSchools === 11823,
      expected: 11823,
      actual: totalSchools,
    });

    const cabaCount = await prisma.school.count({ where: { jurisdiccion: 'CABA' } });
    record({
      name: 'CABA school count is exactly 2,749',
      category: 'COUNTS',
      passed: cabaCount === 2749,
      expected: 2749,
      actual: cabaCount,
    });

    const gbaCount = await prisma.school.count({ where: { jurisdiccion: 'GBA' } });
    record({
      name: 'GBA school count is exactly 9,074',
      category: 'COUNTS',
      passed: gbaCount === 9074,
      expected: 9074,
      actual: gbaCount,
    });

    record({
      name: 'Sum of CABA + GBA equals total schools',
      category: 'COUNTS',
      passed: cabaCount + gbaCount === totalSchools,
      expected: 11823,
      actual: cabaCount + gbaCount,
    });

    const nonAmbaJurisdictions = await prisma.school.count({
      where: { jurisdiccion: { notIn: ['CABA', 'GBA'] } },
    });
    record({
      name: 'Zero records with unknown or non-AMBA jurisdiccion',
      category: 'COUNTS',
      passed: nonAmbaJurisdictions === 0,
      expected: 0,
      actual: nonAmbaJurisdictions,
    });

    // ==========================================
    // 2. CABA COMUNAS DISTRIBUTION
    // ==========================================
    console.log('\n--- [2] CABA COMUNAS BREAKDOWN ---');
    const cabaComunas = await prisma.school.groupBy({
      by: ['departamento'],
      where: { jurisdiccion: 'CABA' },
      _count: { id: true },
    });

    record({
      name: 'CABA has exactly 15 comunas',
      category: 'GEOGRAPHY',
      passed: cabaComunas.length === 15,
      expected: 15,
      actual: cabaComunas.length,
    });

    const comunaMap = new Map<string, number>();
    for (const c of cabaComunas) comunaMap.set(c.departamento, c._count.id);

    let all15Present = true;
    const missingComunas: string[] = [];
    const comunaCounts: Record<string, number> = {};
    for (let i = 1; i <= 15; i++) {
      const key = `Comuna ${i}`;
      if (!comunaMap.has(key) || (comunaMap.get(key) || 0) <= 0) {
        all15Present = false;
        missingComunas.push(key);
      }
      comunaCounts[key] = comunaMap.get(key) || 0;
    }

    record({
      name: 'All 15 CABA comunas (Comuna 1..15) populated with schools > 0',
      category: 'GEOGRAPHY',
      passed: all15Present,
      expected: 'Comuna 1 through Comuna 15 present',
      actual: all15Present ? 'All 15 present' : `Missing: ${missingComunas.join(', ')}`,
      details: JSON.stringify(comunaCounts),
    });

    // Check CABA CUE prefixes: In Argentina, CABA CUEs always start with 02
    const cabaNon02Cue = await prisma.school.count({
      where: {
        jurisdiccion: 'CABA',
        NOT: { cueanexo: { startsWith: '02' } },
      },
    });
    record({
      name: 'All CABA schools have official CABA CUE-prefix (02xxxxxxx)',
      category: 'GEOGRAPHY',
      passed: cabaNon02Cue === 0,
      expected: 0,
      actual: cabaNon02Cue,
    });

    // ==========================================
    // 3. GBA 24 PARTIDOS DISTRIBUTION
    // ==========================================
    console.log('\n--- [3] GBA 24 OFFICIAL PARTIDOS BREAKDOWN ---');
    const gbaPartidos = await prisma.school.groupBy({
      by: ['departamento'],
      where: { jurisdiccion: 'GBA' },
      _count: { id: true },
    });

    record({
      name: 'GBA has exactly 24 distinct official partidos',
      category: 'GEOGRAPHY',
      passed: gbaPartidos.length === 24,
      expected: 24,
      actual: gbaPartidos.length,
    });

    const dbPartidosUpperMap = new Map<string, number>();
    for (const p of gbaPartidos) {
      dbPartidosUpperMap.set(p.departamento.toUpperCase(), p._count.id);
    }

    const missingGba: string[] = [];
    const partidoCounts: Record<string, number> = {};
    for (const partido of GBA_OFFICIAL_24) {
      const count = dbPartidosUpperMap.get(partido) || 0;
      partidoCounts[partido] = count;
      if (count === 0) missingGba.push(partido);
    }

    record({
      name: 'Every single one of the 24 official GBA Partidos is present and populated',
      category: 'GEOGRAPHY',
      passed: missingGba.length === 0,
      expected: 'All 24 present',
      actual: missingGba.length === 0 ? 'All 24 present' : `Missing: ${missingGba.join(', ')}`,
    });

    // Check GBA CUE prefixes: In Argentina, PBA CUEs always start with 06
    const gbaNon06Cue = await prisma.school.count({
      where: {
        jurisdiccion: 'GBA',
        NOT: { cueanexo: { startsWith: '06' } },
      },
    });
    record({
      name: 'All GBA schools have official Buenos Aires Province CUE-prefix (06xxxxxxx)',
      category: 'GEOGRAPHY',
      passed: gbaNon06Cue === 0,
      expected: 0,
      actual: gbaNon06Cue,
    });

    // ==========================================
    // 4. EXCLUSIONS VERIFICATION (LA PLATA & OTHER PROVINCES)
    // ==========================================
    console.log('\n--- [4] EXCLUSIONS VERIFICATION ---');

    // La Plata checks
    const laPlataByDept = await prisma.school.count({
      where: {
        OR: [
          { departamento: { contains: 'Plata' } },
          { departamento: { contains: 'PLATA' } },
        ],
      },
    });
    record({
      name: 'Zero schools with departamento containing "Plata"',
      category: 'EXCLUSIONS',
      passed: laPlataByDept === 0,
      expected: 0,
      actual: laPlataByDept,
    });

    const laPlataByLoc = await prisma.school.count({
      where: {
        OR: [
          { localidad: { contains: 'La Plata' } },
          { localidad: { contains: 'LA PLATA' } },
        ],
      },
    });
    record({
      name: 'Zero schools with localidad containing "La Plata"',
      category: 'EXCLUSIONS',
      passed: laPlataByLoc === 0,
      expected: 0,
      actual: laPlataByLoc,
    });

    // La Plata CUE prefix in DINIECE is 06441 or 060441 / code 441
    const laPlataCue = await prisma.school.count({
      where: { cueanexo: { startsWith: '06441' } },
    });
    record({
      name: 'Zero schools with La Plata CUE prefix (06441)',
      category: 'EXCLUSIONS',
      passed: laPlataCue === 0,
      expected: 0,
      actual: laPlataCue,
    });

    // Other provinces CUE prefixes (all provinces other than 02 CABA and 06 PBA)
    const otherProvincePrefixes = [
      '10', '14', '18', '22', '26', '30', '34', '38', '42', '46',
      '50', '54', '58', '62', '66', '70', '74', '78', '82', '86', '90', '94'
    ];
    let otherProvinceCount = 0;
    for (const prefix of otherProvincePrefixes) {
      const c = await prisma.school.count({
        where: { cueanexo: { startsWith: prefix } },
      });
      otherProvinceCount += c;
    }
    record({
      name: 'Zero schools with non-AMBA provincial CUE prefixes (Chaco, Córdoba, etc.)',
      category: 'EXCLUSIONS',
      passed: otherProvinceCount === 0,
      expected: 0,
      actual: otherProvinceCount,
    });

    // Specific check for interior provinces by name
    const interiorNames = ['Cordoba', 'Córdoba', 'Rosario', 'Santa Fe', 'Mendoza', 'Chaco', 'Santiago del Estero', 'Salta', 'Tucuman', 'Tucumán'];
    let interiorFound = 0;
    for (const name of interiorNames) {
      const c = await prisma.school.count({
        where: {
          OR: [
            { departamento: { contains: name } },
            { localidad: { contains: name } },
          ],
        },
      });
      interiorFound += c;
    }
    record({
      name: 'Zero schools with interior province names in departamento or localidad',
      category: 'EXCLUSIONS',
      passed: interiorFound === 0,
      expected: 0,
      actual: interiorFound,
    });

    // Extended non-GBA interior PBA partidos check (e.g. Berisso, Ensenada, Pilar, Escobar, Lujan, etc.)
    const excludedPbaPartidos = [
      'BERISSO', 'ENSENADA', 'PILAR', 'ESCOBAR', 'LUJAN', 'GENERAL RODRIGUEZ',
      'MARCOS PAZ', 'CANUELAS', 'CAÑUELAS', 'SAN VICENTE', 'BRANDSEN', 'CAMPANA', 'ZARATE'
    ];
    let excludedPbaCount = 0;
    for (const p of excludedPbaPartidos) {
      const c = await prisma.school.count({
        where: {
          departamento: {
            contains: p,
          },
        },
      });
      excludedPbaCount += c;
    }
    record({
      name: 'Zero schools from extended PBA non-GBA-24 partidos (Berisso, Pilar, Escobar, Luján, etc.)',
      category: 'EXCLUSIONS',
      passed: excludedPbaCount === 0,
      expected: 0,
      actual: excludedPbaCount,
    });

    // ==========================================
    // 5. CUEANEXO FORMAT & UNIQUENESS
    // ==========================================
    console.log('\n--- [5] CUEANEXO INTEGRITY & UNIQUENESS ---');
    const distinctCueanexo = await prisma.school.groupBy({
      by: ['cueanexo'],
    });

    record({
      name: 'Every single cueanexo is strictly unique (distinct count == total count)',
      category: 'INTEGRITY',
      passed: distinctCueanexo.length === totalSchools,
      expected: totalSchools,
      actual: distinctCueanexo.length,
    });

    // Test format of all CUE-Anexo: must be 9 digits
    const invalidCue = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM School WHERE length(cueanexo) != 9 OR cueanexo GLOB '*[^0-9]*';
    `;
    const invalidCueCount = Number(invalidCue[0]?.count || 0);
    record({
      name: 'All 11,823 cueanexo follow strict 9-digit numeric format',
      category: 'INTEGRITY',
      passed: invalidCueCount === 0,
      expected: 0,
      actual: invalidCueCount,
    });

    // ==========================================
    // 6. REQUIRED FIELDS & DATA HYGIENE
    // ==========================================
    console.log('\n--- [6] DATA HYGIENE & NORMALIZATION ---');
    const blankNames = await prisma.school.count({
      where: { OR: [{ nombre: '' }, { nombre: ' ' }] },
    });
    record({
      name: 'Zero schools with empty or whitespace-only name',
      category: 'INTEGRITY',
      passed: blankNames === 0,
      expected: 0,
      actual: blankNames,
    });

    const blankDomicilio = await prisma.school.count({
      where: { OR: [{ domicilio: '' }, { domicilio: ' ' }] },
    });
    record({
      name: 'Zero schools with empty domicilio',
      category: 'INTEGRITY',
      passed: blankDomicilio === 0,
      expected: 0,
      actual: blankDomicilio,
    });

    const sentinelPhones = await prisma.school.count({
      where: {
        OR: [
          { telefono: { contains: 'S/D' } },
          { telefono: { contains: 'N/D' } },
        ],
      },
    });
    record({
      name: 'Zero schools with uncleaned phone sentinels ("S/D", "N/D")',
      category: 'INTEGRITY',
      passed: sentinelPhones === 0,
      expected: 0,
      actual: sentinelPhones,
    });

    const sentinelEmails = await prisma.school.count({
      where: {
        OR: [
          { mail: { contains: 'S/D' } },
          { mail: { contains: 'N/D' } },
        ],
      },
    });
    record({
      name: 'Zero schools with uncleaned mail sentinels ("S/D", "N/D")',
      category: 'INTEGRITY',
      passed: sentinelEmails === 0,
      expected: 0,
      actual: sentinelEmails,
    });

    const badChars = await prisma.school.count({
      where: {
        OR: [
          { nombre: { contains: '\uFFFD' } },
          { domicilio: { contains: '\uFFFD' } },
          { departamento: { contains: '\uFFFD' } },
        ],
      },
    });
    record({
      name: 'Zero encoding corruption replacement characters (\\uFFFD) in text fields',
      category: 'INTEGRITY',
      passed: badChars === 0,
      expected: 0,
      actual: badChars,
    });

    // Check Sector breakdown
    const sectorStats = await prisma.school.groupBy({
      by: ['sector'],
      _count: { id: true },
    });
    console.log('       Sector distribution:', sectorStats.map(s => `${s.sector}: ${s._count.id}`).join(', '));

    // Check Ambito breakdown
    const ambitoStats = await prisma.school.groupBy({
      by: ['ambito'],
      _count: { id: true },
    });
    console.log('       Ámbito distribution:', ambitoStats.map(a => `${a.ambito}: ${a._count.id}`).join(', '));

    // ==========================================
    // 7. CLOSED TAXONOMY VERIFICATION
    // ==========================================
    console.log('\n--- [7] CLOSED TAXONOMY (8 CATEGORIES & 28 SUBCATEGORIES) ---');
    const categoryCount = await prisma.category.count();
    record({
      name: 'Exactly 8 categories exist',
      category: 'TAXONOMY',
      passed: categoryCount === 8,
      expected: 8,
      actual: categoryCount,
    });

    const subcategoryCount = await prisma.subcategory.count();
    record({
      name: 'Exactly 28 subcategories exist',
      category: 'TAXONOMY',
      passed: subcategoryCount === 28,
      expected: 28,
      actual: subcategoryCount,
    });

    const allCategories = await prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { orderIndex: 'asc' },
    });

    const expectedTaxonomy = [
      { slug: 'cuidado-infantil', name: 'Cuidado Infantil', subs: 4 },
      { slug: 'apoyo-escolar', name: 'Apoyo Escolar y Clases', subs: 4 },
      { slug: 'transporte-escolar', name: 'Transporte Escolar y Movilidad', subs: 3 },
      { slug: 'cumpleanos-eventos', name: 'Cumpleaños y Eventos Escolares', subs: 4 },
      { slug: 'uniformes-libros', name: 'Uniformes, Libros y Materiales', subs: 3 },
      { slug: 'salud-psicopedagogia', name: 'Salud y Psicopedagogía Infantil', subs: 4 },
      { slug: 'actividades-deportes', name: 'Actividades Extracurriculares y Deportes', subs: 3 },
      { slug: 'servicios-hogar', name: 'Servicios para el Hogar y Familias', subs: 3 },
    ];

    let taxonomyMatches = true;
    for (let i = 0; i < expectedTaxonomy.length; i++) {
      const exp = expectedTaxonomy[i];
      const actual = allCategories[i];
      if (!actual || actual.slug !== exp.slug || actual.subcategories.length !== exp.subs) {
        taxonomyMatches = false;
      }
    }
    record({
      name: 'Taxonomy matches canonical 8 categories with exact subcategory distributions (4+4+3+4+3+4+3+3 = 28)',
      category: 'TAXONOMY',
      passed: taxonomyMatches,
      expected: '8 categories, 28 subcategories matching spec',
      actual: allCategories.map(c => `${c.slug} (${c.subcategories.length} subs)`).join(', '),
    });

    // Check for orphaned subcategories
    const orphanedSubs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM Subcategory s WHERE s.categoryId NOT IN (SELECT id FROM Category);
    `;
    const orphanCount = Number(orphanedSubs[0]?.count || 0);
    record({
      name: 'Zero orphaned subcategories',
      category: 'TAXONOMY',
      passed: orphanCount === 0,
      expected: 0,
      actual: orphanCount,
    });

    // ==========================================
    // 8. CRIANA PERMANENT PROFILE VERIFICATION
    // ==========================================
    console.log('\n--- [8] CRIANA OFFICIAL FEATURED PROFILE ---');
    const crianaListing = await prisma.listing.findUnique({
      where: { id: 'criana-official-featured' },
      include: {
        category: true,
        subcategory: true,
        user: true,
        images: true,
      },
    });

    record({
      name: 'Criana profile exists with id "criana-official-featured"',
      category: 'CRIANA',
      passed: crianaListing !== null,
      expected: 'Not null',
      actual: crianaListing ? 'Found' : 'Missing',
    });

    if (crianaListing) {
      record({
        name: 'Criana pinnedPosition is strictly 1',
        category: 'CRIANA',
        passed: crianaListing.pinnedPosition === 1,
        expected: 1,
        actual: crianaListing.pinnedPosition,
      });

      record({
        name: 'Criana isPermanentFeatured is true',
        category: 'CRIANA',
        passed: crianaListing.isPermanentFeatured === true,
        expected: true,
        actual: crianaListing.isPermanentFeatured,
      });

      record({
        name: 'Criana listing status is APPROVED',
        category: 'CRIANA',
        passed: crianaListing.status === 'APPROVED',
        expected: 'APPROVED',
        actual: crianaListing.status,
      });

      record({
        name: 'Criana category is "cuidado-infantil"',
        category: 'CRIANA',
        passed: crianaListing.category.slug === 'cuidado-infantil',
        expected: 'cuidado-infantil',
        actual: crianaListing.category.slug,
      });

      record({
        name: 'Criana subcategory is "nineras-babysitters"',
        category: 'CRIANA',
        passed: crianaListing.subcategory.slug === 'nineras-babysitters',
        expected: 'nineras-babysitters',
        actual: crianaListing.subcategory.slug,
      });

      record({
        name: 'Criana official WhatsApp contact is +5491178290206',
        category: 'CRIANA',
        passed: crianaListing.whatsapp === '+5491178290206',
        expected: '+5491178290206',
        actual: crianaListing.whatsapp,
      });

      record({
        name: 'Criana official email contact is hola@criana.com.ar',
        category: 'CRIANA',
        passed: crianaListing.email === 'hola@criana.com.ar',
        expected: 'hola@criana.com.ar',
        actual: crianaListing.email,
      });

      record({
        name: 'Criana official webUrl contact is https://www.criana.com.ar',
        category: 'CRIANA',
        passed: crianaListing.webUrl === 'https://www.criana.com.ar',
        expected: 'https://www.criana.com.ar',
        actual: crianaListing.webUrl,
      });

      record({
        name: 'Criana user is ADMIN and isOnboarded is true',
        category: 'CRIANA',
        passed: crianaListing.user.role === 'ADMIN' && crianaListing.user.isOnboarded === true,
        expected: { role: 'ADMIN', isOnboarded: true },
        actual: { role: crianaListing.user.role, isOnboarded: crianaListing.user.isOnboarded },
      });

      record({
        name: 'Criana listing contains official image',
        category: 'CRIANA',
        passed: crianaListing.images.length > 0 && crianaListing.images[0]?.url.includes('criana'),
        expected: 'Contains logo/image',
        actual: crianaListing.images.map(i => i.url).join(', '),
      });
    }

    // ==========================================
    // 9. PERFORMANCE & INDEX LATENCY STRESS TEST
    // ==========================================
    console.log('\n--- [9] PERFORMANCE & INDEX STRESS TEST ---');
    const t0 = performance.now();
    const gbaQuery = await prisma.school.findMany({
      where: {
        jurisdiccion: 'GBA',
        departamento: 'Vicente Lopez',
      },
      take: 100,
    });
    const t1 = performance.now();
    const gbaQueryTime = t1 - t0;
    record({
      name: 'Cascading query [jurisdiccion + departamento] latency < 50ms',
      category: 'PERFORMANCE',
      passed: gbaQueryTime < 50 && gbaQuery.length > 0,
      expected: '< 50ms',
      actual: `${gbaQueryTime.toFixed(2)}ms (${gbaQuery.length} items)`,
    });

    const t2 = performance.now();
    const nameSearch = await prisma.school.findMany({
      where: {
        nombre: { contains: 'San Martin' },
      },
      take: 50,
    });
    const t3 = performance.now();
    const nameSearchTime = t3 - t2;
    record({
      name: 'School name substring search latency < 100ms',
      category: 'PERFORMANCE',
      passed: nameSearchTime < 100 && nameSearch.length > 0,
      expected: '< 100ms',
      actual: `${nameSearchTime.toFixed(2)}ms (${nameSearch.length} items)`,
    });

    // ==========================================
    // 10. RELATIONAL INTEGRITY STRESS TEST
    // ==========================================
    console.log('\n--- [10] RELATIONAL INTEGRITY & FOREIGN KEY ENFORCEMENT ---');
    // Test creating a dummy listing and verifying cascade delete behavior
    const testSchool = await prisma.school.findFirst();
    if (!testSchool) throw new Error('No school found');

    const dummyUser = await prisma.user.create({
      data: {
        email: `adversarial-test-${Date.now()}@example.com`,
        name: 'Adversarial Tester',
        isOnboarded: true,
      },
    });

    const dummyListing = await prisma.listing.create({
      data: {
        title: 'Adversarial Listing Test',
        description: 'Testing relational cascade and foreign key constraints',
        status: 'PENDING',
        userId: dummyUser.id,
        schoolId: testSchool.id,
        categoryId: allCategories[0].id,
        subcategoryId: allCategories[0].subcategories[0].id,
        whatsapp: '+5491100000000',
        images: {
          create: [{ url: 'https://example.com/test.jpg' }],
        },
        clicks: {
          create: [{ channel: 'WHATSAPP' }],
        },
        moderationTokens: {
          create: [
            { token: `test-token-${Date.now()}`, action: 'APPROVE', expiresAt: new Date(Date.now() + 86400000) }
          ],
        },
      },
      include: {
        images: true,
        clicks: true,
        moderationTokens: true,
      },
    });

    const dummyId = dummyListing.id;
    // Now delete listing and check cascade to images, clicks, moderation tokens
    await prisma.listing.delete({ where: { id: dummyId } });
    await prisma.user.delete({ where: { id: dummyUser.id } });

    const orphanImages = await prisma.listingImage.count({ where: { listingId: dummyId } });
    const orphanClicks = await prisma.contactClick.count({ where: { listingId: dummyId } });
    const orphanTokens = await prisma.moderationOtpToken.count({ where: { listingId: dummyId } });

    record({
      name: 'Cascading delete clean-up: ListingImage, ContactClick, ModerationOtpToken cascade with Listing',
      category: 'INTEGRITY',
      passed: orphanImages === 0 && orphanClicks === 0 && orphanTokens === 0,
      expected: 0,
      actual: { orphanImages, orphanClicks, orphanTokens },
    });

  } finally {
    await prisma.$disconnect();
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  const totalChecks = results.length;
  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = results.filter(r => !r.passed).length;
  console.log(`SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED. (${failedChecks} FAILED)`);
  console.log('FINAL VERDICT:', failedChecks === 0 ? 'APPROVE' : 'FAIL');
  console.log('='.repeat(80));

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runAdversarialOracle().catch(err => {
  console.error('CRITICAL UNHANDLED ERROR IN ADVERSARIAL ORACLE:', err);
  process.exit(1);
});
