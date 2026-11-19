'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/auth';
import { db } from '@/lib/db';
import { getConfig, getOverrides, type SettingsOverrides } from '@/lib/config';
import { loadFollowUps } from '@/lib/followups';
import { aiConfigured, buildQuote, draftFollowUps, draftOne, type QuoteDraft } from '@/lib/ai';
import { priceQuote } from '@/lib/pricing';
import { quoteEmail, quoteSms } from '@/lib/quoteText';
import { fillTemplate, firstName, fmtDate, normalizePhone, zonedToUtc } from '@/lib/text';
import { calendarTemplateUrl, upsertCalendarEvent } from '@/lib/google';
import type { Customer, Job, LineItem } from '@/lib/types';

const refresh = () => {
  for (const p of ['/', '/jobs', '/customers', '/schedule']) revalidatePath(p);
};

// ---------------- Follow-ups ----------------
export async function generateDrafts(keys: string[]) {
  await requireUser();
  if (!aiConfigured() || !keys.length) return {};
  const cfg = await getConfig();
  const items = (await loadFollowUps(cfg)).filter((i) => keys.includes(i.key));
  const bucket = Object.fromEntries(cfg.buckets.map((b) => [b.id, b]));
  const drafts = await draftFollowUps(
    cfg,
    items.map((i) => ({
      key: i.key,
      bucket: i.bucket,
      intent: bucket[i.bucket].intent,
      customerName: i.customer.name,
      context: i.context,
      fallback: i.draft,
    })),
  );
  const s = await db();
  for (const [key, body] of Object.entries(drafts)) {
    if (!body) continue;
    await s`insert into draft_cache (key, body) values (${key}, ${body})
            on conflict (key) do update set body = excluded.body, created_at = now()`;
  }
  return drafts;
}

export async function redraft(key: string) {
  await requireUser();
  const s = await db();
  await s`delete from draft_cache where key = ${key}`;
  const d = await generateDrafts([key]);
  return d[key] || null;
}

export async function logTouch(input: { customerId: string; jobId?: string | null; bucket?: string | null; body?: string; channel?: string }) {
  await requireUser();
  const s = await db();
  await s`insert into touches (customer_id, job_id, bucket, channel, body)
          values (${input.customerId}, ${input.jobId || null}, ${input.bucket || null}, ${input.channel || 'text'}, ${input.body || null})`;
  refresh();
}

export async function snooze(customerId: string, days: number) {
  await requireUser();
  const s = await db();
  await s`update customers set snoozed_until = now() + (${days} || ' days')::interval where id = ${customerId}`;
  refresh();
}

// ---------------- Customers ----------------
export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  source?: string | null;
  past_customer?: boolean;
  last_service_at?: string | null;
  last_service_note?: string | null;
}

export async function saveCustomer(input: CustomerInput & { id?: string }) {
  await requireUser();
  const s = await db();
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const row = {
    name,
    phone: normalizePhone(input.phone),
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
    source: input.source?.trim() || null,
    past_customer: !!input.past_customer,
    last_service_at: input.last_service_at || null,
    last_service_note: input.last_service_note?.trim() || null,
  };
  let id = input.id;
  if (id) {
    await s`update customers set ${s(row)} where id = ${id}`;
  } else {
    const [r] = await s`insert into customers ${s(row)} returning id`;
    id = r.id as string;
  }
  refresh();
  return id!;
}

export async function setDoNotContact(id: string, value: boolean) {
  await requireUser();
  const s = await db();
  await s`update customers set do_not_contact = ${value} where id = ${id}`;
  refresh();
}

export async function deleteCustomer(id: string) {
  await requireUser();
  const s = await db();
  await s`delete from customers where id = ${id}`;
  refresh();
}

