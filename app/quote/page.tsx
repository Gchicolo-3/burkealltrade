import { getConfig } from '@/lib/config';
import { db, dbConfigured } from '@/lib/db';
import { aiConfigured } from '@/lib/ai';
import QuoteBuilder from '@/components/QuoteBuilder';
import SetupNotice from '@/components/SetupNotice';
import type { Job } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ job?: string; customer?: string }> }) {
  const sp = await searchParams;
  const cfg = await getConfig();
  if (!dbConfigured()) return <SetupNotice db={false} ai={aiConfigured()} />;
  const s = await db();
  const customers = await s`select id, name, phone, email, address from customers order by name`;
  let job: Job | null = null;
  if (sp.job) [job] = await s<Job[]>`select * from jobs where id = ${sp.job}`;
  return (
    <div className="space-y-4 pt-2">
      <SetupNotice db ai={aiConfigured()} />
      <h1 className="h1">Quick quote</h1>
      <QuoteBuilder
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address }))}
        pricing={cfg.pricing}
        aiEnabled={aiConfigured()}
        initialCustomerId={job?.customer_id || sp.customer || null}
        existing={job ? { id: job.id, title: job.title, notes: job.notes || '', items: job.line_items } : null}
      />
    </div>
  );
}
