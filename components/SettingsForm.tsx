'use client';
import { useState } from 'react';
import { saveSettings } from '@/app/actions';

interface Init { hourlyRate: number; minimumCharge: number; reviewUrl: string; extraVoiceExamples: string[] }

export default function SettingsForm({ initial, builtInExamples }: { initial: Init; builtInExamples: string[] }) {
  const [f, setF] = useState(initial);
  const [example, setExample] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (next = f) => {
    setBusy(true);
    await saveSettings(next);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Pricing</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-semibold muted">Hourly rate
            <input className="input mt-1" type="number" inputMode="decimal" value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: Number(e.target.value) })} />
          </label>
          <label className="text-sm font-semibold muted">Minimum per visit
            <input className="input mt-1" type="number" inputMode="decimal" value={f.minimumCharge} onChange={(e) => setF({ ...f, minimumCharge: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-xs muted">Every quote is raised to the minimum so small jobs stay worth the drive.</p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">Google review link</h2>
        <input className="input" placeholder="https://g.page/r/..." value={f.reviewUrl} onChange={(e) => setF({ ...f, reviewUrl: e.target.value })} />
        <p className="text-xs muted">Goes into the thank-you texts 3 days after a paid job.</p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">Your voice</h2>
        <p className="text-sm muted">Paste real texts you have sent. Drafts copy how you actually write.</p>
        {[...f.extraVoiceExamples.map((e, i) => ({ e, i })), ...builtInExamples.map((e) => ({ e, i: -1 }))].map(({ e, i }) => (
          <div key={e} className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-sm">
            <p className="flex-1">{e}</p>
            {i >= 0 && (
              <button className="text-stone-400" onClick={() => setF({ ...f, extraVoiceExamples: f.extraVoiceExamples.filter((_, j) => j !== i) })}>×</button>
            )}
          </div>
        ))}
        <textarea className="input" rows={3} placeholder="Paste a text you sent a customer" value={example} onChange={(e) => setExample(e.target.value)} />
        <button
          className="btn-ghost btn-sm"
          disabled={!example.trim()}
          onClick={() => {
            setF({ ...f, extraVoiceExamples: [example.trim(), ...f.extraVoiceExamples] });
            setExample('');
          }}
        >
          + Add example
        </button>
      </section>

      <button className="btn-primary w-full" disabled={busy} onClick={() => save()}>
        {busy ? 'Saving...' : saved ? 'Saved' : 'Save settings'}
      </button>
    </div>
  );
}
