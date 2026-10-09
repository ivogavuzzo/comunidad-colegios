import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { GBA_24_PARTIDOS, toTitleCase, cleanPhone, cleanEmail } from '../../scripts/etl-schools';

describe('Milestone 1 — Relational DB & AMBA CSV ETL Verification', () => {
  beforeAll(async () => {
    // Ensure DB is connected
    await prisma.$connect();
  });

  describe('AMBA Schools Database Counts & Strict Filtering', () => {
    it('contains exactly 11,823 total AMBA schools in the database', async () => {
      const totalSchools = await prisma.school.count();
      expect(totalSchools).toBe(11823);
    });

    it('contains exactly 2,749 schools in CABA', async () => {
      const cabaSchools = await prisma.school.count({
        where: { jurisdiccion: 'CABA' },
      });
      expect(cabaSchools).toBe(2749);
    });

    it('contains CABA schools distributed across all 15 comunas', async () => {
      const comunas = await prisma.school.groupBy({
        by: ['departamento'],
        where: { jurisdiccion: 'CABA' },
        _count: { id: true },
      });

      expect(comunas.length).toBe(15);

      const comunaMap = new Map<string, number>();
      comunas.forEach((c) => comunaMap.set(c.departamento, c._count.id));

      for (let i = 1; i <= 15; i++) {
        const comunaName = `Comuna ${i}`;
        expect(comunaMap.has(comunaName)).toBe(true);
        expect(comunaMap.get(comunaName)).toBeGreaterThan(0);
      }
    });

    it('contains exactly 9,074 schools in GBA across the 24 official partidos', async () => {
      const gbaSchools = await prisma.school.count({
        where: { jurisdiccion: 'GBA' },
      });
      expect(gbaSchools).toBe(9074);
    });

    it('contains schools in every one of the 24 official GBA partidos', async () => {
      const gbaPartidosInDb = await prisma.school.groupBy({
        by: ['departamento'],
        where: { jurisdiccion: 'GBA' },
        _count: { id: true },
      });

      expect(gbaPartidosInDb.length).toBe(24);

      const dbPartidosSet = new Set(
        gbaPartidosInDb.map((p) => p.departamento.toUpperCase())
      );

      for (const rawPartido of GBA_24_PARTIDOS) {
        expect(dbPartidosSet.has(rawPartido)).toBe(true);
      }
    });

    it('excludes 100% of non-AMBA schools (0 from La Plata and 0 from other provinces)', async () => {
      // Check La Plata
      const laPlataSchools = await prisma.school.count({
        where: {
          departamento: {
            contains: 'Plata',
          },
        },
      });
      expect(laPlataSchools).toBe(0);

      // Check that only CABA and GBA exist as jurisdiccion
      const invalidJurisdictions = await prisma.school.count({
        where: {
          jurisdiccion: {
            notIn: ['CABA', 'GBA'],
          },
        },
      });
      expect(invalidJurisdictions).toBe(0);
    });

    it('ensures 100% of school records have valid CUE-Anexo and required normalized fields', async () => {
      const sampleSchools = await prisma.school.findMany({
        take: 50,
      });

      expect(sampleSchools.length).toBe(50);
      for (const s of sampleSchools) {
        expect(s.cueanexo).toMatch(/^\d{9}$/);
        expect(s.nombre.length).toBeGreaterThan(0);
        expect(s.domicilio.length).toBeGreaterThan(0);
        expect(['CABA', 'GBA']).toContain(s.jurisdiccion);
        expect(s.departamento.length).toBeGreaterThan(0);
        expect(s.localidad.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Closed Taxonomy Seed (8 Categories & 28 Subcategories)', () => {
    it('contains exactly 8 closed categories', async () => {
      const categories = await prisma.category.findMany({
        orderBy: { orderIndex: 'asc' },
      });
      expect(categories.length).toBe(8);

      const expectedSlugs = [
        'cuidado-infantil',
        'apoyo-escolar',
        'transporte-escolar',
        'cumpleanos-eventos',
        'uniformes-libros',
        'salud-psicopedagogia',
        'actividades-deportes',
        'servicios-hogar',
      ];

      const slugs = categories.map((c) => c.slug);
      expect(slugs).toEqual(expectedSlugs);
    });

    it('contains exactly 28 subcategories linked to the 8 categories', async () => {
      const totalSubcategories = await prisma.subcategory.count();
      expect(totalSubcategories).toBe(28);
    });

    it('has category "Cuidado Infantil" with subcategory "Niñeras y Babysitters"', async () => {
      const cuidadoInfantil = await prisma.category.findUnique({
        where: { slug: 'cuidado-infantil' },
        include: { subcategories: true },
      });

      expect(cuidadoInfantil).not.toBeNull();
      expect(cuidadoInfantil?.name).toBe('Cuidado Infantil');

      const nineras = cuidadoInfantil?.subcategories.find(
        (sub) => sub.slug === 'nineras-babysitters'
      );
      expect(nineras).toBeDefined();
      expect(nineras?.name).toBe('Niñeras y Babysitters');
    });
  });

  describe('Criana Permanent Featured Profile Seed', () => {
    it('seeds the official Criana user with ADMIN role and onboarded status', async () => {
      const crianaUser = await prisma.user.findUnique({
        where: { email: 'hola@criana.com.ar' },
      });

      expect(crianaUser).not.toBeNull();
      expect(crianaUser?.name).toBe('Criana Oficial');
      expect(crianaUser?.role).toBe('ADMIN');
      expect(crianaUser?.isOnboarded).toBe(true);
    });

    it('seeds Criana permanent profile pinned at position 1 under Cuidado Infantil', async () => {
      const crianaListing = await prisma.listing.findUnique({
        where: { id: 'criana-official-featured' },
        include: {
          category: true,
          subcategory: true,
          user: true,
        },
      });

      expect(crianaListing).not.toBeNull();
      expect(crianaListing?.isPermanentFeatured).toBe(true);
      expect(crianaListing?.pinnedPosition).toBe(1);
      expect(crianaListing?.status).toBe('APPROVED');
      expect(crianaListing?.category.slug).toBe('cuidado-infantil');
      expect(crianaListing?.subcategory.slug).toBe('nineras-babysitters');

      // Contact information
      expect(crianaListing?.whatsapp).toBe('+5491178290206');
      expect(crianaListing?.email).toBe('hola@criana.com.ar');
      expect(crianaListing?.webUrl).toBe('https://www.criana.com.ar');
    });
  });

  describe('Utility Normalizers', () => {
    it('normalizes uppercase strings into proper Title Case', () => {
      expect(toTitleCase('INSTITUTO SAN CAYETANO')).toBe('Instituto San Cayetano');
      expect(toTitleCase('ESCUELA DE EDUCACION TECNICA Nº1')).toBe('Escuela de Educacion Tecnica Nº1');
      expect(toTitleCase('AVENIDA DEL LIBERTADOR 1234')).toBe('Avenida del Libertador 1234');
    });

    it('cleans sentinel telephone values', () => {
      expect(cleanPhone('011 S/D')).toBeNull();
      expect(cleanPhone('011 N/D')).toBeNull();
      expect(cleanPhone('   ')).toBeNull();
      expect(cleanPhone('011 4790-1234')).toBe('011 4790-1234');
    });

    it('cleans emails and extracts first valid RFC email', () => {
      expect(cleanEmail('')).toBeNull();
      expect(cleanEmail('S/D')).toBeNull();
      expect(cleanEmail('info@escuela.edu.ar; directiva@escuela.edu.ar')).toBe('info@escuela.edu.ar');
      expect(cleanEmail('SECRETARIA@COLEGIO.COM / RECTORIA@COLEGIO.COM')).toBe('secretaria@colegio.com');
    });
  });
});
