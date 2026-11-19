'use client';
import { useState } from 'react';
import CustomerPicker, { emptyPick, type PickerCustomer, type PickerValue } from './CustomerPicker';
import { bookJob, logTouch } from '@/app/actions';
import { money } from '@/lib/pricing';
import { smsHref } from '@/lib/text';

interface OpenQuote { id: string; title: string; total: number; customerId: string; name: string }

const durations = [60, 90, 120, 180, 240, 360, 480];

export default function ScheduleForm({
  customers,
  quotes,
  defaultDuration,
  initialJobId,
  initialCustomerId,
}: {
  customers: PickerCustomer[];
  quotes: OpenQuote[];
  defaultDuration: number;
  initialJobId: string | null;
  initialCustomerId: string | null;
}) {
  const initialQuote = quotes.find((q) => q.id === initialJobId) || null;
  const [jobId, setJobId] = useState<string | null>(initialQuote?.id || null);
  const [pick, setPick] = useState<PickerValue>({ ...emptyPick, customerId: initialCustomerId });
  const [title, setTitle] = useState(initialQuote?.title || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(defaultDuration);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bookJob>> | null>(null);
  const [text, setText] = useState('');

  const chooseQuote = (id: string) => {
    const q = quotes.find((x) => x.id === id);
    setJobId(q?.id || null);
    if (q) setTitle(q.title);
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await bookJob({
        jobId,
        customerId: jobId ? null : pick.customerId,
        newCustomer: jobId || pick.customerId ? undefined : pick.newCustomer,
        title: title || 'Handyman visit',
        date,
        time,
        durationMin: duration,
      });
      setResult(r);
      setText(r.confirmation);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not book it');
    } finally {
      setBusy(false);
    }
  };

  if (result)
    return (
      <div className="space-y-3">
        <div className="card p-4">
          <p className="font-bold">Booked {result.customer.name}</p>
          {result.calendarSynced ? (
            <p className="mt-1 text-sm text-emerald-700">Added to your Google Calendar.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-amber-700">Calendar did not sync automatically. One tap to add it:</p>
              <a className="btn-ghost mt-2 w-full" href={result.calendarUrl} target="_blank" rel="noreferrer">Add to Google Calendar</a>
            </>
          )}
        </div>
        <div className="card space-y-2 p-4">
          <h2 className="font-bold">Confirmation text</h2>
          <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <a
            className="btn-primary w-full"
            href={smsHref(result.customer.phone, text)}
            onClick={() => logTouch({ customerId: result.customer.id, jobId: result.jobId, bucket: 'confirmation', body: text })}
          >
            Text confirmation
          </a>
        </div>
        <a className="btn-ghost w-full" href="/schedule">Book another</a>
      </div>
    );

  return (
    <div className="space-y-4">
      {quotes.length > 0 && (
        <section>
          <label className="label">From an open quote</label>
          <select className="input" value={jobId || ''} onChange={(e) => chooseQuote(e.target.value)}>
            <option value="">New job (no quote)</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>{q.name}: {q.title} ({money(q.total)})</option>
            ))}
          </select>
        </section>
      )}
      {!jobId && (
        <section className="space-y-2">
          <label className="label">Customer</label>
          <CustomerPicker customers={customers} value={pick} onChange={setPick} />
        </section>
      )}
      <section>
        <label className="label">Job</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Install 3 interior doors" />
      </section>
      <section className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Start</label>
          <input className="input" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </section>
      <section>
        <label className="label">How long</label>
        <div className="flex flex-wrap gap-2">
          {durations.map((d) => (
            <button key={d} className={`btn-sm btn ${duration === d ? 'bg-stone-900 text-white' : 'bg-stone-100'}`} onClick={() => setDuration(d)}>
              {d < 60 ? `${d}m` : `${d / 60}h`}
            </button>
          ))}
        </div>
      </section>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button
        className="btn-primary w-full"
        disabled={busy || !date || !time || (!jobId && !pick.customerId && !pick.newCustomer.name.trim())}
        onClick={submit}
      >
        {busy ? 'Booking...' : 'Book it'}
      </button>
    </div>
  );
}
