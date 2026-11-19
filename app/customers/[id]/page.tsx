import { notFound } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import CustomerForm from '@/components/CustomerForm';
import { money } from '@/lib/pricing';
import { fmtDate, smsHref } from '@/lib/text';
import type { Customer, Job, Touch } from '@/lib/types';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = { quoted: 'Quoted', scheduled: 'Booked', done: 'Unpaid', paid: 'Paid', lost: 'Lost' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cfg = await getConfig();
  const s = await db();
  const [c] = await s<Customer[]>`select * from customers where id = ${id}`;
  if (!c) notFound();
  const [jobs, touches] = await Promise.all([
    s<Job[]>`select * from jobs where customer_id = ${id} order by created_at desc`,
    s<Touch[]>`select * from touches where customer_id = ${id} order by created_at desc limit 30`,
  ]);
  const tz = cfg.schedule.timezone;
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="h1">{c.name}</h1>
        {c.do_not_contact && <span className="chip mt-1 bg-red-100 text-red-800">Do not contact</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {c.phone && <a className="btn-primary btn-sm" href={smsHref(c.phone, '')}>Text</a>}
        {c.phone && <a className="btn-ghost btn-sm" href={`tel:${c.phone}`}>Call</a>}
        <a className="btn-ghost btn-sm" href={`/quote?customer=${c.id}`}>Quote</a>
      </div>

      <section className="space-y-2">
        <h2 className="label">Jobs</h2>
        {jobs.length === 0 && <p className="text-sm muted">No jobs yet.</p>}
        {jobs.map((j) => (
          <div key={j.id} className="card flex justify-between p-3 text-sm">
            <span>
              <span className="font-semibold">{j.title}</span>
              <span className="block muted">{statusLabel[j.status]}{j.scheduled_start ? ` · ${fmtDate(j.scheduled_start, tz, { month: 'short', day: 'numeric' })}` : ''}{j.payment_method ? ` · ${j.payment_method}` : ''}</span>
            </span>
            <span className="font-bold">{money(Number(j.amount_due ?? j.total) || 0)}</span>
          </div>
        ))}
      </section>

      {touches.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Touches</h2>
          <div className="card divide-y text-sm">
            {touches.map((t) => (
              <div key={t.id} className="p-3">
                <p className="text-xs muted">{fmtDate(t.created_at, tz)} · {t.bucket || t.channel}</p>
                {t.body && <p className="mt-0.5">{t.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="label">Details</h2>
        <CustomerForm customer={c} />
      </section>
    </div>
  );
}
