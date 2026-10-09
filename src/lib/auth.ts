import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id-for-dev',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret-for-dev',
      allowDangerousEmailAccountLinking: true,
    }),
    // Credentials provider for development, tests, and mock session resolution
    CredentialsProvider({
      id: 'credentials',
      name: 'Development / Test Sign In',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'usuario@colegio.edu.ar' },
        name: { label: 'Nombre', type: 'text', placeholder: 'Juan Pérez' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: credentials.name || email.split('@')[0],
              isOnboarded: false,
              role: 'USER',
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          dni: user.dni,
          schoolOfOriginId: user.schoolOfOriginId,
          isOnboarded: user.isOnboarded,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'comunidad-colegios-super-secret-key-32ch',
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        const email = user.email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email,
              name: user.name || null,
              image: user.image || null,
              isOnboarded: false,
              role: 'USER',
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      const email = token?.email || user?.email;
      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.image = dbUser.image;
          token.dni = dbUser.dni;
          token.schoolOfOriginId = dbUser.schoolOfOriginId;
          token.isOnboarded = dbUser.isOnboarded;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = (token.image as string) ?? null;
        session.user.dni = (token.dni as string) ?? null;
        session.user.schoolOfOriginId = (token.schoolOfOriginId as string) ?? null;
        session.user.isOnboarded = Boolean(token.isOnboarded);
        session.user.role = (token.role as string) || 'USER';
      }
      return session;
    },
  },
};

/**
 * Resolves session format from user database record or mock user object.
 */
export function resolveUserSession(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  dni?: string | null;
  schoolOfOriginId?: string | null;
  isOnboarded: boolean;
  role: string;
}) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      dni: user.dni ?? null,
      schoolOfOriginId: user.schoolOfOriginId ?? null,
      isOnboarded: Boolean(user.isOnboarded),
      role: user.role ?? 'USER',
    },
  };
}

/**
 * Retrieves the current authenticated user from request headers (test mode) or NextAuth session.
 */
export async function getSessionUser(req?: NextRequest | Request) {
  // 1. Check for automated testing / mock headers
  if (req) {
    const headers = req.headers;
    const testUserId = headers.get('x-test-user-id');
    const testUserEmail = headers.get('x-test-user-email');

    if (testUserId || testUserEmail) {
      const user = await prisma.user.findFirst({
        where: testUserId
          ? { id: testUserId }
          : { email: testUserEmail!.toLowerCase() },
        include: { schoolOfOrigin: true },
      });
      if (user) return user;
    }
  }

  // 2. NextAuth standard getServerSession
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { schoolOfOrigin: true },
      });
      if (user) return user;
    }
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        include: { schoolOfOrigin: true },
      });
      if (user) return user;
    }
  } catch (error) {
    // If getServerSession throws outside request context (e.g. in bare unit tests)
  }

  return null;
}

// -------------------------------------------------------------
// DNI Validation
// -------------------------------------------------------------
export function sanitizeAndValidateDni(rawDni: string): {
  isValid: boolean;
  cleanDni: string;
  error?: string;
} {
  if (!rawDni || typeof rawDni !== 'string') {
    return { isValid: false, cleanDni: '', error: 'El DNI es obligatorio' };
  }
  const cleanDni = rawDni.replace(/\D/g, '');
  if (!/^\d{7,8}$/.test(cleanDni)) {
    return {
      isValid: false,
      cleanDni,
      error: 'El DNI debe contener entre 7 y 8 números',
    };
  }
  return { isValid: true, cleanDni };
}

// -------------------------------------------------------------
// Contact Channels Validation
// -------------------------------------------------------------
export function validateWhatsApp(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+?549\d{10}|\d{10,11})$/.test(clean);
}

export function normalizeWhatsApp(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+549')) return clean;
  if (clean.startsWith('549')) return `+${clean}`;
  if (clean.startsWith('11') || clean.length === 10) return `+549${clean}`;
  return clean;
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateWebUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\/.+/i.test(url.trim());
}

export function validateContactChannels(channels: {
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
}): { isValid: boolean; error?: string } {
  const hasWhatsapp = Boolean(channels.whatsapp && channels.whatsapp.trim());
  const hasEmail = Boolean(channels.email && channels.email.trim());
  const hasWeb = Boolean(channels.webUrl && channels.webUrl.trim());

  if (!hasWhatsapp && !hasEmail && !hasWeb) {
    return {
      isValid: false,
      error: 'Debes ingresar al menos un canal de contacto (WhatsApp, Email o Web)',
    };
  }

  if (hasWhatsapp && !validateWhatsApp(channels.whatsapp!)) {
    return { isValid: false, error: 'Formato de WhatsApp inválido' };
  }
  if (hasEmail && !validateEmail(channels.email!)) {
    return { isValid: false, error: 'Formato de Email inválido' };
  }
  if (hasWeb && !validateWebUrl(channels.webUrl!)) {
    return { isValid: false, error: 'Formato de Web URL inválido' };
  }

  return { isValid: true };
}

// -------------------------------------------------------------
// Listing Payload Validation
// -------------------------------------------------------------
export function validateListingPayload(payload: {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  schoolId?: string | null;
  schoolRequestId?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  images?: Array<string | { url: string; orderIndex?: number }>;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length < 5) {
    errors.push('El título debe tener al menos 5 caracteres');
  } else if (payload.title.trim().length > 100) {
    errors.push('El título no puede superar los 100 caracteres');
  }

  if (
    !payload.description ||
    typeof payload.description !== 'string' ||
    payload.description.trim().length < 20
  ) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  } else if (payload.description.trim().length > 2000) {
    errors.push('La descripción no puede superar los 2000 caracteres');
  }

  if (!payload.categoryId || typeof payload.categoryId !== 'string' || !payload.categoryId.trim()) {
    errors.push('La categoría es requerida');
  }
  if (!payload.subcategoryId || typeof payload.subcategoryId !== 'string' || !payload.subcategoryId.trim()) {
    errors.push('La subcategoría es requerida');
  }
  if (!payload.schoolId && !payload.schoolRequestId) {
    errors.push('Debe asociarse a un colegio existente o solicitado');
  }

  const channelVal = validateContactChannels({
    whatsapp: payload.whatsapp,
    email: payload.email,
    webUrl: payload.webUrl,
  });
  if (!channelVal.isValid) {
    errors.push(channelVal.error!);
  }

  if (payload.images && payload.images.length > 5) {
    errors.push('No se permiten más de 5 imágenes por aviso');
  }

  return { isValid: errors.length === 0, errors };
}
