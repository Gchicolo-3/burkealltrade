import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-safe auth config (used by middleware). No database imports here.
export const allowedEmails = () =>
  (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export default {
  trustHost: true,
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 90 },
  providers: [
    Google({
      authorization: {
        params: {
          // calendar.events lets the app add booked jobs to his Google Calendar
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    // Only the owner's Google account(s) get in. Everyone else is bounced at sign in.
    signIn({ profile }) {
      const email = (profile?.email || '').toLowerCase();
      const allow = allowedEmails();
      return allow.length > 0 && allow.includes(email) && profile?.email_verified !== false;
    },
    authorized({ auth }) {
      const email = (auth?.user?.email || '').toLowerCase();
      return !!email && allowedEmails().includes(email);
    },
  },
} satisfies NextAuthConfig;
