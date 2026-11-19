import { db, dbConfigured } from '@/lib/db';
import { aiConfigured } from '@/lib/ai';
import SetupNotice from '@/components/SetupNotice';
import CustomerList from '@/components/CustomerList';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  if (!dbConfigured()) return <SetupNotice db={false} ai={aiConfigured()} />;
  const s = await db();
  const rows = await s`
    select c.id, c.name, c.phone, c.address, c.past_customer,
      (select count(*)::int from jobs j where j.customer_id = c.id and j.status = 'paid') as paid_jobs
    from customers c order by c.name`;
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="h1">People</h1>
        <div className="flex gap-2">
          <a className="btn-ghost btn-sm" href="/customers/import">Import</a>
          <a className="btn-primary btn-sm" href="/customers/new">+ Add</a>
        </div>
      </div>
      <CustomerList rows={rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, address: r.address, past: r.past_customer, paid: r.paid_jobs }))} />
    </div>
  );
}
