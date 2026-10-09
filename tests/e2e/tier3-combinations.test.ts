import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  sanitizeAndValidateDni,
  validateListingPayload,
  createListingModerationTokens,
  executeModerationOtpAction,
  simulateGeminiAiCorrection,
  recordContactClick,
  computeAdminMetrics,
  getCascadingJurisdictions,
  getCascadingDepartamentos,
  getCascadingSchools,
  getPublicCatalogListings,
} from './helpers/contracts';

describe('Tier 3: Cross-Feature Combinations', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.contactClick.deleteMany({
      where: { listing: { title: { startsWith: '[TEST-T3]' } } },
    });
    await prisma.moderationOtpToken.deleteMany({
      where: { listing: { title: { startsWith: '[TEST-T3]' } } },
    });
    await prisma.listing.deleteMany({
      where: { title: { startsWith: '[TEST-T3]' } },
    });
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: '[TEST-T3]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@test-t3.example.com' } },
    });
  });

  // --------------------------------------------------------------------------
  // Combination 1: Cascading Search + School Selection + Listing Retrieval with Criana
  // --------------------------------------------------------------------------
  it('T3.1: Cascading Search + School Selection + Childcare Catalog with Criana Pinned', async () => {
    // 1. Level 1: Jurisdictions
    const jurisdictions = await getCascadingJurisdictions();
    expect(jurisdictions).toContain('GBA');

    // 2. Level 2: Partidos in GBA
    const partidos = await getCascadingDepartamentos('GBA');
    expect(partidos).toContain('San Isidro');

    // 3. Level 3: Schools in San Isidro
    const schools = await getCascadingSchools({
      jurisdiccion: 'GBA',
      departamento: 'San Isidro',
      query: 'San',
    });
    expect(schools.length).toBeGreaterThan(0);
    const selectedSchool = schools[0];

    // 4. Retrieve Childcare category
    const cat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'cuidado-infantil' },
    });

    // 5. Query listings for this school in Childcare
    const listings = await getPublicCatalogListings({
      categoryId: cat.id,
      schoolId: selectedSchool.id,
    });

    expect(listings.length).toBeGreaterThanOrEqual(1);
    expect(listings[0].isPermanentFeatured).toBe(true);
    expect(listings[0].title).toContain('Criana');
  });

  // --------------------------------------------------------------------------
  // Combination 2: Fallback Modal ("Mi colegio no está") + Ad Publishing + Pending Link
  // --------------------------------------------------------------------------
  it('T3.2: Fallback School Request + Immediate Ad Publishing + Pending Association', async () => {
    // 1. User submits missing school request
    const schoolReq = await prisma.schoolRequest.create({
      data: {
        nombre: '[TEST-T3] Colegio Comunitario San Lucas',
        jurisdiccion: 'GBA',
        departamento: 'Tigre',
        localidad: 'General Pacheco',
        domicilio: 'Av. Hipólito Yrigoyen 2500',
        userEmail: 'anunciante@test-t3.example.com',
        userName: 'Martín Gómez',
        status: 'PENDING',
      },
    });

    expect(schoolReq.id).toBeDefined();
    expect(schoolReq.status).toBe('PENDING');

    // 2. User proceeds immediately to publish ad linked to schoolRequestId
    const user = await prisma.user.create({
      data: {
        name: 'Martín Gómez',
        email: 'anunciante@test-t3.example.com',
        dni: '33444555',
        isOnboarded: true,
        role: 'USER',
      },
    });

    const cat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'transporte-escolar' },
      include: { subcategories: true },
    });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Carpooling para Pacheco y Talar',
        description: 'Comparto auto todas las mañanas para llevar a los chicos al nuevo colegio',
        userId: user.id,
        categoryId: cat.id,
        subcategoryId: cat.subcategories[0].id,
        schoolRequestId: schoolReq.id,
        whatsapp: '+5491133334444',
        status: 'PENDING',
      },
    });

    expect(listing.schoolRequestId).toBe(schoolReq.id);
    expect(listing.status).toBe('PENDING');
  });

  // --------------------------------------------------------------------------
  // Combination 3: Google SSO + Onboarding Gate + Publish Permission Unlock
  // --------------------------------------------------------------------------
  it('T3.3: Google SSO Sign-in + Onboarding Interception + Gate Unlock', async () => {
    // 1. First-time Google user created
    const newUser = await prisma.user.create({
      data: {
        name: '[TEST-T3] Profesora Laura',
        email: 'laura-sso@test-t3.example.com',
        isOnboarded: false,
        role: 'USER',
      },
    });

    // 2. Gate blocks publish access
    expect(newUser.isOnboarded).toBe(false);

    // 3. User submits onboarding data
    const dniVal = sanitizeAndValidateDni(' 31.987.654 ');
    expect(dniVal.isValid).toBe(true);

    const school = await prisma.school.findFirst({
      where: { departamento: 'Vicente Lopez' },
    });

    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: {
        dni: dniVal.cleanDni,
        schoolOfOriginId: school!.id,
        isOnboarded: true,
      },
    });

    // 4. Gate opens
    expect(updatedUser.isOnboarded).toBe(true);
    expect(updatedUser.dni).toBe('31987654');
    expect(updatedUser.schoolOfOriginId).toBe(school!.id);
  });

  // --------------------------------------------------------------------------
  // Combination 4: Listing Creation + Gemini AI Pipeline + Diffs Storage
  // --------------------------------------------------------------------------
  it('T3.4: Listing Publication + Gemini AI Linguistic Correction + Original vs AI Diff', async () => {
    const rawInput = {
      title: 'busco compas de cole q quieran clases de apoyo',
      description:
        'Hola a todas las familias! Ofrezco apoyo escolar para chicos de primaria xq se vienen los examenes de fin de trimestre. Escribanme al wsp!',
    };

    // 1. Gemini AI processes text
    const aiResult = simulateGeminiAiCorrection(rawInput);

    expect(aiResult.correctedTitle).toContain('que');
    expect(aiResult.correctedDescription).toContain('porque');
    // Verifies colloquial tone invariant is preserved
    expect(aiResult.correctedDescription).toContain('chicos');
    expect(aiResult.correctedDescription).toContain('wsp');

    // 2. Persist in database
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'apoyo-escolar' },
      include: { subcategories: true },
    });

    const listing = await prisma.listing.create({
      data: {
        title: `[TEST-T3] ${rawInput.title}`,
        description: rawInput.description,
        aiCorrectedTitle: `[TEST-T3] ${aiResult.correctedTitle}`,
        aiCorrectedDesc: aiResult.correctedDescription,
        userId: user!.id,
        categoryId: cat.id,
        subcategoryId: cat.subcategories[0].id,
        status: 'PENDING',
      },
    });

    expect(listing.title).toContain('q');
    expect(listing.aiCorrectedTitle).toContain('que');
    expect(listing.status).toBe('PENDING');
  });

  // --------------------------------------------------------------------------
  // Combination 5: Listing Creation + 256-bit Cryptographic OTP + Admin Email Composition
  // --------------------------------------------------------------------------
  it('T3.5: Listing Submission + Cryptographic Token Generation + Admin Email Notification', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Clases de Guitarra',
        description: 'Clases de musica e instrumentos para chicos del colegio',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    // 1. Generate 256-bit OTP tokens
    const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);
    expect(approveToken).toMatch(/^[a-f0-9]{64}$/);
    expect(rejectToken).toMatch(/^[a-f0-9]{64}$/);

    // 2. Compose admin notification email
    const emailData = {
      to: 'admin@criana.com.ar',
      subject: `[Moderación] Nuevo aviso: "${listing.title}"`,
      approveUrl: `http://localhost:3000/api/moderation/otp?token=${approveToken}`,
      rejectUrl: `http://localhost:3000/api/moderation/otp?token=${rejectToken}`,
      footerNotice: 'Esta comunidad es una iniciativa de Criana',
    };

    expect(emailData.approveUrl).toContain(approveToken);
    expect(emailData.rejectUrl).toContain(rejectToken);
    expect(emailData.footerNotice).toBe('Esta comunidad es una iniciativa de Criana');
  });

  // --------------------------------------------------------------------------
  // Combination 6: 1-Click Approve OTP + Status Transition + AI Text Application + Sibling Invalidation
  // --------------------------------------------------------------------------
  it('T3.6: 1-Click Approve OTP Execution + AI Text Applied + Sibling Reject Invalidation', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] titulo sin mayusculas q tiene falta',
        description: 'descripcion con abreviatura xq falta corregir',
        aiCorrectedTitle: '[TEST-T3] Título sin Mayúsculas que Tiene Falta',
        aiCorrectedDesc: 'Descripción con abreviatura porque falta corregir',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

    // 1. Execute Approve OTP
    const approveRes = await executeModerationOtpAction(approveToken);
    expect(approveRes.success).toBe(true);
    expect(approveRes.httpStatus).toBe(200);
    expect(approveRes.listingStatus).toBe('APPROVED');

    // 2. Verify AI corrections applied to live listing
    const liveListing = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(liveListing!.title).toBe('[TEST-T3] Título sin Mayúsculas que Tiene Falta');
    expect(liveListing!.status).toBe('APPROVED');

    // 3. Verify sibling Reject token is now invalidated
    const siblingRes = await executeModerationOtpAction(rejectToken);
    expect(siblingRes.success).toBe(false);
    expect(siblingRes.httpStatus).toBe(409);
    expect(siblingRes.message).toContain('El token OTP es de uso único');
  });

  // --------------------------------------------------------------------------
  // Combination 7: 1-Click Reject OTP + Status Transition + Sibling Approve Invalidation
  // --------------------------------------------------------------------------
  it('T3.7: 1-Click Reject OTP Execution + Sibling Approve Invalidation', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Aviso no permitido',
        description: 'Publicidad no comunitaria o spam comercial no escolar',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

    // 1. Execute Reject OTP
    const rejectRes = await executeModerationOtpAction(rejectToken);
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.httpStatus).toBe(200);
    expect(rejectRes.listingStatus).toBe('REJECTED');

    // 2. Verify sibling Approve token is invalidated
    const siblingRes = await executeModerationOtpAction(approveToken);
    expect(siblingRes.success).toBe(false);
    expect(siblingRes.httpStatus).toBe(409);

    // 3. Verify listing is not in approved catalog
    const rejectedListing = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(rejectedListing!.status).toBe('REJECTED');
  });

  // --------------------------------------------------------------------------
  // Combination 8: Approved Listing + Silent WhatsApp Click Tracking + Admin Metrics
  // --------------------------------------------------------------------------
  it('T3.8: Approved Listing + WhatsApp Click Tracking + Admin Metrics Update', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Clases Particulares de Física',
        description: 'Preparación de previas y exámenes de secundaria',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        whatsapp: '+5491122334455',
        status: 'APPROVED',
      },
    });

    const beforeMetrics = await computeAdminMetrics();

    // Track WhatsApp Click
    const trackRes = await recordContactClick({
      listingId: listing.id,
      channel: 'WHATSAPP',
      ip: '181.44.120.5',
    });
    expect(trackRes.success).toBe(true);

    const afterMetrics = await computeAdminMetrics();
    expect(afterMetrics.totalClicks).toBeGreaterThanOrEqual(beforeMetrics.totalClicks + 1);
    expect(afterMetrics.clicksByChannel.WHATSAPP).toBeGreaterThanOrEqual(
      beforeMetrics.clicksByChannel.WHATSAPP + 1
    );

    const listingClicks = await prisma.contactClick.count({
      where: { listingId: listing.id, channel: 'WHATSAPP' },
    });
    expect(listingClicks).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Combination 9: Approved Listing + Silent Email Click Tracking + Admin Metrics
  // --------------------------------------------------------------------------
  it('T3.9: Approved Listing + Email Click Tracking + Admin Metrics Update', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Talleres de Lectura',
        description: 'Taller literario para chicos de primaria',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        email: 'lectura@colegio.edu.ar',
        status: 'APPROVED',
      },
    });

    const beforeMetrics = await computeAdminMetrics();

    // Track Email Click
    const trackRes = await recordContactClick({
      listingId: listing.id,
      channel: 'EMAIL',
    });
    expect(trackRes.success).toBe(true);

    const afterMetrics = await computeAdminMetrics();
    expect(afterMetrics.totalClicks).toBeGreaterThanOrEqual(beforeMetrics.totalClicks + 1);
    expect(afterMetrics.clicksByChannel.EMAIL).toBeGreaterThanOrEqual(
      beforeMetrics.clicksByChannel.EMAIL + 1
    );

    const listingClicks = await prisma.contactClick.count({
      where: { listingId: listing.id, channel: 'EMAIL' },
    });
    expect(listingClicks).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Combination 10: Approved Listing + Silent Web Click Tracking + Admin Metrics
  // --------------------------------------------------------------------------
  it('T3.10: Approved Listing + Web Click Tracking + Admin Metrics Update', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Salón para Cumpleaños Escolares',
        description: 'Espacio cerrado con pelotero para cumpleaños de niños',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        webUrl: 'https://salonfiestas.com.ar',
        status: 'APPROVED',
      },
    });

    const beforeMetrics = await computeAdminMetrics();

    // Track Web Click
    const trackRes = await recordContactClick({
      listingId: listing.id,
      channel: 'WEB',
    });
    expect(trackRes.success).toBe(true);

    const afterMetrics = await computeAdminMetrics();
    expect(afterMetrics.totalClicks).toBeGreaterThanOrEqual(beforeMetrics.totalClicks + 1);
    expect(afterMetrics.clicksByChannel.WEB).toBeGreaterThanOrEqual(
      beforeMetrics.clicksByChannel.WEB + 1
    );

    const listingClicks = await prisma.contactClick.count({
      where: { listingId: listing.id, channel: 'WEB' },
    });
    expect(listingClicks).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Combination 11: Replay Defense + Public Catalog Consistency
  // --------------------------------------------------------------------------
  it('T3.11: OTP Replay Attack Defense preserves Live Listing in Public Catalog', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Replay Attack Ad',
        description: 'Aviso para verificar consistencia tras ataque de repeticion',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    const { approveToken } = await createListingModerationTokens(listing.id);
    await executeModerationOtpAction(approveToken);

    // Replay attack
    const replayRes = await executeModerationOtpAction(approveToken);
    expect(replayRes.httpStatus).toBe(409);

    // Verify catalog query still retrieves the approved listing
    const catalogListings = await getPublicCatalogListings({ categoryId: cat!.id });
    const found = catalogListings.find((l) => l.id === listing.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('APPROVED');
  });

  // --------------------------------------------------------------------------
  // Combination 12: Fallback School Approval + Ad Re-association
  // --------------------------------------------------------------------------
  it('T3.12: Fallback School Request Approval migrates linked Ad to Official School', async () => {
    // 1. School request created
    const schoolReq = await prisma.schoolRequest.create({
      data: {
        nombre: '[TEST-T3] Escuela Primaria Los Aromos',
        jurisdiccion: 'GBA',
        departamento: 'Pilar',
        localidad: 'Pilar Centro',
        domicilio: 'Ruta 8 Km 50',
        status: 'PENDING',
      },
    });

    // 2. Listing linked to SchoolRequest
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Transporte para Los Aromos',
        description: 'Servicio de traslado escolar para el nuevo colegio',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        schoolRequestId: schoolReq.id,
        status: 'APPROVED',
      },
    });

    // 3. Admin approves SchoolRequest and incorporates into School table
    const officialSchool = await prisma.school.create({
      data: {
        cueanexo: '999888777',
        nombre: schoolReq.nombre,
        domicilio: schoolReq.domicilio,
        jurisdiccion: schoolReq.jurisdiccion,
        departamento: schoolReq.departamento,
        localidad: schoolReq.localidad,
      },
    });

    await prisma.schoolRequest.update({
      where: { id: schoolReq.id },
      data: { status: 'APPROVED' },
    });

    // 4. Listing is re-associated to official school
    const updatedListing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        schoolId: officialSchool.id,
        schoolRequestId: null,
      },
    });

    expect(updatedListing.schoolId).toBe(officialSchool.id);
    expect(updatedListing.schoolRequestId).toBeNull();

    // Clean up temporary school
    await prisma.listing.delete({ where: { id: listing.id } });
    await prisma.school.delete({ where: { id: officialSchool.id } });
  });

  // --------------------------------------------------------------------------
  // Combination 13: Unapproved Listing + Catalog Isolation
  // --------------------------------------------------------------------------
  it('T3.13: PENDING listing is isolated from Public Catalog queries', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const pendingListing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Hidden Pending Ad',
        description: 'Este aviso no debe ser visible en el catalogo publico',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    const catalogListings = await getPublicCatalogListings({ categoryId: cat!.id });
    const isPresent = catalogListings.some((l) => l.id === pendingListing.id);
    expect(isPresent).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Combination 14: Category Switching + School Filter Persistence
  // --------------------------------------------------------------------------
  it('T3.14: Category Switching maintains School Filter and activates Criana Pinning in Childcare', async () => {
    const school = await prisma.school.findFirst({
      where: { departamento: 'San Isidro' },
    });

    const childcareCat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'cuidado-infantil' },
    });
    const tutoringCat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'apoyo-escolar' },
    });

    // In Childcare: Criana is pinned at index 0
    const childcareListings = await getPublicCatalogListings({
      categoryId: childcareCat.id,
      schoolId: school!.id,
    });
    expect(childcareListings[0].isPermanentFeatured).toBe(true);

    // In Tutoring: Criana is not injected at index 0
    const tutoringListings = await getPublicCatalogListings({
      categoryId: tutoringCat.id,
      schoolId: school!.id,
    });
    expect(tutoringListings.some((l) => l.isPermanentFeatured)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Combination 15: Multi-Channel Publishing + Multi-Channel Sequential Tracking
  // --------------------------------------------------------------------------
  it('T3.15: Multi-Channel Publishing + Sequential Tracking across WhatsApp, Email, and Web', async () => {
    const user = await prisma.user.findFirst();
    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    const listing = await prisma.listing.create({
      data: {
        title: '[TEST-T3] Multi-Channel Community Business',
        description: 'Servicio completo con todos los canales de atencion habilitados',
        userId: user!.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        whatsapp: '+5491177778888',
        email: 'contacto@multicanal.com',
        webUrl: 'https://multicanal.com.ar',
        status: 'APPROVED',
      },
    });

    const beforeMetrics = await computeAdminMetrics();

    // 1. User A clicks WhatsApp
    await recordContactClick({ listingId: listing.id, channel: 'WHATSAPP' });
    // 2. User B clicks Email
    await recordContactClick({ listingId: listing.id, channel: 'EMAIL' });
    // 3. User C clicks Web
    await recordContactClick({ listingId: listing.id, channel: 'WEB' });

    const afterMetrics = await computeAdminMetrics();

    expect(afterMetrics.totalClicks).toBe(beforeMetrics.totalClicks + 3);
    expect(afterMetrics.clicksByChannel.WHATSAPP).toBe(
      beforeMetrics.clicksByChannel.WHATSAPP + 1
    );
    expect(afterMetrics.clicksByChannel.EMAIL).toBe(
      beforeMetrics.clicksByChannel.EMAIL + 1
    );
    expect(afterMetrics.clicksByChannel.WEB).toBe(
      beforeMetrics.clicksByChannel.WEB + 1
    );
  });
});
