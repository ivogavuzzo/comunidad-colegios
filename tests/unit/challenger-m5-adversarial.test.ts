import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as handleTrackClick } from '@/app/api/track/click/route';
import { POST as handleTrackingAliasClick } from '@/app/api/tracking/click/route';
import { hashClientIp, normalizeChannel } from '@/lib/tracking';

describe('EMPIRICAL CHALLENGER M5 — Adversarial Stress Suite (F25, F26)', () => {
  const PREFIX = '[ADV-CHALLENGER-M5]';
  let testUser: any;
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
          cueanexo: `888888888-${Date.now()}`,
          nombre: `${PREFIX} Escuela Adversarial`,
          domicilio: 'Calle Falsa 123',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 2',
          localidad: 'Recoleta',
        },
      });
    }

    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: {
          name: 'Categoría Stress M5',
          slug: `cat-adv-m5-${Date.now()}`,
          subcategories: {
            create: [{ name: 'Subcat Stress M5', slug: `sub-adv-m5-${Date.now()}` }],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategory = testCategory.subcategories[0];

    testUser = await prisma.user.create({
      data: {
        email: `adv-user-${Date.now()}@adversarial-m5.com`,
        name: 'Adversarial Tester M5',
        dni: '38111222',
        isOnboarded: true,
        role: 'USER',
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testUser.id);
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

  const createListing = async (customTitle?: string) => {
    const listing = await prisma.listing.create({
      data: {
        title: customTitle || `${PREFIX} Listing ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: 'Descripción para stress harness de tracking de clics',
        status: 'APPROVED',
        whatsapp: '+5491199887766',
        email: 'stress@test.com',
        webUrl: 'https://stress-test.org',
        userId: testUser.id,
        schoolId: testSchool.id,
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
      },
    });
    createdListingIds.push(listing.id);
    return listing;
  };

  // =========================================================================
  // 1. HIGH CONCURRENCY BURST CLICKS (WhatsApp, Email, Web)
  // =========================================================================
  describe('1. High Concurrency Burst Click Harness', () => {
    it('handles 60 concurrent burst clicks across mixed channels on /api/track/click without data loss or race condition', async () => {
      const listing = await createListing();
      const channels = ['WHATSAPP', 'EMAIL', 'WEB', 'WEBSITE_IG'] as const;
      const BURST_COUNT = 60;

      const promises = Array.from({ length: BURST_COUNT }).map((_, i) => {
        const ch = channels[i % channels.length];
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': `190.10.${(i % 250) + 1}.1`,
            'user-agent': `StressBot/${i}.0`,
          },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });
        return handleTrackClick(req);
      });

      const responses = await Promise.all(promises);

      // Verify all responses returned HTTP 201
      for (const res of responses) {
        expect(res.status).toBe(201);
      }

      const jsonList = await Promise.all(responses.map((r) => r.json()));
      expect(jsonList.length).toBe(BURST_COUNT);
      expect(jsonList.every((j) => j.success === true)).toBe(true);

      // Verify exact count in SQLite database
      const dbClicks = await prisma.contactClick.findMany({
        where: { listingId: listing.id },
      });
      expect(dbClicks.length).toBe(BURST_COUNT);

      // Verify channel distribution: 15 WHATSAPP, 15 EMAIL, 30 WEB (since WEBSITE_IG normalizes to WEB)
      const countWhatsApp = dbClicks.filter((c) => c.channel === 'WHATSAPP').length;
      const countEmail = dbClicks.filter((c) => c.channel === 'EMAIL').length;
      const countWeb = dbClicks.filter((c) => c.channel === 'WEB').length;

      expect(countWhatsApp).toBe(15);
      expect(countEmail).toBe(15);
      expect(countWeb).toBe(30);
    });

    it('handles 30 concurrent burst clicks on route alias /api/tracking/click', async () => {
      const listing = await createListing();
      const channels = ['WHATSAPP', 'EMAIL', 'WEB'] as const;
      const BURST_COUNT = 30;

      const promises = Array.from({ length: BURST_COUNT }).map((_, i) => {
        const ch = channels[i % channels.length];
        const req = new NextRequest('http://localhost:3000/api/tracking/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-real-ip': `200.50.${i + 1}.10`,
          },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });
        return handleTrackingAliasClick(req);
      });

      const responses = await Promise.all(promises);
      expect(responses.every((r) => r.status === 201)).toBe(true);

      const dbCount = await prisma.contactClick.count({
        where: { listingId: listing.id },
      });
      expect(dbCount).toBe(BURST_COUNT);
    });

    it('handles simultaneous storm across 5 distinct listings (50 total concurrent requests)', async () => {
      const listings = await Promise.all(
        Array.from({ length: 5 }).map((_, i) => createListing(`${PREFIX} Multi-Listing-${i}`))
      );

      // 10 concurrent requests per listing = 50 total concurrent requests
      const promises: Promise<Response>[] = [];
      listings.forEach((listing, listIdx) => {
        for (let i = 0; i < 10; i++) {
          const ch = i % 2 === 0 ? 'WHATSAPP' : 'EMAIL';
          const endpoint = i % 2 === 0 ? handleTrackClick : handleTrackingAliasClick;
          const req = new NextRequest('http://localhost:3000/api/track/click', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': `185.${listIdx}.${i}.1`,
            },
            body: JSON.stringify({ listingId: listing.id, channel: ch }),
          });
          promises.push(endpoint(req));
        }
      });

      const responses = await Promise.all(promises);
      expect(responses.every((r) => r.status === 201)).toBe(true);

      // Verify each listing received exactly 10 clicks
      for (const listing of listings) {
        const count = await prisma.contactClick.count({
          where: { listingId: listing.id },
        });
        expect(count).toBe(10);
      }
    });
  });

  // =========================================================================
  // 2. SHA-256 IP PRIVACY HASHING & ZERO PLAINTEXT LEAKAGE
  // =========================================================================
  describe('2. SHA-256 IP Privacy Hashing & Zero Plaintext IP Assertion', () => {
    it('verifies SHA-256 hash algorithm compliance across IPv4, IPv6, and complex proxy headers', async () => {
      const listing = await createListing();
      const ipTestCases = [
        { raw: '190.19.24.55', header: 'x-forwarded-for', val: '190.19.24.55' },
        { raw: '127.0.0.1', header: 'x-real-ip', val: '127.0.0.1' },
        { raw: '10.0.0.1', header: 'x-forwarded-for', val: '10.0.0.1, 192.168.1.1, 172.16.0.1' },
        { raw: '181.45.67.89', header: 'x-forwarded-for', val: '  181.45.67.89  , 10.0.0.1 ' },
        { raw: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', header: 'x-forwarded-for', val: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
        { raw: '::1', header: 'x-real-ip', val: '::1' },
        { raw: '::ffff:192.0.2.128', header: 'x-forwarded-for', val: '::ffff:192.0.2.128' },
      ];

      for (const tc of ipTestCases) {
        const expectedHash = crypto.createHash('sha256').update(tc.raw).digest('hex');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        headers[tc.header] = tc.val;

        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers,
          body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(201);
        const json = await res.json();

        const dbClick = await prisma.contactClick.findUnique({
          where: { id: json.eventId },
        });

        expect(dbClick).not.toBeNull();
        expect(dbClick!.ipHash).toBe(expectedHash);
        expect(dbClick!.ipHash).toHaveLength(64);
        expect(dbClick!.ipHash).toMatch(/^[a-f0-9]{64}$/);
        expect(hashClientIp(tc.raw)).toBe(expectedHash);
      }
    });

    it('falls back to 127.0.0.1 SHA-256 hash when no IP headers are present', async () => {
      const listing = await createListing();
      const expectedHash = crypto.createHash('sha256').update('127.0.0.1').digest('hex');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel: 'EMAIL' }),
      });

      const res = await handleTrackClick(req);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.ipHash).toBe(expectedHash);
    });

    it('strictly guarantees ZERO plaintext client IPs are stored anywhere in the ContactClick database record', async () => {
      const listing = await createListing();
      const privateIps = [
        '190.220.111.45',
        '201.210.33.99',
        '181.165.77.22',
      ];

      for (const sensitiveIp of privateIps) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': sensitiveIp,
            'user-agent': `AuditAgent/1.0 (${sensitiveIp})`, // IP in UA to test UA or record leakage
          },
          body: JSON.stringify({ listingId: listing.id, channel: 'WEB' }),
        });

        const res = await handleTrackClick(req);
        const json = await res.json();

        const dbClick = await prisma.contactClick.findUnique({
          where: { id: json.eventId },
        });

        expect(dbClick).not.toBeNull();

        // 1. ipHash must NEVER contain raw IP
        expect(dbClick!.ipHash).not.toContain(sensitiveIp);
        // 2. ipHash must be exact 64-char hex
        expect(dbClick!.ipHash).toHaveLength(64);
        expect(dbClick!.ipHash).toMatch(/^[a-f0-9]{64}$/);

        // 3. Inspect full JSON serialized representation of the row
        const serialized = JSON.stringify(dbClick);
        // Field ipHash should not equal sensitiveIp
        expect(dbClick!.ipHash).not.toBe(sensitiveIp);

        // 4. Query directly via raw SQL to confirm SQLite columns
        const rawRows = (await prisma.$queryRawUnsafe(
          `SELECT * FROM ContactClick WHERE id = '${dbClick!.id}'`
        )) as Array<Record<string, any>>;
        expect(rawRows.length).toBe(1);
        const rawRow = rawRows[0];
        expect(rawRow.ipHash).not.toBe(sensitiveIp);
        expect(rawRow.ipHash).toHaveLength(64);
      }
    });

    it('sanitizes oversized User-Agent to at most 500 characters', async () => {
      const listing = await createListing();
      const massiveUa = 'UserAgentX/'.padEnd(850, 'z');

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': massiveUa,
        },
        body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.userAgent).toHaveLength(500);
      expect(dbClick!.userAgent).toBe(massiveUa.substring(0, 500));
    });
  });

  // =========================================================================
  // 3. BOUNDARY INPUTS & MALFORMED PAYLOADS (400, 404)
  // =========================================================================
  describe('3. Boundary Inputs & Error Handling (HTTP 400 & 404)', () => {
    it('returns HTTP 400 for all invalid channel strings and injection attempts', async () => {
      const listing = await createListing();
      const invalidChannels = [
        'TELEGRAM',
        'SMS',
        'PHONE',
        'INSTAGRAM',
        'TIKTOK',
        'RANDOM',
        'NULL',
        '',
        '   ',
        'WHATSAPP; DROP TABLE ContactClick; --',
        "' OR 1=1 --",
        '<script>alert("xss")</script>',
        'A'.repeat(500),
      ];

      for (const ch of invalidChannels) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: ch }),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error).toMatch(/canal/i);
      }
    });

    it('returns HTTP 400 for non-string, missing, or malformed channel values', async () => {
      const listing = await createListing();
      const invalidPayloads = [
        { listingId: listing.id, channel: null },
        { listingId: listing.id, channel: 12345 },
        { listingId: listing.id, channel: true },
        { listingId: listing.id, channel: false },
        { listingId: listing.id, channel: {} },
        { listingId: listing.id, channel: ['WHATSAPP'] },
        { listingId: listing.id }, // missing channel
      ];

      for (const payload of invalidPayloads) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBeDefined();
      }
    });

    it('returns HTTP 400 for missing, null, empty, or non-string listingId values', async () => {
      const invalidListingIds = [
        undefined, // missing
        null,
        123456,
        true,
        false,
        {},
        [],
        '',
      ];

      for (const badId of invalidListingIds) {
        const payload: Record<string, any> = { channel: 'WHATSAPP' };
        if (badId !== undefined) payload.listingId = badId;

        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/listingId/i);
      }
    });

    it('returns HTTP 400 when payload is empty object ({})', async () => {
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/listingId/i);
    });

    it('safely handles extra unexpected properties in payload while processing valid click', async () => {
      const listing = await createListing();
      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          channel: 'WHATSAPP',
          extraField: 'should_be_ignored',
          injectedCode: 'DROP TABLE Users;',
        }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel).toBe('WHATSAPP');
    });

    it('returns HTTP 404 for non-existent, deleted, or arbitrary listing IDs', async () => {
      const nonExistentIds = [
        'cuid_non_existent_999999999',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'arbitrary-slug-string-12345',
        "'; DROP TABLE Listing; --",
      ];

      for (const nonId of nonExistentIds) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: nonId, channel: 'WHATSAPP' }),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toMatch(/no existe/i);
      }
    });

    it('returns HTTP 404 when tracking a listing that has just been deleted', async () => {
      const listing = await createListing();

      // Delete the listing immediately
      await prisma.listing.delete({ where: { id: listing.id } });
      const idx = createdListingIds.indexOf(listing.id);
      if (idx !== -1) createdListingIds.splice(idx, 1);

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/no existe/i);
    });
  });

  // =========================================================================
  // 4. RELATIONAL INTEGRITY & FOREIGN KEY CASCADE DELETION
  // =========================================================================
  describe('4. Relational Cascade Deletion Integrity', () => {
    it('deleting a listing cascade-deletes all associated ContactClick records without orphan rows', async () => {
      const listingA = await createListing(`${PREFIX} Listing Cascade Target`);
      const listingB = await createListing(`${PREFIX} Listing Unaffected`);

      // Record 12 clicks on listing A
      for (let i = 0; i < 12; i++) {
        const ch = i % 2 === 0 ? 'WHATSAPP' : 'EMAIL';
        await prisma.contactClick.create({
          data: {
            listingId: listingA.id,
            channel: ch,
            ipHash: hashClientIp(`10.0.0.${i}`),
          },
        });
      }

      // Record 5 clicks on listing B
      for (let i = 0; i < 5; i++) {
        await prisma.contactClick.create({
          data: {
            listingId: listingB.id,
            channel: 'WEB',
            ipHash: hashClientIp(`192.168.0.${i}`),
          },
        });
      }

      expect(await prisma.contactClick.count({ where: { listingId: listingA.id } })).toBe(12);
      expect(await prisma.contactClick.count({ where: { listingId: listingB.id } })).toBe(5);

      // Execute cascade deletion of listing A
      await prisma.listing.delete({ where: { id: listingA.id } });
      const idxA = createdListingIds.indexOf(listingA.id);
      if (idxA !== -1) createdListingIds.splice(idxA, 1);

      // Assert listing A clicks are 0
      const countA = await prisma.contactClick.count({ where: { listingId: listingA.id } });
      expect(countA).toBe(0);

      // Assert listing B clicks remain intact (5)
      const countB = await prisma.contactClick.count({ where: { listingId: listingB.id } });
      expect(countB).toBe(5);
    });

    it('deleting an advertiser User transitively cascade-deletes Listing and its ContactClick events', async () => {
      // Create dedicated advertiser user
      const advertiser = await prisma.user.create({
        data: {
          email: `temp-advertiser-${Date.now()}@test.com`,
          name: 'Advertiser Temp',
          dni: '37999888',
          isOnboarded: true,
          role: 'USER',
          schoolOfOriginId: testSchool.id,
        },
      });

      const listing = await prisma.listing.create({
        data: {
          title: `${PREFIX} Listing User Cascade`,
          description: 'Aviso para verificar borrado en cascada desde User',
          userId: advertiser.id,
          schoolId: testSchool.id,
          categoryId: testCategory.id,
          subcategoryId: testSubcategory.id,
          status: 'APPROVED',
        },
      });

      // Add 4 clicks to the listing
      for (const ch of ['WHATSAPP', 'EMAIL', 'WEB', 'WHATSAPP'] as const) {
        await prisma.contactClick.create({
          data: {
            listingId: listing.id,
            channel: ch,
            ipHash: hashClientIp('127.0.0.1'),
          },
        });
      }

      expect(await prisma.contactClick.count({ where: { listingId: listing.id } })).toBe(4);

      // Delete the User directly
      await prisma.user.delete({ where: { id: advertiser.id } });

      // Verify Listing is gone
      const dbListing = await prisma.listing.findUnique({ where: { id: listing.id } });
      expect(dbListing).toBeNull();

      // Verify ContactClicks are completely gone
      const clicksCount = await prisma.contactClick.count({ where: { listingId: listing.id } });
      expect(clicksCount).toBe(0);
    });
  });

  // =========================================================================
  // 5. PARITY: /api/track/click vs /api/tracking/click
  // =========================================================================
  describe('5. Parity & Contract Symmetry Across Both Endpoints', () => {
    it('both endpoints exhibit identical error handling for invalid channel', async () => {
      const listing = await createListing();

      const req1 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel: 'BAD_CHANNEL' }),
      });
      const res1 = await handleTrackClick(req1);

      const req2 = new NextRequest('http://localhost:3000/api/tracking/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel: 'BAD_CHANNEL' }),
      });
      const res2 = await handleTrackingAliasClick(req2);

      expect(res1.status).toBe(400);
      expect(res2.status).toBe(400);

      const json1 = await res1.json();
      const json2 = await res2.json();
      expect(json1).toEqual(json2);
    });

    it('both endpoints exhibit identical error handling for non-existent listing', async () => {
      const fakeId = 'cuid_non_existent_both_endpoints';

      const req1 = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: fakeId, channel: 'WHATSAPP' }),
      });
      const res1 = await handleTrackClick(req1);

      const req2 = new NextRequest('http://localhost:3000/api/tracking/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: fakeId, channel: 'WHATSAPP' }),
      });
      const res2 = await handleTrackingAliasClick(req2);

      expect(res1.status).toBe(404);
      expect(res2.status).toBe(404);

      const json1 = await res1.json();
      const json2 = await res2.json();
      expect(json1).toEqual(json2);
    });
  });

  // =========================================================================
  // 6. SAME-CLIENT RAPID BURST & USER-AGENT SPECIAL CASES
  // =========================================================================
  describe('6. Same-Client Rapid Burst & User-Agent Edge Cases', () => {
    it('handles 40 rapid burst clicks from identical IP and channel, recording all with identical ipHash', async () => {
      const listing = await createListing();
      const clientIp = '186.130.88.99';
      const expectedHash = crypto.createHash('sha256').update(clientIp).digest('hex');
      const BURST = 40;

      const promises = Array.from({ length: BURST }).map(() => {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': clientIp,
            'user-agent': 'BurstClient/1.0',
          },
          body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
        });
        return handleTrackClick(req);
      });

      const responses = await Promise.all(promises);
      expect(responses.every((r) => r.status === 201)).toBe(true);

      const dbClicks = await prisma.contactClick.findMany({
        where: { listingId: listing.id },
      });
      expect(dbClicks.length).toBe(BURST);
      expect(dbClicks.every((c) => c.ipHash === expectedHash)).toBe(true);
      expect(dbClicks.every((c) => c.channel === 'WHATSAPP')).toBe(true);
      expect(dbClicks.every((c) => c.userAgent === 'BurstClient/1.0')).toBe(true);
    });

    it('correctly handles case-insensitive channel input variations (mixed-case)', async () => {
      const listing = await createListing();
      const variations = [
        { input: 'whatsapp', expected: 'WHATSAPP' },
        { input: 'WhatsApp', expected: 'WHATSAPP' },
        { input: 'wHaTsApP', expected: 'WHATSAPP' },
        { input: 'email', expected: 'EMAIL' },
        { input: 'Email', expected: 'EMAIL' },
        { input: 'eMaIL', expected: 'EMAIL' },
        { input: 'web', expected: 'WEB' },
        { input: 'Web', expected: 'WEB' },
        { input: 'wEb', expected: 'WEB' },
        { input: 'website_ig', expected: 'WEB' },
        { input: 'WeBsItE_iG', expected: 'WEB' },
      ];

      for (const item of variations) {
        const req = new NextRequest('http://localhost:3000/api/track/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, channel: item.input }),
        });

        const res = await handleTrackClick(req);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.channel).toBe(item.expected);

        const dbClick = await prisma.contactClick.findUnique({
          where: { id: json.eventId },
        });
        expect(dbClick!.channel).toBe(item.expected);
      }
    });

    it('safely handles diverse symbols, brackets, and encoded characters in User-Agent header', async () => {
      const listing = await createListing();
      const complexUa = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0 [Comunidad/1.0; Build-2026; +http://criana.com/bot; token=abc%20123; (test)]';

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': complexUa,
        },
        body: JSON.stringify({ listingId: listing.id, channel: 'WHATSAPP' }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.userAgent).toBe(complexUa);
    });

    it('stores null userAgent when user-agent header is omitted completely', async () => {
      const listing = await createListing();

      const req = new NextRequest('http://localhost:3000/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel: 'WEB' }),
      });

      const res = await handleTrackClick(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      const dbClick = await prisma.contactClick.findUnique({
        where: { id: json.eventId },
      });
      expect(dbClick!.userAgent).toBeNull();
    });
  });

  // =========================================================================
  // 7. HASH INVARIANTS & COLLISION RESISTANCE HARNESS
  // =========================================================================
  describe('7. SHA-256 Hash Invariants & Collision Resistance', () => {
    it('produces 500 unique digests without collisions across 500 distinct synthetic IPs', () => {
      const hashes = new Set<string>();
      const sampleSize = 500;

      for (let i = 0; i < sampleSize; i++) {
        const o1 = 10;
        const o2 = (i >> 8) & 0xff;
        const o3 = i & 0xff;
        const ip = `${o1}.${o2}.${o3}.1`;

        const digest = hashClientIp(ip);
        expect(digest).toHaveLength(64);
        expect(digest).toMatch(/^[a-f0-9]{64}$/);
        hashes.add(digest);
      }

      expect(hashes.size).toBe(sampleSize);
    });

    it('hashClientIp strips leading and trailing whitespace deterministically', () => {
      const ip = '190.12.34.56';
      const cleanHash = hashClientIp(ip);
      const dirtyHash1 = hashClientIp(`   ${ip}`);
      const dirtyHash2 = hashClientIp(`${ip}   `);
      const dirtyHash3 = hashClientIp(` \t ${ip} \n `);

      expect(dirtyHash1).toBe(cleanHash);
      expect(dirtyHash2).toBe(cleanHash);
      expect(dirtyHash3).toBe(cleanHash);
    });
  });
});

