import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { ClientConfig } from '@/clients/types';
import type { LineItem } from './types';

// All AI runs here, server side, on the ANTHROPIC_API_KEY set in Vercel. The browser never sees a key.
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

let _client: Anthropic | null = null;
const client = () => (_client ||= new Anthropic());

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

function voiceBlock(cfg: ClientConfig) {
  const v = cfg.voice;
  return [
    `You write text messages as ${cfg.business.owner} of ${cfg.business.name}, ${cfg.business.serviceArea}.`,
    `Voice: ${v.description}`,
    `Sign off with "${v.signOff}".`,
    `Phrases that fit: ${v.doSay.join('; ')}.`,
    `Never use: ${v.neverSay.join('; ')}.`,
    'Keep each text under 320 characters, 1 to 3 short sentences, plain text, no emojis unless the examples use them, no hashtags, no em dashes.',
    'Never invent facts, prices, dates, or promises that are not in the context.',
    'Examples of how he actually texts:',
    ...v.examples.map((e) => `- ${e}`),
  ].join('\n');
}

type Schema = Record<string, unknown>;

async function jsonCall<T>(opts: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Schema;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}): Promise<T> {
  const res = await client().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: opts.system,
    output_config: { effort: opts.effort, format: { type: 'json_schema', schema: opts.schema } },
    messages: [{ role: 'user', content: opts.content }],
  });
  if (res.stop_reason === 'refusal') throw new Error('The AI declined this request.');
  const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) throw new Error('Empty AI response');
  return JSON.parse(text) as T;
}

// ---------- Follow-up drafts ----------
export interface DraftRequest {
  key: string;
  bucket: string;
  intent: string;
  customerName: string;
  context: string;
  fallback: string;
}

export async function draftFollowUps(cfg: ClientConfig, reqs: DraftRequest[]) {
  if (!reqs.length) return {} as Record<string, string>;
  const list = reqs
    .map(
      (r, i) =>
        `#${i + 1} key=${r.key}\nCustomer: ${r.customerName}\nGoal: ${r.intent}\nFacts: ${r.context}\nTemplate to improve on: ${r.fallback}`,
    )
    .join('\n\n');
  const out = await jsonCall<{ drafts: { key: string; text: string }[] }>({
    system: voiceBlock(cfg),
    effort: 'low',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['drafts'],
      properties: {
        drafts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['key', 'text'],
            properties: { key: { type: 'string' }, text: { type: 'string' } },
          },
        },
      },
    },
    content: [
      {
        type: 'text',
        text: `Write one text message for each follow-up below, in his voice. Use the customer's first name. Return every key exactly as given.\n\n${list}`,
      },
    ],
  });
  return Object.fromEntries(out.drafts.map((d) => [d.key, d.text.trim()]));
}

export async function draftOne(cfg: ClientConfig, goal: string, facts: string) {
  const out = await jsonCall<{ text: string }>({
    system: voiceBlock(cfg),
    effort: 'low',
    maxTokens: 2000,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: { text: { type: 'string' } },
    },
    content: [{ type: 'text', text: `Write one text message.\nGoal: ${goal}\nFacts: ${facts}` }],
  });
  return out.text.trim();
}

// ---------- Quick quote ----------
export interface QuoteDraft {
  title: string;
  scopeSummary: string;
  items: LineItem[];
  assumptions: string[];
  bundleIdeas: string[];
  questions: string[];
}

export async function buildQuote(
  cfg: ClientConfig,
  input: { note: string; images: { mediaType: string; data: string }[]; customerName?: string },
): Promise<QuoteDraft> {
  const p = cfg.pricing;
  const system = [
    `You estimate handyman jobs for ${cfg.business.name}, a solo handyman in ${cfg.business.serviceArea}.`,
    'From the photos and the owner note, break the work into clear line items a homeowner understands.',
    'For each line item estimate realistic on-site labor hours for one experienced handyman (quarter hour steps) and materials cost in dollars at typical Home Depot pricing. Use 0 materials if the customer supplies them or none are needed.',
    'Do NOT compute prices, totals, or rates. The app does the math.',
    'He prices each job on its own. Your hours are a guide for him, not the price.',
    `If the job looks small, you may suggest 1 to 3 quick add-on tasks that fit this house. Pick from or build on: ${p.bundleSuggestions.join('; ')}.`,
    'List any assumptions (e.g. customer supplies fixture) and up to 3 questions he should confirm before the job.',
    'Write plainly. No em dashes.',
  ].join('\n');

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...input.images.slice(0, 4).map(
      (img) =>
        ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data },
        }) as Anthropic.Beta.BetaImageBlockParam,
    ),
    {
      type: 'text',
      text: `Owner note: ${input.note || '(none, use the photos)'}${input.customerName ? `\nCustomer: ${input.customerName}` : ''}`,
    },
  ];

  return jsonCall<QuoteDraft>({
    system,
    content,
    effort: 'medium',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'scopeSummary', 'items', 'assumptions', 'bundleIdeas', 'questions'],
      properties: {
        title: { type: 'string', description: 'Short job title, e.g. "Bathroom faucet replacement"' },
        scopeSummary: { type: 'string', description: 'One or two sentences describing the work for the customer' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['description', 'hours', 'materials'],
            properties: {
              description: { type: 'string' },
              hours: { type: 'number' },
              materials: { type: 'number' },
            },
          },
        },
        assumptions: { type: 'array', items: { type: 'string' } },
        bundleIdeas: { type: 'array', items: { type: 'string' } },
        questions: { type: 'array', items: { type: 'string' } },
      },
    },
  });
}
