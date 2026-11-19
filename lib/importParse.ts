// Parsers for customer import. Pure functions, run in the browser.

export interface ImportRow {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  last_service_at: string;
  last_service_note: string;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const has = (h: string, ...keys: string[]) => keys.some((k) => h.includes(k));

// Figure out which column is which from common header names (Google Contacts, Outlook, QuickBooks, plain sheets).
export function mapCsv(rows: string[][]): ImportRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (pred: (h: string) => boolean) => header.findIndex(pred);
  const name = idx((h) => h === 'name' || h === 'full name' || h === 'customer' || h === 'customer name' || h === 'display name' || h === 'client');
  const first = idx((h) => h === 'first name' || h === 'given name' || h === 'first');
  const last = idx((h) => h === 'last name' || h === 'family name' || h === 'last' || h === 'surname');
  const phone = idx((h) => has(h, 'mobile', 'cell')) >= 0 ? idx((h) => has(h, 'mobile', 'cell')) : idx((h) => has(h, 'phone'));
  const email = idx((h) => has(h, 'email', 'e-mail'));
  const street = idx((h) => h === 'address' || has(h, 'street', 'address 1 - formatted', 'address 1 - street', 'billing address', 'service address'));
  const city = idx((h) => h === 'city' || has(h, 'address 1 - city'));
  const state = idx((h) => h === 'state' || has(h, 'address 1 - region'));
  const zip = idx((h) => has(h, 'zip', 'postal'));
  const notes = idx((h) => has(h, 'note'));
  const lastDate = idx((h) => has(h, 'last job date', 'last service', 'last visit', 'last date', 'date'));
  const lastJob = idx((h) => has(h, 'last job', 'job', 'service', 'work') && !has(h, 'date'));
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] || '').trim() : '');

  return rows.slice(1).map((r) => {
    const n = get(r, name) || [get(r, first), get(r, last)].filter(Boolean).join(' ');
    const addr = get(r, street);
    const full = addr && (addr.includes(',') || city < 0) ? addr : [addr, get(r, city), [get(r, state), get(r, zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return {
      name: n,
      phone: get(r, phone).split(':::')[0].trim(),
      email: get(r, email).split(':::')[0].trim(),
      address: full,
      notes: get(r, notes),
      last_service_at: get(r, lastDate),
      last_service_note: get(r, lastJob),
    };
  }).filter((r) => r.name);
}

// vCard (.vcf), what iPhone and Android export when sharing contacts.
export function parseVcf(text: string): ImportRow[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  return cards
    .map((card) => {
      const lines = card.split(/\r?\n/);
      const val = (prop: string) => {
        const l = lines.find((x) => x.toUpperCase().startsWith(prop + ':') || x.toUpperCase().startsWith(prop + ';'));
        return l ? l.slice(l.indexOf(':') + 1).trim() : '';
      };
      const tels = lines.filter((x) => /^(item\d+\.)?TEL/i.test(x));
      const mobile = tels.find((x) => /CELL|MOBILE|IPHONE/i.test(x)) || tels[0] || '';
      const adr = val('ADR').split(';').filter(Boolean).join(', ');
      const n = val('FN') || val('N').split(';').reverse().filter(Boolean).join(' ');
      return {
        name: n.replace(/\\,/g, ','),
        phone: mobile ? mobile.slice(mobile.indexOf(':') + 1).trim() : '',
        email: val('EMAIL'),
        address: adr.replace(/\\n/g, ' ').replace(/\\,/g, ','),
        notes: val('NOTE').replace(/\\n/g, ' '),
        last_service_at: '',
        last_service_note: '',
      };
    })
    .filter((r) => r.name);
}
