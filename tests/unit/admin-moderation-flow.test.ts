import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getPendingRoute } from '@/app/api/admin/pending/route';
import { GET as getListingsRoute } from '@/app/api/listings/route';
import { PATCH as patchListingRoute } from '@/app/api/listings/[id]/route';

describe('Admin Pending Moderation Flow & Immediate Visibility', () => {
  let adminUser: any;
  let regularUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  beforeAll(async () => {
    // Setup unique test data
    const timestamp = Date.now();
    adminUser = await prisma.user.create({
      data: {
        email: `admin-mod-${timestamp}@test.edu.ar`,
        name: 'Administrador Moderador',
        role: 'ADMIN',
        isOnboarded: true,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `regular-mod-${timestamp}@test.edu.ar`,
        name: 'Usuario Regular',
        role: 'USER',
        isOnboarded: true,
      },
    });

    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: `999${timestamp.toString().slice(-6)}`,
          nombre: `Colegio de Prueba Mod ${timestamp}`,
          domicilio: 'Av. Libertador 1234',
          localidad: 'Olivos',
          departamento: 'Vicente López',
          jurisdiccion: 'GBA',
        },
      });
    }

    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    testSubcategory = testCategory.subcategories[0];
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.listing.deleteMany({
      where: {
        title: { contains: '[MOD-TEST]' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser?.id, regularUser?.id].filter(Boolean) },
      },
    });
  });

  it('1. GET /api/admin/pending rejects non-admin users with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/pending', {
      headers: { 'x-test-user-id': regularUser.id },
    });
    const res = await getPendingRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('permisos de administrador');
  });

  it('2. GET /api/admin/pending returns pending listings for admin users', async () => {
    const pendingListing = await prisma.listing.create({
      data: {
        title: `[MOD-TEST] Aviso Pendiente de Aprobación ${Date.now()}`,
        description: 'Servicio escolar pendiente que requiere revision de administracion.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: regularUser.id,
        status: 'PENDING',
      },
    });

    const req = new NextRequest('http://localhost:3000/api/admin/pending', {
      headers: { 'x-test-user-id': adminUser.id },
    });
    const res = await getPendingRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    const found = data.find((item: any) => item.id === pendingListing.id);
    expect(found).toBeDefined();
    expect(found.title).toBe(pendingListing.title);
    expect(found.user.email).toBe(regularUser.email);
  });

  it('3. Pending listing is NOT visible in public catalog before approval', async () => {
    const pendingListing = await prisma.listing.create({
      data: {
        title: `[MOD-TEST] Aviso Pendiente Invisible ${Date.now()}`,
        description: 'No debe aparecer en el catalogo publico general.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: regularUser.id,
        status: 'PENDING',
      },
    });

    const publicReq = new NextRequest('http://localhost:3000/api/listings');
    const publicRes = await getListingsRoute(publicReq);
    expect(publicRes.status).toBe(200);
    const catalog = await publicRes.json();

    const inCatalog = catalog.some((l: any) => l.id === pendingListing.id);
    expect(inCatalog).toBe(false);
  });

  it('4. Approving a pending listing makes it IMMEDIATELY visible in public catalog', async () => {
    const pendingListing = await prisma.listing.create({
      data: {
        title: `[MOD-TEST] Aviso para Aprobacion Inmediata ${Date.now()}`,
        description: 'Al ser aprobado por el admin, debe mostrarse al instante en el catalogo.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: regularUser.id,
        status: 'PENDING',
      },
    });

    // Admin approves the listing via PATCH /api/listings/[id]
    const patchReq = new NextRequest(
      `http://localhost:3000/api/listings/${pendingListing.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      }
    );

    const patchRes = await patchListingRoute(patchReq, {
      params: { id: pendingListing.id },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.status).toBe('APPROVED');

    // Query public catalog immediately
    const publicReq = new NextRequest('http://localhost:3000/api/listings');
    const publicRes = await getListingsRoute(publicReq);
    expect(publicRes.status).toBe(200);
    const catalog = await publicRes.json();

    // Verify it is now immediately present in the catalog
    const foundInCatalog = catalog.find((l: any) => l.id === pendingListing.id);
    expect(foundInCatalog).toBeDefined();
    expect(foundInCatalog.title).toBe(pendingListing.title);

    // Verify it was removed from the pending queue
    const pendingReq = new NextRequest('http://localhost:3000/api/admin/pending', {
      headers: { 'x-test-user-id': adminUser.id },
    });
    const pendingRes = await getPendingRoute(pendingReq);
    const pendingQueue = await pendingRes.json();
    const stillPending = pendingQueue.some((l: any) => l.id === pendingListing.id);
    expect(stillPending).toBe(false);
  });

  it('5. Rejecting a pending listing removes it from queue without making it visible', async () => {
    const pendingListing = await prisma.listing.create({
      data: {
        title: `[MOD-TEST] Aviso para Rechazo ${Date.now()}`,
        description: 'Aviso con contenido que sera rechazado por el admin.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: regularUser.id,
        status: 'PENDING',
      },
    });

    // Admin rejects the listing
    const patchReq = new NextRequest(
      `http://localhost:3000/api/listings/${pendingListing.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      }
    );

    const patchRes = await patchListingRoute(patchReq, {
      params: { id: pendingListing.id },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.status).toBe('REJECTED');

    // Confirm it is NOT in the public catalog
    const publicReq = new NextRequest('http://localhost:3000/api/listings');
    const publicRes = await getListingsRoute(publicReq);
    const catalog = await publicRes.json();
    expect(catalog.some((l: any) => l.id === pendingListing.id)).toBe(false);

    // Confirm it is NOT in the pending queue
    const pendingReq = new NextRequest('http://localhost:3000/api/admin/pending', {
      headers: { 'x-test-user-id': adminUser.id },
    });
    const pendingRes = await getPendingRoute(pendingReq);
    const pendingQueue = await pendingRes.json();
    expect(pendingQueue.some((l: any) => l.id === pendingListing.id)).toBe(false);
  });
});
