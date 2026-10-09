import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import {
  generate256BitOtpToken,
  createListingModerationTokens,
  INSTITUTIONAL_FOOTER_TEXT,
} from '@/lib/email';
import { GET as handleOtpGet } from '@/app/api/moderation/otp/route';

describe('EMPIRICAL CHALLENGER M4 — 1-Click Cryptographic OTP & Sibling Invalidation Stress Suite', () => {
  const TEST_PREFIX = '[CHALLENGER-M4-OTP]';
  let testUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  // Track created resources for deterministic teardown
  const createdListingIds: string[] = [];

  const createTestListing = async (options?: {
    title?: string;
    description?: string;
    aiCorrectedTitle?: string | null;
    aiCorrectedDesc?: string | null;
    status?: string;
  }) => {
    const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const hasTitle = options && 'title' in options;
    const hasDesc = options && 'description' in options;
    const hasAiTitle = options && 'aiCorrectedTitle' in options;
    const hasAiDesc = options && 'aiCorrectedDesc' in options;
    const listing = await prisma.listing.create({
      data: {
        title: hasTitle ? options.title! : `${TEST_PREFIX} Listing ${timestamp}`,
        description: hasDesc ? options.description! : 'Original listing description before moderation',
        aiCorrectedTitle: hasAiTitle ? options.aiCorrectedTitle : `${TEST_PREFIX} AI Corrected Title ${timestamp}`,
        aiCorrectedDesc: hasAiDesc ? options.aiCorrectedDesc : 'AI Corrected description with improved grammar',
        userId: testUser.id,
        schoolId: testSchool.id,
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        status: options?.status || 'PENDING',
      },
    });
    createdListingIds.push(listing.id);
    return listing;
  };

  const executeOtpRequest = async (token?: string, options?: {
    format?: 'json' | 'html';
    ip?: string;
    acceptHeader?: string;
  }) => {
    const formatParam = options?.format ? `&format=${options.format}` : '';
    const tokenParam = token !== undefined ? `token=${encodeURIComponent(token)}` : '';
    const query = [tokenParam, formatParam].filter(Boolean).join('&');
    const url = `http://localhost:3000/api/moderation/otp${query ? `?${query}` : ''}`;

    const headers: Record<string, string> = {};
    if (options?.ip) {
      headers['x-forwarded-for'] = options.ip;
    }
    if (options?.acceptHeader) {
      headers['accept'] = options.acceptHeader;
    } else if (options?.format === 'html') {
      headers['accept'] = 'text/html';
    } else {
      headers['accept'] = 'application/json';
    }

    const request = new NextRequest(url, { headers });
    return handleOtpGet(request);
  };

  beforeAll(async () => {
    await prisma.$connect();

    testSchool = await prisma.school.findFirst();
    expect(testSchool).toBeDefined();

    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    expect(testCategory).toBeDefined();
    expect(testCategory.subcategories.length).toBeGreaterThan(0);
    testSubcategory = testCategory.subcategories[0];

    const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    testUser = await prisma.user.create({
      data: {
        email: `challenger-m4-${timestamp}@example.com`,
        name: 'Challenger M4 Admin',
        dni: '39876543',
        isOnboarded: true,
        schoolOfOriginId: testSchool.id,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    if (createdListingIds.length > 0) {
      await prisma.moderationOtpToken.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.contactClick.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  // =========================================================================
  // 1. TOKEN ENTROPY, STRUCTURE & CRYPTOGRAPHIC UNIQUENESS (F21)
  // =========================================================================
  describe('1. Token Entropy, Structure & Cryptographic Randomness (F21)', () => {
    it('generates exactly 64-character lowercase hex strings with 256 bits entropy', () => {
      const sampleSize = 5000;
      const tokens: string[] = [];
      const hexPattern = /^[0-9a-f]{64}$/;

      for (let i = 0; i < sampleSize; i++) {
        const token = generate256BitOtpToken();
        tokens.push(token);
        expect(token).toHaveLength(64);
        expect(hexPattern.test(token)).toBe(true);
      }

      // Assert zero collisions across the entire generated sample
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(sampleSize);
    });

    it('demonstrates uniform character distribution across the 16 hex characters', () => {
      const sampleSize = 2000;
      const charCounts: Record<string, number> = {};
      '0123456789abcdef'.split('').forEach((c) => (charCounts[c] = 0));

      for (let i = 0; i < sampleSize; i++) {
        const token = generate256BitOtpToken();
        for (const char of token) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      }

      const totalChars = sampleSize * 64;
      const expectedPerChar = totalChars / 16; // 8,000 per character

      // Each character should be within +/- 15% of expected uniform distribution
      for (const [char, count] of Object.entries(charCounts)) {
        const deviation = Math.abs(count - expectedPerChar) / expectedPerChar;
        expect(deviation).toBeLessThan(0.15);
      }
    });

    it('createListingModerationTokens generates paired APPROVE and REJECT tokens linked to listing', async () => {
      const listing = await createTestListing();
      const expirationDays = 7;
      const beforeTime = Date.now();

      const tokens = await createListingModerationTokens(listing.id, expirationDays);
      const afterTime = Date.now();

      expect(tokens.approveToken).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens.rejectToken).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens.approveToken).not.toBe(tokens.rejectToken);

      // Verify expiration is within bounds (7 days from now)
      const expectedMinExpires = beforeTime + 7 * 24 * 60 * 60 * 1000 - 2000;
      const expectedMaxExpires = afterTime + 7 * 24 * 60 * 60 * 1000 + 2000;
      expect(tokens.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpires);
      expect(tokens.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpires);

      // Verify DB persistence
      const dbTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      expect(dbTokens).toHaveLength(2);

      const approveRecord = dbTokens.find((t) => t.action === 'APPROVE');
      const rejectRecord = dbTokens.find((t) => t.action === 'REJECT');

      expect(approveRecord?.token).toBe(tokens.approveToken);
      expect(approveRecord?.usedAt).toBeNull();
      expect(rejectRecord?.token).toBe(tokens.rejectToken);
      expect(rejectRecord?.usedAt).toBeNull();
    });
  });

  // =========================================================================
  // 2. HIGH-CONCURRENCY RACE CONDITION DEFENSE (F22, F23)
  // =========================================================================
  describe('2. High-Concurrency Race Condition Defense (F22, F23)', () => {
    it('guarantees strictly 1 success (200) and conflicts (409) during simultaneous requests on same token', async () => {
      const listing = await createTestListing();
      const { approveToken } = await createListingModerationTokens(listing.id);

      const concurrencyCount = 10;
      const promises = Array.from({ length: concurrencyCount }, (_, i) =>
        executeOtpRequest(approveToken, {
          format: 'json',
          ip: `192.168.1.${10 + i}`,
        })
      );

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      const jsonBodies = await Promise.all(responses.map((r) => r.json()));

      const successResponses = statuses.filter((s) => s === 200);
      const conflictResponses = statuses.filter((s) => s === 409);
      const otherResponses = statuses.filter((s) => s !== 200 && s !== 409);

      // Exactly 1 winner
      expect(successResponses).toHaveLength(1);
      // Exactly concurrencyCount - 1 losers with HTTP 409 Conflict
      expect(conflictResponses).toHaveLength(concurrencyCount - 1);
      // Zero other error codes (no 500, no unhandled exceptions)
      expect(otherResponses).toHaveLength(0);

      // Winning response asserts
      const winningBody = jsonBodies.find((b) => b.success === true);
      expect(winningBody).toBeDefined();
      expect(winningBody.action).toBe('APPROVE');
      expect(winningBody.listingStatus).toBe('APPROVED');

      // Losing responses asserts
      const losingBodies = jsonBodies.filter((b) => b.success === false);
      for (const losingBody of losingBodies) {
        expect(losingBody.message).toBe(
          'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
        );
      }

      // Check final DB state
      const updatedListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('APPROVED');

      const usedTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      expect(usedTokens).toHaveLength(2);
      expect(usedTokens.every((t) => t.usedAt !== null)).toBe(true);
    });

    it('guarantees strictly 1 winner across simultaneous cross-action race (5 APPROVE vs 5 REJECT)', async () => {
      const listing = await createTestListing();
      const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

      // Create interleaved array of 5 APPROVE and 5 REJECT requests
      const approvePromises = Array.from({ length: 5 }, (_, i) =>
        executeOtpRequest(approveToken, {
          format: 'json',
          ip: `10.0.1.${100 + i}`,
        })
      );
      const rejectPromises = Array.from({ length: 5 }, (_, i) =>
        executeOtpRequest(rejectToken, {
          format: 'json',
          ip: `10.0.2.${100 + i}`,
        })
      );

      // Fire all 10 requests concurrently in a single Promise.all
      const combinedPromises = [];
      for (let i = 0; i < 5; i++) {
        combinedPromises.push(approvePromises[i]);
        combinedPromises.push(rejectPromises[i]);
      }

      const responses = await Promise.all(combinedPromises);
      const statuses = responses.map((r) => r.status);
      const jsonBodies = await Promise.all(responses.map((r) => r.json()));

      const successResponses = statuses.filter((s) => s === 200);
      const conflictResponses = statuses.filter((s) => s === 409);
      const otherResponses = statuses.filter((s) => s !== 200 && s !== 409);

      // Strictly 1 winner overall
      expect(successResponses).toHaveLength(1);
      // Strictly 9 conflicts
      expect(conflictResponses).toHaveLength(9);
      expect(otherResponses).toHaveLength(0);

      const winningBody = jsonBodies.find((b) => b.success === true);
      expect(winningBody).toBeDefined();
      expect(['APPROVE', 'REJECT']).toContain(winningBody.action);
      expect(['APPROVED', 'REJECTED']).toContain(winningBody.listingStatus);

      // DB state must match the winning action
      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe(winningBody.listingStatus);

      // Both tokens in DB must now be marked as used
      const dbTokens = await prisma.moderationOtpToken.findMany({
        where: { listingId: listing.id },
      });
      expect(dbTokens).toHaveLength(2);
      expect(dbTokens.every((t) => t.usedAt !== null)).toBe(true);
    });

    it('returns 409 for all concurrent attempts against an already-consumed token', async () => {
      const listing = await createTestListing();
      const { approveToken } = await createListingModerationTokens(listing.id);

      // Consume it once
      const initialRes = await executeOtpRequest(approveToken, { format: 'json' });
      expect(initialRes.status).toBe(200);

      // Fire 10 concurrent requests against the already-used token
      const concurrentReplays = await Promise.all(
        Array.from({ length: 10 }, () =>
          executeOtpRequest(approveToken, { format: 'json' })
        )
      );

      for (const res of concurrentReplays) {
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toContain('uso único');
      }
    });
  });

  // =========================================================================
  // 3. SIBLING TOKEN INVALIDATION & FIELD TRANSITIONS (F24)
  // =========================================================================
  describe('3. Sibling Token Invalidation & Action Side Effects (F24)', () => {
    it('executing APPROVE immediately invalidates REJECT sibling with exact replay message and sets AI copy', async () => {
      const originalTitle = `${TEST_PREFIX} Original Title`;
      const originalDesc = 'Original description with spelling typos';
      const aiTitle = `${TEST_PREFIX} AI Polished Title`;
      const aiDesc = 'Corrected description with proper punctuation.';

      const listing = await createTestListing({
        title: originalTitle,
        description: originalDesc,
        aiCorrectedTitle: aiTitle,
        aiCorrectedDesc: aiDesc,
        status: 'PENDING',
      });

      const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

      // 1. Execute APPROVE action
      const approveRes = await executeOtpRequest(approveToken, {
        format: 'json',
        ip: '200.5.10.1',
      });
      expect(approveRes.status).toBe(200);
      const approveJson = await approveRes.json();
      expect(approveJson.success).toBe(true);
      expect(approveJson.action).toBe('APPROVE');
      expect(approveJson.listingStatus).toBe('APPROVED');

      // Check DB listing mutation: AI copy must be applied
      const updatedListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('APPROVED');
      expect(updatedListing?.title).toBe(aiTitle);
      expect(updatedListing?.description).toBe(aiDesc);

      // 2. Attempt REJECT action using sibling token
      const rejectRes = await executeOtpRequest(rejectToken, {
        format: 'json',
        ip: '200.5.10.2',
      });
      expect(rejectRes.status).toBe(409);
      const rejectJson = await rejectRes.json();
      expect(rejectJson.success).toBe(false);
      expect(rejectJson.message).toBe(
        'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
      );
      expect(rejectJson.listingStatus).toBe('APPROVED');

      // 3. Inspect Sibling DB Record metadata
      const siblingTokenRecord = await prisma.moderationOtpToken.findUnique({
        where: { token: rejectToken },
      });
      expect(siblingTokenRecord?.usedAt).not.toBeNull();
      expect(siblingTokenRecord?.usedByIp).toBe('200.5.10.1-sibling-invalidated');
    });

    it('executing REJECT immediately invalidates APPROVE sibling with exact replay message and keeps original copy', async () => {
      const originalTitle = `${TEST_PREFIX} Original Unchanged Title`;
      const originalDesc = 'Original description remains untouched upon rejection.';
      const aiTitle = `${TEST_PREFIX} AI Proposal That Should Not Be Applied`;
      const aiDesc = 'AI Proposal description that must not overwrite upon rejection.';

      const listing = await createTestListing({
        title: originalTitle,
        description: originalDesc,
        aiCorrectedTitle: aiTitle,
        aiCorrectedDesc: aiDesc,
        status: 'PENDING',
      });

      const { approveToken, rejectToken } = await createListingModerationTokens(listing.id);

      // 1. Execute REJECT action
      const rejectRes = await executeOtpRequest(rejectToken, {
        format: 'json',
        ip: '181.12.34.56',
      });
      expect(rejectRes.status).toBe(200);
      const rejectJson = await rejectRes.json();
      expect(rejectJson.success).toBe(true);
      expect(rejectJson.action).toBe('REJECT');
      expect(rejectJson.listingStatus).toBe('REJECTED');

      // Check DB listing mutation: title and description must NOT be changed to AI copy
      const updatedListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('REJECTED');
      expect(updatedListing?.title).toBe(originalTitle);
      expect(updatedListing?.description).toBe(originalDesc);

      // 2. Attempt APPROVE action using sibling token
      const approveRes = await executeOtpRequest(approveToken, {
        format: 'json',
        ip: '181.12.34.57',
      });
      expect(approveRes.status).toBe(409);
      const approveJson = await approveRes.json();
      expect(approveJson.success).toBe(false);
      expect(approveJson.message).toBe(
        'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
      );
      expect(approveJson.listingStatus).toBe('REJECTED');

      // 3. Inspect Sibling DB Record metadata
      const siblingTokenRecord = await prisma.moderationOtpToken.findUnique({
        where: { token: approveToken },
      });
      expect(siblingTokenRecord?.usedAt).not.toBeNull();
      expect(siblingTokenRecord?.usedByIp).toBe('181.12.34.56-sibling-invalidated');
    });

    it('approving listing without AI corrections preserves original title and description', async () => {
      const listing = await createTestListing({
        title: `${TEST_PREFIX} Title Without AI Diff`,
        description: 'Description without AI diff',
        aiCorrectedTitle: null,
        aiCorrectedDesc: null,
        status: 'PENDING',
      });

      const { approveToken } = await createListingModerationTokens(listing.id);
      const res = await executeOtpRequest(approveToken, { format: 'json' });
      expect(res.status).toBe(200);

      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe('APPROVED');
      expect(dbListing?.title).toBe(listing.title);
      expect(dbListing?.description).toBe(listing.description);
    });
  });

  // =========================================================================
  // 4. EXPIRED TOKEN BEHAVIOR (HTTP 410)
  // =========================================================================
  describe('4. Expired Token Behavior (HTTP 410)', () => {
    it('returns HTTP 410 Gone when token is past expiration timestamp (JSON format)', async () => {
      const listing = await createTestListing();
      const expiredToken = generate256BitOtpToken();

      // Insert token expired 10 minutes ago
      await prisma.moderationOtpToken.create({
        data: {
          token: expiredToken,
          listingId: listing.id,
          action: 'APPROVE',
          expiresAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });

      const res = await executeOtpRequest(expiredToken, { format: 'json' });
      expect(res.status).toBe(410);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('El token de moderación ha expirado');
      expect(json.listingId).toBe(listing.id);

      // Verify listing remains PENDING and token remains unused
      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe('PENDING');

      const dbToken = await prisma.moderationOtpToken.findUnique({
        where: { token: expiredToken },
      });
      expect(dbToken?.usedAt).toBeNull();
    });

    it('returns HTTP 410 Gone with HTML layout and institutional footer when requested in HTML format', async () => {
      const listing = await createTestListing();
      const expiredToken = generate256BitOtpToken();

      await prisma.moderationOtpToken.create({
        data: {
          token: expiredToken,
          listingId: listing.id,
          action: 'REJECT',
          expiresAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      const res = await executeOtpRequest(expiredToken, { format: 'html' });
      expect(res.status).toBe(410);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('El token de moderación ha expirado');
      expect(html).toContain('Error de Moderación');
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });

    it('sibling of an expired token that is also expired also returns 410', async () => {
      const listing = await createTestListing();
      const expiredApprove = generate256BitOtpToken();
      const expiredReject = generate256BitOtpToken();
      const pastDate = new Date(Date.now() - 5000);

      await prisma.moderationOtpToken.createMany({
        data: [
          { token: expiredApprove, listingId: listing.id, action: 'APPROVE', expiresAt: pastDate },
          { token: expiredReject, listingId: listing.id, action: 'REJECT', expiresAt: pastDate },
        ],
      });

      const resApprove = await executeOtpRequest(expiredApprove, { format: 'json' });
      expect(resApprove.status).toBe(410);

      const resReject = await executeOtpRequest(expiredReject, { format: 'json' });
      expect(resReject.status).toBe(410);
    });
  });

  // =========================================================================
  // 5. NON-EXISTENT & MALFORMED TOKEN BEHAVIOR (HTTP 404)
  // =========================================================================
  describe('5. Non-Existent & Malformed Token Behavior (HTTP 404)', () => {
    it('returns HTTP 404 when token parameter is missing entirely', async () => {
      const res = await executeOtpRequest(undefined, { format: 'json' });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('Token inválido o no encontrado');
    });

    it('returns HTTP 404 when token parameter is empty string', async () => {
      const res = await executeOtpRequest('', { format: 'json' });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('Token inválido o no encontrado');
    });

    it('returns HTTP 404 when token is a valid 64-char hex string but not in database', async () => {
      const nonExistentToken = generate256BitOtpToken();
      const res = await executeOtpRequest(nonExistentToken, { format: 'json' });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('Token inválido o no encontrado');
    });

    it('returns HTTP 404 for arbitrary malformed strings or path traversal attempts', async () => {
      const malformedInputs = [
        'abc',
        '12345',
        '../../admin/metrics',
        "' OR '1'='1",
        '<script>alert(1)</script>',
        'null',
        'undefined',
      ];

      for (const input of malformedInputs) {
        const res = await executeOtpRequest(input, { format: 'json' });
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.success).toBe(false);
      }
    });

    it('returns HTTP 404 with HTML layout and institutional footer when requested in HTML format', async () => {
      const res = await executeOtpRequest('non-existent-token', { format: 'html' });
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Token inválido o no encontrado');
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });
  });

  // =========================================================================
  // 6. REPLAY DEFENSE, REPEATED CALLS & HTML PRESENTATION INTEGRITY (AC-8, AC-11)
  // =========================================================================
  describe('6. Replay Defense, Repeated Calls & Response Integrity (AC-8, AC-11)', () => {
    it('repeatedly calling used token consistently yields HTTP 409 with exact replay message and processed date', async () => {
      const listing = await createTestListing();
      const { approveToken } = await createListingModerationTokens(listing.id);

      // First call -> 200
      const initial = await executeOtpRequest(approveToken, { format: 'json' });
      expect(initial.status).toBe(200);

      // Subsequent 5 sequential calls -> all 409
      for (let i = 0; i < 5; i++) {
        const replay = await executeOtpRequest(approveToken, { format: 'json' });
        expect(replay.status).toBe(409);
        const json = await replay.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe(
          'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
        );
        expect(json.listingId).toBe(listing.id);
        expect(json.listingStatus).toBe('APPROVED');
        expect(json.processedAt).toBeDefined();
      }
    });

    it('renders successful HTML response with Aprobado badge and Criana institutional footer', async () => {
      const listing = await createTestListing();
      const { approveToken } = await createListingModerationTokens(listing.id);

      const res = await executeOtpRequest(approveToken, { format: 'html' });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Publicación Aprobada');
      expect(html).toContain('Aprobado');
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });

    it('renders successful HTML response with Rechazado badge and Criana institutional footer', async () => {
      const listing = await createTestListing();
      const { rejectToken } = await createListingModerationTokens(listing.id);

      const res = await executeOtpRequest(rejectToken, { format: 'html' });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Publicación Rechazada');
      expect(html).toContain('Rechazado');
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });

    it('renders conflict HTML response with Ya Procesado badge and Criana institutional footer', async () => {
      const listing = await createTestListing();
      const { approveToken } = await createListingModerationTokens(listing.id);

      // Consume first
      await executeOtpRequest(approveToken, { format: 'json' });

      // Request replay in HTML
      const res = await executeOtpRequest(approveToken, { format: 'html' });
      expect(res.status).toBe(409);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Aviso ya procesado');
      expect(html).toContain('Ya Procesado');
      expect(html).toContain(
        'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.'
      );
      expect(html).toContain(INSTITUTIONAL_FOOTER_TEXT);
    });
  });
});
