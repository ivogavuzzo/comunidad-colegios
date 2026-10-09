import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as postSchoolRequestRoute } from '@/app/api/schools/request/route';
import { LEGAL_DISCLAIMER_TEXT } from '@/components/LegalBanner';
import { INSTITUTIONAL_FOOTER_TEXT } from '@/components/InstitutionalFooter';
import fs from 'fs';
import path from 'path';

describe('EMPIRICAL CHALLENGER M2 — Fallback School Request API & Layout Branding', () => {
  const TEST_PREFIX = '[TEST-CHALLENGER-M2]';

  beforeAll(async () => {
    await prisma.$connect();
    // Clean up any stale test records from previous runs
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: TEST_PREFIX } },
    });
  });

  afterAll(async () => {
    // Final cleanup of created test records
    await prisma.schoolRequest.deleteMany({
      where: { nombre: { startsWith: TEST_PREFIX } },
    });
  });

  // ==========================================================================
  // SUITE 1: "Mi colegio no está" Fallback Submission & DB Persistence
  // ==========================================================================
  describe('1. "Mi colegio no está" Submission & DB Persistence', () => {
    it('1.1: persists CABA school request in SchoolRequest with status PENDING', async () => {
      const payload = {
        nombre: `${TEST_PREFIX} Escuela Normal Superior N° 1`,
        jurisdiccion: 'CABA',
        departamento: 'Comuna 2',
        localidad: 'Recoleta',
        domicilio: 'Av. Córdoba 1951',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.request).toBeDefined();
      expect(json.request.id).toBeTruthy();
      expect(json.request.nombre).toBe(payload.nombre);
      expect(json.request.jurisdiccion).toBe('CABA');
      expect(json.request.departamento).toBe('Comuna 2');
      expect(json.request.localidad).toBe('Recoleta');
      expect(json.request.domicilio).toBe('Av. Córdoba 1951');
      expect(json.request.status).toBe('PENDING');

      // EMPIRICAL ORACLE: Direct SQLite query asserting persistence
      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted!.status).toBe('PENDING');
      expect(persisted!.jurisdiccion).toBe('CABA');
      expect(persisted!.nombre).toBe(payload.nombre);
      expect(persisted!.departamento).toBe('Comuna 2');
      expect(persisted!.localidad).toBe('Recoleta');
      expect(persisted!.domicilio).toBe('Av. Córdoba 1951');
      expect(persisted!.createdAt).toBeInstanceOf(Date);
      expect(persisted!.updatedAt).toBeInstanceOf(Date);
    });

    it('1.2: persists GBA school request in SchoolRequest with status PENDING', async () => {
      const payload = {
        nombre: `${TEST_PREFIX} Instituto Santa Inés`,
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        localidad: 'Acassuso',
        domicilio: 'Eduardo Costa 850',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.request.status).toBe('PENDING');

      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted!.status).toBe('PENDING');
      expect(persisted!.jurisdiccion).toBe('GBA');
      expect(persisted!.departamento).toBe('San Isidro');
    });

    it('1.3: persists optional userEmail and userName when provided, null when omitted', async () => {
      // Case A: Provided
      const payloadWithUser = {
        nombre: `${TEST_PREFIX} Colegio San Jorge`,
        jurisdiccion: 'GBA',
        departamento: 'Quilmes',
        localidad: 'Quilmes',
        domicilio: 'Guido 800',
        userEmail: 'laura.garcia@padres.test.com',
        userName: 'Laura García',
      };

      const reqA = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithUser),
      });
      const resA = await postSchoolRequestRoute(reqA);
      expect(resA.status).toBe(201);
      const jsonA = await resA.json();

      const persistedA = await prisma.schoolRequest.findUnique({
        where: { id: jsonA.request.id },
      });
      expect(persistedA!.userEmail).toBe('laura.garcia@padres.test.com');
      expect(persistedA!.userName).toBe('Laura García');

      // Case B: Omitted
      const payloadWithoutUser = {
        nombre: `${TEST_PREFIX} Colegio San Andrés`,
        jurisdiccion: 'GBA',
        departamento: 'Vicente Lopez',
        localidad: 'Olivos',
        domicilio: 'Nogoyá 555',
      };

      const reqB = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithoutUser),
      });
      const resB = await postSchoolRequestRoute(reqB);
      expect(resB.status).toBe(201);
      const jsonB = await resB.json();

      const persistedB = await prisma.schoolRequest.findUnique({
        where: { id: jsonB.request.id },
      });
      expect(persistedB!.userEmail).toBeNull();
      expect(persistedB!.userName).toBeNull();
    });

    it('1.4: anti-tampering: ignores client attempt to inject status APPROVED or ACTIVE', async () => {
      const maliciousPayload = {
        nombre: `${TEST_PREFIX} Escuela Hackeada`,
        jurisdiccion: 'CABA',
        departamento: 'Comuna 1',
        localidad: 'Retiro',
        domicilio: 'Juncal 100',
        status: 'APPROVED', // Malicious attempt to bypass moderation
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.request.status).toBe('PENDING');

      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted!.status).toBe('PENDING');
    });

    it('1.5: sanitizes inputs: trims whitespace and normalizes lowercase jurisdiction', async () => {
      const paddedPayload = {
        nombre: `   ${TEST_PREFIX} Colegio Belgrano Day   `,
        jurisdiccion: '  caba  ',
        departamento: '  Comuna 13  ',
        localidad: '  Belgrano  ',
        domicilio: '  Juramento 3035  ',
        userEmail: '   padre@test.com   ',
        userName: '   Carlos Tevez   ',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paddedPayload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted!.nombre).toBe(`${TEST_PREFIX} Colegio Belgrano Day`);
      expect(persisted!.jurisdiccion).toBe('CABA');
      expect(persisted!.departamento).toBe('Comuna 13');
      expect(persisted!.localidad).toBe('Belgrano');
      expect(persisted!.domicilio).toBe('Juramento 3035');
      expect(persisted!.userEmail).toBe('padre@test.com');
      expect(persisted!.userName).toBe('Carlos Tevez');
    });
  });

  // ==========================================================================
  // SUITE 2: Validation Errors When Required Fields Are Missing or Invalid
  // ==========================================================================
  describe('2. Validation Handling for Missing and Malformed Fields', () => {
    const validBase = {
      nombre: `${TEST_PREFIX} Colegio Valido`,
      jurisdiccion: 'CABA',
      departamento: 'Comuna 14',
      localidad: 'Palermo',
      domicilio: 'Gorriti 4500',
    };

    it('2.1: rejects missing or blank nombre with 400', async () => {
      const testCases = [
        { ...validBase, nombre: undefined },
        { ...validBase, nombre: null },
        { ...validBase, nombre: '' },
        { ...validBase, nombre: '    ' },
        { ...validBase, nombre: 12345 as any },
      ];

      for (const payload of testCases) {
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postSchoolRequestRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/nombre/i);
      }
    });

    it('2.2: rejects missing or non-AMBA jurisdiccion with 400', async () => {
      const invalidJurisdictions = [
        undefined,
        null,
        '',
        '   ',
        'CORDOBA',
        'SANTA FE',
        'MENDOZA',
        'BUENOS AIRES',
        'LA PLATA',
        'PROVINCIA',
        'USA',
        123 as any,
      ];

      for (const jur of invalidJurisdictions) {
        const payload = { ...validBase, jurisdiccion: jur };
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postSchoolRequestRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/jurisdicci[oó]n/i);
      }
    });

    it('2.3: rejects missing or blank departamento with 400', async () => {
      const testCases = [
        { ...validBase, departamento: undefined },
        { ...validBase, departamento: null },
        { ...validBase, departamento: '' },
        { ...validBase, departamento: '   ' },
        { ...validBase, departamento: ['Comuna 1'] as any },
      ];

      for (const payload of testCases) {
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postSchoolRequestRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/departamento/i);
      }
    });

    it('2.4: rejects missing or blank localidad with 400', async () => {
      const testCases = [
        { ...validBase, localidad: undefined },
        { ...validBase, localidad: null },
        { ...validBase, localidad: '' },
        { ...validBase, localidad: '   ' },
        { ...validBase, localidad: 9999 as any },
      ];

      for (const payload of testCases) {
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postSchoolRequestRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/localidad/i);
      }
    });

    it('2.5: rejects missing or blank domicilio with 400', async () => {
      const testCases = [
        { ...validBase, domicilio: undefined },
        { ...validBase, domicilio: null },
        { ...validBase, domicilio: '' },
        { ...validBase, domicilio: '   ' },
        { ...validBase, domicilio: false as any },
      ];

      for (const payload of testCases) {
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postSchoolRequestRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/domicilio|direcci[oó]n/i);
      }
    });

    it('2.6: guarantees that failed validations never insert records in SchoolRequest', async () => {
      const beforeCount = await prisma.schoolRequest.count({
        where: { nombre: { startsWith: TEST_PREFIX } },
      });

      const badReq = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${TEST_PREFIX} Colegio Incompleto`,
          // missing all other mandatory fields
        }),
      });

      const res = await postSchoolRequestRoute(badReq);
      expect(res.status).toBe(400);

      const afterCount = await prisma.schoolRequest.count({
        where: { nombre: { startsWith: TEST_PREFIX } },
      });
      expect(afterCount).toBe(beforeCount);
    });
  });

  // ==========================================================================
  // SUITE 3: Adversarial Stress Tests & Concurrency
  // ==========================================================================
  describe('3. Adversarial Stress Tests & Security Invariants', () => {
    it('3.1: safely handles SQL injection and script tags without executing or corrupting DB', async () => {
      const payload = {
        nombre: `${TEST_PREFIX} Robert'); DROP TABLE SchoolRequest; --`,
        jurisdiccion: 'CABA',
        departamento: 'Comuna 1',
        localidad: 'Retiro',
        domicilio: '<script>alert("xss")</script> Av. del Libertador 100',
        userEmail: "hacker' OR 1=1;--@test.com",
        userName: '<b onmouseover="alert(1)">Test</b>',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      // Verify the table still exists and data was stored safely as a literal string
      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted!.nombre).toBe(payload.nombre);
      expect(persisted!.domicilio).toBe(payload.domicilio);
      expect(persisted!.status).toBe('PENDING');

      // Table is intact
      const totalCount = await prisma.schoolRequest.count();
      expect(totalCount).toBeGreaterThan(0);
    });

    it('3.2: preserves Argentine accented characters and symbols without encoding corruption', async () => {
      const payload = {
        nombre: `${TEST_PREFIX} Colegio Niño Jesús N° 12 — Güemes`,
        jurisdiccion: 'GBA',
        departamento: 'Ituzaingó',
        localidad: 'Ituzaingó Sur',
        domicilio: 'Martín Rodríguez 1450 & Colón',
      };

      const req = new NextRequest('http://localhost:3000/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSchoolRequestRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      const persisted = await prisma.schoolRequest.findUnique({
        where: { id: json.request.id },
      });
      expect(persisted!.nombre).toBe(`${TEST_PREFIX} Colegio Niño Jesús N° 12 — Güemes`);
      expect(persisted!.departamento).toBe('Ituzaingó');
      expect(persisted!.localidad).toBe('Ituzaingó Sur');
      expect(persisted!.domicilio).toBe('Martín Rodríguez 1450 & Colón');
    });

    it('3.3: supports 10 concurrent school requests without race conditions or ID collisions', async () => {
      const promises = Array.from({ length: 10 }).map((_, i) => {
        const payload = {
          nombre: `${TEST_PREFIX} Concurrent School ${i + 1}`,
          jurisdiccion: i % 2 === 0 ? 'CABA' : 'GBA',
          departamento: i % 2 === 0 ? `Comuna ${(i % 15) + 1}` : 'Moron',
          localidad: `Localidad ${i + 1}`,
          domicilio: `Calle Falsa ${100 + i}`,
          userEmail: `concurrent${i}@test.com`,
        };
        const req = new NextRequest('http://localhost:3000/api/schools/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return postSchoolRequestRoute(req);
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(201);
      }

      const results = await Promise.all(responses.map((r) => r.json()));
      const ids = results.map((r) => r.request.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      // Verify all 10 are in dev.db with status PENDING
      const dbRecords = await prisma.schoolRequest.findMany({
        where: { id: { in: ids } },
      });
      expect(dbRecords.length).toBe(10);
      for (const record of dbRecords) {
        expect(record.status).toBe('PENDING');
      }
    });
  });

  // ==========================================================================
  // SUITE 4: Layout Texts Verification (Exact Strings & Layout Inclusion)
  // ==========================================================================
  describe('4. Layout Texts & Mandatory Branding Verification', () => {
    it('4.1: verifies Institutional Footer exact string: "Esta comunidad es una iniciativa de Criana"', () => {
      const EXPECTED_FOOTER = 'Esta comunidad es una iniciativa de Criana';

      // 1. Exported constant assertion
      expect(INSTITUTIONAL_FOOTER_TEXT).toBe(EXPECTED_FOOTER);

      // 2. Physical source file inspection
      const footerFilePath = path.join(
        process.cwd(),
        'src',
        'components',
        'InstitutionalFooter.tsx'
      );
      expect(fs.existsSync(footerFilePath)).toBe(true);

      const footerSource = fs.readFileSync(footerFilePath, 'utf-8');
      expect(footerSource).toContain(EXPECTED_FOOTER);
      expect(footerSource).toContain('https://www.criana.com.ar');
      expect(footerSource).toContain('by Criana');
    });

    it('4.2: verifies Legal Banner disclaimer exact string and legal invariants', () => {
      const EXPECTED_LEGAL_DISCLAIMER =
        'Comunidades de Colegios es un espacio comunitario de encuentro entre familias escolares. Los servicios ofrecidos son responsabilidad exclusiva de sus anunciantes. Criana no interviene en la contratación ni se responsabiliza por los acuerdos entre partes.';

      // 1. Exported constant assertion
      expect(LEGAL_DISCLAIMER_TEXT).toBe(EXPECTED_LEGAL_DISCLAIMER);

      // 2. Physical source file inspection
      const bannerFilePath = path.join(
        process.cwd(),
        'src',
        'components',
        'LegalBanner.tsx'
      );
      expect(fs.existsSync(bannerFilePath)).toBe(true);

      const bannerSource = fs.readFileSync(bannerFilePath, 'utf-8');
      expect(bannerSource).toContain(EXPECTED_LEGAL_DISCLAIMER);

      // 3. Core legal requirements check
      expect(LEGAL_DISCLAIMER_TEXT).toContain('Comunidades de Colegios');
      expect(LEGAL_DISCLAIMER_TEXT).toContain('responsabilidad exclusiva de sus anunciantes');
      expect(LEGAL_DISCLAIMER_TEXT).toContain(
        'Criana no interviene en la contratación ni se responsabiliza por los acuerdos entre partes'
      );
    });

    it('4.3: verifies global layout.tsx embeds LegalBanner and InstitutionalFooter', () => {
      const layoutFilePath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
      expect(fs.existsSync(layoutFilePath)).toBe(true);

      const layoutSource = fs.readFileSync(layoutFilePath, 'utf-8');

      // Both components must be imported
      expect(layoutSource).toMatch(/import\s+LegalBanner\s+from\s+['"]@\/components\/LegalBanner['"]/);
      expect(layoutSource).toMatch(
        /import\s+InstitutionalFooter\s+from\s+['"]@\/components\/InstitutionalFooter['"]/
      );

      // Both components must be rendered in JSX
      expect(layoutSource).toContain('<LegalBanner />');
      expect(layoutSource).toContain('<InstitutionalFooter />');

      // Header branding
      expect(layoutSource).toContain('Comunidades de Colegios');
      expect(layoutSource).toContain('by Criana');
    });
  });
});
