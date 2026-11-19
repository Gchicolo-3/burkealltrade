import { getClient, type ClientConfig } from '@/clients';
import { db, dbConfigured } from './db';

// Owner-editable overrides saved in the settings row, layered on the client config file.
export interface SettingsOverrides {
  hourlyRate?: number;
  minimumCharge?: number;
  reviewUrl?: string;
  extraVoiceExamples?: string[];
  phone?: string;
  email?: string;
}

export async function getOverrides(): Promise<SettingsOverrides> {
  if (!dbConfigured()) return {};
  const s = await db();
  const [row] = await s`select data from settings where id = 1`;
  return (row?.data as SettingsOverrides) || {};
}

export async function getConfig(): Promise<ClientConfig> {
  const base = getClient();
  const o = await getOverrides();
  return {
    ...base,
    business: {
      ...base.business,
      reviewUrl: o.reviewUrl ?? base.business.reviewUrl,
      phone: o.phone || base.business.phone,
      email: o.email || base.business.email,
    },
    pricing: {
      ...base.pricing,
      hourlyRate: o.hourlyRate ?? base.pricing.hourlyRate,
      minimumCharge: o.minimumCharge ?? base.pricing.minimumCharge,
    },
    voice: {
      ...base.voice,
      examples: [...(o.extraVoiceExamples || []), ...base.voice.examples],
    },
  };
}
