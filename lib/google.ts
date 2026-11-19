import 'server-only';
import { db } from './db';

async function accessToken() {
  const s = await db();
  const [row] = await s`select google_refresh_token from settings where id = 1`;
  const refresh = row?.google_refresh_token as string | null;
  if (!refresh || !process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID,
      client_secret: process.env.AUTH_GOOGLE_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string };
  return j.access_token || null;
}

export interface CalEvent {
  summary: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  timezone: string;
}

// Returns the created event id, or null if calendar access is not available (caller falls back to a link).
export async function upsertCalendarEvent(ev: CalEvent, existingId?: string | null) {
  const token = await accessToken();
  if (!token) return null;
  const body = {
    summary: ev.summary,
    description: ev.description,
    location: ev.location,
    start: { dateTime: ev.start.toISOString(), timeZone: ev.timezone },
    end: { dateTime: ev.end.toISOString(), timeZone: ev.timezone },
    reminders: { useDefault: true },
  };
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(existingId ? `${base}/${encodeURIComponent(existingId)}` : base, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { id?: string };
  return j.id || null;
}

// One-tap fallback: opens Google Calendar with the event prefilled.
export function calendarTemplateUrl(ev: CalEvent) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.summary,
    dates: `${f(ev.start)}/${f(ev.end)}`,
    details: ev.description,
    location: ev.location || '',
    ctz: ev.timezone,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
