'use client';
import { useMemo, useState } from 'react';

export interface PickerCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}
export interface PickerValue {
  customerId: string | null;
  newCustomer: { name: string; phone: string; email: string; address: string };
}

export const emptyPick: PickerValue = { customerId: null, newCustomer: { name: '', phone: '', email: '', address: '' } };

export default function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: PickerCustomer[];
  value: PickerValue;
  onChange: (v: PickerValue) => void;
}) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>(customers.length ? 'existing' : 'new');
  const matches = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return customers.slice(0, 6);
    return customers.filter((c) => `${c.name} ${c.phone} ${c.email} ${c.address}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q, customers]);
  const picked = customers.find((c) => c.id === value.customerId);

  if (picked)
    return (
      <div className="card flex items-center justify-between p-3">
        <div>
          <p className="font-semibold">{picked.name}</p>
          <p className="text-sm muted">{[picked.phone, picked.address].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => onChange(emptyPick)}>Change</button>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200 p-1 text-sm font-semibold">
        {(['existing', 'new'] as const).map((m) => (
          <button key={m} className={`rounded-lg py-2 ${mode === m ? 'bg-white shadow' : ''}`} onClick={() => setMode(m)}>
            {m === 'existing' ? 'Existing customer' : 'New customer'}
          </button>
        ))}
      </div>
      {mode === 'existing' ? (
        <>
          <input className="input" placeholder="Search name, phone, street" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="card divide-y">
            {matches.length === 0 && <p className="p-3 text-sm muted">No match. Switch to New customer.</p>}
            {matches.map((c) => (
              <button key={c.id} className="block w-full p-3 text-left" onClick={() => onChange({ ...value, customerId: c.id })}>
                <span className="font-semibold">{c.name}</span>
                <span className="block text-sm muted">{[c.phone, c.address].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          {(['name', 'phone', 'email', 'address'] as const).map((f) => (
            <input
              key={f}
              className="input"
              placeholder={f === 'name' ? 'Name' : f === 'phone' ? 'Cell phone' : f === 'email' ? 'Email' : 'Address'}
              type={f === 'phone' ? 'tel' : f === 'email' ? 'email' : 'text'}
              value={value.newCustomer[f]}
              onChange={(e) => onChange({ customerId: null, newCustomer: { ...value.newCustomer, [f]: e.target.value } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
