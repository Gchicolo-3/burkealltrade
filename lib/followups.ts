import type { BucketConfig, BucketId, ClientConfig } from '@/clients/types';
import { db } from './db';
import type { Customer, Job, Touch } from './types';
import { daysBetween, fillTemplate, firstName } from './text';

export interface FollowUp {
  key: string; // stable per (bucket, target, touch count) so drafts can be cached
  bucket: BucketId;
  bucketLabel: string;
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>;
  job: Pick<Job, 'id' | 'title' | 'total' | 'amount_due'> | null;
  reason: string;
  days: number;
  touchCount: number;
  draft: string;
  aiDraft: boolean;
  context: string; // facts handed to the AI
}

const latest = (dates: (string | null | undefined)[]) =>
  dates.filter(Boolean).sort().at(-1) as string | undefined;

export function computeFollowUps(
  cfg: ClientConfig,
  customers: Customer[],
  jobs: Job[],
  touches: Touch[],
  now = new Date(),
): FollowUp[] {
  const b = Object.fromEntries(cfg.buckets.map((x) => [x.id, x])) as Record<BucketId, BucketConfig>;
  const byCustomer = new Map(customers.map((c) => [c.id, c]));
  const touchesByJob = new Map<string, Touch[]>();
  const touchesByCustomer = new Map<string, Touch[]>();
  for (const t of touches) {
    if (t.job_id) touchesByJob.set(t.job_id, [...(touchesByJob.get(t.job_id) || []), t]);
    touchesByCustomer.set(t.customer_id, [...(touchesByCustomer.get(t.customer_id) || []), t]);
  }
  const jobsByCustomer = new Map<string, Job[]>();
  for (const j of jobs) jobsByCustomer.set(j.customer_id, [...(jobsByCustomer.get(j.customer_id) || []), j]);

  const eligible = (c: Customer | undefined) =>
    !!c && !c.do_not_contact && !!c.phone && !(c.snoozed_until && new Date(c.snoozed_until) > now);

  const out: FollowUp[] = [];
  const vars = (c: Customer, job: string, extra: Record<string, string | number> = {}) => ({
    first: firstName(c.name),
    owner: cfg.business.ownerFirst,
    business: cfg.business.name,
    reviewUrl: cfg.business.reviewUrl,
    job,
    ...extra,
  });

  const push = (bk: BucketConfig, c: Customer, job: Job | null, days: number, count: number, reason: string, context: string, v: Record<string, string | number | undefined>) => {
    out.push({
      key: `${bk.id}:${job?.id || c.id}:${count}`,
      bucket: bk.id,
      bucketLabel: bk.label,
      customer: { id: c.id, name: c.name, phone: c.phone, email: c.email },
      job: job ? { id: job.id, title: job.title, total: job.total, amount_due: job.amount_due } : null,
      reason,
      days,
      touchCount: count,
      draft: fillTemplate(bk.template, v),
      aiDraft: false,
      context,
    });
  };

  // Job based buckets
  for (const j of jobs) {
    const c = byCustomer.get(j.customer_id);
    if (!eligible(c) || !c) continue;
    const jt = touchesByJob.get(j.id) || [];
    const bucketTouches = (id: BucketId) => jt.filter((t) => t.bucket === id);

    if (j.status === 'done' && b.unpaid?.enabled && j.completed_at) {
      const bk = b.unpaid;
      const days = daysBetween(j.completed_at, now);
      const prior = bucketTouches('unpaid');
      const last = latest(prior.map((t) => t.created_at));
      const amount = Number(j.amount_due ?? j.total) || 0;
      if (
        days >= bk.afterDays &&
        prior.length < (bk.maxTouches ?? 99) &&
        (!last || daysBetween(last, now) >= (bk.repeatEveryDays ?? 7))
      ) {
        push(bk, c, j, days, prior.length,
          `Finished ${j.title} ${days} days ago. $${amount} still open${prior.length ? `, nudged ${prior.length}x` : ''}.`,
          `Job "${j.title}" finished ${days} days ago, balance $${amount} unpaid. Previous nudges: ${prior.length}.`,
          vars(c, j.title, { amount, days }));
      }
    }

    if (j.status === 'quoted' && b.stale_quote?.enabled) {
      const bk = b.stale_quote;
      const sent = j.quote_sent_at || j.created_at;
      const days = daysBetween(sent, now);
      const prior = bucketTouches('stale_quote');
      const last = latest(prior.map((t) => t.created_at));
      if (
        days >= bk.afterDays &&
        prior.length < (bk.maxTouches ?? 99) &&
        (!last || daysBetween(last, now) >= (bk.repeatEveryDays ?? 4))
      ) {
        push(bk, c, j, days, prior.length,
          `Quote for ${j.title} ($${Number(j.total)}) sent ${days} days ago, no answer yet.`,
          `Quote for "${j.title}" totaling $${Number(j.total)} sent ${days} days ago. Follow-ups so far: ${prior.length}.`,
          vars(c, j.title, { amount: Number(j.total), days }));
      }
    }

    if (j.status === 'paid' && b.referral_thanks?.enabled && j.paid_at) {
      const bk = b.referral_thanks;
      const days = daysBetween(j.paid_at, now);
      const prior = bucketTouches('referral_thanks');
      if (days >= bk.afterDays && days <= (bk.windowDays ?? 30) && prior.length < (bk.maxTouches ?? 1)) {
        push(bk, c, j, days, prior.length,
          `Paid for ${j.title} ${days} days ago. Time for a thank-you and a review or referral ask.`,
          `Paid for "${j.title}" ${days} days ago. Thank them and softly ask for a Google review or a referral.${cfg.business.reviewUrl ? ` Review link: ${cfg.business.reviewUrl}` : ' No review link yet, ask for a referral.'}`,
          vars(c, j.title, { days }));
      }
    }
  }

  // Customer based: past customer check-in
  const ci = b.checkin;
  if (ci?.enabled) {
    for (const c of customers) {
      if (!eligible(c)) continue;
      const cj = jobsByCustomer.get(c.id) || [];
      const hasHistory = c.past_customer || cj.some((j) => j.status === 'paid' || j.status === 'done');
      if (!hasHistory) continue;
      if (cj.some((j) => ['quoted', 'scheduled', 'done'].includes(j.status))) continue; // something open already
      const ct = touchesByCustomer.get(c.id) || [];
      const lastJob = cj
        .filter((j) => j.status === 'paid')
        .sort((a, z) => (a.paid_at || '').localeCompare(z.paid_at || ''))
        .at(-1);
      const lastActivity = latest([
        c.last_service_at,
        lastJob?.paid_at,
        lastJob?.completed_at,
        ...ct.map((t) => t.created_at),
      ]);
      const lastCheckin = latest(ct.filter((t) => t.bucket === 'checkin').map((t) => t.created_at));
      const days = lastActivity ? daysBetween(lastActivity, now) : 999;
      if (days < ci.afterDays) continue;
      if (lastCheckin && daysBetween(lastCheckin, now) < (ci.repeatEveryDays ?? 75)) continue;
      const jobLabel = lastJob?.title || c.last_service_note || 'last job';
      push(ci, c, null, days,
        ct.filter((t) => t.bucket === 'checkin').length,
        lastActivity ? `Last heard from ${days} days ago (${jobLabel}).` : 'Past customer, no contact logged yet.',
        `Past customer. ${lastActivity ? `Last contact ${days} days ago.` : 'No contact logged in this app yet.'} Last job: ${jobLabel}. Current month: ${now.toLocaleString('en-US', { month: 'long' })}.`,
        vars(c, jobLabel));
    }
  }

  // One card per customer, highest priority bucket wins. Then sort and cap.
  const prio = (x: FollowUp) => b[x.bucket]?.priority ?? 9;
  out.sort((a, z) => prio(a) - prio(z) || z.days - a.days);
  const seen = new Set<string>();
  const unique = out.filter((f) => (seen.has(f.customer.id) ? false : (seen.add(f.customer.id), true)));
  return unique.slice(0, cfg.followUps.dailyMax);
}

export async function loadFollowUps(cfg: ClientConfig) {
  const s = await db();
  const [customers, jobs, touches, cached] = await Promise.all([
    s<Customer[]>`select * from customers`,
    s<Job[]>`select * from jobs where status <> 'lost'`,
    s<Touch[]>`select * from touches`,
    s<{ key: string; body: string }[]>`select key, body from draft_cache where created_at > now() - interval '7 days'`,
  ]);
  const items = computeFollowUps(cfg, customers, jobs, touches);
  const cache = new Map(cached.map((r) => [r.key, r.body]));
  for (const it of items) {
    const hit = cache.get(it.key);
    if (hit) {
      it.draft = hit;
      it.aiDraft = true;
    }
  }
  return items;
}
