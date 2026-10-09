import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getSchoolsRoute } from '@/app/api/schools/route';
import { POST as postSchoolRequestRoute } from '@/app/api/schools/request/route';
import { GET as getCategoriesRoute } from '@/app/api/categories/route';
import { GET as getListingsRoute } from '@/app/api/listings/route';
import { LEGAL_DISCLAIMER_TEXT } from '@/components/LegalBanner';
import { INSTITUTIONAL_FOOTER_TEXT } from '@/components/InstitutionalFooter';

describe('Milestone 2 — Public Catalog with Cascading Filters & Fallback', () => {
  let testUserId: string;
  let testListingId: string;
  let childcareCategory: any;
  let childcareSubcategory: any;
  let otherCategory: any;

  beforeAll(async () => {
    await prisma.$connect();

    // Fetch categories for test setup
    childcareCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'cuidado-infantil' },
    });
    childcareSubcategory = await prisma.subcategory.findFirstOrThrow({
      where: { categoryId: childcareCategory.id },
    });
    otherCategory = await prisma.category.findUniqueOrThrow({
      where: { slug: 'apoyo-escolar' },
    });

    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: '[TEST] Catalog User',
        email: 'catalog-test-user@catalog-test.example.com',
        dni: '35123456',
        isOnboarded: true,
        role: 'USER',
      },
    });
    testUserId = user.id;

    // Create an approved listing in Cuidado Infantil to test ordering vs Criana
    const listing = await prisma.listing.create({
      data: {
        title: '[TEST] Niñera con experiencia CABA',
        description: 'Servicio de niñera para tardes y fines de semana con excelentes referencias.',
        status: 'APPROVED',
        isPermanentFeatured: false,
        pinnedPosition: null,
        userId: testUserId,
        categoryId: childcareCategory.id,
        subcategoryId: childcareSubcategory.id,
        whatsapp: '+5491198765432',
      },
    });
    testListingId = listing.id;
  });

  afterAll(async () => {
    // Clean up created test entities
    if (testListingId) {
      await prisma.listing.deleteMany({
        where: { id: testListingId },
      });
    }
    if (testUserId) {
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: '[TEST]' } },
    });
  });

  // --------------------------------------------------------------------------
  // 1. Cascading Search API Filtering
  // --------------------------------------------------------------------------
  describe('Cascading School Search API (/api/schools)', () => {
    it('filters schools strictly by jurisdiction CABA', async () => {
      const req = new NextRequest('http://localhost:3000/api/schools?jurisdiccion=CABA');
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.jurisdiccion).toBe('CABA');
        expect(s.departamento).toMatch(/^Comuna \d+$/);
        expect(s.nombre).toBeTruthy();
        expect(s.domicilio).toBeTruthy();
        expect(s.localidad).toBeTruthy();
      }
    });

    it('filters schools strictly by jurisdiction GBA and specific partido', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=GBA&departamento=San Isidro'
      );
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      for (const s of schools) {
        expect(s.jurisdiccion).toBe('GBA');
        expect(s.departamento.toLowerCase()).toBe('san isidro');
        expect(s.nombre).toBeTruthy();
        expect(s.domicilio).toBeTruthy();
      }
    });

    it('filters schools by search query q in school name', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=CABA&departamento=Comuna 1&q=San'
      );
      const res = await getSchoolsRoute(req);
      expect(res.status).toBe(200);

      const schools = await res.json();
      expect(Array.isArray(schools)).toBe(true);
      for (const s of schools) {
        expect(s.jurisdiccion).toBe('CABA');
        expect(s.departamento).toBe('Comuna 1');
        expect(s.nombre.toLowerCase()).toContain('san');
      }
    });

    it('returns distinct departamentos when mode=departamentos for CABA and GBA', async () => {
      // CABA: 15 comunas
      const reqCaba = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=CABA&mode=departamentos'
      );
      const resCaba = await getSchoolsRoute(reqCaba);
      expect(resCaba.status).toBe(200);
      const cabaDeptos = await resCaba.json();
      expect(Array.isArray(cabaDeptos)).toBe(true);
      expect(cabaDeptos.length).toBe(15);
      expect(cabaDeptos).toContain('Comuna 1');
      expect(cabaDeptos).toContain('Comuna 15');

      // GBA: 24 partidos
      const reqGba = new NextRequest(
        'http://localhost:3000/api/schools?jurisdiccion=GBA&mode=departamentos'
      );
      const resGba = await getSchoolsRoute(reqGba);
      expect(resGba.status).toBe(200);
      const gbaDeptos = await resGba.json();
      expect(Array.isArray(gbaDeptos)).toBe(true);
      expect(gbaDeptos.length).toBe(24);
      expect(gbaDeptos).toContain('San Isidro');
      expect(gbaDeptos).toContain('Vicente Lopez');
    });
  });

  // --------------------------------------------------------------------------
  // 2. "Mi colegio no está" Fallback Request Creation
  // --------------------------------------------------------------------------
  describe('Fallback School Request API (/api/schools/request)', () => {
    it('creates a new SchoolRequest record with PENDING status on valid submission', async () => {
      const payload = {
        nombre: '[TEST] Colegio San Martín del Norte',
        jurisdiccion: 'GBA',
        departamento: 'Vicente Lopez',
        localidad: 'Olivos',
        domicilio: 'Av. Maipú 2500',
        userEmail: 'padre@colegio-test.com',
        userName: 'Martín Palermo',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.request).toBeDefined();
      expect(body.request.nombre).toBe(payload.nombre);
      expect(body.request.jurisdiccion).toBe('GBA');
      expect(body.request.departamento).toBe('Vicente Lopez');
      expect(body.request.localidad).toBe('Olivos');
      expect(body.request.domicilio).toBe('Av. Maipú 2500');
      expect(body.request.status).toBe('PENDING');

      // Verify persistence in SQLite dev.db
      const dbRecord = await prisma.schoolRequest.findUnique({
        where: { id: body.request.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.status).toBe('PENDING');
      expect(dbRecord!.nombre).toBe(payload.nombre);
    });

    it('rejects school request with 400 when mandatory fields are missing', async () => {
      const invalidPayload = {
        nombre: '', // Empty name
        jurisdiccion: 'CABA',
        departamento: 'Comuna 14',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('rejects invalid jurisdiction with 400', async () => {
      const invalidPayload = {
        nombre: '[TEST] Escuela Provincial',
        jurisdiccion: 'CORDOBA', // Not AMBA
        departamento: 'Capital',
        localidad: 'Córdoba',
        domicilio: 'San Martín 100',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Category & Listing Retrieval with Criana Profile Pinning Guarantee
  // --------------------------------------------------------------------------
  describe('Categories and Listings API (/api/categories & /api/listings)', () => {
    it('returns categories and their subcategories hierarchy', async () => {
      const res = await getCategoriesRoute();
      expect(res.status).toBe(200);

      const categories = await res.json();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(8);

      const cuidadoInfantil = categories.find((c: any) => c.slug === 'cuidado-infantil');
      expect(cuidadoInfantil).toBeDefined();
      expect(cuidadoInfantil.subcategories.length).toBeGreaterThan(0);
    });

    it('guarantees Criana permanent featured profile is ALWAYS at index 0 for Cuidado Infantil', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=${childcareCategory.id}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
      expect(listings.length).toBeGreaterThan(0);

      // CRUCIAL: Index 0 must be Criana permanent featured profile
      const firstListing = listings[0];
      expect(firstListing.id).toBe('criana-official-featured');
      expect(firstListing.isPermanentFeatured).toBe(true);
      expect(firstListing.pinnedPosition).toBe(1);
      expect(firstListing.title).toContain('Criana');

      // The other approved listing exists in results but is AFTER Criana
      const testListingItem = listings.find((l: any) => l.id === testListingId);
      expect(testListingItem).toBeDefined();
      expect(listings.indexOf(testListingItem)).toBeGreaterThan(0);
    });

    it('guarantees Criana profile is at index 0 when querying without category filter (all listings)', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings');
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
      expect(listings.length).toBeGreaterThan(0);

      const firstListing = listings[0];
      expect(firstListing.id).toBe('criana-official-featured');
      expect(firstListing.isPermanentFeatured).toBe(true);
    });

    it('does NOT inject Criana childcare profile into non-childcare categories', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=${otherCategory.id}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
      // Criana should not be injected into Apoyo Escolar
      const crianaInOther = listings.find((l: any) => l.id === 'criana-official-featured');
      expect(crianaInOther).toBeUndefined();
    });

    it('retains Criana pinned profile even when filtering Cuidado Infantil by schoolId', async () => {
      const sampleSchool = await prisma.school.findFirstOrThrow();

      const req = new NextRequest(
        `http://localhost:3000/api/listings?categoryId=${childcareCategory.id}&schoolId=${sampleSchool.id}`
      );
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);

      const listings = await res.json();
      expect(Array.isArray(listings)).toBe(true);
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0].id).toBe('criana-official-featured');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Legal Banner & Institutional Footer Verification
  // --------------------------------------------------------------------------
  describe('Legal Banner and Institutional Footer Mandates', () => {
    it('contains mandatory verbatim legal disclaimer banner text', () => {
      const expectedDisclaimer =
        'Comunidades de Colegios es un espacio comunitario de encuentro entre familias escolares. Los servicios ofrecidos son responsabilidad exclusiva de sus anunciantes. Criana no interviene en la contratación ni se responsabiliza por los acuerdos entre partes.';

      expect(LEGAL_DISCLAIMER_TEXT).toBe(expectedDisclaimer);
      expect(LEGAL_DISCLAIMER_TEXT).toContain('Comunidades de Colegios');
      expect(LEGAL_DISCLAIMER_TEXT).toContain('responsabilidad exclusiva de sus anunciantes');
      expect(LEGAL_DISCLAIMER_TEXT).toContain('Criana no interviene en la contratación');
    });

    it('contains mandatory verbatim institutional footer branding text', () => {
      const expectedFooter = 'Esta comunidad es una iniciativa de Criana';
      expect(INSTITUTIONAL_FOOTER_TEXT).toBe(expectedFooter);
    });
  });
});
