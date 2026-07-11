import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

const providers: Provider[] = [
  Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
];
if (process.env.E2E_TEST === '1') {
  providers.push(Credentials({
    id: 'test-login', name: 'Test Login',
    credentials: { email: { label: 'email' } },
    async authorize(creds) {
      const email = String(creds?.email ?? '');
      if (!email) return null;
      const user = await db.user.upsert({
        where: { email }, update: {}, create: { email, name: email.split('@')[0] },
      });
      return { id: user.id, email: user.email, name: user.name };
    },
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
    jwt({ token, user }) { if (user) token.uid = (user as { id: string }).id; return token; },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});
