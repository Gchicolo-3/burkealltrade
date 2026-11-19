import { auth, signOut } from '@/auth';
import { getClient } from '@/clients';
import { getOverrides } from '@/lib/config';
import { db, dbConfigured } from '@/lib/db';
import { aiConfigured } from '@/lib/ai';
import SettingsForm from '@/components/SettingsForm';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  const base = getClient();
  const hasDb = dbConfigured();
  const o = hasDb ? await getOverrides() : {};
  let calendar = false;
  if (hasDb) {
    const s = await db();
    const [r] = await s`select google_refresh_token is not null as ok from settings where id = 1`;
    calendar = !!r?.ok;
  }
  return (
    <div className="space-y-4 pt-2">
      <h1 className="h1">Settings</h1>
      <SetupNotice db={hasDb} ai={aiConfigured()} />
      <div className="card p-4 text-sm">
        <p>Signed in as <span className="font-semibold">{session?.user?.email}</span></p>
        <p className="mt-1">Google Calendar: {calendar ? <span className="text-emerald-700">connected</span> : <span className="text-amber-700">not connected, sign out and back in to connect</span>}</p>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
          <button className="btn-ghost btn-sm mt-3">Sign out</button>
        </form>
      </div>
      {hasDb && (
        <SettingsForm
          initial={{
            hourlyRate: o.hourlyRate ?? base.pricing.hourlyRate,
            minimumCharge: o.minimumCharge ?? base.pricing.minimumCharge,
            reviewUrl: o.reviewUrl ?? base.business.reviewUrl,
            extraVoiceExamples: o.extraVoiceExamples || [],
          }}
          builtInExamples={base.voice.examples}
        />
      )}
    </div>
  );
}
