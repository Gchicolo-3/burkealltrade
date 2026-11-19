'use client';
import { useEffect, useState } from 'react';
import { importCustomers } from '@/app/actions';
import { mapCsv, parseCsv, parseVcf, type ImportRow } from '@/lib/importParse';

type Row = ImportRow & { keep: boolean; past: boolean };

type ContactsApi = {
  select(props: string[], opts: { multiple: boolean }): Promise<{ name?: string[]; tel?: string[]; email?: string[]; address?: { addressLine?: string[]; city?: string }[] }[]>;
};

export default function Importer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pickerOk, setPickerOk] = useState(false);

  useEffect(() => {
    setPickerOk('contacts' in navigator && 'ContactsManager' in window);
  }, []);

  const load = (list: ImportRow[], past: boolean) => {
    setDone(null);
    setErr(list.length ? null : 'Did not find any contacts in that file.');
    setRows(list.map((r) => ({ ...r, keep: true, past })));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (/\.vcf$/i.test(file.name) || text.includes('BEGIN:VCARD')) load(parseVcf(text), true);
    else load(mapCsv(parseCsv(text)), true);
  };

  const pickContacts = async () => {
    try {
      const api = (navigator as unknown as { contacts: ContactsApi }).contacts;
      const picked = await api.select(['name', 'tel', 'email', 'address'], { multiple: true });
      load(
        picked.map((p) => ({
          name: p.name?.[0] || '',
          phone: p.tel?.[0] || '',
          email: p.email?.[0] || '',
          address: [p.address?.[0]?.addressLine?.join(' '), p.address?.[0]?.city].filter(Boolean).join(', '),
          notes: '',
          last_service_at: '',
          last_service_note: '',
        })),
        true,
      );
    } catch {
      setErr('Could not open contacts.');
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await importCustomers(
        rows.filter((r) => r.keep).map((r) => ({ ...r, past_customer: r.past, source: 'import' })),
      );
      setDone(r);
      setRows([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const kept = rows.filter((r) => r.keep).length;
  const setAll = (patch: Partial<Row>) => setRows((c) => c.map((r) => ({ ...r, ...patch })));

  return (
    <div className="space-y-4">
      {done && (
        <div className="card border-emerald-300 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">Imported {done.added}. Skipped {done.skipped} duplicates or blanks.</p>
          <p className="mt-1 text-sm text-emerald-900">Past customers start showing up on Today as check-ins, a few a day.</p>
          <a className="btn-primary mt-3 w-full" href="/">Go to Today</a>
        </div>
      )}

      {rows.length === 0 && (
        <div className="space-y-3">
          <label className="card block cursor-pointer p-4">
            <p className="font-semibold">Spreadsheet (CSV)</p>
            <p className="text-sm muted">Export from Google Sheets, Excel, QuickBooks, or Google Contacts. Name and phone columns are found automatically. Optional columns: last job, last job date.</p>
            <input type="file" accept=".csv,text/csv" className="mt-3 block text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <label className="card block cursor-pointer p-4">
            <p className="font-semibold">Contact cards (.vcf)</p>
            <p className="text-sm muted">iPhone: Contacts app, select contacts, Share, save to Files, then pick the file here.</p>
            <input type="file" accept=".vcf,text/vcard,text/x-vcard" className="mt-3 block text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {pickerOk && (
            <button className="btn-dark w-full" onClick={pickContacts}>Pick from phone contacts</button>
          )}
        </div>
      )}

      {err && <p className="text-sm text-red-700">{err}</p>}

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{kept} of {rows.length} selected</span>
            <span className="flex gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setAll({ keep: true })}>All</button>
              <button className="btn-ghost btn-sm" onClick={() => setAll({ keep: false })}>None</button>
            </span>
          </div>
          <p className="text-xs muted">Uncheck friends and family. &quot;Past customer&quot; means they get check-in texts.</p>
          <div className="card max-h-[55vh] divide-y overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <input type="checkbox" className="h-5 w-5" checked={r.keep} onChange={(e) => setRows((c) => c.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-xs muted">{[r.phone || 'no phone', r.email, r.last_service_note].filter(Boolean).join(' · ')}</p>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={r.past} onChange={(e) => setRows((c) => c.map((x, j) => (j === i ? { ...x, past: e.target.checked } : x)))} />
                  Past
                </label>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary" disabled={busy || !kept} onClick={submit}>{busy ? 'Importing...' : `Import ${kept}`}</button>
            <button className="btn-ghost" onClick={() => setRows([])}>Start over</button>
          </div>
        </div>
      )}
    </div>
  );
}
