import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getUsersRoute } from '@/app/api/admin/users/route';
import {
  GET as getUserRoute,
  PATCH as patchUserRoute,
  DELETE as deleteUserRoute,
} from '@/app/api/admin/users/[id]/route';
import { authOptions } from '@/lib/auth';

describe('Admin User Control API Suite', () => {
  let adminUser: any;
  let regularUser: any;
  let testSchoolA: any;
  let testSchoolB: any;
  let testCategory: any;
  let testSubcategory: any;
  let testTagMath: any;
  let testTagMusic: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create schools
    testSchoolA = await prisma.school.create({
      data: {
        cueanexo: `888${timestamp.toString().slice(-6)}`,
        nombre: `Colegio Belgrano Day ${timestamp}`,
        domicilio: 'Juramento 1234',
        localidad: 'Belgrano',
        departamento: 'Comuna 13',
        jurisdiccion: 'CABA',
      },
    });

    testSchoolB = await prisma.school.create({
      data: {
        cueanexo: `777${timestamp.toString().slice(-6)}`,
        nombre: `Colegio San Martín ${timestamp}`,
        domicilio: 'San Martín 567',
        localidad: 'San Isidro',
        departamento: 'San Isidro',
        jurisdiccion: 'GBA',
      },
    });

    // Create users
    adminUser = await prisma.user.create({
      data: {
        email: `admin-ctrl-${timestamp}@test.edu.ar`,
        name: 'Super Admin',
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
        schoolOfOriginId: testSchoolA.id,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `familia-${timestamp}@test.edu.ar`,
        name: 'Familia Rossi',
        dni: '29888777',
        role: 'USER',
        isActive: true,
        isOnboarded: true,
        schoolOfOriginId: testSchoolA.id,
      },
    });

    // Category
    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    testSubcategory = testCategory.subcategories[0];

    // Tags
    testTagMath = await prisma.tag.upsert({
      where: { slug: `matematica-${timestamp}` },
      update: {},
      create: {
        name: `Matemática ${timestamp}`,
        slug: `matematica-${timestamp}`,
      },
    });

    testTagMusic = await prisma.tag.upsert({
      where: { slug: `musica-${timestamp}` },
      update: {},
      create: {
        name: `Música ${timestamp}`,
        slug: `musica-${timestamp}`,
      },
    });

    // Create listing for regularUser with Math tag
    const listing = await prisma.listing.create({
      data: {
        title: `Clases de Matemática Rossi ${timestamp}`,
        description: 'Apoyo escolar para primaria y secundaria.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchoolA.id,
        userId: regularUser.id,
        status: 'APPROVED',
      },
    });

    await prisma.listingTag.create({
      data: {
        listingId: listing.id,
        tagId: testTagMath.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (adminUser?.id) {
      await prisma.user.deleteMany({ where: { id: adminUser.id } });
    }
    if (regularUser?.id) {
      await prisma.user.deleteMany({ where: { id: regularUser.id } });
    }
    if (testSchoolA?.id) {
      await prisma.school.deleteMany({ where: { id: testSchoolA.id } });
    }
    if (testSchoolB?.id) {
      await prisma.school.deleteMany({ where: { id: testSchoolB.id } });
    }
    if (testTagMath?.id) {
      await prisma.tag.deleteMany({ where: { id: testTagMath.id } });
    }
    if (testTagMusic?.id) {
      await prisma.tag.deleteMany({ where: { id: testTagMusic.id } });
    }
  });

  it('1. GET /api/admin/users rejects non-admin users with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      headers: { 'x-test-user-id': regularUser.id },
    });
    const res = await getUsersRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('permisos de administrador');
  });

  it('2. GET /api/admin/users lists users and counts for admin', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users', {
      headers: { 'x-test-user-id': adminUser.id },
    });
    const res = await getUsersRoute(req);
    expect(res.status).toBe(200);

    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);

    const foundRegular = users.find((u: any) => u.id === regularUser.id);
    expect(foundRegular).toBeDefined();
    expect(foundRegular.name).toBe('Familia Rossi');
    expect(foundRegular.role).toBe('USER');
    expect(foundRegular.isActive).toBe(true);
    expect(foundRegular._count.listings).toBe(1);
    expect(foundRegular.listings.length).toBe(1);
    expect(foundRegular.listings[0].tags[0].tag.name).toBe(testTagMath.name);
  });

  it('3. GET /api/admin/users filters by search text (name, email, DNI)', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/users?search=rossi',
      {
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const res = await getUsersRoute(req);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(users.some((u: any) => u.id === regularUser.id)).toBe(true);
    expect(users.every((u: any) => u.name?.toLowerCase().includes('rossi') || u.email.includes('rossi'))).toBe(true);
  });

  it('4. GET /api/admin/users filters by school', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/admin/users?school=${testSchoolA.id}`,
      {
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const res = await getUsersRoute(req);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(users.some((u: any) => u.id === regularUser.id)).toBe(true);

    // Searching for School B should not return regularUser
    const reqB = new NextRequest(
      `http://localhost:3000/api/admin/users?school=${testSchoolB.id}`,
      {
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const resB = await getUsersRoute(reqB);
    const usersB = await resB.json();
    expect(usersB.some((u: any) => u.id === regularUser.id)).toBe(false);
  });

  it('5. GET /api/admin/users filters by ad tags', async () => {
    // Filter by testTagMath slug
    const req = new NextRequest(
      `http://localhost:3000/api/admin/users?tag=${testTagMath.slug}`,
      {
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const res = await getUsersRoute(req);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(users.some((u: any) => u.id === regularUser.id)).toBe(true);

    // Filter by testTagMusic slug should not match regularUser
    const reqMusic = new NextRequest(
      `http://localhost:3000/api/admin/users?tag=${testTagMusic.slug}`,
      {
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const resMusic = await getUsersRoute(reqMusic);
    const usersMusic = await resMusic.json();
    expect(usersMusic.some((u: any) => u.id === regularUser.id)).toBe(false);
  });

  it('6. PATCH /api/admin/users/[id] can disable and enable a user', async () => {
    // Disable user
    const patchReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${regularUser.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ isActive: false }),
      }
    );
    const patchRes = await patchUserRoute(patchReq, {
      params: { id: regularUser.id },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.isActive).toBe(false);

    // Check DB
    const dbUser = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(dbUser?.isActive).toBe(false);

    // Verify disabled user is blocked by NextAuth signIn callback
    const signInResult = await (authOptions.callbacks?.signIn as any)({
      user: { email: regularUser.email },
      account: { provider: 'google', type: 'oauth' },
    });
    expect(signInResult).toBe(false);

    // Re-enable user
    const enableReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${regularUser.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ isActive: true }),
      }
    );
    const enableRes = await patchUserRoute(enableReq, {
      params: { id: regularUser.id },
    });
    expect(enableRes.status).toBe(200);
    const enabledUser = await enableRes.json();
    expect(enabledUser.isActive).toBe(true);

    // Now sign in is allowed again
    const signInResultAfter = await (authOptions.callbacks?.signIn as any)({
      user: { email: regularUser.email },
      account: { provider: 'google', type: 'oauth' },
    });
    expect(signInResultAfter).toBe(true);
  });

  it('7. PATCH /api/admin/users/[id] can change role between ADMIN and Familia (USER)', async () => {
    // Change regularUser to ADMIN
    const patchAdminReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${regularUser.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      }
    );
    const res1 = await patchUserRoute(patchAdminReq, {
      params: { id: regularUser.id },
    });
    expect(res1.status).toBe(200);
    const promoted = await res1.json();
    expect(promoted.role).toBe('ADMIN');

    // Change back to Familia (USER)
    const patchUserReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${regularUser.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ role: 'USER' }),
      }
    );
    const res2 = await patchUserRoute(patchUserReq, {
      params: { id: regularUser.id },
    });
    expect(res2.status).toBe(200);
    const demoted = await res2.json();
    expect(demoted.role).toBe('USER');
  });

  it('8. DELETE /api/admin/users/[id] deletes user and enables Google re-signup', async () => {
    const timestamp = Date.now();
    const tempUserEmail = `temp-delete-${timestamp}@test.edu.ar`;
    const tempUser = await prisma.user.create({
      data: {
        email: tempUserEmail,
        name: 'Usuario Temporal',
        role: 'USER',
        isOnboarded: false,
      },
    });

    // Create a listing for tempUser
    const tempListing = await prisma.listing.create({
      data: {
        title: `Aviso Temporal ${timestamp}`,
        description: 'Descripcion de prueba para eliminacion en cascada.',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchoolA.id,
        userId: tempUser.id,
      },
    });

    // Delete tempUser
    const delReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${tempUser.id}`,
      {
        method: 'DELETE',
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const delRes = await deleteUserRoute(delReq, {
      params: { id: tempUser.id },
    });
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);

    // Verify user is gone from DB
    const checkUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
    expect(checkUser).toBeNull();

    // Verify their listing cascaded and was deleted
    const checkListing = await prisma.listing.findUnique({ where: { id: tempListing.id } });
    expect(checkListing).toBeNull();

    // Verify user can now sign up again with Google from scratch
    const googleReSignup = {
      id: 'google-fresh-sub-id',
      name: 'Usuario Re-Registrado',
      email: tempUserEmail,
      image: 'https://lh3.googleusercontent.com/avatar-fresh',
    };
    const signInResult = await (authOptions.callbacks?.signIn as any)({
      user: googleReSignup,
      account: { provider: 'google', type: 'oauth' },
    });
    expect(signInResult).toBe(true);

    const reCreatedUser = await prisma.user.findUnique({
      where: { email: tempUserEmail },
    });
    expect(reCreatedUser).not.toBeNull();
    expect(reCreatedUser!.id).toBeDefined();
    expect(reCreatedUser!.id).not.toBe(tempUser.id); // fresh ID

    // Cleanup re-created user
    await prisma.user.delete({ where: { id: reCreatedUser!.id } });
  });

  it('9. Admin cannot disable or delete their own account', async () => {
    // Try to disable self
    const disableSelfReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${adminUser.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminUser.id,
        },
        body: JSON.stringify({ isActive: false }),
      }
    );
    const resDisable = await patchUserRoute(disableSelfReq, {
      params: { id: adminUser.id },
    });
    expect(resDisable.status).toBe(400);

    // Try to delete self
    const deleteSelfReq = new NextRequest(
      `http://localhost:3000/api/admin/users/${adminUser.id}`,
      {
        method: 'DELETE',
        headers: { 'x-test-user-id': adminUser.id },
      }
    );
    const resDelete = await deleteUserRoute(deleteSelfReq, {
      params: { id: adminUser.id },
    });
    expect(resDelete.status).toBe(400);
  });
});
