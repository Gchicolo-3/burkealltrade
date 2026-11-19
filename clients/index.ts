import type { ClientConfig } from './types';
import burke from './burke';

// Register each client here. CLIENT_ID env var picks which one this deployment runs.
const registry: Record<string, ClientConfig> = {
  burke,
};

export function getClient(): ClientConfig {
  const id = process.env.CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID || 'burke';
  const cfg = registry[id];
  if (!cfg) throw new Error(`Unknown CLIENT_ID "${id}". Add it to clients/index.ts`);
  return cfg;
}

export type { ClientConfig } from './types';
