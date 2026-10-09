import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as handleAdminMetrics } from '@/app/api/admin/metrics/route';
import { POST as handleTrackClick } from '@/app/api/track/click/route';

describe('EMPIRICAL CHALLENGER M5-2 — Admin Dashboard & Metrics API Stress Suite (F27, F28)', () => {
  const PREFIX = '[CHALLENGER-M5-2]';

  let testSchool: any;
  let testSchoolRequest: any;
  let testCategory: any;
  let testSubcategory: any;
  let testRegularUser: any;
  let testAdminUser: any;
  let testModeratorUser: any;
  let testLowerAdminUser: any;

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdSchoolRequestIds: string[] = [];
  const createdClickIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Resolve or create test School
    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: `888888888-${Date.now()}`,
          nombre: `${PREFIX} Instituto Modelo Test`,
          domicilio: 'Calle Falsa 123',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 2',
          localidad: 'Recoleta',
        },
      });
    }

    // 2. Create test SchoolRequest ("Mi colegio no está" fallback)
    testSchoolRequest = await prisma.schoolRequest.create({
      data: {
        nombre: `${PREFIX} Colegio Comunitario Sol`,
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        localidad: 'Acassuso',
        domicilio: 'Av. Libertador 15000',
        status: 'PENDING',
        userEmail: `parent-${Date.now()}@test.com`,
        userName: 'Padre Solicitante',
      },
    });
    createdSchoolRequestIds.push(testSchoolRequest.id);

    // 3. Resolve or create test Category
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: {
          name: `${PREFIX} Apoyo Escolar Especial`,
          slug: `cat-stress-${Date.now()}`,
          subcategories: {
            create: [
              {
                name: `${PREFIX} Clases Particulares`,
                slug: `sub-stress-${Date.now()}`,
              },
            ],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];

    // 4. Create standard user (role: 'USER')
    testRegularUser = await prisma.user.create({
      data: {
        email: `regular-stress-${Date.now()}@stress-test.edu.ar`,
        name: 'Usuario Regular Sin Permisos Admin',
        dni: '38111222',
        isOnboarded: true,
        role: 'USER',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testRegularUser.id);

    // 5. Create admin user (role: 'ADMIN')
    testAdminUser = await prisma.user.create({
      data: {
        email: `admin-stress-${Date.now()}@stress-test.edu.ar`,
        name: 'Administrador Maestro',
        dni: '38999888',
        isOnboarded: true,
        role: 'ADMIN',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testAdminUser.id);

    // 6. Create moderator user with arbitrary role (role: 'MODERATOR')
    testModeratorUser = await prisma.user.create({
      data: {
        email: `moderator-stress-${Date.now()}@stress-test.edu.ar`,
        name: 'Moderador No Admin',
        dni: '38555444',
        isOnboarded: true,
        role: 'MODERATOR',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testModeratorUser.id);

    // 7. Create user with lowercase role 'admin'
    testLowerAdminUser = await prisma.user.create({
      data: {
        email: `loweradmin-stress-${Date.now()}@stress-test.edu.ar`,
        name: 'Admin Minúscula',
        dni: '38666777',
        isOnboarded: true,
        role: 'admin',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testLowerAdminUser.id);
  });

  afterAll(async () => {
    // Teardown created clicks
    if (createdClickIds.length > 0) {
      await prisma.contactClick.deleteMany({
        where: { id: { in: createdClickIds } },
      });
    }

    // Teardown created listings and associated clicks/tokens
    if (createdListingIds.length > 0) {
      await prisma.contactClick.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.moderationOtpToken.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    // Teardown created school requests
    if (createdSchoolRequestIds.length > 0) {
      await prisma.schoolRequest.deleteMany({
        where: { id: { in: createdSchoolRequestIds } },
      });
    }

    // Teardown created users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  // Helper to create test listings
  const createListing = async (
    status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING',
    opts?: {
      schoolId?: string | null;
      schoolRequestId?: string | null;
      createdAt?: Date;
      title?: string;
    }
  ) => {
    const listing = await prisma.listing.create({
      data: {
        title: opts?.title || `${PREFIX} Aviso ${status} ${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description: 'Descripción para stress-testing de métricas y moderación en panel de administración',
        status,
        whatsapp: '+5491198765432',
        email: 'profesor@test.edu.ar',
        webUrl: 'https://profesor-particular.edu.ar',
        userId: testRegularUser.id,
        schoolId: opts?.schoolId !== undefined ? opts.schoolId : testSchool.id,
        schoolRequestId: opts?.schoolRequestId !== undefined ? opts.schoolRequestId : null,
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        createdAt: opts?.createdAt || new Date(),
      },
    });
    createdListingIds.push(listing.id);
    return listing;
  };

  // =========================================================================
  // DOMAIN 1: RBAC & AUTHENTICATION GATING (F27 SECURITY)
  // =========================================================================
  describe('Domain 1: RBAC & Authentication Gating (/api/admin/metrics)', () => {
    it('1.1: returns HTTP 401 on completely unauthenticated request (no headers, no cookies)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('No autenticado');
    });

    it('1.2: returns HTTP 401 when forged/invalid bypass values are supplied', async () => {
      const forgedHeaders = [
        { 'x-admin-bypass': 'false' },
        { 'x-admin-bypass': '0' },
        { 'x-admin-bypass': 'admin' },
        { 'x-admin-bypass': 'TRUE' }, // case-sensitive check
        { 'x-admin-bypass': 'yes' },
      ];

      for (const headers of forgedHeaders) {
        const req = new NextRequest('http://localhost:3000/api/admin/metrics', { headers });
        const res = await handleAdminMetrics(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('No autenticado');
      }
    });

    it('1.3: returns HTTP 401 when referencing non-existent user ID or email', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': 'cuid_non_existent_user_99999' },
      });
      const res1 = await handleAdminMetrics(req1);
      expect(res1.status).toBe(401);

      const req2 = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-email': 'ghost-non-existent@nobody.com' },
      });
      const res2 = await handleAdminMetrics(req2);
      expect(res2.status).toBe(401);
    });

    it('1.4: returns HTTP 403 when authenticated as a standard user (role === "USER")', async () => {
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

    it('1.5: returns HTTP 403 when user has non-admin roles ("MODERATOR" or lowercase "admin")', async () => {
      // Moderator role
      const reqMod = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': testModeratorUser.id,
          'x-test-user-email': testModeratorUser.email,
        },
      });
      const resMod = await handleAdminMetrics(reqMod);
      expect(resMod.status).toBe(403);

      // Lowercase admin role
      const reqLower = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': testLowerAdminUser.id,
          'x-test-user-email': testLowerAdminUser.email,
        },
      });
      const resLower = await handleAdminMetrics(reqLower);
      expect(resLower.status).toBe(403);
    });

    it('1.6: returns HTTP 200 when authenticated as a verified ADMIN user (x-test-user-id)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': testAdminUser.id,
        },
      });
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
      expect(json.clicksByChannel).toBeDefined();
      expect(json.clicksByMonth).toBeDefined();
    });

    it('1.7: returns HTTP 200 when authenticated as ADMIN using uppercase/mixed-case email', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-email': testAdminUser.email.toUpperCase(),
        },
      });
      const res = await handleAdminMetrics(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
    });

    it('1.8: returns HTTP 200 with x-admin-bypass: true in test environment', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
    });

    it('1.9: strictly rejects x-admin-bypass (HTTP 401) under simulated production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';

        const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: { 'x-admin-bypass': 'true' },
        });
        const res = await handleAdminMetrics(req);

        // In production, bypass is prohibited; unauthenticated call must return 401
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('No autenticado');
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('1.10: permits verified ADMIN and rejects USER under simulated production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';

        // Verified admin allowed
        const reqAdmin = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: { 'x-test-user-id': testAdminUser.id },
        });
        const resAdmin = await handleAdminMetrics(reqAdmin);
        expect(resAdmin.status).toBe(200);

        // Standard user denied
        const reqUser = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: { 'x-test-user-id': testRegularUser.id },
        });
        const resUser = await handleAdminMetrics(reqUser);
        expect(resUser.status).toBe(403);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  // =========================================================================
  // DOMAIN 2: AGGREGATION ACCURACY & MATHEMATICAL INVARIANTS (F27 METRICS)
  // =========================================================================
  describe('Domain 2: Aggregation Accuracy & Mathematical Invariants (F27)', () => {
    it('2.1: asserts JSON payload structure matches specifications', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      expect(json).toHaveProperty('summary');
      expect(json).toHaveProperty('clicksByChannel');
      expect(json).toHaveProperty('clicksByMonth');
      expect(json).toHaveProperty('pendingListings');
      expect(json).toHaveProperty('moderationQueue');

      expect(typeof json.summary.totalListings).toBe('number');
      expect(typeof json.summary.approvedListings).toBe('number');
      expect(typeof json.summary.pendingListings).toBe('number');
      expect(typeof json.summary.rejectedListings).toBe('number');
      expect(typeof json.summary.totalClicks).toBe('number');

      expect(typeof json.clicksByChannel.whatsapp).toBe('number');
      expect(typeof json.clicksByChannel.email).toBe('number');
      expect(typeof json.clicksByChannel.web).toBe('number');
    });

    it('2.2: asserts mathematical conservation of total listings and channels', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      // Total listings >= approved + pending + rejected
      const sumStatuses =
        json.summary.approvedListings +
        json.summary.pendingListings +
        json.summary.rejectedListings;
      expect(json.summary.totalListings).toBeGreaterThanOrEqual(sumStatuses);

      // Total clicks == sum of channel breakdown
      const sumChannels =
        json.clicksByChannel.whatsapp +
        json.clicksByChannel.email +
        json.clicksByChannel.web;
      expect(json.summary.totalClicks).toBe(sumChannels);
    });

    it('2.3: dynamically increments total, approved, pending, and rejected counters with mathematical precision', async () => {
      // 1. Fetch baseline
      const reqBase = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resBase = await handleAdminMetrics(reqBase);
      const baseline = await resBase.json();

      // 2. Insert 2 PENDING, 1 APPROVED, 1 REJECTED
      await createListing('PENDING');
      await createListing('PENDING');
      await createListing('APPROVED');
      await createListing('REJECTED');

      // 3. Fetch updated metrics
      const reqUpdated = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resUpdated = await handleAdminMetrics(reqUpdated);
      const updated = await resUpdated.json();

      expect(updated.summary.totalListings).toBe(baseline.summary.totalListings + 4);
      expect(updated.summary.pendingListings).toBe(baseline.summary.pendingListings + 2);
      expect(updated.summary.approvedListings).toBe(baseline.summary.approvedListings + 1);
      expect(updated.summary.rejectedListings).toBe(baseline.summary.rejectedListings + 1);
    });

    it('2.4: dynamically increments totalClicks and specific channel counters upon click generation', async () => {
      const listing = await createListing('APPROVED');

      // Baseline
      const reqBase = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resBase = await handleAdminMetrics(reqBase);
      const baseline = await resBase.json();

      // Generate: 2 WhatsApp, 1 Email, 3 Web clicks
      const events: Array<'WHATSAPP' | 'EMAIL' | 'WEB'> = [
        'WHATSAPP',
        'WHATSAPP',
        'EMAIL',
        'WEB',
        'WEB',
        'WEB',
      ];
      for (const ch of events) {
        const clickReq = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });
        const clickRes = await handleTrackClick(clickReq);
        expect(clickRes.status).toBe(201);
        const clickJson = await clickRes.json();
        createdClickIds.push(clickJson.eventId);
      }

      // Check updated metrics
      const reqUpdated = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resUpdated = await handleAdminMetrics(reqUpdated);
      const updated = await resUpdated.json();

      expect(updated.summary.totalClicks).toBe(baseline.summary.totalClicks + 6);
      expect(updated.clicksByChannel.whatsapp).toBe(baseline.clicksByChannel.whatsapp + 2);
      expect(updated.clicksByChannel.email).toBe(baseline.clicksByChannel.email + 1);
      expect(updated.clicksByChannel.web).toBe(baseline.clicksByChannel.web + 3);
    });

    it('2.5: asserts internal and global mathematical consistency of time-series (clicksByMonth)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      let sumMonthTotal = 0;
      let sumMonthWhatsapp = 0;
      let sumMonthEmail = 0;
      let sumMonthWeb = 0;

      for (const m of json.clicksByMonth) {
        expect(m.month).toMatch(/^\d{4}-\d{2}$/);
        // Internal consistency per month
        expect(m.whatsapp + m.email + m.web).toBe(m.clicks);

        sumMonthTotal += m.clicks;
        sumMonthWhatsapp += m.whatsapp;
        sumMonthEmail += m.email;
        sumMonthWeb += m.web;
      }

      // Global consistency: sum of all months matches overall counters
      expect(sumMonthTotal).toBe(json.summary.totalClicks);
      expect(sumMonthWhatsapp).toBe(json.clicksByChannel.whatsapp);
      expect(sumMonthEmail).toBe(json.clicksByChannel.email);
      expect(sumMonthWeb).toBe(json.clicksByChannel.web);
    });

    it('2.6: correctly buckets historical clicks across multiple past calendar months', async () => {
      const listing = await createListing('APPROVED');

      // Seed historical clicks directly into DB with specific past months
      const pastDates = [
        { date: new Date('2025-01-15T12:00:00Z'), channel: 'WHATSAPP', month: '2025-01' },
        { date: new Date('2025-01-20T15:00:00Z'), channel: 'EMAIL', month: '2025-01' },
        { date: new Date('2025-06-10T10:00:00Z'), channel: 'WEB', month: '2025-06' },
      ];

      for (const p of pastDates) {
        const click = await prisma.contactClick.create({
          data: {
            listingId: listing.id,
            channel: p.channel,
            createdAt: p.date,
          },
        });
        createdClickIds.push(click.id);
      }

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const jan2025 = json.clicksByMonth.find((m: any) => m.month === '2025-01');
      expect(jan2025).toBeDefined();
      expect(jan2025.clicks).toBeGreaterThanOrEqual(2);
      expect(jan2025.whatsapp).toBeGreaterThanOrEqual(1);
      expect(jan2025.email).toBeGreaterThanOrEqual(1);

      const jun2025 = json.clicksByMonth.find((m: any) => m.month === '2025-06');
      expect(jun2025).toBeDefined();
      expect(jun2025.clicks).toBeGreaterThanOrEqual(1);
      expect(jun2025.web).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // DOMAIN 3: MODERATION QUEUE INTEGRATION (F28 MODERATION QUEUE)
  // =========================================================================
  describe('Domain 3: Moderation Queue Integration (F28)', () => {
    it('3.1: moderation queue contains exclusively PENDING listings (zero APPROVED/REJECTED leak)', async () => {
      const pending = await createListing('PENDING');
      const approved = await createListing('APPROVED');
      const rejected = await createListing('REJECTED');

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const queueIds = json.moderationQueue.map((item: any) => item.id);

      expect(queueIds).toContain(pending.id);
      expect(queueIds).not.toContain(approved.id);
      expect(queueIds).not.toContain(rejected.id);
    });

    it('3.2: pending listings linked to official school return official school name', async () => {
      const listing = await createListing('PENDING', {
        schoolId: testSchool.id,
        title: `${PREFIX} Listing con Escuela Oficial`,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const item = json.moderationQueue.find((i: any) => i.id === listing.id);
      expect(item).toBeDefined();
      expect(item.school).toBe(testSchool.nombre);
      expect(item.category).toBe(testCategory.name);
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('3.3: pending listings linked to schoolRequest ("Mi colegio no está") return requested school name', async () => {
      const listing = await createListing('PENDING', {
        schoolId: null,
        schoolRequestId: testSchoolRequest.id,
        title: `${PREFIX} Listing con Colegio Solicitado`,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const item = json.moderationQueue.find((i: any) => i.id === listing.id);
      expect(item).toBeDefined();
      expect(item.school).toBe(testSchoolRequest.nombre);
    });

    it('3.4: pending listings with null school and null schoolRequest fallback gracefully', async () => {
      const listing = await createListing('PENDING', {
        schoolId: null,
        schoolRequestId: null,
        title: `${PREFIX} Listing sin Escuela Asociada`,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const item = json.moderationQueue.find((i: any) => i.id === listing.id);
      expect(item).toBeDefined();
      expect(item.school).toBe('Colegio no especificado');
    });

    it('3.5: moderation queue items are ordered descending by createdAt (newest first)', async () => {
      const dateOlder = new Date('2026-02-01T10:00:00Z');
      const dateNewer = new Date('2026-03-01T10:00:00Z');

      const older = await createListing('PENDING', { createdAt: dateOlder, title: `${PREFIX} Older Item` });
      const newer = await createListing('PENDING', { createdAt: dateNewer, title: `${PREFIX} Newer Item` });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const idxNewer = json.moderationQueue.findIndex((i: any) => i.id === newer.id);
      const idxOlder = json.moderationQueue.findIndex((i: any) => i.id === older.id);

      expect(idxNewer).toBeGreaterThanOrEqual(0);
      expect(idxOlder).toBeGreaterThanOrEqual(0);
      expect(idxNewer).toBeLessThan(idxOlder); // Newer item appears earlier in the queue
    });

    it('3.6: dynamically evicts approved/rejected listings from queue and updates counters', async () => {
      const pending = await createListing('PENDING');

      // 1. Initial check: pending is in queue
      const req1 = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res1 = await handleAdminMetrics(req1);
      const json1 = await res1.json();
      expect(json1.moderationQueue.some((i: any) => i.id === pending.id)).toBe(true);

      // 2. Approve listing
      await prisma.listing.update({
        where: { id: pending.id },
        data: { status: 'APPROVED' },
      });

      // 3. Second check: no longer in queue, approved count increased
      const req2 = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res2 = await handleAdminMetrics(req2);
      const json2 = await res2.json();
      expect(json2.moderationQueue.some((i: any) => i.id === pending.id)).toBe(false);
      expect(json2.summary.approvedListings).toBe(json1.summary.approvedListings + 1);
      expect(json2.summary.pendingListings).toBe(json1.summary.pendingListings - 1);
    });

    it('3.7: verifies symmetrical output for pendingListings and moderationQueue keys', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      expect(json.pendingListings).toBeDefined();
      expect(json.moderationQueue).toBeDefined();
      expect(json.pendingListings).toEqual(json.moderationQueue);
    });
  });

  // =========================================================================
  // DOMAIN 4: CONCURRENCY, RESILIENCE & PERFORMANCE STRESS HARNESS
  // =========================================================================
  describe('Domain 4: Concurrency & Performance Stress Harness', () => {
    it('4.1: handles rapid concurrent click tracking without loss or race condition', async () => {
      const listing = await createListing('APPROVED');

      // Read baseline
      const reqBase = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resBase = await handleAdminMetrics(reqBase);
      const base = await resBase.json();

      // Launch 15 concurrent click tracking requests
      const channels: Array<'WHATSAPP' | 'EMAIL' | 'WEB'> = ['WHATSAPP', 'EMAIL', 'WEB'];
      const promises = Array.from({ length: 15 }, (_, i) => {
        const ch = channels[i % 3];
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });
        return handleTrackClick(req);
      });

      const responses = await Promise.all(promises);
      for (const r of responses) {
        expect(r.status).toBe(201);
        const j = await r.json();
        createdClickIds.push(j.eventId);
      }

      // Verify updated metrics
      const reqUp = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const resUp = await handleAdminMetrics(reqUp);
      const updated = await resUp.json();

      expect(updated.summary.totalClicks).toBe(base.summary.totalClicks + 15);
      expect(updated.clicksByChannel.whatsapp).toBe(base.clicksByChannel.whatsapp + 5);
      expect(updated.clicksByChannel.email).toBe(base.clicksByChannel.email + 5);
      expect(updated.clicksByChannel.web).toBe(base.clicksByChannel.web + 5);
    });

    it('4.2: executes /api/admin/metrics query in under 350ms (performance threshold)', async () => {
      const start = performance.now();
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-test-user-id': testAdminUser.id },
      });
      const res = await handleAdminMetrics(req);
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(350); // fast execution
    });
  });
});
