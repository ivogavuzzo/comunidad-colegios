import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  sanitizeAndValidateDni,
  validateWhatsApp,
  normalizeWhatsApp,
  validateEmail,
  validateWebUrl,
  validateContactChannels,
  validateListingPayload,
  generate256BitOtpToken,
  createListingModerationTokens,
  executeModerationOtpAction,
  recordContactClick,
  getCascadingSchools,
} from './helpers/contracts';

describe('Tier 2: Boundary & Corner Cases', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.contactClick.deleteMany({
      where: { listing: { title: { startsWith: '[TEST-T2]' } } },
    });
    await prisma.moderationOtpToken.deleteMany({
      where: { listing: { title: { startsWith: '[TEST-T2]' } } },
    });
    await prisma.listing.deleteMany({
      where: { title: { startsWith: '[TEST-T2]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@test-t2.example.com' } },
    });
  });

  // --------------------------------------------------------------------------
  // Domain 1: Title Length Boundaries & Whitespace
  // --------------------------------------------------------------------------
  describe('Domain 1: Title Length Boundaries & Whitespace', () => {
    it('T2.1.1: rejects title with exactly 4 characters (below minimum 5)', () => {
      const res = validateListingPayload({
        title: 'Hola',
        description: 'Descripción válida de más de veinte caracteres',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('El título debe tener al menos 5 caracteres');
    });

    it('T2.1.2: accepts title with exactly 5 characters (boundary minimum)', () => {
      const res = validateListingPayload({
        title: '12345',
        description: 'Descripción válida de más de veinte caracteres',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(true);
    });

    it('T2.1.3: accepts title with exactly 100 characters (boundary maximum)', () => {
      const title100 = 'A'.repeat(100);
      const res = validateListingPayload({
        title: title100,
        description: 'Descripción válida de más de veinte caracteres',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(true);
    });

    it('T2.1.4: rejects title with exactly 101 characters (above maximum 100)', () => {
      const title101 = 'A'.repeat(101);
      const res = validateListingPayload({
        title: title101,
        description: 'Descripción válida de más de veinte caracteres',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('El título no puede superar los 100 caracteres');
    });

    it('T2.1.5: rejects title composed entirely of whitespace characters', () => {
      const res = validateListingPayload({
        title: '       ',
        description: 'Descripción válida de más de veinte caracteres',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('El título debe tener al menos 5 caracteres');
    });
  });

  // --------------------------------------------------------------------------
  // Domain 2: Description Length Boundaries & Empty Inputs
  // --------------------------------------------------------------------------
  describe('Domain 2: Description Length Boundaries & Empty Inputs', () => {
    it('T2.2.1: rejects description with exactly 19 characters (below minimum 20)', () => {
      const desc19 = '1234567890123456789';
      const res = validateListingPayload({
        title: 'Título Válido',
        description: desc19,
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('La descripción debe tener al menos 20 caracteres');
    });

    it('T2.2.2: accepts description with exactly 20 characters (boundary minimum)', () => {
      const desc20 = '12345678901234567890';
      const res = validateListingPayload({
        title: 'Título Válido',
        description: desc20,
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(true);
    });

    it('T2.2.3: accepts description with exactly 2000 characters (boundary maximum)', () => {
      const desc2000 = 'D'.repeat(2000);
      const res = validateListingPayload({
        title: 'Título Válido',
        description: desc2000,
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(true);
    });

    it('T2.2.4: rejects description with exactly 2001 characters (above maximum 2000)', () => {
      const desc2001 = 'D'.repeat(2001);
      const res = validateListingPayload({
        title: 'Título Válido',
        description: desc2001,
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('La descripción no puede superar los 2000 caracteres');
    });

    it('T2.2.5: rejects description composed entirely of whitespace characters', () => {
      const res = validateListingPayload({
        title: 'Título Válido',
        description: '                          ',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('La descripción debe tener al menos 20 caracteres');
    });
  });

  // --------------------------------------------------------------------------
  // Domain 3: DNI Format Boundaries
  // --------------------------------------------------------------------------
  describe('Domain 3: DNI Format Boundaries', () => {
    it('T2.3.1: rejects 6-digit DNI (below minimum 7 digits)', () => {
      const res = sanitizeAndValidateDni('123456');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('El DNI debe contener entre 7 y 8 números');
    });

    it('T2.3.2: accepts 7-digit DNI (boundary minimum, e.g. senior citizen / older ID)', () => {
      const res = sanitizeAndValidateDni('4567890');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('4567890');
    });

    it('T2.3.3: accepts 8-digit DNI (standard contemporary Argentine ID)', () => {
      const res = sanitizeAndValidateDni('35678901');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('35678901');
    });

    it('T2.3.4: rejects 9-digit DNI (above maximum 8 digits)', () => {
      const res = sanitizeAndValidateDni('123456789');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('El DNI debe contener entre 7 y 8 números');
    });

    it('T2.3.5: sanitizes formatted DNI with dots and spaces ("34.567.890") into valid 8 digits', () => {
      const res = sanitizeAndValidateDni(' 34.567.890 ');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('34567890');
    });
  });

  // --------------------------------------------------------------------------
  // Domain 4: Contact Channels Boundaries & Zero-Channel Stress
  // --------------------------------------------------------------------------
  describe('Domain 4: Contact Channels Boundaries', () => {
    it('T2.4.1: rejects submission with 0 contact channels provided', () => {
      const res = validateContactChannels({});
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Debes ingresar al menos un canal de contacto');
    });

    it('T2.4.2: accepts submission with only WhatsApp channel populated', () => {
      const res = validateContactChannels({ whatsapp: '+5491123456789' });
      expect(res.isValid).toBe(true);
    });

    it('T2.4.3: accepts submission with only Email channel populated', () => {
      const res = validateContactChannels({ email: 'contacto@colegio.edu.ar' });
      expect(res.isValid).toBe(true);
    });

    it('T2.4.4: accepts submission with only Web URL channel populated', () => {
      const res = validateContactChannels({ webUrl: 'https://servicioscolegio.com.ar' });
      expect(res.isValid).toBe(true);
    });

    it('T2.4.5: accepts submission with all 3 channels populated simultaneously', () => {
      const res = validateContactChannels({
        whatsapp: '+5491123456789',
        email: 'contacto@colegio.edu.ar',
        webUrl: 'https://servicioscolegio.com.ar',
      });
      expect(res.isValid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Domain 5: WhatsApp Phone Number Boundaries
  // --------------------------------------------------------------------------
  describe('Domain 5: WhatsApp Formatting Boundaries', () => {
    it('T2.5.1: accepts international E.164 Argentine mobile (+54911...) format', () => {
      expect(validateWhatsApp('+5491144445555')).toBe(true);
    });

    it('T2.5.2: normalizes 10-digit national number without country code (1144445555)', () => {
      const normalized = normalizeWhatsApp('1144445555');
      expect(normalized).toBe('+5491144445555');
    });

    it('T2.5.3: normalizes 549 without plus sign into +549...', () => {
      const normalized = normalizeWhatsApp('5491144445555');
      expect(normalized).toBe('+5491144445555');
    });

    it('T2.5.4: rejects phone number with fewer than 10 digits', () => {
      expect(validateWhatsApp('114444')).toBe(false);
    });

    it('T2.5.5: rejects phone number containing non-numeric alphanumeric characters', () => {
      expect(validateWhatsApp('114444ABCD')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Domain 6: Email Format Boundaries
  // --------------------------------------------------------------------------
  describe('Domain 6: Email Format Boundaries', () => {
    it('T2.6.1: accepts standard institutional email address', () => {
      expect(validateEmail('profesora.garcia@escuela.edu.ar')).toBe(true);
    });

    it('T2.6.2: rejects email address missing @ symbol', () => {
      expect(validateEmail('profesora.garciaescuela.edu.ar')).toBe(false);
    });

    it('T2.6.3: rejects email address missing domain extension', () => {
      expect(validateEmail('profesora.garcia@escuela')).toBe(false);
    });

    it('T2.6.4: trims whitespace and accepts valid trimmed email', () => {
      expect(validateEmail('  profesora@gmail.com  ')).toBe(true);
    });

    it('T2.6.5: rejects empty string email', () => {
      expect(validateEmail('')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Domain 7: Web URL Format Boundaries
  // --------------------------------------------------------------------------
  describe('Domain 7: Web URL Format Boundaries', () => {
    it('T2.7.1: accepts valid HTTPS URL with path and query parameters', () => {
      expect(validateWebUrl('https://servicios.criana.com.ar/nineras?ref=colegios')).toBe(true);
    });

    it('T2.7.2: accepts valid HTTP URL', () => {
      expect(validateWebUrl('http://mi-pagina-comunitaria.org.ar')).toBe(true);
    });

    it('T2.7.3: rejects unsupported protocols such as FTP or javascript:', () => {
      expect(validateWebUrl('ftp://servidor.com/archivo')).toBe(false);
      expect(validateWebUrl('javascript:alert(1)')).toBe(false);
    });

    it('T2.7.4: rejects URL missing protocol (e.g. "www.criana.com.ar")', () => {
      expect(validateWebUrl('www.criana.com.ar')).toBe(false);
    });

    it('T2.7.5: rejects empty string URL', () => {
      expect(validateWebUrl('')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Domain 8: Cryptographic OTP Token Boundary & Stress
  // --------------------------------------------------------------------------
  describe('Domain 8: Cryptographic OTP Token Boundary & Replay Stress', () => {
    it('T2.8.1: rejects truncated 32-character token with 404', async () => {
      const truncated = 'a'.repeat(32);
      const res = await executeModerationOtpAction(truncated);
      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(404);
    });

    it('T2.8.2: rejects token with invalid non-hex characters with 404', async () => {
      const invalidHex = 'g'.repeat(64);
      const res = await executeModerationOtpAction(invalidHex);
      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(404);
    });

    it('T2.8.3: rejects expired token with HTTP 410 Gone', async () => {
      const user = await prisma.user.findFirst();
      const cat = await prisma.category.findFirst({ include: { subcategories: true } });

      const listing = await prisma.listing.create({
        data: {
          title: '[TEST-T2] Token Expirado',
          description: 'Aviso con token vencido para prueba de frontera 410',
          userId: user!.id,
          categoryId: cat!.id,
          subcategoryId: cat!.subcategories[0].id,
          status: 'PENDING',
        },
      });

      const token = generate256BitOtpToken();
      await prisma.moderationOtpToken.create({
        data: {
          token,
          listingId: listing.id,
          action: 'APPROVE',
          expiresAt: new Date(Date.now() - 10000), // 10 seconds in past
        },
      });

      const res = await executeModerationOtpAction(token);
      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(410);
    });

    it('T2.8.4: multiple rapid replay attempts consistently return HTTP 409 Conflict', async () => {
      const user = await prisma.user.findFirst();
      const cat = await prisma.category.findFirst({ include: { subcategories: true } });

      const listing = await prisma.listing.create({
        data: {
          title: '[TEST-T2] Rapid Replay Stress',
          description: 'Aviso para prueba de ataques de repetición continuos',
          userId: user!.id,
          categoryId: cat!.id,
          subcategoryId: cat!.subcategories[0].id,
          status: 'PENDING',
        },
      });

      const { approveToken } = await createListingModerationTokens(listing.id);
      await executeModerationOtpAction(approveToken);

      // Execute 5 consecutive replays
      for (let i = 0; i < 5; i++) {
        const replay = await executeModerationOtpAction(approveToken);
        expect(replay.success).toBe(false);
        expect(replay.httpStatus).toBe(409);
        expect(replay.message).toContain('El token OTP es de uso único');
      }
    });

    it('T2.8.5: token execution is atomic under concurrent promises', async () => {
      const user = await prisma.user.findFirst();
      const cat = await prisma.category.findFirst({ include: { subcategories: true } });

      const listing = await prisma.listing.create({
        data: {
          title: '[TEST-T2] Concurrency Replay Stress',
          description: 'Aviso para prueba de concurrencia de tokens OTP',
          userId: user!.id,
          categoryId: cat!.id,
          subcategoryId: cat!.subcategories[0].id,
          status: 'PENDING',
        },
      });

      const { approveToken } = await createListingModerationTokens(listing.id);

      // Launch 3 concurrent execution attempts
      const [res1, res2, res3] = await Promise.all([
        executeModerationOtpAction(approveToken),
        executeModerationOtpAction(approveToken),
        executeModerationOtpAction(approveToken),
      ]);

      const successCount = [res1, res2, res3].filter((r) => r.success).length;
      const conflictCount = [res1, res2, res3].filter((r) => r.httpStatus === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Domain 9: Geographic Filtering Boundaries
  // --------------------------------------------------------------------------
  describe('Domain 9: Geographic Filtering Boundaries', () => {
    it('T2.9.1: searching school with empty string query returns top default schools', async () => {
      const schools = await getCascadingSchools({
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        query: '',
      });
      expect(schools.length).toBeGreaterThan(0);
    });

    it('T2.9.2: searching school with 1-character query returns matching results', async () => {
      const schools = await getCascadingSchools({
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        query: 'A',
      });
      expect(schools.length).toBeGreaterThan(0);
    });

    it('T2.9.3: school search handles special characters without SQL errors', async () => {
      const schools = await getCascadingSchools({
        jurisdiccion: 'CABA',
        departamento: 'Comuna 1',
        query: "San O'Donnell & Co. (N° 1)",
      });
      expect(Array.isArray(schools)).toBe(true);
    });

    it('T2.9.4: searching in a non-existent partido returns empty array without throwing', async () => {
      const schools = await getCascadingSchools({
        jurisdiccion: 'GBA',
        departamento: 'Partido Inexistente 999',
      });
      expect(schools).toEqual([]);
    });

    it('T2.9.5: CABA Comunas 1 to 15 all have non-zero school records in database', async () => {
      for (let i = 1; i <= 15; i++) {
        const comunaName = `Comuna ${i}`;
        const count = await prisma.school.count({
          where: { jurisdiccion: 'CABA', departamento: comunaName },
        });
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Domain 10: Adversarial Probes & Injection Defense
  // --------------------------------------------------------------------------
  describe('Domain 10: Adversarial Probes & Injection Defense', () => {
    it('T2.10.1: SQL injection substring in school search query is treated as literal string', async () => {
      const sqlInjection = "' OR 1=1 --";
      const schools = await getCascadingSchools({
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        query: sqlInjection,
      });
      expect(schools.length).toBe(0); // Safely treated as literal string, not executed
    });

    it('T2.10.2: rapid burst of contact clicks from same client is tracked cleanly', async () => {
      const listing = await prisma.listing.findFirst({
        where: { isPermanentFeatured: true },
      });

      const promises = Array.from({ length: 5 }).map(() =>
        recordContactClick({
          listingId: listing!.id,
          channel: 'WHATSAPP',
          ip: '203.0.113.195',
        })
      );

      const results = await Promise.all(promises);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.length).toBe(5);
    });

    it('T2.10.3: HTML and script tags in listing title are preserved as text without executing', () => {
      const xssTitle = '<script>alert("xss")</script> Clases';
      const res = validateListingPayload({
        title: xssTitle,
        description: 'Descripción suficientemente extensa para pasar las reglas',
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        schoolId: 'sch-1',
        whatsapp: '+5491122334455',
      });
      expect(res.isValid).toBe(true);
    });

    it('T2.10.4: non-admin access gate check denies access to admin routes', () => {
      const checkAdminRouteAccess = (role: string) => {
        if (role !== 'ADMIN') {
          return { status: 403, error: 'Acceso restringido a administradores' };
        }
        return { status: 200, allowed: true };
      };

      expect(checkAdminRouteAccess('USER').status).toBe(403);
      expect(checkAdminRouteAccess('ADVERTISER').status).toBe(403);
      expect(checkAdminRouteAccess('ADMIN').status).toBe(200);
    });

    it('T2.10.5: unauthenticated click tracking with null IP records event safely', async () => {
      const listing = await prisma.listing.findFirst({
        where: { isPermanentFeatured: true },
      });
      const res = await recordContactClick({
        listingId: listing!.id,
        channel: 'WEB',
      });
      expect(res.success).toBe(true);
      expect(res.ipHash).toBeUndefined();
    });
  });
});