export async function importCustomers(rows: CustomerInput[]) {
  await requireUser();
  const s = await db();
  const existing = await s<{ phone: string | null; email: string | null }[]>`select phone, lower(email) as email from customers`;
  const phones = new Set(existing.map((e) => e.phone).filter(Boolean));
  const emails = new Set(existing.map((e) => e.email).filter(Boolean));
  let added = 0;
  let skipped = 0;
  for (const r of rows) {
    const name = (r.name || '').trim();
    const phone = normalizePhone(r.phone);
    const email = r.email?.trim().toLowerCase() || null;
    if (!name || (phone && phones.has(phone)) || (email && emails.has(email))) {
      skipped++;
      continue;
    }
    let lastAt: string | null = null;
    if (r.last_service_at) {
      const d = new Date(r.last_service_at);
      lastAt = isNaN(d.getTime()) ? null : d.toISOString();
    }
    await s`insert into customers ${s({
      name,
      phone,
      email,
      address: r.address?.trim() || null,
      notes: r.notes?.trim() || null,
      source: r.source || 'import',
      past_customer: !!r.past_customer,
      last_service_at: lastAt,
      last_service_note: r.last_service_note?.trim() || null,
    })}`;
    if (phone) phones.add(phone);
    if (email) emails.add(email);
    added++;
  }
  refresh();
  return { added, skipped };
}

// ---------------- Quotes ----------------
export async function aiQuote(input: { note: string; images: { mediaType: string; data: string }[]; customerName?: string }): Promise<QuoteDraft> {
  await requireUser();
  if (!aiConfigured()) throw new Error('AI is not set up yet (ANTHROPIC_API_KEY missing on the server).');
  const cfg = await getConfig();
  return buildQuote(cfg, input);
}

async function ensureCustomer(c: { customerId?: string | null; name?: string; phone?: string; email?: string; address?: string }) {
  if (c.customerId) return c.customerId;
  if (!c.name?.trim()) throw new Error('Pick a customer or enter a name');
  return saveCustomer({ name: c.name, phone: c.phone, email: c.email, address: c.address, source: 'quote' });
}

export async function saveQuote(input: {
  jobId?: string | null;
  customerId?: string | null;
  newCustomer?: { name: string; phone?: string; email?: string; address?: string };
  title: string;
  summary: string;
  notes?: string;
  items: LineItem[];
  assumptions: string[];
}) {
  await requireUser();
  const cfg = await getConfig();
  const s = await db();
  const customerId = await ensureCustomer({ customerId: input.customerId, ...input.newCustomer });
  const [cust] = await s<Customer[]>`select * from customers where id = ${customerId}`;
  const q = priceQuote(input.items, cfg.pricing);
  const items = q.lines.map(({ description, hours, materials }) => ({ description, hours, materials }));
  const notes = [input.summary, input.notes].filter(Boolean).join('\n\n');
  let jobId = input.jobId;
  if (jobId) {
    await s`update jobs set title = ${input.title}, notes = ${notes}, line_items = ${s.json(items)}, total = ${q.total}, customer_id = ${customerId} where id = ${jobId}`;
  } else {
    const [r] = await s`insert into jobs (customer_id, title, notes, status, line_items, total)
      values (${customerId}, ${input.title}, ${notes}, 'quoted', ${s.json(items)}, ${q.total}) returning id`;
    jobId = r.id as string;
  }
  const email = quoteEmail(cfg, { customerName: cust.name, title: input.title, summary: input.summary, q, assumptions: input.assumptions });
  const sms = quoteSms(cfg, { customerName: cust.name, title: input.title, q });
  refresh();
  return { jobId, customer: { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }, total: q.total, email, sms };
}

export async function markQuoteSent(jobId: string, channel: 'email' | 'text', body: string) {
  await requireUser();
  const s = await db();
  const [j] = await s<Job[]>`update jobs set quote_sent_at = coalesce(quote_sent_at, now()) where id = ${jobId} returning *`;
  if (j) await s`insert into touches (customer_id, job_id, bucket, channel, body) values (${j.customer_id}, ${j.id}, 'quote', ${channel}, ${body})`;
  refresh();
}

