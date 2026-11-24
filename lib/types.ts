export type JobStatus = 'quoted' | 'scheduled' | 'done' | 'paid' | 'lost';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  source: string | null;
  past_customer: boolean;
  last_service_at: string | null;
  last_service_note: string | null;
  do_not_contact: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export interface LineItem {
  description: string;
  hours: number;
  materials: number;
  price?: number | null; // labor price for this line, set by the owner (per job pricing)
}

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  notes: string | null;
  status: JobStatus;
  line_items: LineItem[];
  total: number;
  quote_sent_at: string | null;
  scheduled_start: string | null;
  duration_min: number | null;
  calendar_event_id: string | null;
  completed_at: string | null;
  amount_due: number | null;
  paid_at: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface Touch {
  id: string;
  customer_id: string;
  job_id: string | null;
  bucket: string | null;
  channel: string;
  body: string | null;
  created_at: string;
}
