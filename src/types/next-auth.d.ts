import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      dni?: string | null;
      schoolOfOriginId?: string | null;
      isOnboarded: boolean;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    dni?: string | null;
    schoolOfOriginId?: string | null;
    isOnboarded?: boolean;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
    image?: string | null;
    dni?: string | null;
    schoolOfOriginId?: string | null;
    isOnboarded?: boolean;
    role?: string;
  }
}
