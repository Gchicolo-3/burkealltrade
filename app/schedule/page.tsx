import { getConfig } from '@/lib/config';
import { db, dbConfigured } from '@/lib/db';
import { aiConfigured } from '@/lib/ai';
import ScheduleForm from '@/components/ScheduleForm';
import SetupNotice from '@/components/SetupNotice';
import { fmtDate } from '@/lib/text';

export const dynamic = 'force-dynamic';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ job?: string; customer?: string }> }) {
  const sp = await searchParams;
  const cfg = await getConfig();
  if (!dbConfigured()) return <SetupNotice db={false} ai={aiConfigured()} />;
  const s = await db();
  const [customers, openQuotes, upcoming] = await Promise.all([
    s`select id, name, phone, email, address from customers order by name`,
    s`select j.id, j.title, j.total::float8 as total, j.customer_id, c.name from jobs j join customers c on c.id = j.customer_id
      where j.status = 'quoted' order by j.created_at desc`,
    s`select j.id, j.title, j.scheduled_start, c.name from jobs j join customers c on c.id = j.customer_id
      where j.status = 'scheduled' and j.scheduled_start >= now() - interval '12 hours' order by j.scheduled_start limit 10`,
  ]);
  return (
    <div className="space-y-4 pt-2">
      <h1 className="h1">Quick schedule</h1>
      <ScheduleForm
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address }))}
        quotes={openQuotes.map((q) => ({ id: q.id, title: q.title, total: q.total, customerId: q.customer_id, name: q.name }))}
        defaultDuration={cfg.schedule.defaultDurationMin}
        initialJobId={sp.job || null}
        initialCustomerId={sp.customer || null}
      />
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Coming up</h2>
          <div className="card divide-y">
            {upcoming.map((u) => (
              <div key={u.id} className="flex justify-between gap-2 p-3 text-sm">
                <span><span className="font-semibold">{u.name}</span> · {u.title}</span>
                <span className="shrink-0 muted">{fmtDate(u.scheduled_start, cfg.schedule.timezone)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
