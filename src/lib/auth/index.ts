import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Sign-in: stamp the JWT with the user's current tokenVersion.
      if (user) {
        token.id = user.id;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        return token;
      }

      // Every later request: re-check that the version this JWT was issued with
      // is still current. A password reset increments tokenVersion, which makes
      // every previously issued JWT fail this check. Returning null makes
      // Auth.js clean the session cookie, so the user is signed out.
      if (typeof token.id === 'string') {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { tokenVersion: true },
        });

        // Unknown user (deleted account) or a stale version: invalidate.
        if (!current || current.tokenVersion !== (token.tokenVersion ?? 0)) {
          return null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.tokenVersion = (token.tokenVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tokenVersion: number;
    };
  }

  interface User {
    id: string;
    // Optional: the Prisma adapter's User doesn't carry it, but the credentials
    // provider returns it so the JWT can record the version it was issued with.
    tokenVersion?: number;
  }
}

declare module 'next-auth' {
  interface JWT {
    id: string;
    tokenVersion: number;
  }
}