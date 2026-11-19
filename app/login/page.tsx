import { signIn } from '@/auth';
import { getClient } from '@/clients';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cfg = getClient();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-3xl font-bold text-white">A</div>
      <div>
        <h1 className="h1">{cfg.appName}</h1>
        <p className="muted mt-1">{cfg.business.name}</p>
      </div>
      {error && (
        <p className="card w-full p-3 text-sm text-red-700">
          {error === 'AccessDenied' ? 'That Google account is not allowed on this app.' : 'Sign in did not work. Try again.'}
        </p>
      )}
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/' });
        }}
        className="w-full"
      >
        <button className="btn-dark w-full">Sign in with Google</button>
      </form>
      <p className="text-xs muted">Private to {cfg.business.ownerFirst}. Calendar access is used to add booked jobs.</p>
    </div>
  );
}
