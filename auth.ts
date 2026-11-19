import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { db, dbConfigured } from './lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    // Keep the Google refresh token server side so calendar sync works from any device.
    async signIn({ account }) {
      if (account?.provider === 'google' && account.refresh_token && dbConfigured()) {
        const s = await db();
        await s`update settings set google_refresh_token = ${account.refresh_token}, updated_at = now() where id = 1`;
      }
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) throw new Error('Not signed in');
  return session.user;
}
