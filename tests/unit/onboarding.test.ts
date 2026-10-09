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
  resolveUserSession,
  authOptions,
} from '@/lib/auth';
import { POST as onboardingRoute } from '@/app/api/onboarding/route';
import { POST as listingsRoute } from '@/app/api/listings/route';
import { NextRequest } from 'next/server';

describe('Milestone 3: Google SSO & Advertiser Onboarding', () => {
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;
  let testUser: any;
  let testUserOnboarded: any;

  beforeAll(async () => {
    // Locate or create test school
    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: '020000001',
          nombre: 'COLEGIO DE PRUEBA UNITARIA M3',
          domicilio: 'AV. SANTA FE 1234',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 1',
          localidad: 'RETIRO',
        },
      });
    }

    // Locate or create taxonomy category
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: {
          name: 'Apoyo Escolar M3',
          slug: 'apoyo-escolar-m3',
          subcategories: {
            create: [
              { name: 'Matemática M3', slug: 'matematica-m3', orderIndex: 0 },
            ],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];

    // Create fresh test users
    const timestamp = Date.now();
    testUser = await prisma.user.create({
      data: {
        name: 'Usuario Sin Onboardear',
        email: `not-onboarded-${timestamp}@test.edu.ar`,
        isOnboarded: false,
        role: 'USER',
      },
    });

    testUserOnboarded = await prisma.user.create({
      data: {
        name: 'Usuario Ya Onboardeado',
        email: `already-onboarded-${timestamp}@test.edu.ar`,
        dni: '38123456',
        schoolOfOriginId: testSchool.id,
        isOnboarded: true,
        role: 'USER',
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.listing.deleteMany({
      where: {
        userId: { in: [testUser.id, testUserOnboarded.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser.id, testUserOnboarded.id] },
      },
    });
  });

  // --------------------------------------------------------------------------
  // 1. DNI Validation Unit Tests
  // --------------------------------------------------------------------------
  describe('DNI Validation (7-8 Numeric Digits)', () => {
    it('accepts 7-digit Argentine DNI', () => {
      const res = sanitizeAndValidateDni('4567890');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('4567890');
      expect(res.error).toBeUndefined();
    });

    it('accepts 8-digit Argentine DNI', () => {
      const res = sanitizeAndValidateDni('34567890');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('34567890');
      expect(res.error).toBeUndefined();
    });

    it('sanitizes formatted DNI with dots and whitespace', () => {
      const res = sanitizeAndValidateDni(' 34.567.890 ');
      expect(res.isValid).toBe(true);
      expect(res.cleanDni).toBe('34567890');
    });

    it('rejects DNI with fewer than 7 digits', () => {
      const res = sanitizeAndValidateDni('12345');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('entre 7 y 8 números');
    });

    it('rejects DNI with more than 8 digits', () => {
      const res = sanitizeAndValidateDni('123456789');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('entre 7 y 8 números');
    });

    it('rejects DNI containing letters or non-numeric characters only', () => {
      const res = sanitizeAndValidateDni('abcdef');
      expect(res.isValid).toBe(false);
    });

    it('rejects empty or whitespace DNI', () => {
      const res = sanitizeAndValidateDni('');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('El DNI es obligatorio');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Contact Channels Validation Unit Tests
  // --------------------------------------------------------------------------
  describe('Contact Channels Validation', () => {
    it('rejects submission when no contact channels are provided', () => {
      const res = validateContactChannels({});
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Debes ingresar al menos un canal de contacto');
    });

    it('rejects submission when all contact channels are empty whitespace', () => {
      const res = validateContactChannels({
        whatsapp: '   ',
        email: '   ',
        webUrl: '',
      });
      expect(res.isValid).toBe(false);
    });

    it('accepts Argentine mobile WhatsApp numbers and normalizes them', () => {
      expect(validateWhatsApp('+5491144445555')).toBe(true);
      expect(validateWhatsApp('1144445555')).toBe(true);
      expect(normalizeWhatsApp('1144445555')).toBe('+5491144445555');
    });

    it('rejects invalid WhatsApp numbers', () => {
      expect(validateWhatsApp('123')).toBe(false);
      expect(validateWhatsApp('abcdef')).toBe(false);
    });

    it('accepts valid RFC emails and rejects invalid emails', () => {
      expect(validateEmail('mariana@colegio.edu.ar')).toBe(true);
      expect(validateEmail('no-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('accepts valid Web URLs (http and https) and rejects non-web protocols', () => {
      expect(validateWebUrl('https://criana.com')).toBe(true);
      expect(validateWebUrl('http://servicios.ar')).toBe(true);
      expect(validateWebUrl('ftp://servicios.ar')).toBe(false);
      expect(validateWebUrl('not-a-url')).toBe(false);
    });

    it('accepts payload when at least one valid channel is present', () => {
      expect(validateContactChannels({ whatsapp: '+5491144445555' }).isValid).toBe(true);
      expect(validateContactChannels({ email: 'contacto@colegio.ar' }).isValid).toBe(true);
      expect(validateContactChannels({ webUrl: 'https://miweb.com' }).isValid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Database Onboarding Status Update
  // --------------------------------------------------------------------------
  describe('Onboarding Database Flow (/api/onboarding)', () => {
    it('rejects onboarding request when user is unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: '35123456',
          schoolOfOriginId: testSchool.id,
        }),
      });

      const response = await onboardingRoute(req);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain('No autorizado');
    });

    it('rejects onboarding when DNI format is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id,
        },
        body: JSON.stringify({
          dni: '1234', // invalid < 7 digits
          schoolOfOriginId: testSchool.id,
        }),
      });

      const response = await onboardingRoute(req);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('entre 7 y 8 números');
    });

    it('rejects onboarding when schoolOfOriginId does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id,
        },
        body: JSON.stringify({
          dni: '35123456',
          schoolOfOriginId: 'non-existent-school-id-999',
        }),
      });

      const response = await onboardingRoute(req);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('no existe');
    });

    it('successfully updates user in database to isOnboarded: true with DNI and schoolOfOriginId', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUser.id,
        },
        body: JSON.stringify({
          dni: ' 35.888.999 ',
          schoolOfOriginId: testSchool.id,
        }),
      });

      const response = await onboardingRoute(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.user.isOnboarded).toBe(true);
      expect(json.user.dni).toBe('35888999');
      expect(json.user.schoolOfOriginId).toBe(testSchool.id);

      // Verify persistent record directly in Prisma SQLite
      const verifiedDbUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(verifiedDbUser!.isOnboarded).toBe(true);
      expect(verifiedDbUser!.dni).toBe('35888999');
      expect(verifiedDbUser!.schoolOfOriginId).toBe(testSchool.id);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Listing Publishing Flow & Gate Enforcement (/api/listings POST)
  // --------------------------------------------------------------------------
  describe('Listing Publishing Flow (/api/listings)', () => {
    it('rejects listing creation if user is NOT onboarded (gate enforcement)', async () => {
      // Create a fresh un-onboarded user
      const unboarded = await prisma.user.create({
        data: {
          email: `gate-test-${Date.now()}@test.com`,
          isOnboarded: false,
          role: 'USER',
        },
      });

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': unboarded.id,
        },
        body: JSON.stringify({
          title: 'Clases de dibujo y pintura',
          description: 'Taller creativo para chicos de primaria los fines de semana',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        }),
      });

      const response = await listingsRoute(req);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('onboarding obligatorio');
      expect(json.redirectUrl).toBe('/onboarding');

      await prisma.user.delete({ where: { id: unboarded.id } });
    });

    it('rejects listing creation when no contact channels are provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUserOnboarded.id,
        },
        body: JSON.stringify({
          title: 'Clases de guitarra acústica',
          description: 'Aprende guitarra desde cero con repertorio popular y clásico',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          // no whatsapp, email, or webUrl provided
        }),
      });

      const response = await listingsRoute(req);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Debes ingresar al menos un canal de contacto');
    });

    it('saves listing in database with status: PENDING, associated school, category, subcategory, and channels', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': testUserOnboarded.id,
        },
        body: JSON.stringify({
          title: 'Apoyo de Física y Química para Secundaria',
          description: 'Preparación de trimestrales y previas para alumnos del colegio con material práctico',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          whatsapp: '1133334444',
          email: 'profesora.fisica@test.com',
          webUrl: 'https://clasesdefisica.ar',
          images: [
            'https://test.com/aula1.jpg',
            'https://test.com/aula2.jpg',
          ],
        }),
      });

      const response = await listingsRoute(req);
      expect(response.status).toBe(201);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.listing.id).toBeDefined();
      expect(json.listing.status).toBe('PENDING');
      expect(json.listing.schoolId).toBe(testSchool.id);
      expect(json.listing.categoryId).toBe(testCategory.id);
      expect(json.listing.subcategoryId).toBe(testSubcategory.id);
      expect(json.listing.whatsapp).toBe('+5491133334444');
      expect(json.listing.email).toBe('profesora.fisica@test.com');
      expect(json.listing.webUrl).toBe('https://clasesdefisica.ar');
      expect(json.listing.images.length).toBe(2);

      // Verify database record
      const dbListing = await prisma.listing.findUnique({
        where: { id: json.listing.id },
        include: { images: true },
      });
      expect(dbListing!.status).toBe('PENDING');
      expect(dbListing!.userId).toBe(testUserOnboarded.id);
      expect(dbListing!.images.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 5. NextAuth Session Metadata Resolver
  // --------------------------------------------------------------------------
  describe('NextAuth Session Resolution & Metadata', () => {
    it('resolveUserSession includes id, email, name, dni, schoolOfOriginId, isOnboarded, role', () => {
      const session = resolveUserSession(testUserOnboarded);
      expect(session.user.id).toBe(testUserOnboarded.id);
      expect(session.user.email).toBe(testUserOnboarded.email);
      expect(session.user.dni).toBe('38123456');
      expect(session.user.schoolOfOriginId).toBe(testSchool.id);
      expect(session.user.isOnboarded).toBe(true);
      expect(session.user.role).toBe('USER');
    });

    it('authOptions contains configured GoogleProvider and CredentialsProvider', () => {
      const providerIds = authOptions.providers.map((p) => p.id);
      expect(providerIds).toContain('google');
      expect(providerIds).toContain('credentials');
    });
  });
});
