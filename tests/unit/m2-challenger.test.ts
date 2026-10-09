import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getSchoolsRoute } from '@/app/api/schools/route';
import { POST as postSchoolRequestRoute } from '@/app/api/schools/request/route';
import { GET as getListingsRoute } from '@/app/api/listings/route';
import { GBA_24_PARTIDOS } from '../../scripts/etl-schools';

describe('CHALLENGER 1 — Empirical Verification & Adversarial Suite for Milestone 2', () => {
  let childcareCategory: any;
  let childcareSubcategories: any[];
  let nonChildcareCategory: any;
  let testUserId: string;
  let rivalListingId: string;

  beforeAll(async () => {
    await prisma.$connect();

    childcareCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'cuidado-infantil' },
      include: { subcategories: true },
    });
    childcareSubcategories = childcareCategory.subcategories;

    nonChildcareCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'apoyo-escolar' },
    });

    // Create a temporary rival user and rival approved listing in Cuidado Infantil
    const user = await prisma.user.create({
      data: {
        name: '[CHALLENGER] Rival Provider',
        email: 'challenger-rival@example.com',
        dni: '40999888',
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    // Rival listing with recent timestamp to test sorting priority
    const listing = await prisma.listing.create({
      data: {
        title: '[CHALLENGER] Rival Niñera Premium VIP',
        description: 'Servicio de niñera compitiendo por la primera posición del catálogo.',
        status: 'APPROVED',
        isPermanentFeatured: false,
        pinnedPosition: null,
        userId: testUserId,
        categoryId: childcareCategory.id,
        subcategoryId: childcareSubcategories[0].id,
        whatsapp: '+5491111223344',
      },
    });
    rivalListingId = listing.id;
  });

  afterAll(async () => {
    if (rivalListingId) {
      await prisma.listing.deleteMany({ where: { id: rivalListingId } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: '[CHALLENGER]' } },
    });
  });

  // ==========================================================================
  // SUITE 1: CABA (Comuna 1..15) & GBA (24 Partidos) Cascading Verification
  // ==========================================================================
  describe('Suite 1: CABA & GBA Cascading Responses & Geographic Invariants', () => {
    it('returns exactly 15 comunas for CABA with mode=departamentos', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=CABA&mode=departamentos');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const comunas: string[] = await res.json();
      expect(Array.isArray(comunas)).toBe(true);
      expect(comunas).toHaveLength(15);

      for (let i = 1; i <= 15; i++) {
        expect(comunas).toContain(`Comuna ${i}`);
      }
    });

    it('returns exactly 24 partidos for GBA with mode=departamentos matching canonical GBA list', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=GBA&mode=departamentos');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const partidos: string[] = await res.json();
      expect(Array.isArray(partidos)).toBe(true);
      expect(partidos).toHaveLength(24);

      // Verify that every canonical GBA partido is represented
      const lowerPartidos = partidos.map(p => p.toLowerCase());
      for (const canonical of GBA_24_PARTIDOS) {
        expect(lowerPartidos).toContain(canonical.toLowerCase());
      }
    });

    it('cascades correctly into every CABA comuna (1..15) returning valid schools', async () => {
      for (let i = 1; i <= 15; i++) {
        const comunaName = `Comuna ${i}`;
        const req = new NextRequest(
          `http://localhost:3000/api/schools?jurisdiccion=CABA&departamento=${encodeURIComponent(comunaName)}`
        );
        const res = await getSchoolsRoute(req);
        expect(res.status).toBe(200);

        const schools = await res.json();
        expect(Array.isArray(schools)).toBe(true);
        expect(schools.length).toBeGreaterThan(0);

        // Every school must belong strictly to CABA and this Comuna
        for (const s of schools) {
          expect(s.jurisdiccion).toBe('CABA');
          expect(s.departamento).toBe(comunaName);
          expect(s.nombre).toBeTruthy();
          expect(s.domicilio).toBeTruthy();
        }
      }
    });

    it('cascades correctly into all 24 GBA partidos returning valid schools', async () => {
      // First get official list from API
      const deptosReq = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=GBA&mode=departamentos');
      const deptosRes = await getSchoolsRoute(deptosReq);
      const partidos: string[] = await deptosRes.json();

      for (const partido of partidos) {
        const req = new NextRequest(
          `http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=${encodeURIComponent(partido)}`
        );
        const res = await getSchoolsRoute(req);
        expect(res.status).toBe(200);

        const schools = await res.json();
        expect(Array.isArray(schools)).toBe(true);
        expect(schools.length).toBeGreaterThan(0);

        for (const s of schools) {
          expect(s.jurisdiccion).toBe('GBA');
          expect(s.departamento.toLowerCase()).toBe(partido.toLowerCase());
          expect(s.nombre).toBeTruthy();
          expect(s.domicilio).toBeTruthy();
        }
      }
    });

    it('returns empty array when mixing CABA jurisdiction with a GBA partido', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=CABA&departamento=San%20Isidro'
      );
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);
      const schools = await res.json();
      expect(schools).toEqual([]);
    });

    it('returns empty array when mixing GBA jurisdiction with a CABA comuna', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=Comuna%201'
      );
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);
      const schools = await res.json();
      expect(schools).toEqual([]);
    });
  });

  // ==========================================================================
  // SUITE 2: Search with Diacritics & Accents (San Martín, Peña, José)
  // ==========================================================================
  describe('Suite 2: Diacritics & Accents Search Validation', () => {
    it('executes search with accented query "San Martín" returning matching schools', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?q=San%20Mart%C3%ADn');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.nombre).toMatch(/Mart[ií]n/i);
      }
    });

    it('executes search with unaccented query "San Martin" returning matching schools', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?q=San%20Martin');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.nombre).toMatch(/Martin/i);
      }
    });

    it('executes search with tilde query "Peña" returning matching schools', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?q=Pe%C3%B1a');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.nombre).toMatch(/Peña/i);
      }
    });

    it('executes search with accented query "José" returning matching schools', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?q=Jos%C3%A9');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.nombre).toMatch(/Jos[eé]/i);
      }
    });

    it('empirically records SQLite accent-sensitivity limitation between unaccented vs accented queries', async () => {
      // In SQLite, "Martín" and "Martin" queries return disjoint subsets because LIKE is accent-sensitive
      const resAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=San%20Mart%C3%ADn'));
      const listAcc = await resAcc.json();

      const resNoAcc = await getSchoolsRoute(new NextRequest('http://localhost:3000/api/schools?q=San%20Martin'));
      const listNoAcc = await resNoAcc.json();

      const accIds = new Set(listAcc.map((s: any) => s.id));
      const overlapping = listNoAcc.filter((s: any) => accIds.has(s.id));

      // Documented finding: 0 intersection in SQLite Prisma LIKE query
      expect(overlapping.length).toBe(0);
      expect(listAcc.length).toBeGreaterThan(0);
      expect(listNoAcc.length).toBeGreaterThan(0);
    });

    it('empirically checks departamento matching with exact casing vs accented variant', async () => {
      // The database stores "Moron" (unaccented title-case)
      const resCanonical = await getSchoolsRoute(
        new NextRequest('http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=Moron')
      );
      const schoolsCanonical = await resCanonical.json();
      expect(schoolsCanonical.length).toBeGreaterThan(0);

      // When queried with accented "Morón", exact equality in SQLite matches 0 rows
      const resAccented = await getSchoolsRoute(
        new NextRequest('http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=Mor%C3%B3n')
      );
      const schoolsAccented = await resAccented.json();
      expect(schoolsAccented.length).toBe(0);
    });
  });

  // ==========================================================================
  // SUITE 3: Criana Profile Pinning Guarantee
  // ==========================================================================
  describe('Suite 3: Criana Profile Pinning Guarantee (/api/listings)', () => {
    it('guarantees Criana is strictly item 0 when querying Cuidado Infantil by slug', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings?categoryId=cuidado-infantil');
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
      expect(listings.length).toBeGreaterThanOrEqual(2); // Criana + Rival

      // STRICTURE: Item 0 must be Criana
      const item0 = listings[0];
      expect(item0.id).toBe('criana-official-featured');
      expect(item0.isPermanentFeatured).toBe(true);
      expect(item0.pinnedPosition).toBe(1);
      expect(item0.title).toContain('Criana');

      // The competitor listing must appear AFTER Criana
      const rivalPos = listings.findIndex((l: any) => l.id === rivalListingId);
      expect(rivalPos).toBeGreaterThan(0);
    });

    it('guarantees Criana is strictly item 0 when querying Cuidado Infantil by category ID', async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings?categoryId=${childcareCategory.id}`);
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(listings[0].id).toBe('criana-official-featured');
      expect(listings[0].isPermanentFeatured).toBe(true);
    });

    it('guarantees Criana is strictly item 0 even when filtering Cuidado Infantil by subcategory', async () => {
      const sub = childcareSubcategories[1] || childcareSubcategories[0];
      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=cuidado-infantil&subcategoryId=${sub.slug}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0].id).toBe('criana-official-featured');
    });

    it('guarantees Criana is strictly item 0 when filtering Cuidado Infantil by specific schoolId', async () => {
      const randomSchool = await prisma.school.findFirstOrThrow();
      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=cuidado-infantil&schoolId=${randomSchool.id}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0].id).toBe('criana-official-featured');
    });

    it('guarantees Criana is strictly item 0 when viewing all listings without category filter', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings');
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0].id).toBe('criana-official-featured');
    });

    it('strictly DOES NOT pin Criana into non-childcare categories (e.g. Apoyo Escolar)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=${nonChildcareCategory.slug}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      const crianaFound = listings.find((l: any) => l.id === 'criana-official-featured');
      expect(crianaFound).toBeUndefined();
    });
  });

  // ==========================================================================
  // SUITE 4: Adversarial Stress Testing & Boundary Invariants
  // ==========================================================================
  describe('Suite 4: Adversarial Stress Testing & Edge Cases', () => {
    it('handles search query with SQL injection characters safely without error', async () => {
      const maliciousQueries = [
        "'; DROP TABLE School; --",
        "' OR '1'='1",
        "UNION SELECT * FROM User",
        "%",
        "_",
        "[]",
      ];

      for (const q of maliciousQueries) {
        const req = new NextRequest(
          `http://localhost:3000/api/schools?q=${encodeURIComponent(q)}`
        );
        const res = await getSchoolsRoute(req);
        expect(res.status).toBe(200);
        const schools = await res.json();
        expect(Array.isArray(schools)).toBe(true);
      }
    });

    it('handles extremely long search queries without breaking', async () => {
      const longQuery = 'A'.repeat(500);
      const req = new NextRequest(
        `http://localhost:3000/api/schools?q=${encodeURIComponent(longQuery)}`
      );
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);
      const schools = await res.json();
      expect(schools).toEqual([]);
    });

    it('handles nonexistent category in listings without 500 error', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/listings?categoryId=non-existent-category-12345'
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);
      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
    });

    it('rejects malformed fallback school request submission', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: '', // Missing
          jurisdiccion: 'INVALID_JURISDICTION',
        }),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(400);
    });

    it('persists fallback school request successfully and returns 201 with PENDING status', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: '[CHALLENGER] Colegio Nuevo Amanecer',
          jurisdiccion: 'GBA',
          departamento: 'Tigre',
          localidad: 'Don Torcuato',
          domicilio: 'Av. Ángel T. de Alvear 1200',
          userName: 'Padre Solicitante',
          userEmail: 'padre@solicitud.com',
        }),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.request.status).toBe('PENDING');
      expect(data.request.nombre).toBe('[CHALLENGER] Colegio Nuevo Amanecer');
    });
  });
});
