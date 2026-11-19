'use client';
import { useState, useTransition } from 'react';
import { markDone, markLost, markPaid } from '@/app/actions';
import { money } from '@/lib/pricing';
import { daysBetween, fmtDate } from '@/lib/text';
import type { JobStatus } from '@/lib/types';

export interface BoardJob {
  id: string;
  title: string;
  status: JobStatus;
  total: number;
  amount_due: number | null;
  quote_sent_at: string | null;
  created_at: string;
  scheduled_start: string | null;
  completed_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  customer_id: string;
  name: string;
  phone: string | null;
}

const tabs: { id: string; label: string; status: JobStatus }[] = [
  { id: 'quoted', label: 'Quoted', status: 'quoted' },
  { id: 'scheduled', label: 'Booked', status: 'scheduled' },
  { id: 'unpaid', label: 'Unpaid', status: 'done' },
  { id: 'paid', label: 'Paid', status: 'paid' },
];

export default function JobsBoard({ jobs, methods, timezone, initialTab }: { jobs: BoardJob[]; methods: string[]; timezone: string; initialTab: string }) {
  const [tab, setTab] = useState(tabs.find((t) => t.id === initialTab)?.id || 'unpaid');
  const current = tabs.find((t) => t.id === tab)!;
  const list = jobs.filter((j) => j.status === current.status);
  const sum = list.reduce((s, j) => s + Number(j.status === 'done' || j.status === 'paid' ? j.amount_due ?? j.total : j.total), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-200 p-1 text-sm font-semibold">
        {tabs.map((t) => (
          <button key={t.id} className={`rounded-lg py-2 ${tab === t.id ? 'bg-white shadow' : ''}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="muted">{jobs.filter((j) => j.status === t.status).length}</span>
          </button>
        ))}
      </div>
      {list.length > 0 && <p className="text-sm muted">{list.length} jobs · {money(sum)}</p>}
      {list.length === 0 && <div className="card p-6 text-center muted">Nothing here.</div>}
      {list.map((j) => <JobCard key={j.id} job={j} methods={methods} timezone={timezone} />)}
    </div>
  );
}

function JobCard({ job, methods, timezone }: { job: BoardJob; methods: string[]; timezone: string }) {
  const [mode, setMode] = useState<null | 'done' | 'paid'>(null);
  const [amount, setAmount] = useState(String(job.amount_due ?? job.total ?? ''));
  const [method, setMethod] = useState(methods[0]);
  const [pending, start] = useTransition();

  const sub =
    job.status === 'quoted'
      ? `Quoted ${daysBetween(job.quote_sent_at || job.created_at)} days ago`
      : job.status === 'scheduled' && job.scheduled_start
        ? fmtDate(job.scheduled_start, timezone)
        : job.status === 'done' && job.completed_at
          ? `Done ${daysBetween(job.completed_at)} days ago`
          : job.paid_at
            ? `Paid ${fmtDate(job.paid_at, timezone, { month: 'short', day: 'numeric' })} · ${job.payment_method}`
            : '';

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <a href={`/customers/${job.customer_id}`} className="font-bold">{job.name}</a>
          <p className="text-sm">{job.title}</p>
          <p className="text-xs muted">{sub}</p>
        </div>
        <p className="text-lg font-bold">{money(Number(job.amount_due ?? job.total) || 0)}</p>
      </div>

      {mode === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.status === 'quoted' && (
            <>
              <a className="btn-primary btn-sm" href={`/schedule?job=${job.id}`}>Book it</a>
              <a className="btn-ghost btn-sm" href={`/quote?job=${job.id}`}>Edit quote</a>
              <button className="btn-ghost btn-sm" disabled={pending} onClick={() => start(() => markLost(job.id))}>Lost</button>
            </>
          )}
          {job.status === 'scheduled' && (
            <>
              <button className="btn-primary btn-sm" onClick={() => setMode('done')}>Job done</button>
              <button className="btn-ghost btn-sm" onClick={() => setMode('paid')}>Paid on the spot</button>
            </>
          )}
          {job.status === 'done' && <button className="btn-primary btn-sm" onClick={() => setMode('paid')}>Mark paid</button>}
        </div>
      )}

      {mode && (
        <div className="mt-3 space-y-2">
          <label className="label">{mode === 'done' ? 'Amount due' : 'Amount paid'}</label>
          <input className="input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {mode === 'paid' && (
            <div className="grid grid-cols-4 gap-1">
              {methods.map((m) => (
                <button key={m} className={`btn btn-sm ${method === m ? 'bg-stone-900 text-white' : 'bg-stone-100'}`} onClick={() => setMethod(m)}>{m}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-primary"
              disabled={pending || !amount}
              onClick={() => start(async () => {
                if (mode === 'done') await markDone(job.id, Number(amount));
                else await markPaid(job.id, method, Number(amount));
                setMode(null);
              })}
            >
              {pending ? 'Saving...' : 'Save'}
            </button>
            <button className="btn-ghost" onClick={() => setMode(null)}>Cancel</button>
          </div>
          {mode === 'paid' && <p className="text-xs muted">A thank-you and review ask shows up on Today in 3 days.</p>}
          {mode === 'done' && <p className="text-xs muted">If it is still unpaid in 2 days, a polite nudge shows up on Today.</p>}
        </div>
      )}
    </div>
  );
}
