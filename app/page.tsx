import { getConfig } from '@/lib/config';
import { db, dbConfigured } from '@/lib/db';
import { loadFollowUps } from '@/lib/followups';
import { aiConfigured } from '@/lib/ai';
import FollowUpList from '@/components/FollowUpList';
import SetupNotice from '@/components/SetupNotice';
import { money } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function Today() {
  const cfg = await getConfig();
  const hasDb = dbConfigured();
  const hasAi = aiConfigured();
  if (!hasDb) return <SetupNotice db={false} ai={hasAi} />;

  const s = await db();
  const [items, [stats]] = await Promise.all([
    loadFollowUps(cfg),
    s`select
        (select count(*)::int from jobs where status in ('scheduled','done','paid')
           and scheduled_start >= date_trunc('week', now()) and scheduled_start < date_trunc('week', now()) + interval '7 days') as week_jobs,
        (select coalesce(sum(coalesce(amount_due, total)),0)::float8 from jobs where status = 'done') as unpaid,
        (select count(*)::int from touches where created_at >= date_trunc('day', now() at time zone ${cfg.schedule.timezone}) at time zone ${cfg.schedule.timezone}) as touched_today,
        (select count(*)::int from customers) as customers`,
  ]);

  const today = new Date().toLocaleDateString('en-US', { timeZone: cfg.schedule.timezone, weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-4 pt-2">
      <SetupNotice db={hasDb} ai={hasAi} />
      <div>
        <p className="text-sm muted">{today}</p>
        <h1 className="h1">Who to follow up with today</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Jobs this week" value={`${stats.week_jobs}/10`} />
        <Stat label="Unpaid" value={money(Number(stats.unpaid))} />
        <Stat label="Texts today" value={String(stats.touched_today)} />
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-center">
          {stats.customers === 0 ? (
            <>
              <p className="font-semibold">No customers yet.</p>
              <p className="muted mt-1 text-sm">Import past customers and this list starts filling with check-ins.</p>
              <a href="/customers/import" className="btn-primary mt-4 w-full">Import customers</a>
            </>
          ) : (
            <>
              <p className="font-semibold">You are all caught up.</p>
              <p className="muted mt-1 text-sm">Nobody is due today. Good day to send a quote.</p>
              <a href="/quote" className="btn-primary mt-4 w-full">Quick quote</a>
            </>
          )}
        </div>
      ) : (
        <FollowUpList initial={items} aiEnabled={hasAi} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-2 py-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</div>
    </div>
  );
}
