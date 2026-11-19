import NextAuth from 'next-auth';
import authConfig from './auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect everything except auth endpoints, the login page, and static assets.
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
