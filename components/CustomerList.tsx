'use client';
import { useMemo, useState } from 'react';

interface Row { id: string; name: string; phone: string | null; address: string | null; past: boolean; paid: number }

export default function CustomerList({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.toLowerCase().trim();
    return t ? rows.filter((r) => `${r.name} ${r.phone} ${r.address}`.toLowerCase().includes(t)) : rows;
  }, [q, rows]);
  if (!rows.length)
    return (
      <div className="card p-6 text-center">
        <p className="font-semibold">No customers yet</p>
        <p className="muted mt-1 text-sm">Bring in your past customers from a spreadsheet or your phone.</p>
        <a className="btn-primary mt-4 w-full" href="/customers/import">Import customers</a>
      </div>
    );
  return (
    <div className="space-y-2">
      <input className="input" placeholder={`Search ${rows.length} people`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card divide-y">
        {list.map((r) => (
          <a key={r.id} href={`/customers/${r.id}`} className="flex items-center justify-between p-3">
            <span>
              <span className="font-semibold">{r.name}</span>
              <span className="block text-sm muted">{[r.phone, r.address].filter(Boolean).join(' · ')}</span>
            </span>
            {(r.paid > 0 || r.past) && <span className="chip bg-emerald-100 text-emerald-800">{r.paid > 0 ? `${r.paid} jobs` : 'Past'}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
