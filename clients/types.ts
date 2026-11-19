// Shared shape for every client tool built on this framework.
// A new client = a new file in /clients plus CLIENT_ID in the environment.
// Nothing client specific should live outside /clients.

export type BucketId = 'unpaid' | 'stale_quote' | 'referral_thanks' | 'checkin';

export interface BucketConfig {
  id: BucketId;
  label: string; // shown on the follow-up card
  priority: number; // lower = shows first
  enabled: boolean;
  // Rule knobs (days). Each bucket reads the ones it needs.
  afterDays: number; // how long after the trigger event before it shows up
  repeatEveryDays?: number; // re-surface if still open after this many days since last touch
  maxTouches?: number; // stop nagging after this many touches on the same job
  windowDays?: number; // give up after this many days past the trigger
  // Fallback draft if AI is unavailable. Tokens: {first} {owner} {job} {amount} {days} {business} {reviewUrl}
  template: string;
  // Extra guidance for the AI on what this text should accomplish
  intent: string;
}

export interface VoiceConfig {
  description: string; // how the owner talks
  signOff: string; // how texts end
  doSay: string[];
  neverSay: string[];
  examples: string[]; // real or approved sample texts, the AI mimics these
}

export interface PricingConfig {
  hourlyRate: number;
  minimumCharge: number; // the floor for any single visit
  minimumLabel: string; // line item label when the floor kicks in
  tripCharge: number; // 0 to disable
  materialsMarkupPct: number; // added to materials estimates
  roundTo: number; // round line items to this many dollars
  bundleSuggestions: string[]; // small add-ons to suggest when a job is under the minimum
}

export interface ClientConfig {
  id: string;
  appName: string;
  business: {
    name: string;
    owner: string;
    ownerFirst: string;
    phone: string;
    email: string;
    serviceArea: string;
    reviewUrl: string; // Google review link, blank until set
    paymentInstructions: string; // shown in quotes and nudges
  };
  pricing: PricingConfig;
  voice: VoiceConfig;
  buckets: BucketConfig[];
  followUps: {
    dailyMax: number;
    dailyMin: number;
  };
  schedule: {
    defaultDurationMin: number;
    timezone: string;
    confirmationTemplate: string; // tokens: {first} {date} {time} {job} {owner}
  };
  paymentMethods: string[];
  quote: {
    emailSubject: string; // tokens: {job} {business}
    terms: string[];
  };
}
