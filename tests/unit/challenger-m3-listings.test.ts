import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as listingsRoute } from '@/app/api/listings/route';
import { NextRequest } from 'next/server';

describe('Adversarial Challenge: /api/listings POST (Milestone 3)', () => {
  let testSchool: any;
  let testSchool2: any;
  let testCategoryA: any;
  let testSubcategoryA1: any;
  let testSubcategoryA2: any;
  let testCategoryB: any;
  let testSubcategoryB1: any;
  let testSchoolRequest: any;

  let onboardedUser: any;
  let unonboardedUser: any;

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdSchoolReqIds: string[] = [];

  // Helper to construct POST NextRequest
  function makePostRequest(
    body: Record<string, any>,
    authHeaders?: { userId?: string; userEmail?: string }
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeaders?.userId) {
      headers['x-test-user-id'] = authHeaders.userId;
    }
    if (authHeaders?.userEmail) {
      headers['x-test-user-email'] = authHeaders.userEmail;
    }

    return new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    // 1. Setup Schools
    testSchool = await prisma.school.findFirst({
      where: { jurisdiccion: 'CABA' },
    });
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: '020999901',
          nombre: 'COLEGIO CHALLENGER 1',
          domicilio: 'AV. CORDOBA 1111',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 1',
          localidad: 'RETIRO',
        },
      });
    }

    testSchool2 = await prisma.school.findFirst({
      where: { id: { not: testSchool.id } },
    });
    if (!testSchool2) {
      testSchool2 = await prisma.school.create({
        data: {
          cueanexo: '020999902',
          nombre: 'COLEGIO CHALLENGER 2',
          domicilio: 'AV. CALLAO 2222',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 2',
          localidad: 'RECOLETA',
        },
      });
    }

    // 2. Setup Categories & Subcategories (Category A with two subcats, Category B with one)
    testCategoryA = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    if (!testCategoryA || testCategoryA.subcategories.length < 2) {
      testCategoryA = await prisma.category.create({
        data: {
          name: 'Categoría Challenger A',
          slug: `cat-challenger-a-${Date.now()}`,
          subcategories: {
            create: [
              { name: 'Subcat A1', slug: `subcat-a1-${Date.now()}`, orderIndex: 0 },
              { name: 'Subcat A2', slug: `subcat-a2-${Date.now()}`, orderIndex: 1 },
            ],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategoryA1 = testCategoryA.subcategories[0];
    testSubcategoryA2 = testCategoryA.subcategories[1] || testCategoryA.subcategories[0];

    testCategoryB = await prisma.category.findFirst({
      where: { id: { not: testCategoryA.id } },
      include: { subcategories: true },
    });
    if (!testCategoryB || testCategoryB.subcategories.length === 0) {
      testCategoryB = await prisma.category.create({
        data: {
          name: 'Categoría Challenger B',
          slug: `cat-challenger-b-${Date.now()}`,
          subcategories: {
            create: [
              { name: 'Subcat B1', slug: `subcat-b1-${Date.now()}`, orderIndex: 0 },
            ],
          },
        },
        include: { subcategories: true },
      });
    }
    testSubcategoryB1 = testCategoryB.subcategories[0];

    // 3. Setup Fallback SchoolRequest ("Mi colegio no está")
    testSchoolRequest = await prisma.schoolRequest.create({
      data: {
        nombre: 'Colegio No Listado Challenger',
        jurisdiccion: 'GBA',
        departamento: 'San Isidro',
        localidad: 'Acassuso',
        domicilio: 'Calle Falsa 123',
        status: 'PENDING',
        userEmail: 'padre@colegionolistado.edu.ar',
      },
    });
    createdSchoolReqIds.push(testSchoolRequest.id);

    // 4. Setup Test Users
    const timestamp = Date.now();

    onboardedUser = await prisma.user.create({
      data: {
        name: 'Advertiser Onboarded Challenger',
        email: `onboarded-adv-${timestamp}@test.edu.ar`,
        dni: '36987654',
        schoolOfOriginId: testSchool.id,
        isOnboarded: true,
        role: 'USER',
      },
    });
    createdUserIds.push(onboardedUser.id);

    unonboardedUser = await prisma.user.create({
      data: {
        name: 'Advertiser Non-Onboarded Challenger',
        email: `unonboarded-adv-${timestamp}@test.edu.ar`,
        isOnboarded: false,
        role: 'USER',
      },
    });
    createdUserIds.push(unonboardedUser.id);
  });

  afterAll(async () => {
    // Cleanup listings
    if (createdListingIds.length > 0) {
      await prisma.listingImage.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    // Cleanup users
    if (createdUserIds.length > 0) {
      await prisma.listing.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // Cleanup school requests
    if (createdSchoolReqIds.length > 0) {
      await prisma.listing.deleteMany({
        where: { schoolRequestId: { in: createdSchoolReqIds } },
      });
      await prisma.schoolRequest.deleteMany({
        where: { id: { in: createdSchoolReqIds } },
      });
    }
  });

  // ==========================================================================
  // Section 1: Non-onboarded User Attempt is Rejected / Gated
  // ==========================================================================
  describe('1. Onboarding Gate Enforcement & Authentication', () => {
    it('rejects unauthenticated user without session or test headers with 401', async () => {
      const req = makePostRequest({
        title: 'Servicio de Clases Particulares',
        description: 'Clases de apoyo escolar personalizadas para nivel primario y secundario.',
        categoryId: testCategoryA.id,
        subcategoryId: testSubcategoryA1.id,
        schoolId: testSchool.id,
        whatsapp: '+5491144445555',
      });

      const res = await listingsRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('No autenticado');
    });

    it('rejects authenticated non-onboarded user with 403 and redirectUrl: /onboarding', async () => {
      const req = makePostRequest(
        {
          title: 'Servicio de Clases Particulares',
          description: 'Clases de apoyo escolar personalizadas para nivel primario y secundario.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: unonboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('onboarding obligatorio');
      expect(json.redirectUrl).toBe('/onboarding');
    });

    it('rejects non-onboarded user even if request body maliciously claims isOnboarded: true', async () => {
      const req = makePostRequest(
        {
          title: 'Intento de Evasión de Onboarding',
          description: 'Probando si se puede saltar el gate inyectando campos de estado en el payload.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
          isOnboarded: true, // Spoofed field
        },
        { userId: unonboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.redirectUrl).toBe('/onboarding');
    });

    it('rejects non-onboarded user resolving via email header', async () => {
      const req = makePostRequest(
        {
          title: 'Servicio de Fotografía Escolar',
          description: 'Fotografía para eventos escolares, actos patrios y fin de curso con entrega digital.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userEmail: unonboardedUser.email }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // Section 2: Contact Channels Matrix (WhatsApp only, Email only, Web only, and Combinations)
  // ==========================================================================
  describe('2. Contact Channels Matrix & Normalization', () => {
    it('succeeds with WhatsApp ONLY (valid 10-digit Argentine format) and normalizes to +549', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Ajedrez Escolar',
          description: 'Taller de ajedrez estratégico para chicos desde primer grado en adelante.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '1155556666', // 10 digits
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.listing.status).toBe('PENDING');
      expect(json.listing.whatsapp).toBe('+5491155556666');
      expect(json.listing.email).toBeNull();
      expect(json.listing.webUrl).toBeNull();

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with WhatsApp ONLY (+549 international prefix format)', async () => {
      const req = makePostRequest(
        {
          title: 'Taller de Cerámica y Escultura',
          description: 'Modelado en arcilla y pintura de piezas para niños de primaria y secundaria.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491199998888',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.whatsapp).toBe('+5491199998888');

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with Email ONLY and leaves whatsapp and webUrl as null', async () => {
      const req = makePostRequest(
        {
          title: 'Traducciones Inglés-Español',
          description: 'Traductora pública matriculada ofrece traducciones para certificados escolares.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          email: 'contacto.traductora@colegio.edu.ar',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.listing.status).toBe('PENDING');
      expect(json.listing.whatsapp).toBeNull();
      expect(json.listing.email).toBe('contacto.traductora@colegio.edu.ar');
      expect(json.listing.webUrl).toBeNull();

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with Web ONLY and leaves whatsapp and email as null', async () => {
      const req = makePostRequest(
        {
          title: 'Plataforma de Libros Escolares Usados',
          description: 'Intercambio y compraventa de manuales escolares de editoriales reconocidas.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          webUrl: 'https://libros-escolares-usados.com.ar',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.listing.status).toBe('PENDING');
      expect(json.listing.whatsapp).toBeNull();
      expect(json.listing.email).toBeNull();
      expect(json.listing.webUrl).toBe('https://libros-escolares-usados.com.ar');

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with combination: WhatsApp + Email', async () => {
      const req = makePostRequest(
        {
          title: 'Profesor de Matemáticas y Álgebra',
          description: 'Preparación integral para exámenes de ingreso y parciales de secundaria.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '1122334455',
          email: 'prof.mate@example.com',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.whatsapp).toBe('+5491122334455');
      expect(json.listing.email).toBe('prof.mate@example.com');
      expect(json.listing.webUrl).toBeNull();

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with combination: WhatsApp + Web', async () => {
      const req = makePostRequest(
        {
          title: 'Transporte Escolar Puerta a Puerta',
          description: 'Servicio habilitado con celadora para colegios de CABA y Zona Norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491133332222',
          webUrl: 'https://transporte-escolar-seguro.ar',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.whatsapp).toBe('+5491133332222');
      expect(json.listing.email).toBeNull();
      expect(json.listing.webUrl).toBe('https://transporte-escolar-seguro.ar');

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with combination: Email + Web', async () => {
      const req = makePostRequest(
        {
          title: 'Psicopedagogía y Orientación Vocacional',
          description: 'Evaluaciones neurocognitivas y orientación vocacional para egresados.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          email: 'lic.garcia@orientacion.edu.ar',
          webUrl: 'https://orientacionvocacional.ar/garcia',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.whatsapp).toBeNull();
      expect(json.listing.email).toBe('lic.garcia@orientacion.edu.ar');
      expect(json.listing.webUrl).toBe('https://orientacionvocacional.ar/garcia');

      createdListingIds.push(json.listing.id);
    });

    it('succeeds with ALL THREE channels: WhatsApp + Email + Web', async () => {
      const req = makePostRequest(
        {
          title: 'Escuela de Natación y Colonia de Vacaciones',
          description: 'Natación infantil climatizada con profesores certificados y colonia en enero y febrero.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144448888',
          email: 'natacion@colonia-escolar.com',
          webUrl: 'https://colonia-escolar.com',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.whatsapp).toBe('+5491144448888');
      expect(json.listing.email).toBe('natacion@colonia-escolar.com');
      expect(json.listing.webUrl).toBe('https://colonia-escolar.com');

      createdListingIds.push(json.listing.id);
    });
  });

  // ==========================================================================
  // Section 3: Rejection with 400 when Zero Contact Channels or Invalid Channels
  // ==========================================================================
  describe('3. Zero Contact Channels & Invalid Channel Rejection', () => {
    it('rejects attempt with zero contact channels completely omitted (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Violin y Viola',
          description: 'Método Suzuki para chicos principiantes y avanzados en zona norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Debes ingresar al menos un canal de contacto');
    });

    it('rejects attempt with all channels set to null or empty strings (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Violin y Viola',
          description: 'Método Suzuki para chicos principiantes y avanzados en zona norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: null,
          email: '',
          webUrl: '   ',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Debes ingresar al menos un canal de contacto');
    });

    it('rejects attempt when WhatsApp is provided but invalid format (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Violin y Viola',
          description: 'Método Suzuki para chicos principiantes y avanzados en zona norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '12345', // Too short
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de WhatsApp inválido');
    });

    it('rejects attempt when Email is provided but invalid format (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Violin y Viola',
          description: 'Método Suzuki para chicos principiantes y avanzados en zona norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          email: 'not-an-email-address',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de Email inválido');
    });

    it('rejects attempt when Web URL is provided but lacks http/https (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Violin y Viola',
          description: 'Método Suzuki para chicos principiantes y avanzados en zona norte.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          webUrl: 'ftp://invalidscheme.com',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de Web URL inválido');
    });
  });

  // ==========================================================================
  // Section 4: Created Listing Properties (PENDING status, ListingImage records, relations)
  // ==========================================================================
  describe('4. Listing Properties, Images & Relational Integrity', () => {
    it('creates listing with status: "PENDING" in response and confirmed in DB', async () => {
      const req = makePostRequest(
        {
          title: 'Profesor de Historia y Geografía',
          description: 'Clases de apoyo didáctico para exámenes del ciclo básico y orientado.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.listing.status).toBe('PENDING');

      // Direct DB query verification
      const dbListing = await prisma.listing.findUnique({
        where: { id: json.listing.id },
      });
      expect(dbListing).not.toBeNull();
      expect(dbListing!.status).toBe('PENDING');
      expect(dbListing!.userId).toBe(onboardedUser.id);
      expect(dbListing!.schoolId).toBe(testSchool.id);
      expect(dbListing!.categoryId).toBe(testCategoryA.id);
      expect(dbListing!.subcategoryId).toBe(testSubcategoryA1.id);

      createdListingIds.push(json.listing.id);
    });

    it('creates listing with multiple ListingImage records preserving orderIndex', async () => {
      const req = makePostRequest(
        {
          title: 'Taller de Robotica Educativa Arduino',
          description: 'Armado y programación de robots sencillos para estudiantes de 10 a 16 años.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
          images: [
            'https://storage.ejemplo.ar/img1.jpg',
            { url: 'https://storage.ejemplo.ar/img2.jpg', orderIndex: 1 },
            'https://storage.ejemplo.ar/img3.jpg',
          ],
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.images.length).toBe(3);

      // Verify in DB directly
      const dbImages = await prisma.listingImage.findMany({
        where: { listingId: json.listing.id },
        orderBy: { orderIndex: 'asc' },
      });
      expect(dbImages.length).toBe(3);
      expect(dbImages[0].url).toBe('https://storage.ejemplo.ar/img1.jpg');
      expect(dbImages[0].orderIndex).toBe(0);
      expect(dbImages[1].url).toBe('https://storage.ejemplo.ar/img2.jpg');
      expect(dbImages[1].orderIndex).toBe(1);
      expect(dbImages[2].url).toBe('https://storage.ejemplo.ar/img3.jpg');
      expect(dbImages[2].orderIndex).toBe(2);

      createdListingIds.push(json.listing.id);
    });

    it('rejects attempt with more than 5 images (400 limit constraint)', async () => {
      const req = makePostRequest(
        {
          title: 'Taller de Pintura Excesivas Fotos',
          description: 'Probando el límite de 5 fotos por aviso para prevenir abusos de almacenamiento.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
          images: [
            'https://img1.jpg',
            'https://img2.jpg',
            'https://img3.jpg',
            'https://img4.jpg',
            'https://img5.jpg',
            'https://img6.jpg', // 6th image exceeds limit
          ],
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('No se permiten más de 5 imágenes');
    });

    it('succeeds when associating with fallback schoolRequestId ("Mi colegio no está")', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Italiano para Familias',
          description: 'Aprende italiano desde nivel inicial con material didáctico y conversación.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolRequestId: testSchoolRequest.id, // Fallback school request
          email: 'prof.italiano@idiomas.com',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.listing.schoolRequestId).toBe(testSchoolRequest.id);
      expect(json.listing.schoolId).toBeNull();
      expect(json.listing.status).toBe('PENDING');

      // Verify in DB
      const dbListing = await prisma.listing.findUnique({
        where: { id: json.listing.id },
      });
      expect(dbListing!.schoolRequestId).toBe(testSchoolRequest.id);
      expect(dbListing!.schoolId).toBeNull();

      createdListingIds.push(json.listing.id);
    });

    it('rejects attempt with non-existent schoolId (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Francés y Fonética',
          description: 'Preparación para exámenes DELF y apoyo para colegios bilingües de la zona.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: 'non-existent-school-id-999',
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('El colegio seleccionado no existe');
    });

    it('rejects attempt with non-existent categoryId (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Francés y Fonética',
          description: 'Preparación para exámenes DELF y apoyo para colegios bilingües de la zona.',
          categoryId: 'non-existent-cat-999',
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('La categoría seleccionada no existe');
    });

    it('rejects cross-category subcategory mismatch (subcat B1 sent with category A) (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Francés y Fonética',
          description: 'Preparación para exámenes DELF y apoyo para colegios bilingües de la zona.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryB1.id, // Belongs to Category B, not Category A!
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('La subcategoría seleccionada no pertenece a la categoría elegida');
    });

    it('rejects when neither schoolId nor schoolRequestId is provided (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases de Francés y Fonética',
          description: 'Preparación para exámenes DELF y apoyo para colegios bilingües de la zona.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Debe asociarse a un colegio existente o solicitado');
    });

    it('rejects title shorter than 5 chars (boundary check) (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Hola', // 4 chars
          description: 'Descripción suficientemente larga con más de veinte caracteres necesarios.',
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('al menos 5 caracteres');
    });

    it('rejects description shorter than 20 chars (boundary check) (400)', async () => {
      const req = makePostRequest(
        {
          title: 'Clases Particulares',
          description: 'Demasiado corta.', // 16 chars
          categoryId: testCategoryA.id,
          subcategoryId: testSubcategoryA1.id,
          schoolId: testSchool.id,
          whatsapp: '+5491144445555',
        },
        { userId: onboardedUser.id }
      );

      const res = await listingsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('al menos 20 caracteres');
    });
  });
});