// ---------------- Scheduling ----------------
export async function bookJob(input: {
  jobId?: string | null;
  customerId?: string | null;
  newCustomer?: { name: string; phone?: string; address?: string };
  title: string;
  date: string;
  time: string;
  durationMin: number;
}) {
  await requireUser();
  const cfg = await getConfig();
  const s = await db();
  const customerId = input.jobId
    ? ((await s`select customer_id from jobs where id = ${input.jobId}`)[0]?.customer_id as string)
    : await ensureCustomer({ customerId: input.customerId, ...input.newCustomer });
  const [cust] = await s<Customer[]>`select * from customers where id = ${customerId}`;
  const tz = cfg.schedule.timezone;
  const start = zonedToUtc(input.date, input.time, tz);
  const end = new Date(start.getTime() + (input.durationMin || cfg.schedule.defaultDurationMin) * 60_000);

  let jobId = input.jobId;
  let existingEvent: string | null = null;
  if (jobId) {
    const [r] = await s<Job[]>`update jobs set status = 'scheduled', title = ${input.title}, scheduled_start = ${start.toISOString()}, duration_min = ${input.durationMin} where id = ${jobId} returning *`;
    existingEvent = r.calendar_event_id;
  } else {
    const [r] = await s`insert into jobs (customer_id, title, status, scheduled_start, duration_min)
      values (${customerId}, ${input.title}, 'scheduled', ${start.toISOString()}, ${input.durationMin}) returning id`;
    jobId = r.id as string;
  }

  const ev = {
    summary: `${input.title}: ${cust.name}`,
    description: [cust.phone && `Phone: ${cust.phone}`, cust.email && `Email: ${cust.email}`, cust.notes && `Notes: ${cust.notes}`, 'Booked in AllTrade Command']
      .filter(Boolean)
      .join('\n'),
    location: cust.address || undefined,
    start,
    end,
    timezone: tz,
  };
  const eventId = await upsertCalendarEvent(ev, existingEvent).catch(() => null);
  if (eventId) await s`update jobs set calendar_event_id = ${eventId} where id = ${jobId}`;

  const date = fmtDate(start.toISOString(), tz, { weekday: 'long', month: 'short', day: 'numeric' });
  const time = fmtDate(start.toISOString(), tz, { hour: 'numeric', minute: '2-digit' });
  const confirmation = fillTemplate(cfg.schedule.confirmationTemplate, {
    first: firstName(cust.name),
    date,
    time,
    job: input.title.toLowerCase(),
    owner: cfg.business.ownerFirst,
  });
  refresh();
  return {
    jobId,
    customer: { id: cust.id, name: cust.name, phone: cust.phone },
    calendarSynced: !!eventId,
    calendarUrl: calendarTemplateUrl(ev),
    confirmation,
  };
}

// ---------------- Job status & payments ----------------
export async function markDone(jobId: string, amount: number) {
  await requireUser();
  const s = await db();
  await s`update jobs set status = 'done', completed_at = coalesce(completed_at, now()), amount_due = ${amount} where id = ${jobId}`;
  refresh();
}

export async function markPaid(jobId: string, method: string, amount: number) {
  await requireUser();
  const s = await db();
  await s`update jobs set status = 'paid', paid_at = now(), payment_method = ${method},
          amount_due = ${amount}, total = case when total = 0 then ${amount} else total end,
          completed_at = coalesce(completed_at, now()) where id = ${jobId}`;
  refresh();
}

export async function markLost(jobId: string) {
  await requireUser();
  const s = await db();
  await s`update jobs set status = 'lost' where id = ${jobId}`;
  refresh();
}

export async function reopenJob(jobId: string, status: 'quoted' | 'scheduled' | 'done') {
  await requireUser();
  const s = await db();
  await s`update jobs set status = ${status}, paid_at = case when ${status} <> 'paid' then null else paid_at end where id = ${jobId}`;
  refresh();
}

export async function draftAdHoc(goal: string, facts: string) {
  await requireUser();
  if (!aiConfigured()) return null;
  return draftOne(await getConfig(), goal, facts);
}

// ---------------- Settings ----------------
export async function saveSettings(o: SettingsOverrides) {
  await requireUser();
  const s = await db();
  const cur = await getOverrides();
  const next = { ...cur, ...o };
  await s`update settings set data = ${s.json(next as never)}, updated_at = now() where id = 1`;
  await s`delete from draft_cache`; // voice changed, redraft
  refresh();
  revalidatePath('/settings');
}
