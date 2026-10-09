import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { generateCaptcha, verifyCaptcha } from '@/lib/captcha';
import { GET as captchaGetRoute } from '@/app/api/captcha/route';
import { POST as listingsPostRoute } from '@/app/api/listings/route';
import { NextRequest } from 'next/server';

describe('Anti-Spam Security (Captcha) & User 10-Listing Quota Limit', () => {
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;
  let limitTestUser: any;
  const createdListingIds: string[] = [];

  beforeAll(async () => {
    // 1. Setup School
    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: '990011223',
          nombre: 'COLEGIO SEGURIDAD TEST',
          domicilio: 'CALLE SEGURIDAD 123',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 14',
          localidad: 'PALERMO',
        },
      });
    }

    // 2. Setup Category & Subcategory
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory || testCategory.subcategories.length === 0) {
      testCategory = await prisma.category.create({
        data: {
          name: 'Categoría Seguridad',
          slug: `cat-seguridad-${Date.now()}`,
          subcategories: {
            create: [
              {
                name: 'Subcat Seguridad',
                slug: `subcat-seguridad-${Date.now()}`,
                orderIndex: 0,
              },
            ],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];

    // 3. Setup Test User
    limitTestUser = await prisma.user.create({
      data: {
        name: 'Usuario Cuota Maxima',
        email: `cuota-${Date.now()}@seguridad.test`,
        dni: '44555666',
        schoolOfOriginId: testSchool.id,
        isOnboarded: true,
        role: 'USER',
      },
    });
  });

  afterAll(async () => {
    if (createdListingIds.length > 0) {
      await prisma.listingImage.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.moderationOtpToken.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }
    if (limitTestUser) {
      await prisma.listing.deleteMany({
        where: { userId: limitTestUser.id },
      });
      await prisma.user.deleteMany({
        where: { id: limitTestUser.id },
      });
    }
  });

  describe('1. Captcha generation and cryptographic verification', () => {
    it('generates a challenge question and HMAC-signed token', () => {
      const challenge = generateCaptcha();
      expect(challenge.question).toMatch(/^¿Cuánto es \d+ [+-] \d+\?$/);
      expect(challenge.token).toBeDefined();
      expect(challenge.token.includes('.')).toBe(true);
    });

    it('successfully validates the correct answer', () => {
      const challenge = generateCaptcha();
      // Parse question to get correct answer
      const match = challenge.question.match(/¿Cuánto es (\d+) ([+-]) (\d+)\?/);
      expect(match).not.toBeNull();
      const n1 = parseInt(match![1], 10);
      const op = match![2];
      const n2 = parseInt(match![3], 10);
      const expectedAns = op === '+' ? n1 + n2 : n1 - n2;

      const result = verifyCaptcha(challenge.token, expectedAns);
      expect(result.valid).toBe(true);
    });

    it('rejects an incorrect answer', () => {
      const challenge = generateCaptcha();
      const result = verifyCaptcha(challenge.token, 9999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Respuesta incorrecta');
    });

    it('rejects a forged or tampered token', () => {
      const challenge = generateCaptcha();
      const tamperedToken = challenge.token.slice(0, -4) + 'abcd';
      const result = verifyCaptcha(tamperedToken, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('2. GET /api/captcha endpoint', () => {
    it('returns a valid challenge object with maxListings=10', async () => {
      const req = new NextRequest('http://localhost:3000/api/captcha');
      const res = await captchaGetRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.question).toBeDefined();
      expect(data.token).toBeDefined();
      expect(data.maxListings).toBe(10);
      expect(data.limitReached).toBe(false);
    });
  });

  describe('3. Listing creation with Captcha anti-spam enforcement', () => {
    it('blocks creation if captcha is missing when captcha check is enforced', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': limitTestUser.id,
          'x-test-captcha': 'true', // Enforces captcha validation
        },
        body: JSON.stringify({
          title: 'Servicio sin Captcha',
          description: 'Aviso de prueba para verificar bloqueo por falta de captcha.',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          email: 'contacto@prueba.com',
        }),
      });

      const res = await listingsPostRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('verificación de seguridad (captcha)');
    });

    it('blocks creation if captcha answer is wrong', async () => {
      const challenge = generateCaptcha();
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': limitTestUser.id,
          'x-test-captcha': 'true',
        },
        body: JSON.stringify({
          title: 'Servicio con Captcha Incorrecto',
          description: 'Aviso de prueba con respuesta de captcha errónea.',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          email: 'contacto@prueba.com',
          captchaToken: challenge.token,
          captchaAnswer: '9999',
        }),
      });

      const res = await listingsPostRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('incorrecta');
    });

    it('allows creation when captcha answer is correct', async () => {
      const challenge = generateCaptcha();
      const match = challenge.question.match(/¿Cuánto es (\d+) ([+-]) (\d+)\?/);
      const n1 = parseInt(match![1], 10);
      const op = match![2];
      const n2 = parseInt(match![3], 10);
      const expectedAns = op === '+' ? n1 + n2 : n1 - n2;

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': limitTestUser.id,
          'x-test-captcha': 'true',
        },
        body: JSON.stringify({
          title: 'Servicio con Captcha Exitoso',
          description: 'Aviso de prueba con captcha resuelto correctamente.',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          email: 'contacto@prueba.com',
          captchaToken: challenge.token,
          captchaAnswer: String(expectedAns),
        }),
      });

      const res = await listingsPostRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.listing).toBeDefined();
      createdListingIds.push(data.listing.id);
    });
  });

  describe('4. Quota Limit: Maximum 10 listings per user & admin contact suggestion', () => {
    it('blocks the 11th listing and suggests contacting admin at contacto@criana.com', async () => {
      // Create listings up to 10 for limitTestUser directly in DB
      const currentCount = await prisma.listing.count({
        where: { userId: limitTestUser.id, status: { not: 'REJECTED' } },
      });

      for (let i = currentCount; i < 10; i++) {
        const item = await prisma.listing.create({
          data: {
            title: `Aviso preexistente #${i + 1}`,
            description: `Descripción del servicio #${i + 1}`,
            categoryId: testCategory.id,
            subcategoryId: testSubcategory.id,
            schoolId: testSchool.id,
            userId: limitTestUser.id,
            status: 'APPROVED',
          },
        });
        createdListingIds.push(item.id);
      }

      // Verify that user now has exactly 10 active listings
      const totalCount = await prisma.listing.count({
        where: { userId: limitTestUser.id, status: { not: 'REJECTED' } },
      });
      expect(totalCount).toBe(10);

      // Attempt to post the 11th listing with enforce-listing-limit
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': limitTestUser.id,
          'x-enforce-listing-limit': 'true',
        },
        body: JSON.stringify({
          title: 'Aviso Nro 11 Que Deberia Ser Rechazado',
          description: 'Este aviso debe ser bloqueado por sobrepasar el límite de 10 avisos.',
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          schoolId: testSchool.id,
          email: 'contacto@prueba.com',
        }),
      });

      const res = await listingsPostRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.code).toBe('LIMIT_EXCEEDED');
      expect(data.limitReached).toBe(true);
      expect(data.maxListings).toBe(10);
      expect(data.error).toContain('límite máximo de 10 avisos');
      expect(data.error).toContain('contacto@criana.com');
    });
  });
});
