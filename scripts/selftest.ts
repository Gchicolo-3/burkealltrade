// Logic self-test against a throwaway Postgres. Never point this at the real database.
// DATABASE_URL=postgres://postgres@localhost:5433/alltrade npx tsx scripts/selftest.ts
import assert from 'node:assert/strict';
import { db, sql } from '../lib/db';
import { getClient } from '../clients';
import { computeFollowUps, loadFollowUps } from '../lib/followups';
import { priceQuote } from '../lib/pricing';
import { mapCsv, parseCsv, parseVcf } from '../lib/importParse';
import { quoteEmail, quoteSms } from '../lib/quoteText';
import { zonedToUtc, smsHref, normalizePhone, firstName } from '../lib/text';
import type { Customer, Job, Touch } from '../lib/types';

if (!/localhost/.test(process.env.DATABASE_URL || '')) throw new Error('selftest only runs against localhost');

const cfg = getClient();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function main() {
  // pricing + minimum
  const small = priceQuote([{ description: 'Replace faucet cartridge', hours: 0.75, materials: 20 }], cfg.pricing);
  assert.equal(small.underMinimum, true);
  assert.equal(small.total, cfg.pricing.minimumCharge);
  const big = priceQuote([{ description: 'Hang 3 doors', hours: 4, materials: 0 }], cfg.pricing);
  assert.equal(big.total, 380);
  assert.equal(big.underMinimum, false);
  console.log('pricing ok', small.lines[0].amount, small.minimumAdjustment, small.total);

  const em = quoteEmail(cfg, { customerName: 'Maria Lopez', title: 'Faucet repair', summary: 'Fix drip.', q: small, assumptions: ['Customer has the part'] });
  assert.match(em.body, /Minimum service call/);
  assert.match(em.body, /Total: \$190/);
  assert.match(quoteSms(cfg, { customerName: 'Maria Lopez', title: 'Faucet repair', q: small }), /\$190 total/);

  // text helpers
  assert.equal(normalizePhone('(201) 555-0142'), '201-555-0142');
  assert.equal(normalizePhone('+1 201 555 0142'), '201-555-0142');
  assert.equal(firstName('Tom & Linda Walsh'), 'Tom and Linda');
  assert.equal(smsHref('201-555-0142', 'hi there'), 'sms:2015550142?&body=hi%20there');
  const nov = zonedToUtc('2026-11-20', '09:00', 'America/New_York');
  assert.equal(nov.toISOString(), '2026-11-20T14:00:00.000Z');
  const jul = zonedToUtc('2026-07-10', '09:00', 'America/New_York');
  assert.equal(jul.toISOString(), '2026-07-10T13:00:00.000Z');
  console.log('text/tz ok');

  // importers
  const csv = mapCsv(parseCsv('First Name,Last Name,Mobile Phone,E-mail Address,Street,City,Last Job,Last Job Date\nMaria,Lopez,(201) 555-0142,m@x.com,14 Oak St,Hillsdale,"Fence gate, repair",2026-06-01\n,,,,,,,\n'));
  assert.equal(csv.length, 1);
  assert.equal(csv[0].name, 'Maria Lopez');
  assert.equal(csv[0].address, '14 Oak St, Hillsdale');
  assert.equal(csv[0].last_service_note, 'Fence gate, repair');
  assert.equal(csv[0].last_service_at, '2026-06-01');
  const vcf = parseVcf('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Kim;Dave;;;\r\nFN:Dave Kim\r\nitem1.TEL;type=CELL;type=VOICE;type=pref:(201) 555-0177\r\nEMAIL;type=INTERNET:dk@x.com\r\nEND:VCARD\r\n');
  assert.equal(vcf[0].name, 'Dave Kim');
  assert.equal(vcf[0].phone, '(201) 555-0177');
  console.log('import parsers ok');

  // database + follow-up engine
  const s = await db();
  await s`truncate customers, jobs, touches, draft_cache cascade`;
  const mk = async (name: string, phone: string | null, extra: Record<string, unknown> = {}) =>
    (await s`insert into customers ${s({ name, phone, ...extra })} returning id`)[0].id as string;
  const unpaidC = await mk('Una Paid', '201-555-0001');
  const quoteC = await mk('Quinn Quote', '201-555-0002');
  const freshQuoteC = await mk('Fresh Quote', '201-555-0003');
  const thanksC = await mk('Tara Thanks', '201-555-0004');
  const pastC = await mk('Pat Past', '201-555-0005', { past_customer: true, last_service_at: daysAgo(70), last_service_note: 'deck repair' });
  const recentPastC = await mk('Rita Recent', '201-555-0006', { past_customer: true, last_service_at: daysAgo(20) });
  const noPhoneC = await mk('No Phone', null, { past_customer: true });
  const dncC = await mk('Do Not', '201-555-0007', { past_customer: true, do_not_contact: true });

  await s`insert into jobs (customer_id, title, status, total, amount_due, completed_at) values (${unpaidC}, 'Vanity install', 'done', 450, 450, ${daysAgo(4)})`;
  await s`insert into jobs (customer_id, title, status, total, quote_sent_at) values (${quoteC}, 'Crown molding', 'quoted', 1200, ${daysAgo(5)})`;
  await s`insert into jobs (customer_id, title, status, total, quote_sent_at) values (${freshQuoteC}, 'Shelves', 'quoted', 300, ${daysAgo(1)})`;
  await s`insert into jobs (customer_id, title, status, total, paid_at, completed_at, payment_method) values (${thanksC}, 'Door install', 'paid', 600, ${daysAgo(3)}, ${daysAgo(3)}, 'Zelle')`;

  let items = await loadFollowUps(cfg);
  const names = items.map((i) => `${i.customer.name}:${i.bucket}`);
  console.log(names);
  assert.deepEqual(names, ['Una Paid:unpaid', 'Quinn Quote:stale_quote', 'Tara Thanks:referral_thanks', 'Pat Past:checkin']);
  assert.ok(!names.some((n) => /Fresh|Rita|No Phone|Do Not/.test(n)));
  assert.match(items[0].draft, /\$450/);

  // logging a touch removes the card; nudges repeat after the interval, capped
  await s`insert into touches (customer_id, job_id, bucket, body) select ${unpaidC}, id, 'unpaid', 'x' from jobs where customer_id = ${unpaidC}`;
  items = await loadFollowUps(cfg);
  assert.ok(!items.some((i) => i.customer.name === 'Una Paid'));
  await s`update touches set created_at = ${daysAgo(6)} where customer_id = ${unpaidC}`;
  items = await loadFollowUps(cfg);
  const again = items.find((i) => i.customer.name === 'Una Paid');
  assert.ok(again && again.touchCount === 1 && again.key.endsWith(':1'));

  // referral thank-you only once
  await s`insert into touches (customer_id, job_id, bucket) select ${thanksC}, id, 'referral_thanks' from jobs where customer_id = ${thanksC}`;
  items = await loadFollowUps(cfg);
  assert.ok(!items.some((i) => i.customer.name === 'Tara Thanks'));

  // snooze
  await s`update customers set snoozed_until = now() + interval '7 days' where id = ${pastC}`;
  items = await loadFollowUps(cfg);
  assert.ok(!items.some((i) => i.customer.name === 'Pat Past'));

  // daily cap + one per customer
  for (let i = 0; i < 12; i++) await mk(`Bulk ${i}`, `201-555-01${String(i).padStart(2, '0')}`, { past_customer: true });
  items = await loadFollowUps(cfg);
  assert.equal(items.length, cfg.followUps.dailyMax);
  assert.equal(new Set(items.map((i) => i.customer.id)).size, items.length);

  // pure function sanity with no DB
  assert.equal(computeFollowUps(cfg, [] as Customer[], [] as Job[], [] as Touch[]).length, 0);

  // settings row exists
  const [st] = await s`select * from settings where id = 1`;
  assert.ok(st);
  console.log('follow-up engine ok');
  await sql().end();
}

main().catch(async (e) => {
  console.error(e);
  await sql().end();
  process.exit(1);
});
