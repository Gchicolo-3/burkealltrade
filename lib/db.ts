import postgres from 'postgres';

// One database per client deployment. Works with Neon (Vercel Postgres) or Supabase Postgres.
// Use the pooled connection string. prepare:false keeps it compatible with transaction poolers.

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: Promise<void> | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require',
    types: {
      // numeric -> number, timestamptz -> ISO string, so rows pass cleanly to client components
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      tstz: {
        to: 1184,
        from: [1184],
        serialize: (x: unknown) => (x instanceof Date ? x.toISOString() : String(x)),
        parse: (x: string) => new Date(x).toISOString(),
      },
    },
  });
}

export function sql() {
  if (!globalThis.__sql) globalThis.__sql = makeClient();
  return globalThis.__sql;
}

const SCHEMA = `
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  source text,
  past_customer boolean not null default false,
  last_service_at timestamptz,
  last_service_note text,
  do_not_contact boolean not null default false,
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customers_phone_idx on customers (phone);
create index if not exists customers_email_idx on customers (lower(email));

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'quoted' check (status in ('quoted','scheduled','done','paid','lost')),
  line_items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  quote_sent_at timestamptz,
  scheduled_start timestamptz,
  duration_min int,
  calendar_event_id text,
  completed_at timestamptz,
  amount_due numeric(10,2),
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_customer_idx on jobs (customer_id);
create index if not exists jobs_status_idx on jobs (status);

create table if not exists touches (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  bucket text,
  channel text not null default 'text',
  body text,
  created_at timestamptz not null default now()
);
create index if not exists touches_customer_idx on touches (customer_id);
create index if not exists touches_job_idx on touches (job_id);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  google_refresh_token text,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists draft_cache (
  key text primary key,
  body text not null,
  created_at timestamptz not null default now()
);
`;

// Idempotent. Runs once per cold start so a fresh database needs no manual migration.
export async function db() {
  const s = sql();
  if (!globalThis.__schemaReady) {
    globalThis.__schemaReady = s.unsafe(SCHEMA).then(() => undefined).catch((e) => {
      globalThis.__schemaReady = undefined;
      throw e;
    });
  }
  await globalThis.__schemaReady;
  return s;
}

export function dbConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}
