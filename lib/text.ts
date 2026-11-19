// Small helpers safe for both server and client.

export const firstName = (name: string) => {
  const n = name.trim();
  // "Tom & Linda Walsh" -> "Tom and Linda"
  if (/&| and /i.test(n)) {
    const parts = n.split(/\s+/);
    return parts.slice(0, Math.max(1, parts.length - 1)).join(' ').replace('&', 'and');
  }
  return n.split(/\s+/)[0] || n;
};

export function fillTemplate(t: string, vars: Record<string, string | number | undefined>) {
  return t
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === '' ? '' : String(vars[k])))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizePhone(p: string | null | undefined) {
  if (!p) return null;
  const d = p.replace(/[^\d+]/g, '');
  const digits = d.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1'))
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return p.trim() || null;
}

// sms: link with body prefilled. "?&body=" works on both iOS and Android.
export function smsHref(phone: string | null, body: string) {
  const to = (phone || '').replace(/[^\d+]/g, '');
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

export function mailtoHref(to: string | null, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const daysBetween = (a: Date | string, b: Date | string = new Date()) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export function fmtDate(iso: string, tz = 'America/New_York', opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: tz,
    ...(opts || { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  });
}

// Convert a wall-clock date + time in a timezone to a UTC Date, no library needed.
export function zonedToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(guess), tz);
  const first = guess - offset;
  // re-check across DST boundaries
  const offset2 = tzOffsetMs(new Date(first), tz);
  return new Date(guess - offset2);
}

function tzOffsetMs(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asUtc - at.getTime();
}
