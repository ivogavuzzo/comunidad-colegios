import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getTagsRoute, POST as postTagsRoute } from '@/app/api/tags/route';
import { PATCH as patchTagRoute, DELETE as deleteTagRoute } from '@/app/api/tags/[id]/route';
import { GET as getListingsRoute, POST as postListingRoute } from '@/app/api/listings/route';
import { PATCH as patchListingRoute } from '@/app/api/listings/[id]/route';
import { validateListingPayload } from '@/lib/auth';

describe('Tags and Work Zone Feature Suite', () => {
  let adminUser: any;
  let regularUser: any;
  let testSchool: any;
  const createdTagIds: string[] = [];
  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create admin user
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin Tags Tester',
        email: `admin-tag-tester-${Date.now()}@example.com`,
        dni: '20111222',
        isOnboarded: true,
        role: 'ADMIN',
      },
    });
    createdUserIds.push(adminUser.id);

    // 2. Create regular user
    regularUser = await prisma.user.create({
      data: {
        name: 'Regular User Tester',
        email: `regular-user-${Date.now()}@example.com`,
        dni: '30222333',
        isOnboarded: true,
        role: 'USER',
      },
    });
    createdUserIds.push(regularUser.id);

    // 3. Find or create a test school
    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: '020999999',
          nombre: 'COLEGIO TEST TAGS',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 14',
          localidad: 'PALERMO',
        },
      });
    }
  });

  afterAll(async () => {
    // Cleanup created listings
    if (createdListingIds.length > 0) {
      await prisma.listingTag.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    // Cleanup created tags
    if (createdTagIds.length > 0) {
      await prisma.listingTag.deleteMany({
        where: { tagId: { in: createdTagIds } },
      });
      await prisma.tag.deleteMany({
        where: { id: { in: createdTagIds } },
      });
    }

    // Cleanup created users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  describe('1. Tag Manager API (/api/tags & /api/tags/[id])', () => {
    let createdTagId: string;

    it('rejects unauthenticated requests trying to create a tag (401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tag Sin Auth', group: 'Cuidado Infantil' }),
      });
      const res = await postTagsRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects regular users trying to create a tag (403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': regularUser.id,
          'x-test-user-email': regularUser.email,
        },
        body: JSON.stringify({ name: 'Tag Usuario Comun', group: 'Cuidado Infantil' }),
      });
      const res = await postTagsRoute(req);
      expect(res.status).toBe(403);
    });

    it('allows admins to create a new tag with auto-generated slug', async () => {
      const tagName = `Robótica Educativa ${Date.now()}`;
      const req = new NextRequest('http://localhost:3000/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
          'x-test-user-email': adminUser.email,
        },
        body: JSON.stringify({
          name: tagName,
          group: 'Deportes y Actividades',
        }),
      });
      const res = await postTagsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe(tagName);
      expect(json.slug).toContain('robotica-educativa');
      expect(json.group).toBe('Deportes y Actividades');
      createdTagId = json.id;
      createdTagIds.push(createdTagId);
    });

    it('prevents duplicate tag creation with the same name', async () => {
      const tag = await prisma.tag.findUniqueOrThrow({ where: { id: createdTagId } });
      const req = new NextRequest('http://localhost:3000/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
          'x-test-user-email': adminUser.email,
        },
        body: JSON.stringify({
          name: tag.name,
          group: 'Deportes y Actividades',
        }),
      });
      const res = await postTagsRoute(req);
      expect(res.status).toBe(409);
    });

    it('allows admin to update tag name and group via PATCH', async () => {
      const updatedName = `Robótica y Programación ${Date.now()}`;
      const req = new NextRequest(`http://localhost:3000/api/tags/${createdTagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
          'x-test-user-email': adminUser.email,
        },
        body: JSON.stringify({
          name: updatedName,
          group: 'Apoyo Escolar',
        }),
      });
      const res = await patchTagRoute(req, { params: Promise.resolve({ id: createdTagId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe(updatedName);
      expect(json.group).toBe('Apoyo Escolar');
    });

    it('returns all tags via GET /api/tags and supports search and group filtering', async () => {
      const req = new NextRequest('http://localhost:3000/api/tags?group=Apoyo%20Escolar');
      const res = await getTagsRoute(req);
      expect(res.status).toBe(200);
      const tags = await res.json();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.some((t: any) => t.id === createdTagId)).toBe(true);
    });

    it('allows admin to delete a tag via DELETE', async () => {
      // Create a temporary tag to delete
      const tempTag = await prisma.tag.create({
        data: {
          name: `Tag Para Borrar ${Date.now()}`,
          slug: `tag-para-borrar-${Date.now()}`,
          group: 'Otros',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/tags/${tempTag.id}`, {
        method: 'DELETE',
        headers: {
          'x-test-user-id': adminUser.id,
          'x-test-user-email': adminUser.email,
        },
      });
      const res = await deleteTagRoute(req, { params: Promise.resolve({ id: tempTag.id }) });
      expect(res.status).toBe(200);

      const check = await prisma.tag.findUnique({ where: { id: tempTag.id } });
      expect(check).toBeNull();
    });
  });

  describe('2. Validation of 1 to 5 Tags & Work Zones', () => {
    it('rejects listing payload with 0 tags', () => {
      const res = validateListingPayload({
        title: 'Servicio sin tags válidos',
        description: 'Descripción adecuada de más de 30 caracteres para el servicio de prueba.',
        whatsapp: '+5491112345678',
        tagIds: [],
        workZone: 'TODO_AMBA',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debes seleccionar entre 1 y 5 tags relacionados con tu servicio');
    });

    it('rejects listing payload with more than 5 tags', () => {
      const res = validateListingPayload({
        title: 'Servicio con demasiados tags',
        description: 'Descripción adecuada de más de 30 caracteres para el servicio de prueba.',
        whatsapp: '+5491112345678',
        tagIds: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
        workZone: 'TODO_AMBA',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('No puedes seleccionar más de 5 tags');
    });

    it('rejects listing payload with workZone BARRIO but missing workNeighborhood', () => {
      const res = validateListingPayload({
        title: 'Servicio en barrio sin especificar barrio',
        description: 'Descripción adecuada de más de 30 caracteres para el servicio de prueba.',
        whatsapp: '+5491112345678',
        tagIds: ['tag1'],
        workZone: 'BARRIO',
        workNeighborhood: '',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debes especificar el barrio o localidad');
    });

    it('accepts listing payload with 1-5 tags and valid workZone and barrio', () => {
      const res = validateListingPayload({
        title: 'Servicio con tags y barrio correctos',
        description: 'Descripción adecuada de más de 30 caracteres para el servicio de prueba.',
        schoolId: testSchool.id,
        whatsapp: '+5491112345678',
        tagIds: ['tag1', 'tag2'],
        workZone: 'BARRIO',
        workNeighborhood: 'Palermo',
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toEqual([]);
    });
  });

  describe('3. Listing Creation & Modification with Tags & Work Zone', () => {
    let tagA: any;
    let tagB: any;
    let createdListingId: string;

    beforeAll(async () => {
      tagA = await prisma.tag.create({
        data: {
          name: `Tag Alpha ${Date.now()}`,
          slug: `tag-alpha-${Date.now()}`,
          group: 'Cuidado Infantil',
        },
      });
      createdTagIds.push(tagA.id);

      tagB = await prisma.tag.create({
        data: {
          name: `Tag Beta ${Date.now()}`,
          slug: `tag-beta-${Date.now()}`,
          group: 'Apoyo Escolar',
        },
      });
      createdTagIds.push(tagB.id);
    });

    it('rejects regular users trying to submit non-existent tags (cannot create new tags)', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': regularUser.id,
          'x-test-user-email': regularUser.email,
        },
        body: JSON.stringify({
          title: 'Aviso con tag inexistente inventado',
          description: 'Descripción con suficiente longitud para superar el límite de 30 caracteres.',
          whatsapp: '+5491112345678',
          schoolId: testSchool.id,
          tagIds: ['non-existent-tag-id-12345'],
          workZone: 'TODO_AMBA',
        }),
      });

      const res = await postListingRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Uno o más tags seleccionados');
    });

    it('creates a listing successfully with 1-5 existing tags and workZone TODO_AMBA', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': regularUser.id,
          'x-test-user-email': regularUser.email,
        },
        body: JSON.stringify({
          title: 'Clases particulares y apoyo escolar en zona norte',
          description: 'Profesor universitario con amplia experiencia dando apoyo escolar y tecnicas de estudio.',
          whatsapp: '+5491112345678',
          schoolId: testSchool.id,
          tagIds: [tagA.id, tagB.id],
          workZone: 'TODO_AMBA',
        }),
      });

      const res = await postListingRoute(req);
      expect([200, 201]).toContain(res.status);
      const json = await res.json();
      createdListingId = json.listing.id;
      createdListingIds.push(createdListingId);

      // Verify DB Listing record
      const dbListing = await prisma.listing.findUnique({
        where: { id: createdListingId },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      });
      expect(dbListing).not.toBeNull();
      expect(dbListing?.workZone).toBe('TODO_AMBA');
      expect(dbListing?.tags.length).toBe(2);
      const tagIdsInDb = dbListing?.tags.map((t) => t.tagId);
      expect(tagIdsInDb).toContain(tagA.id);
      expect(tagIdsInDb).toContain(tagB.id);
    });

    it('allows updating listing tags and changing workZone to BARRIO', async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${createdListingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': regularUser.id,
          'x-test-user-email': regularUser.email,
        },
        body: JSON.stringify({
          tagIds: [tagA.id],
          workZone: 'BARRIO',
          workNeighborhood: 'Belgrano',
        }),
      });

      const res = await patchListingRoute(req, { params: Promise.resolve({ id: createdListingId }) });
      expect(res.status).toBe(200);

      const updated = await prisma.listing.findUnique({
        where: { id: createdListingId },
        include: { tags: true },
      });
      expect(updated?.workZone).toBe('BARRIO');
      expect(updated?.workNeighborhood).toBe('Belgrano');
      expect(updated?.tags.length).toBe(1);
      expect(updated?.tags[0].tagId).toBe(tagA.id);
    });
  });

  describe('4. Catalog Filtering by Tag and Work Zone', () => {
    let filterListingId: string;
    let specialTag: any;

    beforeAll(async () => {
      specialTag = await prisma.tag.create({
        data: {
          name: `Filtro Especial ${Date.now()}`,
          slug: `filtro-especial-${Date.now()}`,
          group: 'Idiomas',
        },
      });
      createdTagIds.push(specialTag.id);

      // Create an APPROVED listing with this tag and specific neighborhood
      const listing = await prisma.listing.create({
        data: {
          title: 'Servicio Aprobado para Filtro de Zona y Tag',
          description: 'Aviso especial para comprobar filtros de catalogo por tag y por zona de cobertura.',
          status: 'APPROVED',
          userId: regularUser.id,
          schoolId: testSchool.id,
          whatsapp: '+5491199887766',
          workZone: 'BARRIO',
          workNeighborhood: 'Recoleta',
          tags: {
            create: [
              {
                tag: {
                  connect: { id: specialTag.id },
                },
              },
            ],
          },
        },
      });
      filterListingId = listing.id;
      createdListingIds.push(filterListingId);
    });

    it('filters listings by tag slug via GET /api/listings?tag=<slug>', async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings?tag=${specialTag.slug}`);
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);
      const listings = await res.json();
      expect(listings.some((l: any) => l.id === filterListingId)).toBe(true);
      // Criana official may be included if childcare, but our special tag is Idiomas
      for (const l of listings) {
        if (l.id !== 'criana-official-featured') {
          const hasTag = l.tags?.some((t: any) => t.tag?.slug === specialTag.slug || t.tagId === specialTag.id);
          expect(hasTag).toBe(true);
        }
      }
    });

    it('filters listings by workZone neighborhood via GET /api/listings?workZone=Recoleta', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings?workZone=Recoleta');
      const res = await getListingsRoute(req);
      expect(res.status).toBe(200);
      const listings = await res.json();
      expect(listings.some((l: any) => l.id === filterListingId)).toBe(true);
    });
  });
});
