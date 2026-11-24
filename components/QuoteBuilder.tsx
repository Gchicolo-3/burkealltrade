'use client';
import { useMemo, useState } from 'react';
import CustomerPicker, { emptyPick, type PickerCustomer, type PickerValue } from './CustomerPicker';
import VoiceInput from './VoiceInput';
import { aiQuote, markQuoteSent, saveQuote } from '@/app/actions';
import { money, priceQuote, minimumHeadroomHours, type PricingInput } from '@/lib/pricing';
import { mailtoHref, smsHref } from '@/lib/text';
import type { LineItem } from '@/lib/types';

type Img = { mediaType: string; data: string; preview: string };

async function compress(file: File): Promise<Img> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const dataUrl = c.toDataURL('image/jpeg', 0.8);
  return { mediaType: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl };
}

export default function QuoteBuilder({
  customers,
  pricing,
  aiEnabled,
  initialCustomerId,
  existing,
}: {
  customers: PickerCustomer[];
  pricing: PricingInput & { bundleSuggestions: string[] };
  aiEnabled: boolean;
  initialCustomerId: string | null;
  existing: { id: string; title: string; notes: string; items: LineItem[] } | null;
}) {
  const [pick, setPick] = useState<PickerValue>({ ...emptyPick, customerId: initialCustomerId });
  const [images, setImages] = useState<Img[]>([]);
  const [note, setNote] = useState('');
  const [title, setTitle] = useState(existing?.title || '');
  const [summary, setSummary] = useState(existing?.notes || '');
  const [items, setItems] = useState<LineItem[]>(existing?.items || []);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [bundleIdeas, setBundleIdeas] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof saveQuote>> | null>(null);
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');

  const q = useMemo(() => priceQuote(items, pricing), [items, pricing]);
  const headroom = minimumHeadroomHours(q, pricing);
  const suggestions = useMemo(
    () => Array.from(new Set([...bundleIdeas, ...pricing.bundleSuggestions])).filter((s) => !items.some((i) => i.description === s)).slice(0, 6),
    [bundleIdeas, pricing.bundleSuggestions, items],
  );
  const customerName = customers.find((c) => c.id === pick.customerId)?.name || pick.newCustomer.name;
  const editing = items.length > 0 || !!existing;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all(Array.from(files).slice(0, 4 - images.length).map(compress));
    setImages((cur) => [...cur, ...next].slice(0, 4));
  };

  const build = async () => {
    setErr(null);
    setBusy('ai');
    try {
      const d = await aiQuote({ note, images: images.map(({ mediaType, data }) => ({ mediaType, data })), customerName });
      setTitle(d.title);
      setSummary(d.scopeSummary);
      setItems(d.items);
      setAssumptions(d.assumptions);
      setQuestions(d.questions);
      setBundleIdeas(d.bundleIdeas);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not build the quote');
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setErr(null);
    setBusy('save');
    try {
      const r = await saveQuote({
        jobId: existing?.id,
        customerId: pick.customerId,
        newCustomer: pick.customerId ? undefined : pick.newCustomer,
        title: title || 'Handyman work',
        summary,
        items,
        assumptions,
      });
      setResult(r);
      setEmailBody(r.email.body);
      setSmsBody(r.sms);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  const setItem = (i: number, patch: Partial<LineItem>) => setItems((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  if (result)
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <p className="text-sm muted">Saved quote for {result.customer.name}</p>
          <p className="text-3xl font-bold">{money(result.total)}</p>
        </div>
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">Email version</h2>
          <p className="text-sm muted">Subject: {result.email.subject}</p>
          <textarea className="input text-sm" rows={12} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <a
              className="btn-primary"
              href={mailtoHref(result.customer.email, result.email.subject, emailBody)}
              onClick={() => markQuoteSent(result.jobId, 'email', emailBody)}
            >
              Open email draft
            </a>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(emailBody)}>Copy</button>
          </div>
          {!result.customer.email && <p className="text-xs text-amber-700">No email on file. Add one in People or paste it in.</p>}
        </section>
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">Text version</h2>
          <textarea className="input text-sm" rows={5} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <a className="btn-primary" href={smsHref(result.customer.phone, smsBody)} onClick={() => markQuoteSent(result.jobId, 'text', smsBody)}>
              Text it
            </a>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(smsBody)}>Copy</button>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-dark" href={`/schedule?job=${result.jobId}`}>They said yes, book it</a>
          <a className="btn-ghost" href="/quote">New quote</a>
        </div>
        <p className="text-xs muted">If they do not answer in 3 days it shows up on Today with a check-in text.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="label">Customer</h2>
        <CustomerPicker customers={customers} value={pick} onChange={setPick} />
      </section>

      {!editing && (
        <>
          <section className="space-y-2">
            <h2 className="label">Photos (up to 4)</h2>
            <div className="flex flex-wrap gap-2">
              {images.map((im, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.preview} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-stone-900 text-xs text-white" onClick={() => setImages((c) => c.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              {images.length < 4 && (
                <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-stone-300 text-center text-xs font-semibold text-stone-500">
                  📷<br />Add photo
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="label">What needs doing</h2>
            <VoiceInput value={note} onChange={setNote} placeholder="Talk or type it out. Ex: kitchen faucet drips, replace with the one she bought, also 2 outlets not working in the den" />
          </section>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="grid gap-2">
            <button className="btn-primary" disabled={!aiEnabled || busy === 'ai' || (!note.trim() && !images.length)} onClick={build}>
              {busy === 'ai' ? 'Building quote...' : 'Build quote'}
            </button>
            <button className="btn-ghost" onClick={() => setItems([{ description: note.trim() || '', hours: 1, materials: 0 }])}>
              Skip AI, enter line items myself
            </button>
          </div>
        </>
      )}

      {editing && (
        <>
          <section className="space-y-2">
            <label className="label">Job title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bathroom faucet replacement" />
            <label className="label">Scope for the customer</label>
            <textarea className="input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="label mb-0">Line items</h2>
              <span className="text-xs muted">{pricing.mode === 'hourly' && pricing.hourlyRate ? `$${pricing.hourlyRate}/hr` : 'Your price per line'} · materials +{pricing.materialsMarkupPct}%</span>
            </div>
            {q.lines.length === 0 && items.length > 0 && <p className="text-sm muted">Add a description to price it.</p>}
            {items.map((it, i) => (
              <div key={i} className="card space-y-2 p-3">
                <div className="flex gap-2">
                  <input className="input" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="What" />
                  <button className="btn-ghost btn-sm" aria-label="Remove" onClick={() => setItems((c) => c.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className={`grid ${pricing.mode === 'hourly' ? 'grid-cols-3' : 'grid-cols-4'} items-end gap-2`}>
                  {pricing.mode !== 'hourly' && (
                    <label className="text-xs font-semibold muted">Price $
                      <input className="input mt-1" type="number" inputMode="decimal" step="5" min="0" value={it.price ?? ''} placeholder="0" onChange={(e) => setItem(i, { price: e.target.value === '' ? null : Number(e.target.value) })} />
                    </label>
                  )}
                  <label className="text-xs font-semibold muted">Hours
                    <input className="input mt-1" type="number" inputMode="decimal" step="0.25" min="0" value={it.hours} onChange={(e) => setItem(i, { hours: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs font-semibold muted">Materials $
                    <input className="input mt-1" type="number" inputMode="decimal" step="1" min="0" value={it.materials} onChange={(e) => setItem(i, { materials: Number(e.target.value) })} />
                  </label>
                  <div className="pb-3 text-right text-lg font-bold">{money(priceQuote([{ ...it, description: it.description || '-' }], { ...pricing, minimumCharge: 0, tripCharge: 0 }).total)}</div>
                </div>
              </div>
            ))}
            <button className="btn-ghost btn-sm w-full" onClick={() => setItems((c) => [...c, { description: '', hours: 0.5, materials: 0 }])}>+ Add line</button>
          </section>

          {q.underMinimum && (
            <section className="card border-amber-300 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                Under the {money(pricing.minimumCharge)} minimum by {money(q.minimumAdjustment)}
              </p>
              <p className="mt-1 text-sm text-amber-900">
                The minimum gets charged either way, so there is about {headroom} hr of free time on this visit. Offer to bundle:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} className="chip bg-white text-stone-800 ring-1 ring-amber-300" onClick={() => setItems((c) => [...c, { description: s, hours: 0.5, materials: 0 }])}>
                    + {s}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card p-4">
            <Row label="Line items" value={money(q.subtotal)} />
            {q.trip > 0 && <Row label="Trip charge" value={money(q.trip)} />}
            {q.minimumAdjustment > 0 && <Row label="Minimum service call adjustment" value={money(q.minimumAdjustment)} />}
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xl font-bold">
              <span>Total</span>
              <span>{money(q.total)}</span>
            </div>
          </section>

          {(assumptions.length > 0 || questions.length > 0) && (
            <section className="card space-y-2 p-4 text-sm">
              {questions.length > 0 && (
                <div>
                  <p className="font-semibold">Confirm before the job</p>
                  <ul className="list-disc pl-5">{questions.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
              {assumptions.length > 0 && (
                <div>
                  <p className="font-semibold">Assumptions (go on the quote)</p>
                  <ul className="list-disc pl-5">{assumptions.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </section>
          )}

          {err && <p className="text-sm text-red-700">{err}</p>}
          <button className="btn-primary w-full" disabled={busy === 'save' || q.lines.length === 0 || (!pick.customerId && !pick.newCustomer.name.trim())} onClick={save}>
            {busy === 'save' ? 'Saving...' : 'Save and write it up'}
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
