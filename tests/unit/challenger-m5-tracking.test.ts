import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as handleTrackClick } from '@/app/api/track/click/route';
import { POST as handleTrackingAliasClick } from '@/app/api/tracking/click/route';
import { GET as handleAdminMetrics } from '@/app/api/admin/metrics/route';
import { hashClientIp, normalizeChannel } from '@/lib/tracking';

describe('EMPIRICAL CHALLENGER M5 — Contact Tracking & Admin Dashboard Metrics Suite', () => {
  const PREFIX = '[CHALLENGER-M5]';
  let testRegularUser: any;
  let testAdminUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();

    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: `999999999-${Date.now()}`,
          nombre: `${PREFIX} Colegio Test`,
          domicilio: 'Av. Test 1234',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 1',
          localidad: 'Retiro',
        },
      });
    }

    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: {
          name: 'Categoría Test M5',
          slug: `cat-m5-${Date.now()}`,
          subcategories: {
            create: [{ name: 'Subcat Test M5', slug: `sub-m5-${Date.now()}` }],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];

    testRegularUser = await prisma.user.create({
      data: {
        email: `regular-m5-${Date.now()}@test-example.com`,
        name: 'Usuario Regular M5',
        dni: '39123456',
        isOnboarded: true,
        role: 'USER',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testRegularUser.id);

    testAdminUser = await prisma.user.create({
      data: {
        email: `admin-m5-${Date.now()}@test-example.com`,
        name: 'Administrador M5',
        dni: '39999999',
        isOnboarded: true,
        role: 'ADMIN',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testAdminUser.id);
  });

  afterAll(async () => {
    // Teardown created listings and clicks
    if (createdListingIds.length > 0) {
      await prisma.contactClick.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    // Teardown created users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  const createTestListing = async (status: string = 'APPROVED') => {
    const listing = await prisma.listing.create({
      data: {
        title: `${PREFIX} Listing ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: 'Descripción de prueba para el módulo de tracking de contacto',
        status,
        whatsapp: '+5491123456789',
        email: 'contacto@colegio.edu.ar',
        webUrl: 'https://colegio-servicios.edu.ar',
        userId: testRegularUser.id,
        schoolId: testSchool.id,
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
      },
    });
    createdListingIds.push(listing.id);
    return listing;
  };

  // =========================================================================
  // 1. Silent Multi-Channel Tracking Persistence (WHATSAPP, EMAIL, WEB)
  // =========================================================================
  describe('1. Silent Multi-Channel Click Tracking (WHATSAPP, EMAIL, WEB)', () => {
    it('records WHATSAPP click with HTTP 201 and persists ContactClick in SQLite', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      expect(json.eventId).toBeDefined();
      expect(json.trackedAt).toBeDefined();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick).not.toBeNull();
      expect(dbClick!.listingId).toBe(listing.id);
      expect(dbClick!.channel).toBe('WHATSAPP');
      expect(dbClick!.createdAt).toBeInstanceOf(Date);
    });

    it('records EMAIL click with HTTP 201 and persists ContactClick in SQLite', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'EMAIL',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel).toBe('EMAIL');

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick).not.toBeNull();
      expect(dbClick!.listingId).toBe(listing.id);
      expect(dbClick!.channel).toBe('EMAIL');
    });

    it('records WEB click with HTTP 201 and persists ContactClick in SQLite', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WEB',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel).toBe('WEB');

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick).not.toBeNull();
      expect(dbClick!.listingId).toBe(listing.id);
      expect(dbClick!.channel).toBe('WEB');
    });

    it('normalizes lowercase channel inputs to canonical uppercase (whatsapp -> WHATSAPP)', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'whatsapp',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.channel).toBe('WHATSAPP');

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.channel).toBe('WHATSAPP');
    });

    it('normalizes legacy WEBSITE_IG alias to canonical WEB channel', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WEBSITE_IG',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.channel).toBe('WEB');

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.channel).toBe('WEB');
    });
  });

  // =========================================================================
  // 2. Privacy-Preserving SHA-256 IP Hashing & User-Agent Sanitization
  // =========================================================================
  describe('2. Privacy-Preserving IP Hashing & User-Agent Sanitization', () => {
    it('computes exact SHA-256 hash of client IP from x-forwarded-for header', async () => {
      const listing = await createTestListing();
      const rawIp = '190.19.24.55';
      const expectedHash = crypto.createHash('sha256').update(rawIp).digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': rawIp,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WHATSAPP',
        }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedHash);
      expect(dbClick!.ipHash).toHaveLength(64);
      expect(dbClick!.ipHash).toMatch(/^[a-f0-9]{64}$/);
      expect(hashClientIp(rawIp)).toBe(expectedHash);
    });

    it('extracts primary client IP when multiple proxies are listed in x-forwarded-for', async () => {
      const listing = await createTestListing();
      const clientIp = '181.45.67.89';
      const forwardedChain = `${clientIp}, 10.0.0.1, 192.168.1.1`;
      const expectedHash = crypto.createHash('sha256').update(clientIp).digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': forwardedChain,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'EMAIL',
        }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedHash);
    });

    it('falls back to x-real-ip header when x-forwarded-for is missing', async () => {
      const listing = await createTestListing();
      const realIp = '200.12.34.56';
      const expectedHash = crypto.createHash('sha256').update(realIp).digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-real-ip': realIp,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WEB',
        }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedHash);
    });

    it('records user-agent correctly and truncates oversized strings to 500 characters', async () => {
      const listing = await createTestListing();
      const standardUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36';

      const req1 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': standardUa,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WHATSAPP',
        }),
      });

      const res1 = await handleTrackClick(req1);
      const json1 = await res1.json();
      const click1 = await prisma.contactClick.findUnique({ where: { id: json1.eventId } });
      expect(click1!.userAgent).toBe(standardUa);

      // Oversized UA (600 characters)
      const oversizedUa = 'A'.repeat(600);
      const req2 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': oversizedUa,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'EMAIL',
        }),
      });

      const res2 = await handleTrackClick(req2);
      const json2 = await res2.json();
      const click2 = await prisma.contactClick.findUnique({ where: { id: json2.eventId } });
      expect(click2!.userAgent).toHaveLength(500);
      expect(click2!.userAgent).toBe('A'.repeat(500));
    });

    it('guarantees raw IP is NEVER stored anywhere in the database', async () => {
      const listing = await createTestListing();
      const sensitiveIp = '198.51.100.42';

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': sensitiveIp,
        },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WEB',
        }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();
      const dbClick = await prisma.contactClick.findUnique({ where: { id: json.eventId } });

      expect(dbClick!.ipHash).not.toContain(sensitiveIp);
      if (dbClick!.userAgent) {
        expect(dbClick!.userAgent).not.toContain(sensitiveIp);
      } else {
        expect(dbClick!.userAgent).toBeNull();
      }
    });
  });

  // =========================================================================
  // 3. Route Aliasing: /api/tracking/click works identically
  // =========================================================================
  describe('3. Route Aliasing (/api/tracking/click)', () => {
    it('processes WHATSAPP click identically via /api/tracking/click alias', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/tracking/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WHATSAPP',
        }),
      });

      const res = await handleTrackingAliasClick(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel).toBe('WHATSAPP');

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick).not.toBeNull();
      expect(dbClick!.listingId).toBe(listing.id);
      expect(dbClick!.channel).toBe('WHATSAPP');
    });

    it('processes EMAIL and WEB clicks identically via /api/tracking/click alias', async () => {
      const listing = await createTestListing();

      for (const ch of ['EMAIL', 'WEB'] as const) {
        const req = new NextRequest('http://localhost:3000/api/tracking/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            channel: ch,
          }),
        });

        const res = await handleTrackingAliasClick(req);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.channel).toBe(ch);
      }
    });
  });

  // =========================================================================
  // 4. Input Validation & Boundary Error Handling
  // =========================================================================
  describe('4. Input Validation & Error Handling', () => {
    it('returns HTTP 400 when channel is invalid (INVALID_CHANNEL)', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'INVALID_CHANNEL',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('Canal inválido');
    });

    it('returns HTTP 400 when channel is missing or empty string', async () => {
      const listing = await createTestListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: '',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it('returns HTTP 400 when listingId is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'WHATSAPP',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('listingId es obligatorio');
    });

    it('returns HTTP 400 when listingId is empty string or not a string', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: '',
          channel: 'WHATSAPP',
        }),
      });

      const res1 = await handleTrackClick(req1);
      expect(res1.status).toBe(400);

      const req2 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: 123456,
          channel: 'WHATSAPP',
        }),
      });

      const res2 = await handleTrackClick(req2);
      expect(res2.status).toBe(400);
    });

    it('returns HTTP 404 when listingId does not exist in the database', async () => {
      const fakeId = 'cuid_non_existent_999999999';
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: fakeId,
          channel: 'WHATSAPP',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toContain('no existe');
    });

    it('helper normalizeChannel correctly parses or rejects channels', () => {
      expect(normalizeChannel('WHATSAPP')).toBe('WHATSAPP');
      expect(normalizeChannel('email')).toBe('EMAIL');
      expect(normalizeChannel('Web')).toBe('WEB');
      expect(normalizeChannel('WEBSITE_IG')).toBe('WEB');
      expect(normalizeChannel('telegram')).toBeNull();
      expect(normalizeChannel('')).toBeNull();
    });
  });

  // =========================================================================
  // 5. Admin Metrics API: Complete Structure & Aggregations
  // =========================================================================
  describe('5. Admin Metrics API Aggregations (/api/admin/metrics)', () => {
    it('returns complete JSON structure with summary, clicksByChannel, clicksByMonth, and moderationQueue', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });

      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(200);

      const json = await res.json();

      // Summary structure
      expect(json.summary).toBeDefined();
      expect(typeof json.summary.totalListings).toBe('number');
      expect(typeof json.summary.approvedListings).toBe('number');
      expect(typeof json.summary.pendingListings).toBe('number');
      expect(typeof json.summary.rejectedListings).toBe('number');
      expect(typeof json.summary.totalClicks).toBe('number');

      // Channel breakdown structure
      expect(json.clicksByChannel).toBeDefined();
      expect(typeof json.clicksByChannel.whatsapp).toBe('number');
      expect(typeof json.clicksByChannel.email).toBe('number');
      expect(typeof json.clicksByChannel.web).toBe('number');

      // Monthly breakdown structure
      expect(Array.isArray(json.clicksByMonth)).toBe(true);
      for (const item of json.clicksByMonth) {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof item.clicks).toBe('number');
        expect(typeof item.whatsapp).toBe('number');
        expect(typeof item.email).toBe('number');
        expect(typeof item.web).toBe('number');
        expect(item.whatsapp + item.email + item.web).toBe(item.clicks);
      }

      // Moderation queue structure
      expect(Array.isArray(json.pendingListings)).toBe(true);
      expect(Array.isArray(json.moderationQueue)).toBe(true);
    });

    it('accurately increments summary and channel counters when new clicks are recorded', async () => {
      const listing = await createTestListing();

      // Read baseline metrics
      const baselineReq = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const baselineRes = await handleAdminMetrics(baselineReq);
      const baseline = await baselineRes.json();

      // Record 1 WhatsApp, 1 Email, 1 Web click
      for (const ch of ['WHATSAPP', 'EMAIL', 'WEB'] as const) {
        const clickReq = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });
        const clickRes = await handleTrackClick(clickReq);
        expect(clickRes.status).toBe(201);
      }

      // Read updated metrics
      const updatedReq = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const updatedRes = await handleAdminMetrics(updatedReq);
      const updated = await updatedRes.json();

      expect(updated.summary.totalClicks).toBe(baseline.summary.totalClicks + 3);
      expect(updated.clicksByChannel.whatsapp).toBe(baseline.clicksByChannel.whatsapp + 1);
      expect(updated.clicksByChannel.email).toBe(baseline.clicksByChannel.email + 1);
      expect(updated.clicksByChannel.web).toBe(baseline.clicksByChannel.web + 1);
    });

    it('moderation queue displays pending listings with title, category, school, and date', async () => {
      const pendingListing = await createTestListing('PENDING');

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const found = json.pendingListings.find((p: any) => p.id === pendingListing.id);
      expect(found).toBeDefined();
      expect(found.title).toBe(pendingListing.title);
      expect(found.category).toBeDefined();
      expect(found.school).toBeDefined();
      expect(found.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // =========================================================================
  // 6. Security & Role-Based Access Control (RBAC)
  // =========================================================================
  describe('6. Security & Authentication Gating (/api/admin/metrics)', () => {
    it('returns HTTP 401 when unauthenticated without dev/test bypass header', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('No autenticado');
    });

    it('returns HTTP 403 when authenticated as a non-admin user (role === USER)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': testRegularUser.id,
          'x-test-user-email': testRegularUser.email,
        },
      });
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('administrador');
    });

    it('returns HTTP 200 when authenticated as an ADMIN user without bypass header', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': testAdminUser.id,
          'x-test-user-email': testAdminUser.email,
        },
      });
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
    });

    it('strictly forbids x-admin-bypass in production environment simulation', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        // Simulate production environment
        (process.env as any).NODE_ENV = 'production';

        const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: { 'x-admin-bypass': 'true' },
        });

        const res = await handleAdminMetrics(req);
        // In production, bypass is disallowed, and unauthenticated request must fail with 401
        expect(res.status).toBe(401);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('permits authenticated ADMIN in production environment simulation', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';

        const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: {
            'x-test-user-id': testAdminUser.id,
            'x-test-user-email': testAdminUser.email,
          },
        });

        const res = await handleAdminMetrics(req);
        expect(res.status).toBe(200);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  // =========================================================================
  // 7. Relational Integrity & Cascade Deletion
  // =========================================================================
  describe('7. Relational Integrity & Cascade Deletion', () => {
    it('automatically cascade-deletes all associated ContactClick records when parent Listing is deleted', async () => {
      const listing = await createTestListing();

      // Create 3 clicks
      for (const ch of ['WHATSAPP', 'EMAIL', 'WEB'] as const) {
        await prisma.contactClick.create({
          data: {
            listingId: listing.id,
            channel: ch,
            ipHash: hashClientIp('127.0.0.1'),
          },
        });
      }

      const countBefore = await prisma.contactClick.count({
        where: { listingId: listing.id },
      });
      expect(countBefore).toBe(3);

      // Delete parent listing
      await prisma.listing.delete({
        where: { id: listing.id },
      });

      // Remove from teardown list since already deleted
      const idx = createdListingIds.indexOf(listing.id);
      if (idx !== -1) createdListingIds.splice(idx, 1);

      // Verify cascade deletion
      const countAfter = await prisma.contactClick.count({
        where: { listingId: listing.id },
      });
      expect(countAfter).toBe(0);
    });
  });
});
