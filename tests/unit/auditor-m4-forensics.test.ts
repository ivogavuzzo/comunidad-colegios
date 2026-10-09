import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  applyLocalRuleBasedCorrection,
  moderateContentWithGemini,
  ARGENTINE_SCHOOL_COLLOQUIALISMS,
} from '@/lib/gemini';
import {
  generate256BitOtpToken,
  createListingModerationTokens,
  buildModerationEmailHtml,
  sendAdminModerationEmail,
  getSentEmails,
  clearSentEmails,
  INSTITUTIONAL_FOOTER_TEXT,
} from '@/lib/email';
import { GET as handleOtpGet } from '@/app/api/moderation/otp/route';
import { NextRequest } from 'next/server';

describe('FORENSIC INTEGRITY AUDIT: Milestone 4 (Gemini AI & 1-Click OTP)', () => {
  let auditUser: any;
  let auditSchool: any;
  let auditCategory: any;
  let auditSubcategory: any;

  beforeAll(async () => {
    await prisma.$connect();
    clearSentEmails();

    auditSchool = await prisma.school.findFirst();
    auditCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    auditSubcategory = auditCategory.subcategories[0];

    auditUser = await prisma.user.create({
      data: {
        email: `forensic-audit-${Date.now()}@criana-audit.internal`,
        name: 'Auditor Forense M4',
        dni: '40999888',
        isOnboarded: true,
        schoolOfOriginId: auditSchool?.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.moderationOtpToken.deleteMany({
      where: { listing: { title: { startsWith: '[FORENSIC-AUDIT]' } } },
    });
    await prisma.listing.deleteMany({
      where: { title: { startsWith: '[FORENSIC-AUDIT]' } },
    });
    if (auditUser?.id) {
      await prisma.user.delete({ where: { id: auditUser.id } });
    }
  });

  // =========================================================================
  // 1. CSPRNG Entropy & Cryptographic Token Generation
  // =========================================================================
  describe('Forensic 1: Cryptographic Entropy & Token Properties', () => {
    it('generates 256-bit CSPRNG tokens with 64 hex characters and zero collisions across 2,000 samples', () => {
      const tokens = new Set<string>();
      const N = 2000;
      for (let i = 0; i < N; i++) {
        const token = generate256BitOtpToken();
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]{64}$/);
        tokens.add(token);
      }
      expect(tokens.size).toBe(N);
    });

    it('creates persistent ModerationOtpToken records in SQLite with foreign keys', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] Listing Tokens Persistence',
          description: 'Aviso para auditar persistencia de tokens de moderacion',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken, rejectToken, expiresAt } =
        await createListingModerationTokens(listing.id);

      expect(approveToken).toHaveLength(64);
      expect(rejectToken).toHaveLength(64);
      expect(approveToken).not.toBe(rejectToken);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const dbTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      expect(dbTokens).toHaveLength(2);

      const approveRecord = dbTokens.find((t) => t.action === 'APPROVE');
      const rejectRecord = dbTokens.find((t) => t.action === 'REJECT');

      expect(approveRecord).toBeDefined();
      expect(approveRecord?.token).toBe(approveToken);
      expect(approveRecord?.usedAt).toBeNull();
      expect(approveRecord?.usedByIp).toBeNull();

      expect(rejectRecord).toBeDefined();
      expect(rejectRecord?.token).toBe(rejectToken);
      expect(rejectRecord?.usedAt).toBeNull();
      expect(rejectRecord?.usedByIp).toBeNull();
    });
  });

  // =========================================================================
  // 2. Gemini AI Moderation Pipeline & Regex Fallback Authenticity
  // =========================================================================
  describe('Forensic 2: AI Pipeline & Dynamic Content Processing', () => {
    it('dynamically normalizes novel abbreviations and collapses whitespace without static bypasses', () => {
      const novelInputs = [
        {
          input: {
            title: '  taller de fisica   q ayuda a ingresar   ',
            description: '  preparamos examenes xq nos importa tmb su futuro academico  ',
          },
          expectedTitle: 'Taller de fisica que ayuda a ingresar',
          expectedDescContains: ['porque', 'también', 'futuro academico'],
        },
        {
          input: {
            title: 'clases de computacion qe arrancan en mayo',
            description: 'grupos reducidos xq priorizamos la practica',
          },
          expectedTitle: 'Clases de computacion que arrancan en mayo',
          expectedDescContains: ['porque'],
        },
      ];

      for (const { input, expectedTitle, expectedDescContains } of novelInputs) {
        const result = applyLocalRuleBasedCorrection(input);
        expect(result.correctedTitle).toBe(expectedTitle);
        for (const needle of expectedDescContains) {
          expect(result.correctedDescription.toLowerCase()).toContain(needle.toLowerCase());
        }
        expect(result.flagged).toBe(false);
      }
    });

    it('strictly preserves ALL 15 Argentine school colloquialisms in novel sentences', () => {
      for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
        const sentence = `Aviso especial con ${slang} para toda la comunidad`;
        const result = applyLocalRuleBasedCorrection({
          title: sentence,
          description: sentence,
        });
        expect(result.correctedTitle.toLowerCase()).toContain(slang.toLowerCase());
        expect(result.correctedDescription.toLowerCase()).toContain(slang.toLowerCase());
      }
    });

    it('accurately distinguishes harmful terms (singular/plural) from harmless lookalikes', () => {
      // Harmful terms should flag
      const harmfulSamples = [
        'Venta de armas de fuego',
        'Distribución de drogas en secundaria',
        'Ofrecemos sicarios y aprietes',
        'Organización de estafas piramidales',
        'Actividades totalmente ilegales en la zona',
        'Apuestas clandestinas para adolescentes',
        'Pornografia infantil o contenido prohibido',
      ];

      for (const text of harmfulSamples) {
        const res = applyLocalRuleBasedCorrection({ title: text, description: 'Contacto directo' });
        expect(res.flagged, `Should flag harmful: "${text}"`).toBe(true);
        expect(res.flagReason).not.toBeNull();
      }

      // Harmless lookalikes should NOT flag
      const harmlessSamples = [
        'Venta de armario escolar de madera',
        'Clases de violinista profesional',
        'Apuesto joven busca empleo como preceptor',
        'Descuentos en droguería comunitaria habilitada',
      ];

      for (const text of harmlessSamples) {
        const res = applyLocalRuleBasedCorrection({ title: text, description: 'Detalles por wsp' });
        expect(res.flagged, `Should NOT flag harmless: "${text}"`).toBe(false);
        expect(res.flagReason).toBeNull();
      }
    });
  });

  // =========================================================================
  // 3. Database State Machine & One-Click OTP Security Enforcement
  // =========================================================================
  describe('Forensic 3: Authentic Database State Transitions & Sibling Invalidation', () => {
    it('executes APPROVE action atomically: updates listing status, copies AI diff, marks token used, and invalidates sibling', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] Aviso para aprobacion atomica',
          description: 'Descripcion original antes de aprobacion',
          aiCorrectedTitle: '[FORENSIC-AUDIT] Aviso para Aprobación Atómica Corregida',
          aiCorrectedDesc: 'Descripción original antes de aprobación corregida por IA',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

      // Invoke endpoint via NextRequest
      const req = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`,
        {
          headers: {
            accept: 'application/json',
            'x-forwarded-for': '200.45.10.99',
          },
        }
      );

      const res = await handleOtpGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.action).toBe('APPROVE');
      expect(json.listingStatus).toBe('APPROVED');

      // Verify SQLite state for Listing
      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe('APPROVED');
      expect(dbListing?.title).toBe('[FORENSIC-AUDIT] Aviso para Aprobación Atómica Corregida');
      expect(dbListing?.description).toBe('Descripción original antes de aprobación corregida por IA');

      // Verify SQLite state for Tokens
      const dbTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      const approveRow = dbTokens.find((t) => t.token === approveToken);
      const rejectRow = dbTokens.find((t) => t.token === rejectToken);

      expect(approveRow?.usedAt).not.toBeNull();
      expect(approveRow?.usedByIp).toBe('200.45.10.99');

      // Sibling token must be invalidated
      expect(rejectRow?.usedAt).not.toBeNull();
      expect(rejectRow?.usedByIp).toBe('200.45.10.99-sibling-invalidated');
    });

    it('enforces replay defense: returns 409 Conflict with exact Spanish message when token is reused', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] Replay Test Listing',
          description: 'Aviso para verificar defensa contra repeticion',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken } = await createListingModerationTokens(listing.id);

      // First call -> 200 OK
      const req1 = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`
      );
      const res1 = await handleOtpGet(req1);
      expect(res1.status).toBe(200);

      // Second call (Replay) -> 409 Conflict
      const req2 = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`
      );
      const res2 = await handleOtpGet(req2);
      expect(res2.status).toBe(409);

      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.message).toBe(
        'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
      );
      expect(json2.listingStatus).toBe('APPROVED');
    });

    it('enforces sibling rejection: returns 409 Conflict if sibling token is invoked after action completed', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] Sibling Test Listing',
          description: 'Aviso para verificar invalidacion de token hermano',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

      // Approve listing first
      const reqApprove = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=json`
      );
      const resApprove = await handleOtpGet(reqApprove);
      expect(resApprove.status).toBe(200);

      // Try invoking reject token after approval
      const reqReject = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${rejectToken}&format=json`
      );
      const resReject = await handleOtpGet(reqReject);
      expect(resReject.status).toBe(409);

      const jsonReject = await resReject.json();
      expect(jsonReject.success).toBe(false);
      expect(jsonReject.message).toContain('uso único');
    });

    it('rejects expired tokens with 410 Gone and leaves listing intact', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] Expired Token Test',
          description: 'Aviso con token expirado',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const expiredToken = generate256BitOtpToken();
      await prisma.moderationOtpToken.create({
        data: {
          token: expiredToken,
          listingId: listing.id,
          action: 'APPROVE',
          expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${expiredToken}&format=json`
      );
      const res = await handleOtpGet(req);
      expect(res.status).toBe(410);

      const json = await res.json();
      expect(json.message).toContain('ha expirado');

      // Listing must still be PENDING in DB
      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe('PENDING');
    });

    it('rejects nonexistent or missing tokens with 404 Not Found', async () => {
      // Nonexistent token
      const req1 = new NextRequest(
        'http://localhost:3000/api/moderation/otp?token=0000000000000000000000000000000000000000000000000000000000000000&format=json'
      );
      const res1 = await handleOtpGet(req1);
      expect(res1.status).toBe(404);

      // Missing token param
      const req2 = new NextRequest('http://localhost:3000/api/moderation/otp');
      const res2 = await handleOtpGet(req2);
      expect(res2.status).toBe(404);
    });

    it('renders clean HTML page with Criana institutional footer when format=html is requested', async () => {
      const listing = await prisma.listing.create({
        data: {
          title: '[FORENSIC-AUDIT] HTML View Listing',
          description: 'Aviso para verificar renderizado HTML',
          userId: auditUser.id,
          schoolId: auditSchool.id,
          categoryId: auditCategory.id,
          subcategoryId: auditSubcategory.id,
          status: 'PENDING',
        },
      });

      const { approveToken } = await createListingModerationTokens(listing.id);

      const req = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveToken}&format=html`,
        {
          headers: { accept: 'text/html' },
        }
      );

      const res = await handleOtpGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Comunidades de Colegios (by Criana)');
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
      expect(html).toContain('Publicación Aprobada');
    });
  });

  // =========================================================================
  // 4. Transactional Email Integrity
  // =========================================================================
  describe('Forensic 4: Transactional Email Structure & Links', () => {
    it('builds complete HTML and text email templates with 1-click OTP links and Criana footer', () => {
      const approveToken = generate256BitOtpToken();
      const rejectToken = generate256BitOtpToken();

      const email = buildModerationEmailHtml({
        listingId: 'test-audit-email-id',
        title: 'Servicio de combi escolar',
        description: 'Viajes seguros para chicos de primaria',
        aiCorrectedTitle: 'Servicio de Combi Escolar',
        aiCorrectedDesc: 'Viajes seguros para chicos de primaria y jardín',
        schoolName: auditSchool.nombre,
        approveToken,
        rejectToken,
        baseUrl: 'http://localhost:3000',
      });

      // Subject checks
      expect(email.subject).toContain('Nuevo aviso pendiente');
      expect(email.subject).toContain('Servicio de combi escolar');
      expect(email.subject).toContain(auditSchool.nombre);

      // Links check
      expect(email.html).toContain(`/api/moderation/otp?token=${approveToken}`);
      expect(email.html).toContain(`/api/moderation/otp?token=${rejectToken}`);
      expect(email.text).toContain(`/api/moderation/otp?token=${approveToken}`);
      expect(email.text).toContain(`/api/moderation/otp?token=${rejectToken}`);

      // Criana Institutional Footer check
      expect(email.html).toContain(INSTITUTIONAL_FOOTER_TEXT);
      expect(email.text).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });
  });
});
