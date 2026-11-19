'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCustomer, saveCustomer, setDoNotContact } from '@/app/actions';
import type { Customer } from '@/lib/types';

export default function CustomerForm({ customer }: { customer: Customer | null }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    source: customer?.source || '',
    past_customer: customer?.past_customer || false,
    last_service_at: customer?.last_service_at?.slice(0, 10) || '',
    last_service_note: customer?.last_service_note || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const id = await saveCustomer({ ...f, id: customer?.id, last_service_at: f.last_service_at ? new Date(f.last_service_at + 'T12:00:00').toISOString() : null });
      if (!customer) router.push(`/customers/${id}`);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input className="input" placeholder="Name" value={f.name} onChange={(e) => set('name', e.target.value)} />
      <input className="input" placeholder="Cell phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
      <input className="input" placeholder="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
      <input className="input" placeholder="Address" value={f.address} onChange={(e) => set('address', e.target.value)} />
      <input className="input" placeholder="Referred by / how they found you" value={f.source} onChange={(e) => set('source', e.target.value)} />
      <textarea className="input" rows={3} placeholder="Notes (dogs, gate code, prefers mornings)" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      <label className="flex items-center gap-2 py-1 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={f.past_customer} onChange={(e) => set('past_customer', e.target.checked)} />
        Past customer (gets check-ins every 60 to 90 days)
      </label>
      {f.past_customer && (
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" value={f.last_service_at} onChange={(e) => set('last_service_at', e.target.value)} />
          <input className="input" placeholder="Last job" value={f.last_service_note} onChange={(e) => set('last_service_note', e.target.value)} />
        </div>
      )}
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="btn-primary w-full" disabled={busy || !f.name.trim()} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
      {customer && (
        <div className="flex gap-2 pt-2">
          <button className="btn-ghost btn-sm" onClick={async () => { await setDoNotContact(customer.id, !customer.do_not_contact); router.refresh(); }}>
            {customer.do_not_contact ? 'Allow follow-ups' : 'Do not contact'}
          </button>
          <button
            className="btn-ghost btn-sm text-red-700"
            onClick={async () => {
              if (!confirm(`Delete ${customer.name} and all their jobs?`)) return;
              await deleteCustomer(customer.id);
              router.push('/customers');
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
