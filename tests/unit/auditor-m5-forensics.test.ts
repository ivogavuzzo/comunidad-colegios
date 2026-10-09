import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as handleTrackClick } from '@/app/api/track/click/route';
import { POST as handleTrackingAliasClick } from '@/app/api/tracking/click/route';
import { GET as handleAdminMetrics } from '@/app/api/admin/metrics/route';
import { hashClientIp, normalizeChannel } from '@/lib/tracking';

describe('FORENSIC INTEGRITY AUDIT: Milestone 5 (Contact Tracking & Admin Dashboard)', () => {
  const PREFIX = '[FORENSIC-M5]';
  let auditSchool: any;
  let auditCategory: any;
  let auditSubcategory: any;
  let auditRegularUser: any;
  let auditAdminUser: any;

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();

    auditSchool = await prisma.school.findFirst();
    if (!auditSchool) {
      auditSchool = await prisma.school.create({
        data: {
          cueanexo: `888888888-${Date.now()}`,
          nombre: `${PREFIX} Colegio Auditoria`,
          domicilio: 'Av. Libertador 5000',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 13',
          localidad: 'Belgrano',
        },
      });
    }

    auditCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!auditCategory) {
      auditCategory = await prisma.category.create({
        data: {
          name: 'Categoría Auditoria M5',
          slug: `cat-audit-m5-${Date.now()}`,
          subcategories: {
            create: [{ name: 'Subcat Audit M5', slug: `sub-audit-m5-${Date.now()}` }],
          },
        },
        include: { subcategories: true },
      });
    }
    auditSubcategory = auditCategory.subcategories[0];

    auditRegularUser = await prisma.user.create({
      data: {
        email: `regular-audit-${Date.now()}@criana-audit.internal`,
        name: 'Usuario Regular Auditoria M5',
        dni: '41123456',
        isOnboarded: true,
        role: 'USER',
        schoolOfOriginId: auditSchool.id,
      },
    });
    createdUserIds.push(auditRegularUser.id);

    auditAdminUser = await prisma.user.create({
      data: {
        email: `admin-audit-${Date.now()}@criana-audit.internal`,
        name: 'Administrador Auditoria M5',
        dni: '41999999',
        isOnboarded: true,
        role: 'ADMIN',
        schoolOfOriginId: auditSchool.id,
      },
    });
    createdUserIds.push(auditAdminUser.id);
  });

  afterAll(async () => {
    if (createdListingIds.length > 0) {
      await prisma.contactClick.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  const createForensicListing = async (status: string = 'APPROVED') => {
    const listing = await prisma.listing.create({
      data: {
        title: `${PREFIX} Listing ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: 'Publicación forense para verificar el tracking de contactos y dashboard',
        status,
        whatsapp: '+5491144445555',
        email: 'contacto@forense.edu.ar',
        webUrl: 'https://forense.edu.ar',
        userId: auditRegularUser.id,
        schoolId: auditSchool.id,
        categoryId: auditCategory.id,
        subcategoryId: auditSubcategory.id,
      },
    });
    createdListingIds.push(listing.id);
    return listing;
  };

  // =========================================================================
  // Forensic Check 1: Authentic SQLite Persistence of ContactClick
  // =========================================================================
  describe('Forensic 1: Genuine Database Operations in SQLite (ContactClick)', () => {
    it('persists authentic ContactClick rows in SQLite when /api/track/click is invoked', async () => {
      const listing = await createForensicListing();

      const initialCount = await prisma.contactClick.count({
        where: { listingId: listing.id },
      });
      expect(initialCount).toBe(0);

      const channels = ['WHATSAPP', 'EMAIL', 'WEB'] as const;
      for (const channel of channels) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel }),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.eventId).toBeDefined();

        // Direct DB inspection
        const saved = await prisma.contactClick.findUnique({
          where: { id: json.eventId },
        });
        expect(saved).not.toBeNull();
        expect(saved!.listingId).toBe(listing.id);
        expect(saved!.channel).toBe(channel);
        expect(saved!.createdAt).toBeInstanceOf(Date);
      }

      const finalCount = await prisma.contactClick.count({
        where: { listingId: listing.id },
      });
      expect(finalCount).toBe(3);
    });

    it('enforces relational foreign key cascade delete in SQLite', async () => {
      const listing = await createForensicListing();

      // Create 2 clicks directly in DB
      await prisma.contactClick.createMany({
        data: [
          { listingId: listing.id, channel: 'WHATSAPP', ipHash: hashClientIp('127.0.0.1') },
          { listingId: listing.id, channel: 'EMAIL', ipHash: hashClientIp('127.0.0.1') },
        ],
      });

      expect(await prisma.contactClick.count({ where: { listingId: listing.id } })).toBe(2);

      // Delete parent listing
      await prisma.listing.delete({ where: { id: listing.id } });

      // Clicks must be wiped via cascade
      expect(await prisma.contactClick.count({ where: { listingId: listing.id } })).toBe(0);

      // Remove from cleanup array
      const idx = createdListingIds.indexOf(listing.id);
      if (idx !== -1) createdListingIds.splice(idx, 1);
    });
  });

  // =========================================================================
  // Forensic Check 2: Privacy-Preserving SHA-256 IP Hashing Authenticity
  // =========================================================================
  describe('Forensic 2: Authentic SHA-256 IP Privacy Hashing', () => {
    it('genuinely computes crypto.createHash("sha256") and stores zero plain IPs', async () => {
      const listing = await createForensicListing();
      const testIps = ['190.111.22.33', '201.234.56.78', '181.16.0.1'];

      for (const rawIp of testIps) {
        const expectedSha256 = crypto.createHash('sha256').update(rawIp).digest('hex');

        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': rawIp,
          },
          body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
        });

        const res = await handleTrackClick(req);
        const json = await res.json();

        const dbClick = await prisma.contactClick.findUnique({
          where: { id: json.eventId },
        });

        expect(dbClick).not.toBeNull();
        expect(dbClick!.ipHash).toBe(expectedSha256);
        expect(dbClick!.ipHash).toHaveLength(64);
        expect(dbClick!.ipHash).not.toContain(rawIp);
      }
    });

    it('correctly handles multi-hop x-forwarded-for header by hashing client-origin IP only', async () => {
      const listing = await createForensicListing();
      const clientIp = '186.130.45.67';
      const forwardedHeader = `${clientIp}, 172.16.0.2, 10.0.0.1`;
      const expectedSha256 = crypto.createHash('sha256').update(clientIp).digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': forwardedHeader,
        },
        body: JSON.stringify({ listingId: listing.id, channel: 'WEB' }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedSha256);
    });

    it('falls back to x-real-ip when x-forwarded-for is not present', async () => {
      const listing = await createForensicListing();
      const realIp = '190.220.10.5';
      const expectedSha256 = crypto.createHash('sha256').update(realIp).digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-real-ip': realIp,
        },
        body: JSON.stringify({ listingId: listing.id, channel: 'EMAIL' }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedSha256);
    });
  });

  // =========================================================================
  // Forensic Check 3: Genuine Dynamic Metrics Aggregations & Moderation Queue
  // =========================================================================
  describe('Forensic 3: Genuine Dynamic Metrics Aggregations (/api/admin/metrics)', () => {
    it('computes live database aggregations and increments counters strictly on new data', async () => {
      const baselineReq = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const baselineRes = await handleAdminMetrics(baselineReq);
      expect(baselineRes.status).toBe(200);
      const baselineJson = await baselineRes.json();

      // Add 1 listing and 2 clicks (1 WhatsApp, 1 Web)
      const newListing = await createForensicListing('PENDING');

      const clickReq1 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: newListing.id, channel: 'WHATSAPP' }),
      });
      await handleTrackClick(clickReq1);

      const clickReq2 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: newListing.id, channel: 'WEB' }),
      });
      await handleTrackClick(clickReq2);

      // Fetch metrics again
      const updatedReq = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const updatedRes = await handleAdminMetrics(updatedReq);
      const updatedJson = await updatedRes.json();

      // Verify exact dynamic delta
      expect(updatedJson.summary.totalListings).toBe(baselineJson.summary.totalListings + 1);
      expect(updatedJson.summary.pendingListings).toBe(baselineJson.summary.pendingListings + 1);
      expect(updatedJson.summary.totalClicks).toBe(baselineJson.summary.totalClicks + 2);
      expect(updatedJson.clicksByChannel.whatsapp).toBe(baselineJson.clicksByChannel.whatsapp + 1);
      expect(updatedJson.clicksByChannel.web).toBe(baselineJson.clicksByChannel.web + 1);

      // Verify pending listing is in moderationQueue
      const queuedItem = updatedJson.moderationQueue.find((i: any) => i.id === newListing.id);
      expect(queuedItem).toBeDefined();
      expect(queuedItem.title).toBe(newListing.title);
      expect(queuedItem.category).toBe(auditCategory.name);
      expect(queuedItem.school).toBe(auditSchool.nombre);
    });

    it('aggregates clicksByMonth dynamically matching individual createdAt timestamps', async () => {
      const listing = await createForensicListing();

      // Inject click with previous month date
      const pastDate = new Date('2025-11-15T12:00:00Z');
      await prisma.contactClick.create({
        data: {
          listingId: listing.id,
          channel: 'EMAIL',
          createdAt: pastDate,
          ipHash: hashClientIp('127.0.0.1'),
        },
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: { 'x-admin-bypass': 'true' },
      });
      const res = await handleAdminMetrics(req);
      const json = await res.json();

      const novItem = json.clicksByMonth.find((m: any) => m.month === '2025-11');
      expect(novItem).toBeDefined();
      expect(novItem.email).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Forensic Check 4: Authentication & RBAC Enforcement
  // =========================================================================
  describe('Forensic 4: Security & Access Control Hardening', () => {
    it('returns HTTP 401 when no session or test headers are provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('No autenticado');
    });

    it('returns HTTP 403 when authenticated as a non-ADMIN user', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': auditRegularUser.id,
          'x-test-user-email': auditRegularUser.email,
        },
      });
      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('administrador');
    });

    it('returns HTTP 200 when authenticated as an ADMIN user', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
        headers: {
          'x-test-user-id': auditAdminUser.id,
          'x-test-user-email': auditAdminUser.email,
        },
      });
      const res = await handleAdminMetrics(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
    });

    it('strictly denies bypass header in simulated production environment', async () => {
      const savedEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const req = new NextRequest('http://localhost:3000/api/admin/metrics', {
          headers: { 'x-admin-bypass': 'true' },
        });
        const res = await handleAdminMetrics(req);
        expect(res.status).toBe(401);
      } finally {
        (process.env as any).NODE_ENV = savedEnv;
      }
    });
  });

  // =========================================================================
  // Forensic Check 5: Input Validation & Boundary Robustness
  // =========================================================================
  describe('Forensic 5: Input Validation & Boundary Robustness', () => {
    it('returns 400 for unknown channel, missing channel, or missing listingId', async () => {
      const listing = await createForensicListing();

      // Unknown channel
      const res1 = await handleTrackClick(
        new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: 'TELEGRAM' }),
        })
      );
      expect(res1.status).toBe(400);

      // Missing channel
      const res2 = await handleTrackClick(
        new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id }),
        })
      );
      expect(res2.status).toBe(400);

      // Missing listingId
      const res3 = await handleTrackClick(
        new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'WHATSAPP' }),
        })
      );
      expect(res3.status).toBe(400);
    });

    it('returns 404 when listingId does not exist in SQLite database', async () => {
      const res = await handleTrackClick(
        new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: 'non-existent-listing-id-cuid',
            channel: 'WHATSAPP',
          }),
        })
      );
      expect(res.status).toBe(404);
    });

    it('supports alias /api/tracking/click identically', async () => {
      const listing = await createForensicListing();
      const res = await handleTrackingAliasClick(
        new NextRequest('http://localhost:3000/api/tracking/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
        })
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.channel).toBe('WHATSAPP');
    });
  });
});
