'use client';
import { useEffect, useState, useTransition } from 'react';
import type { FollowUp } from '@/lib/followups';
import { generateDrafts, logTouch, redraft, snooze } from '@/app/actions';
import { smsHref } from '@/lib/text';

const bucketColor: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  stale_quote: 'bg-amber-100 text-amber-800',
  referral_thanks: 'bg-emerald-100 text-emerald-800',
  checkin: 'bg-sky-100 text-sky-800',
};

export default function FollowUpList({ initial, aiEnabled }: { initial: FollowUp[]; aiEnabled: boolean }) {
  const [items, setItems] = useState(initial);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  useEffect(() => setItems(initial), [initial]);

  // Fill in AI drafts for anything still on a template. Cached server side after the first run.
  useEffect(() => {
    const missing = initial.filter((i) => !i.aiDraft).map((i) => i.key);
    if (!aiEnabled || !missing.length) return;
    setLoadingDrafts(true);
    generateDrafts(missing)
      .then((d) => setItems((cur) => cur.map((i) => (d[i.key] ? { ...i, draft: d[i.key], aiDraft: true } : i))))
      .catch(() => {})
      .finally(() => setLoadingDrafts(false));
  }, [initial, aiEnabled]);

  return (
    <div className="space-y-3">
      {loadingDrafts && <p className="text-sm muted">Writing drafts in your voice...</p>}
      {items.map((it) => (
        <Card key={it.key} item={it} aiEnabled={aiEnabled} onGone={() => setItems((c) => c.filter((x) => x.key !== it.key))} />
      ))}
    </div>
  );
}

function Card({ item, aiEnabled, onGone }: { item: FollowUp; aiEnabled: boolean; onGone: () => void }) {
  const [text, setText] = useState(item.draft);
  const [texted, setTexted] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  useEffect(() => setText(item.draft), [item.draft]);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <a href={`/customers/${item.customer.id}`} className="text-lg font-bold">{item.customer.name}</a>
          <p className="text-sm muted">{item.customer.phone}</p>
        </div>
        <span className={`chip ${bucketColor[item.bucket] || 'bg-stone-100'}`}>{item.bucketLabel}</span>
      </div>
      <p className="mt-2 text-sm text-stone-700">{item.reason}</p>
      <textarea className="input mt-3 text-[15px]" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={smsHref(item.customer.phone, text)}
          onClick={() => setTexted(true)}
          className="btn-primary"
        >
          Text
        </a>
        <button
          className={texted ? 'btn-dark' : 'btn-ghost'}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await logTouch({ customerId: item.customer.id, jobId: item.job?.id, bucket: item.bucket, body: text });
              onGone();
            })
          }
        >
          {pending ? 'Saving...' : 'Log touch'}
        </button>
      </div>
      <div className="mt-2 flex gap-2 text-sm">
        {aiEnabled && (
          <button
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const d = await redraft(item.key).catch(() => null);
              if (d) setText(d);
              setBusy(false);
            }}
          >
            {busy ? 'Rewriting...' : 'Rewrite'}
          </button>
        )}
        <button
          className="btn-ghost btn-sm"
          onClick={() => start(async () => { await snooze(item.customer.id, 7); onGone(); })}
        >
          Skip a week
        </button>
      </div>
      {texted && <p className="mt-2 text-xs muted">Sent it? Tap Log touch so it comes off the list.</p>}
    </div>
  );
}
