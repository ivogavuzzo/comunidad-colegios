import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  LEGAL_BANNER_TEXT,
  INSTITUTIONAL_FOOTER_TEXT,
  sanitizeAndValidateDni,
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

describe('Tier 4: Real-World Application Scenarios', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.contactClick.deleteMany({
      where: { listing: { title: { startsWith: '[SCENARIO]' } } },
    });
    await prisma.moderationOtpToken.deleteMany({
      where: { listing: { title: { startsWith: '[SCENARIO]' } } },
    });
    await prisma.listing.deleteMany({
      where: { title: { startsWith: '[SCENARIO]' } },
    });
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: '[SCENARIO]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@scenario-test.example.com' } },
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 1: School Family Childcare Discovery & WhatsApp Connection
  // --------------------------------------------------------------------------
  it('Scenario 1: School Family Local Childcare Discovery & WhatsApp Connection Journey', async () => {
    // 1. Parent enters platform: checks persistent legal banner and footer
    expect(LEGAL_BANNER_TEXT).toContain('Comunidades de Colegios');
    expect(INSTITUTIONAL_FOOTER_TEXT).toBe('Esta comunidad es una iniciativa de Criana');

    // 2. Parent navigates cascading filters: GBA -> Vicente Lopez -> School
    const jurisdictions = await getCascadingJurisdictions();
    expect(jurisdictions).toContain('GBA');

    const partidos = await getCascadingDepartamentos('GBA');
    expect(partidos).toContain('Vicente Lopez');

    const schools = await getCascadingSchools({
      jurisdiccion: 'GBA',
      departamento: 'Vicente Lopez',
    });
    expect(schools.length).toBeGreaterThan(0);
    const targetSchool = schools[0];

    // 3. Parent selects "Cuidado Infantil" category
    const cat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'cuidado-infantil' },
    });

    // 4. Query public catalog: Criana profile is guaranteed at index 0 (pinned position 1)
    const listings = await getPublicCatalogListings({
      categoryId: cat.id,
      schoolId: targetSchool.id,
    });

    expect(listings.length).toBeGreaterThanOrEqual(1);
    const crianaCard = listings[0];
    expect(crianaCard.isPermanentFeatured).toBe(true);
    expect(crianaCard.pinnedPosition).toBe(1);
    expect(crianaCard.whatsapp).toBeTruthy();

    // 5. Parent clicks Criana's WhatsApp button: tracked silently in background
    const beforeMetrics = await computeAdminMetrics();

    const trackResult = await recordContactClick({
      listingId: crianaCard.id,
      channel: 'WHATSAPP',
      ip: '190.19.45.22',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });

    expect(trackResult.success).toBe(true);
    expect(trackResult.ipHash).toMatch(/^[a-f0-9]{64}$/);

    // 6. Admin metrics reflect the new contact interaction
    const afterMetrics = await computeAdminMetrics();
    expect(afterMetrics.clicksByChannel.WHATSAPP).toBeGreaterThanOrEqual(
      beforeMetrics.clicksByChannel.WHATSAPP + 1
    );
    expect(afterMetrics.totalClicks).toBeGreaterThanOrEqual(beforeMetrics.totalClicks + 1);

    const eventRecord = await prisma.contactClick.findUnique({
      where: { id: trackResult.eventId },
    });
    expect(eventRecord).toBeDefined();
    expect(eventRecord!.channel).toBe('WHATSAPP');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Community Teacher First-Time Advertiser Journey
  // --------------------------------------------------------------------------
  it('Scenario 2: Community Teacher First-Time Advertiser Journey (SSO -> Onboarding -> Publish)', async () => {
    // 1. Teacher logs in via Google SSO: first session created
    const teacherUser = await prisma.user.create({
      data: {
        name: '[SCENARIO] Mariana Docente',
        email: 'mariana.docente@scenario-test.example.com',
        image: 'https://lh3.googleusercontent.com/mariana-avatar',
        isOnboarded: false,
        role: 'USER',
      },
    });

    // 2. Teacher attempts to publish: blocked by onboarding gate
    expect(teacherUser.isOnboarded).toBe(false);

    // 3. Teacher completes mandatory onboarding with Argentine DNI and School of Origin
    const dniValidation = sanitizeAndValidateDni('32.456.789');
    expect(dniValidation.isValid).toBe(true);

    const schoolOfOrigin = await prisma.school.findFirst({
      where: { departamento: 'San Isidro' },
    });
    expect(schoolOfOrigin).toBeDefined();

    const onboardedTeacher = await prisma.user.update({
      where: { id: teacherUser.id },
      data: {
        dni: dniValidation.cleanDni,
        schoolOfOriginId: schoolOfOrigin!.id,
        isOnboarded: true,
      },
    });

    expect(onboardedTeacher.isOnboarded).toBe(true);
    expect(onboardedTeacher.dni).toBe('32456789');

    // 4. Teacher submits tutoring ad with Argentine school colloquialisms
    const rawAd = {
      title: 'apoyo escolar para chicos de primaria y compas',
      description:
        'Hola familias del cole! Doy clases de apoyo escolar y tecnicas de estudio para que los chicos preparen sus tareas y viandas con tranquilidad. Escribanme al wsp!',
    };

    // 5. Gemini AI pipeline processes text
    const aiCorrection = simulateGeminiAiCorrection(rawAd);
    expect(aiCorrection.correctedTitle).toContain('Apoyo escolar');
    expect(aiCorrection.correctedDescription).toContain('chicos');
    expect(aiCorrection.correctedDescription).toContain('wsp');
    expect(aiCorrection.isFlagged).toBe(false);

    // 6. Ad is persisted in PENDING status
    const tutoringCat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'apoyo-escolar' },
      include: { subcategories: true },
    });

    const listing = await prisma.listing.create({
      data: {
        title: `[SCENARIO] ${rawAd.title}`,
        description: rawAd.description,
        aiCorrectedTitle: `[SCENARIO] ${aiCorrection.correctedTitle}`,
        aiCorrectedDesc: aiCorrection.correctedDescription,
        userId: onboardedTeacher.id,
        categoryId: tutoringCat.id,
        subcategoryId: tutoringCat.subcategories[0].id,
        schoolId: schoolOfOrigin!.id,
        whatsapp: '+5491155556666',
        email: onboardedTeacher.email,
        status: 'PENDING',
      },
    });

    expect(listing.status).toBe('PENDING');
    expect(listing.aiCorrectedTitle).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Missing School Fallback Journey (From Request to Published Service)
  // --------------------------------------------------------------------------
  it('Scenario 3: Missing School Fallback Journey ("Mi colegio no está" -> Ad Publication)', async () => {
    // 1. Parent searches for their new school in Tigre; does not find it in catalog
    const searchResults = await getCascadingSchools({
      jurisdiccion: 'GBA',
      departamento: 'Tigre',
      query: 'Colegio Nuevo Horizonte Verde',
    });
    expect(searchResults.length).toBe(0);

    // 2. Parent clicks "Mi colegio no está" and submits fallback modal
    const schoolRequest = await prisma.schoolRequest.create({
      data: {
        nombre: '[SCENARIO] Colegio Nuevo Horizonte Verde',
        jurisdiccion: 'GBA',
        departamento: 'Tigre',
        localidad: 'Rincón de Milberg',
        domicilio: 'Av. Santa María de las Conchas 4200',
        userEmail: 'padre.tigre@scenario-test.example.com',
        userName: 'Carlos Benítez',
        status: 'PENDING',
      },
    });

    expect(schoolRequest.id).toBeDefined();
    expect(schoolRequest.status).toBe('PENDING');

    // 3. Parent immediately publishes carpooling ad associated to this request
    const user = await prisma.user.create({
      data: {
        name: '[SCENARIO] Carlos Benítez',
        email: 'padre.tigre@scenario-test.example.com',
        dni: '29876543',
        isOnboarded: true,
        role: 'USER',
      },
    });

    const transportCat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'transporte-escolar' },
      include: { subcategories: true },
    });

    const carpoolListing = await prisma.listing.create({
      data: {
        title: '[SCENARIO] Pool escolar para Nuevo Horizonte Verde',
        description:
          'Viajes compartidos todas las mañanas saliendo de Rincón de Milberg hacia el cole',
        userId: user.id,
        categoryId: transportCat.id,
        subcategoryId: transportCat.subcategories[0].id,
        schoolRequestId: schoolRequest.id,
        whatsapp: '+5491144447777',
        status: 'PENDING',
      },
    });

    expect(carpoolListing.schoolRequestId).toBe(schoolRequest.id);
    expect(carpoolListing.status).toBe('PENDING');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Admin One-Click Moderation Journey (Approval Flow & Replay Defense)
  // --------------------------------------------------------------------------
  it('Scenario 4: Administrator One-Click Moderation Journey (Approval Flow & Replay Defense)', async () => {
    // 1. Advertiser publishes uniform ad in CABA Comuna 13
    const user = await prisma.user.create({
      data: {
        name: '[SCENARIO] Mamá de Primaria',
        email: 'uniformes.mama@scenario-test.example.com',
        dni: '36789012',
        isOnboarded: true,
      },
    });

    const uniformsCat = await prisma.category.findUniqueOrThrow({
      where: { slug: 'uniformes-libros' },
      include: { subcategories: true },
    });

    const school = await prisma.school.findFirst({
      where: { jurisdiccion: 'CABA', departamento: 'Comuna 13' },
    });

    const listing = await prisma.listing.create({
      data: {
        title: '[SCENARIO] lote de uniformes impecables talle 8 y 10',
        description: 'chombas polleras y sweaters del cole en perfecto estado listos para usar',
        aiCorrectedTitle: '[SCENARIO] Lote de Uniformes Impecables Talles 8 y 10',
        aiCorrectedDesc: 'Chombas, polleras y sweaters del colegio en perfecto estado listos para usar',
        userId: user.id,
        categoryId: uniformsCat.id,
        subcategoryId: uniformsCat.subcategories[0].id,
        schoolId: school!.id,
        whatsapp: '+5491166668888',
        status: 'PENDING',
      },
    });

    // 2. Generate 256-bit cryptographic OTP tokens
    const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);
    expect(approveToken).toMatch(/^[a-f0-9]{64}$/);

    // 3. Admin clicks 1-Click Approve OTP from transactional email
    const approvalResult = await executeModerationOtpAction(approveToken);
    expect(approvalResult.success).toBe(true);
    expect(approvalResult.httpStatus).toBe(200);
    expect(approvalResult.listingStatus).toBe('APPROVED');

    // 4. Verify AI corrections applied to live listing
    const liveListing = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(liveListing!.title).toBe('[SCENARIO] Lote de Uniformes Impecables Talles 8 y 10');
    expect(liveListing!.status).toBe('APPROVED');

    // 5. Verify sibling Reject token is atomically invalidated
    const siblingResult = await executeModerationOtpAction(rejectToken);
    expect(siblingResult.success).toBe(false);
    expect(siblingResult.httpStatus).toBe(409);

    // 6. Adversary or duplicate email click triggers replay defense
    const replayResult = await executeModerationOtpAction(approveToken);
    expect(replayResult.success).toBe(false);
    expect(replayResult.httpStatus).toBe(409);
    expect(replayResult.message).toBe(
      'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
    );
    expect(replayResult.listingStatus).toBe('APPROVED');

    // 7. Verify listing is now publicly searchable in Comuna 13
    const publicListings = await getPublicCatalogListings({
      categoryId: uniformsCat.id,
      schoolId: school!.id,
    });
    const foundAd = publicListings.find((l) => l.id === listing.id);
    expect(foundAd).toBeDefined();
    expect(foundAd!.status).toBe('APPROVED');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Admin One-Click Moderation Journey (Rejection Flow)
  // --------------------------------------------------------------------------
  it('Scenario 5: Administrator One-Click Moderation Journey (Rejection Flow & Policy Enforcement)', async () => {
    // 1. Spammer publishes inappropriate ad
    const user = await prisma.user.create({
      data: {
        name: '[SCENARIO] Spammer Bot',
        email: 'spam@scenario-test.example.com',
        dni: '40111222',
        isOnboarded: true,
      },
    });

    const cat = await prisma.category.findFirst({ include: { subcategories: true } });

    // 2. Gemini AI flags content
    const rawSpam = {
      title: 'estafa y venta no autorizada de productos',
      description: 'contenido no relacionado con la comunidad escolar que viola normas',
    };
    const aiCheck = simulateGeminiAiCorrection(rawSpam);
    expect(aiCheck.isFlagged).toBe(true);

    const listing = await prisma.listing.create({
      data: {
        title: `[SCENARIO] ${rawSpam.title}`,
        description: rawSpam.description,
        userId: user.id,
        categoryId: cat!.id,
        subcategoryId: cat!.subcategories[0].id,
        status: 'PENDING',
      },
    });

    const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

    // 3. Admin clicks 1-Click Reject OTP link
    const rejectionResult = await executeModerationOtpAction(rejectToken);
    expect(rejectionResult.success).toBe(true);
    expect(rejectionResult.httpStatus).toBe(200);
    expect(rejectionResult.listingStatus).toBe('REJECTED');

    // 4. Listing marked REJECTED in database
    const rejectedAd = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(rejectedAd!.status).toBe('REJECTED');

    // 5. Sibling Approve token is invalidated
    const approveSiblingResult = await executeModerationOtpAction(approveToken);
    expect(approveSiblingResult.httpStatus).toBe(409);

    // 6. Rejected ad is 100% excluded from public catalog
    const catalog = await getPublicCatalogListings({ categoryId: cat!.id });
    expect(catalog.some((l) => l.id === listing.id)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Platform Analytics & Administrative Audit
  // --------------------------------------------------------------------------
  it('Scenario 6: Comprehensive Administrative Dashboard & Channel Analytics Audit', async () => {
    // 1. Fetch live metrics from database
    const metrics = await computeAdminMetrics();

    // 2. Audit total listings & distribution
    expect(metrics.totalListings).toBeGreaterThanOrEqual(1);
    expect(metrics.listingsByStatus.APPROVED).toBeGreaterThanOrEqual(1);
    expect(typeof metrics.listingsByStatus.PENDING).toBe('number');
    expect(typeof metrics.listingsByStatus.REJECTED).toBe('number');

    // 3. Audit total clicks & channel distribution
    expect(metrics.totalClicks).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.clicksByChannel.WHATSAPP).toBe('number');
    expect(typeof metrics.clicksByChannel.EMAIL).toBe('number');
    expect(typeof metrics.clicksByChannel.WEB).toBe('number');

    // 4. Audit mathematical consistency: sum of channels equals total clicks
    const channelSum =
      metrics.clicksByChannel.WHATSAPP +
      metrics.clicksByChannel.EMAIL +
      metrics.clicksByChannel.WEB;
    expect(channelSum).toBe(metrics.totalClicks);

    // 5. Audit pending school requests queue
    const pendingSchoolRequests = await prisma.schoolRequest.count({
      where: { status: 'PENDING' },
    });
    expect(pendingSchoolRequests).toBeGreaterThanOrEqual(0);
  });
});
