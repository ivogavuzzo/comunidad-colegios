import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as onboardingRoute } from '@/app/api/onboarding/route';
import { POST as listingsRoute } from '@/app/api/listings/route';
import { sanitizeAndValidateDni } from '@/lib/auth';

describe('EMPIRICAL CHALLENGER M3 — Google SSO & Advertiser Onboarding (/api/onboarding)', () => {
  const TEST_PREFIX = '[TEST-CHALLENGER-M3]';
  let cabaSchool: any;
  let gbaSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  // Track created test users for cleanup
  const createdUserIds: string[] = [];

  const createTestUser = async (isOnboarded = false, dni: string | null = null, schoolId: string | null = null) => {
    const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user = await prisma.user.create({
      data: {
        name: `${TEST_PREFIX} User ${timestamp}`,
        email: `challenger-m3-${timestamp}@test.edu.ar`,
        isOnboarded,
        dni,
        schoolOfOriginId: schoolId,
        role: 'USER',
      },
    });
    createdUserIds.push(user.id);
    return user;
  };

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Fetch real schools from DB
    cabaSchool = await prisma.school.findFirst({
      where: { jurisdiccion: 'CABA' },
    });
    gbaSchool = await prisma.school.findFirst({
      where: { jurisdiccion: 'GBA' },
    });

    expect(cabaSchool).toBeDefined();
    expect(gbaSchool).toBeDefined();

    // 2. Fetch category and subcategory for gate verification
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: {
          name: `${TEST_PREFIX} Categoría`,
          slug: 'cat-challenger-m3',
          subcategories: {
            create: [{ name: `${TEST_PREFIX} Subcat`, slug: 'subcat-challenger-m3', orderIndex: 0 }],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];
  });

  afterAll(async () => {
    // Clean up created listings and users
    if (createdUserIds.length > 0) {
      await prisma.listing.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  // ==========================================================================
  // SUITE 1: Valid DNI (7 and 8 Numeric Digits) Empirical Validation
  // ==========================================================================
  describe('1. Valid DNI (7 and 8 Numeric Digits) Acceptance', () => {
    it('1.1: accepts valid 7-digit unformatted DNI and updates user', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '8765432',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.dni).toBe('8765432');
      expect(json.user.isOnboarded).toBe(true);
      expect(json.user.schoolOfOriginId).toBe(cabaSchool.id);

      // Verify directly in SQLite
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.dni).toBe('8765432');
      expect(dbUser?.isOnboarded).toBe(true);
    });

    it('1.2: accepts valid 7-digit DNI formatted with dots (e.g. 8.765.432) and strips formatting', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '8.765.432',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.dni).toBe('8765432');
      expect(json.user.isOnboarded).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.dni).toBe('8765432');
    });

    it('1.3: accepts valid 8-digit unformatted DNI and updates user', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '45678901',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.dni).toBe('45678901');
      expect(json.user.isOnboarded).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.dni).toBe('45678901');
      expect(dbUser?.isOnboarded).toBe(true);
    });

    it('1.4: accepts valid 8-digit DNI formatted with dots (e.g. 45.678.901) and normalizes to digits', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '45.678.901',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.dni).toBe('45678901');

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.dni).toBe('45678901');
    });

    it('1.5: accepts valid DNI surrounded by leading and trailing whitespace', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '   38111222   ',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.dni).toBe('38111222');

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.dni).toBe('38111222');
    });

    it('1.6: accepts valid DNI with mixed spaces and dots (e.g. " 38. 111 .222 ")', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: ' 38. 111 .222 ',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.dni).toBe('38111222');
    });
  });

  // ==========================================================================
  // SUITE 2: Invalid DNI (Letters, 6 Digits, 9 Digits, Empty, Special Chars) Rejection
  // ==========================================================================
  describe('2. Invalid DNI Rejection with HTTP 400', () => {
    it('2.1: rejects lowercase letters only ("abcdefgh") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: 'abcdefgh',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/entre 7 y 8 números/i);

      // Verify DB was NOT updated
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.isOnboarded).toBe(false);
      expect(dbUser?.dni).toBeNull();
    });

    it('2.2: rejects uppercase letters only ("ABCDEFGH") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: 'ABCDEFGH',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/entre 7 y 8 números/i);
    });

    it('2.3: rejects short letter string ("abc") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: 'abc',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.4: rejects 6 digits ("123456") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '123456',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/entre 7 y 8 números/i);
    });

    it('2.5: rejects 5 digits ("12345") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '12345',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.6: rejects 1 digit ("9") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '9',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.7: rejects 9 digits ("123456789") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '123456789',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/entre 7 y 8 números/i);
    });

    it('2.8: rejects 10 digits ("1234567890") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '1234567890',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.9: rejects empty DNI string ("") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/obligatorio/i);
    });

    it('2.10: rejects whitespace-only DNI ("   ") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '   ',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.11: rejects special characters only ("!@#$%^&*()") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '!@#$%^&*()',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/entre 7 y 8 números/i);
    });

    it('2.12: rejects punctuation and symbols ("----////????") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '----////????',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.13: rejects payload when dni property is omitted with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/obligatorio/i);
    });

    it('2.14: rejects null dni with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: null,
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.15: rejects non-string numeric dni (e.g. number type 38123456) with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: 38123456,
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.16: rejects boolean dni with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: true,
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('2.17: rejects array dni with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: ['38123456'],
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // SUITE 3: School of Origin Verification & Relational Linking
  // ==========================================================================
  describe('3. School of Origin Verification & Relational Linking', () => {
    it('3.1: rejects missing schoolOfOriginId with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/colegio de procedencia es obligatorio/i);
    });

    it('3.2: rejects empty schoolOfOriginId ("") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: '',
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('3.3: rejects whitespace schoolOfOriginId ("   ") with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: '   ',
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('3.4: rejects non-existent schoolOfOriginId with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: 'non-existent-school-id-xyz-999',
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/no existe/i);
    });

    it('3.5: rejects non-string schoolOfOriginId with HTTP 400', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: 12345,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('3.6: correctly links user to CABA school record with full relation data in SQLite', async () => {
      const user = await createTestUser(false);
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '36555444',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.schoolOfOriginId).toBe(cabaSchool.id);
      expect(json.user.schoolOfOrigin.id).toBe(cabaSchool.id);
      expect(json.user.schoolOfOrigin.nombre).toBe(cabaSchool.nombre);
      expect(json.user.schoolOfOrigin.jurisdiccion).toBe('CABA');

      // Query database relational join
      const dbUserWithSchool = await prisma.user.findUnique({
        where: { id: user.id },
        include: { schoolOfOrigin: true },
      });
      expect(dbUserWithSchool?.schoolOfOriginId).toBe(cabaSchool.id);
      expect(dbUserWithSchool?.schoolOfOrigin).toBeDefined();
      expect(dbUserWithSchool?.schoolOfOrigin?.cueanexo).toBe(cabaSchool.cueanexo);
      expect(dbUserWithSchool?.schoolOfOrigin?.nombre).toBe(cabaSchool.nombre);
      expect(dbUserWithSchool?.schoolOfOrigin?.domicilio).toBe(cabaSchool.domicilio);
    });

    it('3.7: correctly links user to GBA school record and allows switching school of origin', async () => {
      // Start with CABA school
      const user = await createTestUser(true, '37111222', cabaSchool.id);

      // Update to GBA school
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '37111222',
          schoolOfOriginId: gbaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.schoolOfOriginId).toBe(gbaSchool.id);
      expect(json.user.schoolOfOrigin.jurisdiccion).toBe('GBA');

      // Verify in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { schoolOfOrigin: true },
      });
      expect(dbUser?.schoolOfOriginId).toBe(gbaSchool.id);
      expect(dbUser?.schoolOfOrigin?.nombre).toBe(gbaSchool.nombre);
      expect(dbUser?.schoolOfOrigin?.jurisdiccion).toBe('GBA');
    });
  });

  // ==========================================================================
  // SUITE 4: User Database Persistence & State Invariants
  // ==========================================================================
  describe('4. User Database Persistence & State Invariants', () => {
    it('4.1: asserts initial state: user has isOnboarded=false, dni=null, schoolOfOriginId=null', async () => {
      const user = await createTestUser(false);
      const preCheck = await prisma.user.findUnique({ where: { id: user.id } });

      expect(preCheck?.isOnboarded).toBe(false);
      expect(preCheck?.dni).toBeNull();
      expect(preCheck?.schoolOfOriginId).toBeNull();
    });

    it('4.2: asserts persistent update in SQLite: isOnboarded=true, dni, schoolOfOriginId updated', async () => {
      const user = await createTestUser(false);

      const targetDni = '39888777';
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: ` ${targetDni.slice(0, 2)}.${targetDni.slice(2, 5)}.${targetDni.slice(5)} `,
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      // Direct independent query to SQLite DB
      const postCheck = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(postCheck).not.toBeNull();
      expect(postCheck!.isOnboarded).toBe(true);
      expect(postCheck!.dni).toBe(targetDni);
      expect(postCheck!.schoolOfOriginId).toBe(cabaSchool.id);
      expect(postCheck!.updatedAt.getTime()).toBeGreaterThanOrEqual(postCheck!.createdAt.getTime());
    });

    it('4.3: persists onboarding idempotently when re-submitted with new valid data', async () => {
      const user = await createTestUser(true, '31000111', cabaSchool.id);

      const newDni = '32999000';
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: newDni,
          schoolOfOriginId: gbaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.isOnboarded).toBe(true);
      expect(dbUser!.dni).toBe(newDni);
      expect(dbUser!.schoolOfOriginId).toBe(gbaSchool.id);
    });
  });

  // ==========================================================================
  // SUITE 5: Authentication Protection & End-to-End Publishing Gate
  // ==========================================================================
  describe('5. Authentication Security & Publishing Gate Enforcement', () => {
    it('5.1: rejects onboarding request when unauthenticated with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toMatch(/no autorizado/i);
    });

    it('5.2: rejects onboarding request with non-existent test user ID with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'non-existent-user-id-999999',
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const res = await onboardingRoute(req);
      expect(res.status).toBe(401);
    });

    it('5.3: end-to-end publishing gate: user is blocked prior to onboarding (403), succeeds after onboarding (201)', async () => {
      // 1. Create fresh un-onboarded user
      const user = await createTestUser(false);

      const listingPayload = {
        title: `${TEST_PREFIX} Clases de Ajedrez`,
        description: 'Taller de ajedrez táctico para nivel inicial y avanzado en el colegio.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: cabaSchool.id,
        whatsapp: '+5491144445555',
      };

      // 2. Attempt to publish listing -> must be BLOCKED with 403
      const blockedReq = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify(listingPayload),
      });

      const blockedRes = await listingsRoute(blockedReq);
      expect(blockedRes.status).toBe(403);
      const blockedJson = await blockedRes.json();
      expect(blockedJson.error).toMatch(/onboarding obligatorio/i);
      expect(blockedJson.redirectUrl).toBe('/onboarding');

      // 3. User completes onboarding via /api/onboarding
      const onboardReq = new NextRequest('http://localhost:3000/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify({
          dni: '38123456',
          schoolOfOriginId: cabaSchool.id,
        }),
      });

      const onboardRes = await onboardingRoute(onboardReq);
      expect(onboardRes.status).toBe(200);

      // Verify DB confirms isOnboarded: true
      const verifiedDbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(verifiedDbUser!.isOnboarded).toBe(true);

      // 4. Attempt to publish listing again -> now SUCCEEDS with 201
      const publishReq = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': user.id,
        },
        body: JSON.stringify(listingPayload),
      });

      const publishRes = await listingsRoute(publishReq);
      expect(publishRes.status).toBe(201);
      const publishJson = await publishRes.json();
      expect(publishJson.success).toBe(true);
      expect(publishJson.listing.status).toBe('PENDING');
      expect(publishJson.listing.userId).toBe(user.id);
    });
  });
});
