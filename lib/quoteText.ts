import type { ClientConfig } from '@/clients/types';
import { money, type PricedQuote } from './pricing';
import { fillTemplate, firstName } from './text';

export function quoteEmail(
  cfg: ClientConfig,
  o: { customerName: string; title: string; summary: string; q: PricedQuote; assumptions: string[] },
) {
  const subject = fillTemplate(cfg.quote.emailSubject, { job: o.title, business: cfg.business.name });
  const lines = o.q.lines.map((l) => `  ${l.description}: ${money(l.amount)}`);
  if (o.q.trip) lines.push(`  Trip charge: ${money(o.q.trip)}`);
  if (o.q.minimumAdjustment) lines.push(`  ${cfg.pricing.minimumLabel}: ${money(o.q.minimumAdjustment)}`);
  const body = [
    `Hi ${firstName(o.customerName)},`,
    '',
    `Thanks for reaching out. Here is the quote for the ${o.title.toLowerCase()}.`,
    '',
    o.summary,
    '',
    ...lines,
    '',
    `  Total: ${money(o.q.total)}`,
    '',
    ...(o.assumptions.length ? ['Notes:', ...o.assumptions.map((a) => `  - ${a}`), ''] : []),
    ...cfg.quote.terms.map((t) => `- ${t}`),
    '',
    'Just reply here or text me and I will get you on the schedule.',
    '',
    'Thanks,',
    cfg.business.owner,
    cfg.business.name,
    cfg.business.phone,
  ].join('\n');
  return { subject, body };
}

export function quoteSms(cfg: ClientConfig, o: { customerName: string; title: string; q: PricedQuote }) {
  const items = o.q.lines.map((l) => l.description).join(', ');
  const minNote = o.q.underMinimum ? ` (includes my ${money(cfg.pricing.minimumCharge)} visit minimum, happy to knock out a few other small things while I am there)` : '';
  return `Hey ${firstName(o.customerName)}, ${cfg.business.ownerFirst} here. Quote for the ${o.title.toLowerCase()}: ${money(o.q.total)} total${minNote}. Covers ${items}. Want me to get you on the calendar? ${cfg.voice.signOff}`;
}
