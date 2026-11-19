import { getConfig } from '@/lib/config';
import { db, dbConfigured } from '@/lib/db';
import { aiConfigured } from '@/lib/ai';
import JobsBoard, { type BoardJob } from '@/components/JobsBoard';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const cfg = await getConfig();
  if (!dbConfigured()) return <SetupNotice db={false} ai={aiConfigured()} />;
  const s = await db();
  const rows = await s`
    select j.id, j.title, j.status, j.total::float8 as total, j.amount_due::float8 as amount_due, j.quote_sent_at, j.created_at,
           j.scheduled_start, j.completed_at, j.paid_at, j.payment_method, c.id as customer_id, c.name, c.phone
    from jobs j join customers c on c.id = j.customer_id
    where j.status <> 'lost' and (j.status <> 'paid' or j.paid_at > now() - interval '120 days')
    order by coalesce(j.scheduled_start, j.created_at) desc`;
  return (
    <div className="space-y-4 pt-2">
      <h1 className="h1">Jobs</h1>
      <JobsBoard
        jobs={rows as unknown as BoardJob[]}
        methods={cfg.paymentMethods}
        timezone={cfg.schedule.timezone}
        initialTab={tab || 'unpaid'}
      />
    </div>
  );
}
