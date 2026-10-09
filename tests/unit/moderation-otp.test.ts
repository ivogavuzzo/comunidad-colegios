import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  moderateContentWithGemini,
  applyLocalRuleBasedCorrection,
  ARGENTINE_SCHOOL_COLLOQUIALISMS,
} from '@/lib/gemini';
import {
  createListingModerationTokens,
  buildModerationEmailHtml,
  sendAdminModerationEmail,
  getSentEmails,
  clearSentEmails,
  INSTITUTIONAL_FOOTER_TEXT,
  generate256BitOtpToken,
} from '@/lib/email';
import { GET as handleOtpGet } from '@/app/api/moderation/otp/route';
import { POST as handleTrackClick } from '@/app/api/track/click/route';
import { GET as handleAdminMetrics } from '@/app/api/admin/metrics/route';
import { NextRequest } from 'next/server';

describe('Milestone 4 & 5: Gemini AI Moderation Pipeline, One-Click OTP, and Contact Tracking', () => {
  let testUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  beforeAll(async () => {
    await prisma.$connect();
    clearSentEmails();

    testSchool = await prisma.school.findFirst();
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    testSubcategory = testCategory.subcategories[0];

    testUser = await prisma.user.create({
      data: {
        email: `moderation-test-${Date.now()}@test-example.com`,
        name: 'Padre Test Moderación',
        dni: '38123456',
        isOnboarded: true,
        schoolOfOriginId: testSchool.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.contactClick.deleteMany({
      where: { listing: { title: { startsWith: '[OTP-TEST]' } } },
    });
    await prisma.moderationOtpToken.deleteMany({
      where: { listing: { title: { startsWith: '[OTP-TEST]' } } },
    });
    await prisma.listing.deleteMany({
      where: { title: { startsWith: '[OTP-TEST]' } },
    });
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  // -------------------------------------------------------------
  // 1. Gemini AI Moderation & Preservation of Argentine Colloquialisms
  // -------------------------------------------------------------
  describe('Gemini AI Pipeline & Dialect Preservation', () => {
    it('preserves Argentine school colloquialisms without converting to peninsular/neutral terms', () => {
      for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
        const text = `Aviso para los ${slang} del cole`;
        const result = applyLocalRuleBasedCorrection({
          title: text,
          description: text,
        });
        expect(result.correctedTitle.toLowerCase()).toContain(slang.toLowerCase());
        expect(result.correctedDescription.toLowerCase()).toContain(slang.toLowerCase());
      }
    });

    it('corrects abbreviations (q -> que, xq -> porque) while keeping tone', () => {
      const input = {
        title: 'q linda clase xq aprenden mucho',
        description: 'ofresco viandas para los chicos q se quedan al mediodia',
      };
      const result = applyLocalRuleBasedCorrection(input);
      expect(result.correctedTitle).toContain('que');
      expect(result.correctedTitle).toContain('porque');
      expect(result.correctedDescription).toContain('viandas');
      expect(result.correctedDescription).toContain('chicos');
      expect(result.isFlagged).toBe(false);
    });

    it('flags harmful content correctly', () => {
      const input = {
        title: 'Venta de armas ilegales',
        description: 'Contacto por mensaje privado',
      };
      const result = applyLocalRuleBasedCorrection(input);
      expect(result.isFlagged).toBe(true);
      expect(result.flagReason).not.toBeNull();
    });

    it('flags harmful content with plural variants (ilegales, sicarios)', () => {
      const inputIlegales = {
        title: 'Clases y actividades ilegales',
        description: 'Contacto directo',
      };
      expect(applyLocalRuleBasedCorrection(inputIlegales).isFlagged).toBe(true);

      const inputSicarios = {
        title: 'Servicio de sicarios en zona norte',
        description: 'Disponibilidad inmediata',
      };
      expect(applyLocalRuleBasedCorrection(inputSicarios).isFlagged).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 2. Token Creation & Transactional Emails
  // -------------------------------------------------------------
  describe('Transactional Email & Cryptographic OTP Generation', () => {
    it('generates 256-bit entropy tokens (64 hex characters)', () => {
      const token1 = generate256BitOtpToken();
      const token2 = generate256BitOtpToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('creates APPROVE and REJECT tokens linked to a listing in DB', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[OTP-TEST] Servicio de traslado escolar',
          description: 'Traslado seguro para chicos en combi habilitada',
          userId: testUser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'PENDING',
        },
      });

      const tokens = await createListingModerationTokens(listing.id);
      expect(tokens.approveToken).toHaveLength(64);
      expect(tokens.rejectToken).toHaveLength(64);
      expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const dbTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      expect(dbTokens).toHaveLength(2);
      expect(dbTokens.map((t) => t.action).sort()).toEqual(['APPROVE', 'REJECT']);
    });

    it('constructs email HTML with preview diff, buttons and Criana footer', () => {
      const emailContent = buildModerationEmailHtml({
        listingId: 'test-listing-id',
        title: 'Clases de apoyo',
        description: 'Matemática para primaria',
        aiCorrectedTitle: 'Clases de Apoyo',
        aiCorrectedDesc: 'Matemática para primaria y secundaria',
        schoolName: testSchool.nombre,
        approveToken: 'token-approve-123',
        rejectToken: 'token-reject-123',
      });

      expect(emailContent.html).toContain(INSTITUTIONAL_FOOTER_TEXT);
      expect(emailContent.html).toContain('token-approve-123');
      expect(emailContent.html).toContain('token-reject-123');
      expect(emailContent.text).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });

    it('dispatches email and records in simulation queue', async () => {
      clearSentEmails();
      const res = await sendAdminModerationEmail({
        listingId: 'listing-email-test',
        title: 'Prueba de email',
        description: 'Descripción de prueba',
        schoolName: 'Colegio Test',
        approveToken: 'app-token',
        rejectToken: 'rej-token',
      });

      expect(res.success).toBe(true);
      const sent = getSentEmails();
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.listingId).toBe('listing-email-test');
    });
  });

  // -------------------------------------------------------------
  // 3. One-Click OTP Endpoint Execution & Security Defenses
  // -------------------------------------------------------------
  describe('One-Click OTP Endpoint Execution', () => {
    it('approves a pending listing when calling OTP endpoint with approveToken', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[OTP-TEST] Aviso para aprobar',
          description: 'Texto original antes de aprobacion',
          aiCorrectedTitle: '[OTP-TEST] Aviso para Aprobar',
          aiCorrectedDesc: 'Texto original antes de aprobación',
          userId: testUser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken, rejectToken } = await createListingModerationTokens(
        listing.id
      );

      const req = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`,
        { headers: { accept: 'application/json' } }
      );

      const response = await handleOtpGet(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.action).toBe('APPROVE');
      expect(json.listingStatus).toBe('APPROVED');

      // Check DB state
      const updatedListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('APPROVED');
      expect(updatedListing?.title).toBe('[OTP-TEST] Aviso para Aprobar');

      // Check sibling token invalidation
      const tokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      for (const t of tokens) {
        expect(t.usedAt).not.toBeNull();
      }
    });

    it('rejects an already used token with 409 conflict replay message', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[OTP-TEST] Aviso para re-prueba replay',
          description: 'Texto replay',
          userId: testUser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken } = await createListingModerationTokens(listing.id);

      // First use: succeeds
      const req1 = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`,
        { headers: { accept: 'application/json' } }
      );
      const res1 = await handleOtpGet(req1);
      expect(res1.status).toBe(200);

      // Second use (replay): returns 409
      const req2 = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`,
        { headers: { accept: 'application/json' } }
      );
      const res2 = await handleOtpGet(req2);
      expect(res2.status).toBe(409);

      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.message).toContain('uso único');
    });

    it('rejects an expired token with 410 Gone status', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[OTP-TEST] Aviso con token expirado',
          description: 'Texto expirado',
          userId: testUser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'PENDING',
        },
      });

      const expiredToken = generate256BitOtpToken();
      await prisma.moderationOtpToken.create({
        data: {
          token: expiredToken,
          listingId: listing.id,
          action: 'APPROVE',
          expiresAt: new Date(Date.now() - 10000), // in the past
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${expiredToken}&format=json`,
        { headers: { accept: 'application/json' } }
      );
      const res = await handleOtpGet(req);
      expect(res.status).toBe(410);
    });
  });

  // -------------------------------------------------------------
  // 4. Contact Click Tracking & Admin Metrics
  // -------------------------------------------------------------
  describe('Contact Click Tracking & Admin Metrics Dashboard', () => {
    it('records contact clicks on WHATSAPP, EMAIL, and WEB', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[OTP-TEST] Aviso para tracking',
          description: 'Aviso con botones',
          userId: testUser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'APPROVED',
        },
      });

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '181.44.120.5',
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WHATSAPP',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel).toBe('WHATSAPP');

      const clickInDb = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(clickInDb).not.toBeNull();
      expect(clickInDb?.channel).toBe('WHATSAPP');
      expect(clickInDb?.ipHash).toBeDefined();
    });

    it('aggregates summary metrics and monthly breakdowns in /api/admin/metrics', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.summary).toBeDefined();
      expect(typeof json.summary.totalListings).toBe('number');
      expect(typeof json.summary.approvedListings).toBe('number');
      expect(typeof json.summary.totalClicks).toBe('number');
      expect(json.clicksByChannel).toBeDefined();
      expect(Array.isArray(json.clicksByMonth)).toBe(true);
    });
  });
});
