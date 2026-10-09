import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

describe('Google OAuth & Database Write Persistence', () => {
  const createdUserEmails: string[] = [];

  afterAll(async () => {
    if (createdUserEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: createdUserEmails } },
      });
    }
  });

  it('provisions a new user in the SQLite database upon first Google signIn callback', async () => {
    const timestamp = Date.now();
    const testEmail = `google-login-${timestamp}@gmail.com`;
    createdUserEmails.push(testEmail);

    const googleUser = {
      id: 'google-sub-id-123456789',
      name: 'María Montessori',
      email: testEmail,
      image: 'https://lh3.googleusercontent.com/a/avatar123',
    };

    // Verify user does not exist in DB before signIn
    const beforeUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(beforeUser).toBeNull();

    // Trigger NextAuth signIn callback
    const signInResult = await (authOptions.callbacks?.signIn as any)({
      user: googleUser,
      account: { provider: 'google', type: 'oauth' },
      profile: { email_verified: true },
    });

    expect(signInResult).toBe(true);

    // Verify user was immediately created and persisted in DB
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe(testEmail);
    expect(dbUser!.name).toBe('María Montessori');
    expect(dbUser!.image).toBe('https://lh3.googleusercontent.com/a/avatar123');
    expect(dbUser!.role).toBe('USER');
    expect(dbUser!.isOnboarded).toBe(false);
    expect(dbUser!.id).toBeDefined();
    // Verify user.id was assigned the DB cuid
    expect(googleUser.id).toBe(dbUser!.id);
  });

  it('updates existing user profile photo and name from Google profile if updated', async () => {
    const timestamp = Date.now();
    const testEmail = `existing-user-${timestamp}@gmail.com`;
    createdUserEmails.push(testEmail);

    // Create user initially without photo or name
    const initialUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: null,
        image: null,
        isOnboarded: false,
        role: 'USER',
      },
    });

    const googleUser = {
      id: 'google-sub-999',
      name: 'Carlos Pellegrini',
      email: testEmail,
      image: 'https://lh3.googleusercontent.com/a/new-photo',
    };

    // Trigger signIn callback
    await (authOptions.callbacks?.signIn as any)({
      user: googleUser,
      account: { provider: 'google', type: 'oauth' },
    });

    // Check that DB was updated
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    expect(updatedUser!.name).toBe('Carlos Pellegrini');
    expect(updatedUser!.image).toBe('https://lh3.googleusercontent.com/a/new-photo');
    expect(updatedUser!.id).toBe(initialUser.id);
  });

  it('populates JWT and Session callbacks with database attributes', async () => {
    const timestamp = Date.now();
    const testEmail = `jwt-session-${timestamp}@gmail.com`;
    createdUserEmails.push(testEmail);

    const testSchool = await prisma.school.findFirst();

    const dbUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Ana Frank',
        dni: '38112233',
        schoolOfOriginId: testSchool ? testSchool.id : null,
        isOnboarded: true,
        role: 'USER',
      },
    });

    // 1. Run jwt callback
    const initialToken = { email: testEmail };
    const populatedToken = await (authOptions.callbacks?.jwt as any)({
      token: initialToken,
      user: { id: dbUser.id, email: testEmail },
    });

    expect(populatedToken.id).toBe(dbUser.id);
    expect(populatedToken.email).toBe(testEmail);
    expect(populatedToken.isOnboarded).toBe(true);
    expect(populatedToken.dni).toBe('38112233');

    // 2. Run session callback
    const sessionObj = {
      user: { email: testEmail },
      expires: '2026-12-31T23:59:59.000Z',
    };
    const finalSession = await (authOptions.callbacks?.session as any)({
      session: sessionObj,
      token: populatedToken,
    });

    expect(finalSession.user.id).toBe(dbUser.id);
    expect(finalSession.user.email).toBe(testEmail);
    expect(finalSession.user.name).toBe('Ana Frank');
    expect(finalSession.user.isOnboarded).toBe(true);
    expect(finalSession.user.dni).toBe('38112233');
    expect(finalSession.user.role).toBe('USER');
  });
});
