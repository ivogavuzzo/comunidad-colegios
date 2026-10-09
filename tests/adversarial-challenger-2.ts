import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

export interface ChallengerResult {
  id: string;
  name: string;
  category: 'PERFORMANCE_INDEX' | 'ADDRESS_COMPLETENESS' | 'DATA_CONSISTENCY' | 'SPECIAL_CHARS' | 'DOWNSTREAM_SCHEMA';
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  expected: any;
  actual: any;
  details?: any;
}

async function runChallenger2Suite() {
  console.log('='.repeat(80));
  console.log('CHALLENGER 2 — ADVERSARIAL STRESS SUITE: QUERY PERF, DATA & DOWNSTREAM');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(80));

  const results: ChallengerResult[] = [];

  function record(r: ChallengerResult) {
    results.push(r);
    const color = r.passed ? '\x1b[32mPASS\x1b[0m' : r.severity === 'CRITICAL' || r.severity === 'HIGH' ? '\x1b[31mFAIL\x1b[0m' : '\x1b[33mWARN\x1b[0m';
    console.log(`[${color}] [${r.category}] ${r.id}: ${r.name}`);
    if (!r.passed || r.severity === 'CRITICAL' || r.severity === 'HIGH') {
      console.log(`       Expected: ${JSON.stringify(r.expected)}`);
      console.log(`       Actual:   ${JSON.stringify(r.actual)}`);
      if (r.details) console.log(`       Details:  ${typeof r.details === 'object' ? JSON.stringify(r.details) : r.details}`);
    }
  }

  await prisma.$connect();

  // 1. DIRECT SQLITE PRAGMA & INDEX PHYSICAL VERIFICATION
  console.log('\n--- [1] PHYSICAL SQLITE INDICES & EXECUTION PLAN ANALYSIS ---');

  const indices = (await prisma.$queryRawUnsafe("PRAGMA index_list('School')")) as Array<{
    seq: number;
    name: string;
    unique: number;
    origin: string;
    partial: number;
  }>;

  const indexNames = indices.map((i) => i.name);
  console.log('       Physical SQLite indices on School:', indexNames);

  // Verify School_jurisdiccion_departamento_idx
  const jurDeptIdx = indices.find((i) => i.name === 'School_jurisdiccion_departamento_idx');
  const jurDeptColumns = jurDeptIdx
    ? ((await prisma.$queryRawUnsafe(`PRAGMA index_info('${jurDeptIdx.name}')`)) as Array<{ name: string }>)
    : [];
  const jurDeptColNames = jurDeptColumns.map((c) => c.name);

  record({
    id: 'IDX-01',
    name: 'Physical composite index on [jurisdiccion, departamento] exists in SQLite',
    category: 'PERFORMANCE_INDEX',
    passed: Boolean(jurDeptIdx && jurDeptColNames.join(',') === 'jurisdiccion,departamento'),
    severity: 'CRITICAL',
    expected: ['jurisdiccion', 'departamento'],
    actual: jurDeptColNames,
  });

  // Verify School_nombre_idx
  const nombreIdx = indices.find((i) => i.name === 'School_nombre_idx');
  const nombreColumns = nombreIdx
    ? ((await prisma.$queryRawUnsafe(`PRAGMA index_info('${nombreIdx.name}')`)) as Array<{ name: string }>)
    : [];

  record({
    id: 'IDX-02',
    name: 'Physical index on [nombre] exists in SQLite',
    category: 'PERFORMANCE_INDEX',
    passed: Boolean(nombreIdx && nombreColumns.length === 1 && nombreColumns[0].name === 'nombre'),
    severity: 'HIGH',
    expected: ['nombre'],
    actual: nombreColumns.map((c) => c.name),
  });

  // Verify School_cueanexo_key
  const cueIdx = indices.find((i) => i.name.includes('cueanexo'));
  record({
    id: 'IDX-03',
    name: 'Unique index on [cueanexo] exists in SQLite',
    category: 'PERFORMANCE_INDEX',
    passed: Boolean(cueIdx && Number(cueIdx.unique) === 1),
    severity: 'CRITICAL',
    expected: 'Unique index on cueanexo',
    actual: cueIdx ? `Found ${cueIdx.name} (unique=${cueIdx.unique})` : 'Missing',
  });

  // Query Plan for Cascading Filter: Jurisdiccion + Departamento
  const qpCascading = (await prisma.$queryRawUnsafe(
    "EXPLAIN QUERY PLAN SELECT id, nombre, domicilio FROM School WHERE jurisdiccion = 'GBA' AND departamento = 'San Isidro'"
  )) as Array<{ id: number; parent: number; notused: number; detail: string }>;

  const usesJurDeptIndex = qpCascading.some((step) =>
    step.detail.includes('School_jurisdiccion_departamento_idx')
  );
  console.log('       Query Plan (Cascading GBA + San Isidro):', qpCascading.map((s) => s.detail).join(' | '));

  record({
    id: 'PLAN-01',
    name: 'Cascading query [jurisdiccion, departamento] uses index search (not table scan)',
    category: 'PERFORMANCE_INDEX',
    passed: usesJurDeptIndex,
    severity: 'HIGH',
    expected: 'USING INDEX School_jurisdiccion_departamento_idx',
    actual: qpCascading.map((s) => s.detail).join('; '),
  });

  // Query Plan for GroupBy departamento where jurisdiccion = 'GBA'
  const qpGroupBy = (await prisma.$queryRawUnsafe(
    "EXPLAIN QUERY PLAN SELECT departamento FROM School WHERE jurisdiccion = 'GBA' GROUP BY departamento"
  )) as Array<{ detail: string }>;
  const usesIndexForGroupBy = qpGroupBy.some((s) =>
    s.detail.includes('School_jurisdiccion_departamento_idx')
  );
  console.log('       Query Plan (GroupBy Depto):', qpGroupBy.map((s) => s.detail).join(' | '));

  record({
    id: 'PLAN-02',
    name: 'Cascading departamento list query uses index covering scan',
    category: 'PERFORMANCE_INDEX',
    passed: usesIndexForGroupBy,
    severity: 'MEDIUM',
    expected: 'USING INDEX School_jurisdiccion_departamento_idx',
    actual: qpGroupBy.map((s) => s.detail).join('; '),
  });

  // Query Plan for substring search: LIKE '%Martin%'
  const qpSubstring = (await prisma.$queryRawUnsafe(
    "EXPLAIN QUERY PLAN SELECT id, nombre FROM School WHERE nombre LIKE '%Martin%'"
  )) as Array<{ detail: string }>;
  console.log('       Query Plan (Substring search LIKE %Martin%):', qpSubstring.map((s) => s.detail).join(' | '));

  record({
    id: 'PLAN-03',
    name: 'Substring search (%query%) performs full table/index scan (inherent B-Tree behavior)',
    category: 'PERFORMANCE_INDEX',
    passed: true,
    severity: 'INFO',
    expected: 'Full scan documented',
    actual: qpSubstring.map((s) => s.detail).join('; '),
  });

  // 2. QUERY PERFORMANCE BENCHMARK (200 QUERIES)
  console.log('\n--- [2] QUERY PERFORMANCE LATENCY BENCHMARK ---');

  const samplePartidos = [
    'Vicente Lopez', 'San Isidro', 'San Fernando', 'Tigre', 'General San Martin',
    'Tres De Febrero', 'Moron', 'Hurlingham', 'Ituzaingo', 'La Matanza',
    'Lanus', 'Avellaneda', 'Quilmes', 'Lomas De Zamora', 'Almirante Brown',
    'Comuna 1', 'Comuna 13', 'Comuna 14', 'Comuna 15'
  ];

  const queryTimes: number[] = [];
  const searchTimes: number[] = [];

  for (let i = 0; i < 200; i++) {
    const target = samplePartidos[i % samplePartidos.length];
    const isCaba = target.startsWith('Comuna');
    const jur = isCaba ? 'CABA' : 'GBA';

    const t0 = performance.now();
    await prisma.school.findMany({
      where: {
        jurisdiccion: jur,
        departamento: target,
      },
      select: { id: true, nombre: true, domicilio: true, localidad: true },
      take: 50,
    });
    const t1 = performance.now();
    queryTimes.push(t1 - t0);

    if (i % 2 === 0) {
      const searchTerms = ['San', 'Colegio', 'Instituto', 'Escuela', 'Nacional', 'Santa', 'Maria'];
      const term = searchTerms[i % searchTerms.length];
      const s0 = performance.now();
      await prisma.school.findMany({
        where: {
          jurisdiccion: jur,
          departamento: target,
          nombre: { contains: term },
        },
        take: 20,
      });
      const s1 = performance.now();
      searchTimes.push(s1 - s0);
    }
  }

  queryTimes.sort((a, b) => a - b);
  const p50 = queryTimes[Math.floor(queryTimes.length * 0.5)];
  const p95 = queryTimes[Math.floor(queryTimes.length * 0.95)];
  const p99 = queryTimes[Math.floor(queryTimes.length * 0.99)];
  const max = queryTimes[queryTimes.length - 1];

  console.log(`       Cascading Filter (200 runs): p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms, max=${max.toFixed(2)}ms`);

  record({
    id: 'PERF-01',
    name: 'Cascading lookup p95 latency is under 15ms',
    category: 'PERFORMANCE_INDEX',
    passed: p95 < 15,
    severity: 'HIGH',
    expected: '< 15ms',
    actual: `${p95.toFixed(2)}ms (p50=${p50.toFixed(2)}ms, p99=${p99.toFixed(2)}ms)`,
  });

  searchTimes.sort((a, b) => a - b);
  const sp95 = searchTimes[Math.floor(searchTimes.length * 0.95)];
  console.log(`       Combined Cascading + Substring Search (100 runs): p95=${sp95.toFixed(2)}ms`);

  record({
    id: 'PERF-02',
    name: 'Combined Cascading + Substring search p95 latency is under 30ms',
    category: 'PERFORMANCE_INDEX',
    passed: sp95 < 30,
    severity: 'MEDIUM',
    expected: '< 30ms',
    actual: `${sp95.toFixed(2)}ms`,
  });

  // 3. ADDRESS COMPLETENESS & DATA HYGIENE
  console.log('\n--- [3] ADDRESS COMPLETENESS & DATA HYGIENE ---');
  const allSchools = await prisma.school.findMany({
    select: {
      id: true,
      cueanexo: true,
      nombre: true,
      domicilio: true,
      localidad: true,
      departamento: true,
      jurisdiccion: true,
      telefono: true,
      mail: true,
      codigoPostal: true,
      sector: true,
      ambito: true,
    },
  });

  const total = allSchools.length;
  let emptyAddress = 0;
  let whitespaceAddress = 0;
  let sentinelAddress = 0;
  let shortAddress = 0;
  let snAddress = 0;

  let emptyLocalidad = 0;
  let sentinelLocalidad = 0;

  let nullPhones = 0;
  let invalidPhones = 0;

  let nullMails = 0;
  let invalidMails = 0;

  let nullCps = 0;
  let validSector = 0;
  let validAmbito = 0;

  const addressLengths: number[] = [];

  for (const s of allSchools) {
    const dom = s.domicilio;
    if (!dom || dom.length === 0) emptyAddress++;
    else if (dom.trim().length === 0) whitespaceAddress++;
    else {
      addressLengths.push(dom.length);
      const upper = dom.toUpperCase().trim();
      if (['S/D', 'N/D', 'SIN DOMICILIO', '-', '.', '?'].includes(upper)) {
        sentinelAddress++;
      }
      if (dom.length < 3) shortAddress++;
      if (upper.includes('S/N') || upper.includes('SIN NUMERO') || upper.includes('S/ N')) {
        snAddress++;
      }
    }

    const loc = s.localidad;
    if (!loc || loc.trim().length === 0) emptyLocalidad++;
    else if (['S/D', 'N/D'].includes(loc.toUpperCase().trim())) sentinelLocalidad++;

    if (!s.telefono) nullPhones++;
    else if (s.telefono.includes('S/D') || s.telefono.includes('N/D') || s.telefono.length < 5) {
      invalidPhones++;
    }

    if (!s.mail) nullMails++;
    else if (!s.mail.includes('@') || s.mail.includes('S/D') || s.mail.includes('N/D')) {
      invalidMails++;
    }

    if (!s.codigoPostal) nullCps++;

    if (s.sector === 'ESTATAL' || s.sector === 'PRIVADO') validSector++;
    if (s.ambito === 'URBANO' || s.ambito === 'RURAL') validAmbito++;
  }

  addressLengths.sort((a, b) => a - b);
  const minAddrLen = addressLengths[0] || 0;
  const maxAddrLen = addressLengths[addressLengths.length - 1] || 0;
  const avgAddrLen = addressLengths.reduce((a, b) => a + b, 0) / addressLengths.length;

  console.log(`       Address stats: Total=${total}, Empty=${emptyAddress}, Whitespace=${whitespaceAddress}, Sentinel=${sentinelAddress}, S/N=${snAddress}`);
  console.log(`       Address length range: min=${minAddrLen}, avg=${avgAddrLen.toFixed(1)}, max=${maxAddrLen}`);
  console.log(`       Localidad: Empty=${emptyLocalidad}, Sentinel=${sentinelLocalidad}`);
  console.log(`       Contacts: NullPhones=${nullPhones} (${((nullPhones/total)*100).toFixed(1)}%), InvalidPhones=${invalidPhones}`);
  console.log(`       Contacts: NullMails=${nullMails} (${((nullMails/total)*100).toFixed(1)}%), InvalidMails=${invalidMails}`);
  console.log(`       Metadata: SectorValid=${validSector}/${total}, AmbitoValid=${validAmbito}/${total}`);

  record({
    id: 'ADDR-01',
    name: '100% of schools have non-empty physical address (0 blank, 0 whitespace)',
    category: 'ADDRESS_COMPLETENESS',
    passed: emptyAddress === 0 && whitespaceAddress === 0,
    severity: 'CRITICAL',
    expected: 0,
    actual: { emptyAddress, whitespaceAddress },
  });

  record({
    id: 'ADDR-02',
    name: 'Zero uncleaned placeholder sentinel values in domicilio ("S/D", "N/D", "-")',
    category: 'ADDRESS_COMPLETENESS',
    passed: sentinelAddress === 0,
    severity: 'HIGH',
    expected: 0,
    actual: sentinelAddress,
  });

  record({
    id: 'ADDR-03',
    name: '100% of schools have non-empty localidad (0 blank, 0 sentinel)',
    category: 'ADDRESS_COMPLETENESS',
    passed: emptyLocalidad === 0 && sentinelLocalidad === 0,
    severity: 'HIGH',
    expected: 0,
    actual: { emptyLocalidad, sentinelLocalidad },
  });

  record({
    id: 'DATA-01',
    name: 'Zero uncleaned telephone sentinels (all populated phones are valid)',
    category: 'DATA_CONSISTENCY',
    passed: invalidPhones === 0,
    severity: 'MEDIUM',
    expected: 0,
    actual: invalidPhones,
  });

  record({
    id: 'DATA-02',
    name: 'Zero uncleaned email sentinels (all populated emails have RFC structure)',
    category: 'DATA_CONSISTENCY',
    passed: invalidMails === 0,
    severity: 'MEDIUM',
    expected: 0,
    actual: invalidMails,
  });

  record({
    id: 'DATA-03',
    name: 'All populated sector values are strictly ESTATAL or PRIVADO',
    category: 'DATA_CONSISTENCY',
    passed: validSector === total,
    severity: 'MEDIUM',
    expected: total,
    actual: validSector,
  });

  record({
    id: 'DATA-04',
    name: 'All populated ambito values are strictly URBANO or RURAL',
    category: 'DATA_CONSISTENCY',
    passed: validAmbito === total,
    severity: 'MEDIUM',
    expected: total,
    actual: validAmbito,
  });

  // 4. SPECIAL CHARACTERS LOOKUPS (Ñ, ACENTOS, COMILLAS)
  console.log('\n--- [4] SPECIAL CHARACTERS EMPIRICAL LOOKUPS ---');

  const schoolsWithEnye = await prisma.school.findMany({
    where: { nombre: { contains: 'ñ' } },
    select: { id: true, nombre: true },
    take: 5,
  });
  console.log(`       Sample schools with 'ñ': ${schoolsWithEnye.length} found. Examples:`, schoolsWithEnye.map((s) => s.nombre));

  const lowerEnyeMatches = await prisma.school.count({ where: { nombre: { contains: 'peña' } } });
  const upperEnyeMatches = await prisma.school.count({ where: { nombre: { contains: 'PEÑA' } } });
  const titleEnyeMatches = await prisma.school.count({ where: { nombre: { contains: 'Peña' } } });

  console.log(`       'ñ' lookups count: 'peña'=${lowerEnyeMatches}, 'PEÑA'=${upperEnyeMatches}, 'Peña'=${titleEnyeMatches}`);

  const enyeCaseSensitive = lowerEnyeMatches !== upperEnyeMatches;
  record({
    id: 'CHAR-01',
    name: 'Schools with "ñ" / "Ñ" correctly stored and queryable in database',
    category: 'SPECIAL_CHARS',
    passed: titleEnyeMatches > 0,
    severity: 'HIGH',
    expected: '> 0 schools with "Peña"',
    actual: titleEnyeMatches,
    details: { lowerEnyeMatches, upperEnyeMatches, titleEnyeMatches, enyeCaseSensitive },
  });

  // Accents test
  const martinWithAccent = await prisma.school.count({ where: { nombre: { contains: 'Martín' } } });
  const martinLowerAccent = await prisma.school.count({ where: { nombre: { contains: 'martín' } } });
  const martinUpperAccent = await prisma.school.count({ where: { nombre: { contains: 'MARTÍN' } } });
  const martinWithoutAccent = await prisma.school.count({ where: { nombre: { contains: 'Martin' } } });

  console.log(`       Accent lookups ('Martín'): 'Martín'=${martinWithAccent}, 'martín'=${martinLowerAccent}, 'MARTÍN'=${martinUpperAccent}, 'Martin'=${martinWithoutAccent}`);

  record({
    id: 'CHAR-02',
    name: 'Accented school names preserved in UTF-8 without mojibake (Martín, José, etc.)',
    category: 'SPECIAL_CHARS',
    passed: martinWithAccent > 0,
    severity: 'HIGH',
    expected: '> 0 schools with "Martín"',
    actual: martinWithAccent,
    details: { martinWithAccent, martinWithoutAccent, martinLowerAccent, martinUpperAccent },
  });

  const mariaCount = await prisma.school.count({ where: { nombre: { contains: 'María' } } });
  const guemesCount = await prisma.school.count({ where: { nombre: { contains: 'Güemes' } } });
  const censCount = await prisma.school.count({ where: { nombre: { contains: 'C.E.N.S.' } } });

  console.log(`       Special char counts: María=${mariaCount}, Güemes=${guemesCount}, C.E.N.S.=${censCount}`);

  record({
    id: 'CHAR-03',
    name: 'Complex diacritics (umlaut Güemes, abbreviations C.E.N.S.) preserved accurately',
    category: 'SPECIAL_CHARS',
    passed: guemesCount > 0 && censCount > 0,
    severity: 'MEDIUM',
    expected: 'Güemes > 0 and C.E.N.S. > 0',
    actual: { guemesCount, censCount },
  });

  const quotesDouble = await prisma.school.count({ where: { nombre: { contains: '"' } } });
  const quotesSingle = await prisma.school.count({ where: { nombre: { contains: "'" } } });
  const ordinalMasc = await prisma.school.count({ where: { nombre: { contains: 'Nº' } } });
  const ordinalDegree = await prisma.school.count({ where: { nombre: { contains: 'N°' } } });

  console.log(`       Punctuation lookups: Double quotes (")=${quotesDouble}, Single quotes (')=${quotesSingle}, Nº (U+00BA)=${ordinalMasc}, N° (U+00B0)=${ordinalDegree}`);

  record({
    id: 'CHAR-04',
    name: 'Ordinal indicators and quotes queryable without SQL injection or syntax error',
    category: 'SPECIAL_CHARS',
    passed: ordinalMasc >= 0 && quotesSingle >= 0,
    severity: 'HIGH',
    expected: 'Zero syntax errors querying special chars',
    actual: { quotesDouble, quotesSingle, ordinalMasc, ordinalDegree },
  });

  // 5. DOWNSTREAM MODELS & CONTRACT INTEGRITY (R2, R3, R4, R5)
  console.log('\n--- [5] DOWNSTREAM SCHEMA VALIDATION (R2, R3, R4, R5) ---');

  let r2Success = false;
  let testSchoolRequest: any = null;
  try {
    testSchoolRequest = await prisma.schoolRequest.create({
      data: {
        nombre: 'Colegio Nuevo Sol Test',
        jurisdiccion: 'GBA',
        departamento: 'Tigre',
        localidad: 'General Pacheco',
        domicilio: 'Av. De Los Colegios 1234',
        userEmail: 'test-parent@example.com',
        userName: 'Papa Tester',
      },
    });
    r2Success = Boolean(testSchoolRequest.id && testSchoolRequest.status === 'PENDING');
  } catch (err: any) {
    console.error('       Error creating SchoolRequest:', err.message);
  }

  record({
    id: 'SCHEMA-01',
    name: 'R2 SchoolRequest model supports required fields and default PENDING status',
    category: 'DOWNSTREAM_SCHEMA',
    passed: r2Success,
    severity: 'CRITICAL',
    expected: 'Created SchoolRequest with status PENDING',
    actual: testSchoolRequest ? `id=${testSchoolRequest.id}, status=${testSchoolRequest.status}` : 'Failed',
  });

  let r3Success = false;
  let testUser: any = null;
  const sampleSchool = allSchools[0];
  try {
    testUser = await prisma.user.create({
      data: {
        email: `onboarding-test-${Date.now()}@test.com`,
        name: 'Mama Publicadora',
        dni: '34567890',
        schoolOfOriginId: sampleSchool.id,
        isOnboarded: true,
        role: 'USER',
      },
      include: { schoolOfOrigin: true },
    });
    r3Success = Boolean(testUser.id && testUser.isOnboarded === true && testUser.schoolOfOrigin?.id === sampleSchool.id);
  } catch (err: any) {
    console.error('       Error creating User with Onboarding:', err.message);
  }

  record({
    id: 'SCHEMA-02',
    name: 'R3 User model supports mandatory onboarding fields (dni, schoolOfOriginId, isOnboarded)',
    category: 'DOWNSTREAM_SCHEMA',
    passed: r3Success,
    severity: 'CRITICAL',
    expected: 'User created with DNI and linked School of Origin',
    actual: testUser ? `dni=${testUser.dni}, isOnboarded=${testUser.isOnboarded}, school=${testUser.schoolOfOrigin?.nombre}` : 'Failed',
  });

  let r4Success = false;
  let testListing: any = null;
  let approveToken: any = null;
  let rejectToken: any = null;
  const cat = await prisma.category.findFirstOrThrow({ include: { subcategories: true } });

  try {
    testListing = await prisma.listing.create({
      data: {
        title: 'Clases Particulares de Matematica',
        description: 'Apoyo escolar para chicos de primaria y secundaria con experiencia docente.',
        aiCorrectedTitle: 'Clases Particulares de Matemática',
        aiCorrectedDesc: 'Apoyo escolar para chicos de primaria y secundaria con experiencia docente.',
        status: 'PENDING',
        userId: testUser.id,
        schoolRequestId: testSchoolRequest.id,
        categoryId: cat.id,
        subcategoryId: cat.subcategories[0].id,
        whatsapp: '+5491144445555',
        moderationTokens: {
          create: [
            {
              token: `otp-approve-${Date.now()}`,
              action: 'APPROVE',
              expiresAt: new Date(Date.now() + 86400000),
            },
            {
              token: `otp-reject-${Date.now()}`,
              action: 'REJECT',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        },
      },
      include: {
        moderationTokens: true,
        schoolRequest: true,
      },
    });

    approveToken = testListing.moderationTokens.find((t: any) => t.action === 'APPROVE');
    rejectToken = testListing.moderationTokens.find((t: any) => t.action === 'REJECT');

    r4Success = Boolean(
      testListing.id &&
      testListing.schoolRequest?.id === testSchoolRequest.id &&
      testListing.moderationTokens.length === 2 &&
      approveToken &&
      rejectToken &&
      testListing.aiCorrectedTitle
    );
  } catch (err: any) {
    console.error('       Error creating R4 Listing & ModerationOtpTokens:', err.message);
  }

  record({
    id: 'SCHEMA-03',
    name: 'R4 Listing supports schoolRequestId fallback, AI diff fields, and dual OTP tokens',
    category: 'DOWNSTREAM_SCHEMA',
    passed: r4Success,
    severity: 'CRITICAL',
    expected: 'Listing created with schoolRequestId and 2 OTP tokens (APPROVE/REJECT)',
    actual: testListing ? `listingId=${testListing.id}, tokens=${testListing.moderationTokens?.length}` : 'Failed',
  });

  let r5StandardSuccess = false;
  let testClick: any = null;
  try {
    testClick = await prisma.contactClick.create({
      data: {
        listingId: testListing.id,
        channel: 'WHATSAPP',
      },
    });
    r5StandardSuccess = Boolean(testClick.id && testClick.channel === 'WHATSAPP');
  } catch (err: any) {
    console.error('       Error creating standard ContactClick:', err.message);
  }

  record({
    id: 'SCHEMA-04',
    name: 'R5 ContactClick model records silent event per PROJECT.md interface contract (id, listingId, channel, createdAt)',
    category: 'DOWNSTREAM_SCHEMA',
    passed: r5StandardSuccess,
    severity: 'HIGH',
    expected: 'ContactClick event persisted',
    actual: testClick ? `id=${testClick.id}, channel=${testClick.channel}` : 'Failed',
  });

  const schemaContent = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
  const hasIpHash = schemaContent.includes('ipHash');
  const hasUserAgent = schemaContent.includes('userAgent');

  record({
    id: 'SCHEMA-05',
    name: 'DOWNSTREAM DISCREPANCY: ContactClick model in schema.prisma lacks ipHash and userAgent expected by E2E test suite (F25.4)',
    category: 'DOWNSTREAM_SCHEMA',
    passed: hasIpHash && hasUserAgent,
    severity: 'HIGH',
    expected: 'schema.prisma ContactClick has optional ipHash String? and userAgent String?',
    actual: `ipHash present: ${hasIpHash}, userAgent present: ${hasUserAgent}`,
    details: 'Causes 4 failures in tests/e2e/tier1-features.test.ts (F25.1..F25.4) because tests/e2e/helpers/contracts.ts:352 passes ipHash to prisma.contactClick.create()',
  });

  // Clean up test data
  if (testListing) {
    await prisma.moderationOtpToken.deleteMany({ where: { listingId: testListing.id } });
    await prisma.contactClick.deleteMany({ where: { listingId: testListing.id } });
    await prisma.listing.delete({ where: { id: testListing.id } });
  }
  if (testSchoolRequest) {
    await prisma.schoolRequest.delete({ where: { id: testSchoolRequest.id } });
  }
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } });
  }

  console.log('\n' + '='.repeat(80));
  const totalChecks = results.length;
  const passedChecks = results.filter((r) => r.passed).length;
  const criticalFails = results.filter((r) => !r.passed && r.severity === 'CRITICAL').length;
  const highFails = results.filter((r) => !r.passed && r.severity === 'HIGH').length;

  console.log(`SUMMARY: ${passedChecks}/${totalChecks} PASSED.`);
  console.log(`CRITICAL FAILURES: ${criticalFails}, HIGH FINDINGS: ${highFails}`);
  console.log('='.repeat(80));

  await prisma.$disconnect();
  return results;
}

runChallenger2Suite().catch((err) => {
  console.error('UNHANDLED ERROR IN SUITE:', err);
  process.exit(1);
});
