import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getClient } from '@/clients';
import { auth } from '@/auth';
import Nav from '@/components/Nav';

const cfg = getClient();

export const metadata: Metadata = {
  title: cfg.appName,
  description: `${cfg.business.name} follow-ups, quotes, and scheduling`,
  appleWebApp: { capable: true, title: 'AllTrade', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#c2410c',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = !!session?.user;
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-xl pb-28">
          {signedIn && (
            <header className="sticky top-0 z-20 flex items-center justify-between bg-stone-100/90 px-4 py-3 backdrop-blur">
              <a href="/" className="flex items-center gap-2 font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">A</span>
                <span>{cfg.appName}</span>
              </a>
              <a href="/settings" className="btn-ghost btn-sm" aria-label="Settings">Settings</a>
            </header>
          )}
          <main className="px-4">{children}</main>
        </div>
        {signedIn && <Nav />}
      </body>
    </html>
  );
}
