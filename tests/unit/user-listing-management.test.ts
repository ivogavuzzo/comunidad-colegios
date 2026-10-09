import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getUserListingsRoute } from '@/app/api/user/listings/route';
import { PATCH as patchListingRoute, DELETE as deleteListingRoute } from '@/app/api/listings/[id]/route';

describe('User Listing Management (Edit, Delete, Toggle Published & Re-approval Notice)', () => {
  let userA: any;
  let userB: any;
  let adminUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    userA = await prisma.user.create({
      data: {
        email: `user-owner-a-${timestamp}@test.edu.ar`,
        name: 'Dueño Aviso A',
        role: 'USER',
        isOnboarded: true,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `user-other-b-${timestamp}@test.edu.ar`,
        name: 'Otro Usuario B',
        role: 'USER',
        isOnboarded: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin-manage-${timestamp}@test.edu.ar`,
        name: 'Admin Gestor',
        role: 'ADMIN',
        isOnboarded: true,
      },
    });

    testSchool = await prisma.school.findFirst();
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: `998${timestamp.toString().slice(-6)}`,
          nombre: `Colegio de Prueba UserMgmt ${timestamp}`,
          domicilio: 'Calle Falsa 123',
          localidad: 'Vicente López',
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
    await prisma.listing.deleteMany({
      where: {
        title: { contains: '[USER-MGMT-TEST]' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [userA?.id, userB?.id, adminUser?.id].filter(Boolean) },
      },
    });
  });

  it('1. GET /api/user/listings rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/listings');
    const res = await getUserListingsRoute(req);
    expect(res.status).toBe(401);
  });

  it('2. GET /api/user/listings returns only the listings belonging to the authenticated user', async () => {
    // Create listing for User A
    const listingA = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso de Usuario A ${Date.now()}`,
        description: 'Clases particulares de matemáticas y física para secundaria.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
      },
    });

    // Create listing for User B
    const listingB = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso de Usuario B ${Date.now()}`,
        description: 'Taller de robótica y programación escolar inicial.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userB.id,
        status: 'APPROVED',
      },
    });

    const req = new NextRequest('http://localhost:3000/api/user/listings', {
      headers: { 'x-test-user-id': userA.id },
    });
    const res = await getUserListingsRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    const ids = data.map((l: any) => l.id);
    expect(ids).toContain(listingA.id);
    expect(ids).not.toContain(listingB.id);
  });

  it('3. Owner can toggle status between APPROVED and HIDDEN without resetting to PENDING', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso Toggle ${Date.now()}`,
        description: 'Servicio para probar conmutación entre publicado y pausado.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
      },
    });

    // Toggle to HIDDEN (pausar)
    const reqHide = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: {
        'x-test-user-id': userA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'HIDDEN' }),
    });
    const resHide = await patchListingRoute(reqHide, { params: { id: listing.id } });
    expect(resHide.status).toBe(200);
    const dataHide = await resHide.json();
    expect(dataHide.status).toBe('HIDDEN');

    // Toggle back to APPROVED (re-publicar)
    const reqApprove = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: {
        'x-test-user-id': userA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const resApprove = await patchListingRoute(reqApprove, { params: { id: listing.id } });
    expect(resApprove.status).toBe(200);
    const dataApprove = await resApprove.json();
    expect(dataApprove.status).toBe('APPROVED');
  });

  it('4. Owner modifying content forces status to PENDING and triggers re-approval', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso Original ${Date.now()}`,
        description: 'Descripción original válida con más de veinte caracteres requeridos.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
      },
    });

    const reqEdit = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: {
        'x-test-user-id': userA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[USER-MGMT-TEST] Aviso Modificado ${Date.now()}`,
        description: 'Nueva descripción editada por el usuario con más de veinte caracteres.',
      }),
    });

    const resEdit = await patchListingRoute(reqEdit, { params: { id: listing.id } });
    expect(resEdit.status).toBe(200);
    const updated = await resEdit.json();

    // Must be forced to PENDING since non-admin owner modified content!
    expect(updated.status).toBe('PENDING');

    const inDb = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(inDb?.status).toBe('PENDING');
  });

  it('5. Non-owner regular user cannot modify another user\'s listing (403)', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso de A Protegido ${Date.now()}`,
        description: 'Aviso de prueba que no debe ser modificable por usuario B.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: {
        'x-test-user-id': userB.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'HIDDEN' }),
    });

    const res = await patchListingRoute(req, { params: { id: listing.id } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Acceso denegado');
  });

  it('6. Non-owner regular user cannot delete another user\'s listing (403)', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso para borrar no autorizado ${Date.now()}`,
        description: 'Aviso que usuario B intentará eliminar indebidamente.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'DELETE',
      headers: { 'x-test-user-id': userB.id },
    });

    const res = await deleteListingRoute(req, { params: { id: listing.id } });
    expect(res.status).toBe(403);

    // Listing must still exist
    const stillExists = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(stillExists).not.toBeNull();
  });

  it('7. Owner can delete their own listing (200) and it cascades correctly', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso para eliminar por dueño ${Date.now()}`,
        description: 'Aviso que será eliminado exitosamente por su propio autor.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userA.id,
        status: 'APPROVED',
        images: {
          create: [{ url: 'https://example.com/test-img.jpg', orderIndex: 0 }],
        },
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'DELETE',
      headers: { 'x-test-user-id': userA.id },
    });

    const res = await deleteListingRoute(req, { params: { id: listing.id } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const deleted = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(deleted).toBeNull();
  });

  it('8. Administrator can delete any listing', async () => {
    const listing = await prisma.listing.create({
      data: {
        title: `[USER-MGMT-TEST] Aviso eliminado por admin ${Date.now()}`,
        description: 'Aviso que será eliminado de forma administrativa.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        userId: userB.id,
        status: 'APPROVED',
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
      method: 'DELETE',
      headers: { 'x-test-user-id': adminUser.id },
    });

    const res = await deleteListingRoute(req, { params: { id: listing.id } });
    expect(res.status).toBe(200);

    const deleted = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(deleted).toBeNull();
  });
});
