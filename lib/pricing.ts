import type { LineItem } from './types';

export interface PricingInput {
  hourlyRate: number;
  minimumCharge: number;
  minimumLabel: string;
  tripCharge: number;
  materialsMarkupPct: number;
  roundTo: number;
}

export interface PricedLine extends LineItem {
  labor: number;
  materialsBilled: number;
  amount: number;
}

export interface PricedQuote {
  lines: PricedLine[];
  subtotal: number;
  trip: number;
  minimumAdjustment: number;
  total: number;
  underMinimum: boolean;
  totalHours: number;
}

const roundUp = (n: number, step: number) => (step > 0 ? Math.ceil(n / step) * step : Math.round(n * 100) / 100);

// All math happens here, never in the AI. The AI only estimates hours and materials.
export function priceQuote(items: LineItem[], p: PricingInput): PricedQuote {
  const lines = items
    .filter((i) => i.description.trim())
    .map((i) => {
      const hours = Math.max(0, Number(i.hours) || 0);
      const materials = Math.max(0, Number(i.materials) || 0);
      const labor = hours * p.hourlyRate;
      const materialsBilled = materials * (1 + p.materialsMarkupPct / 100);
      const amount = roundUp(labor + materialsBilled, p.roundTo);
      return { description: i.description.trim(), hours, materials, labor, materialsBilled, amount };
    });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const trip = p.tripCharge || 0;
  const before = subtotal + trip;
  const minimumAdjustment = before > 0 && before < p.minimumCharge ? p.minimumCharge - before : 0;
  const total = before + minimumAdjustment;
  const totalHours = lines.reduce((s, l) => s + l.hours, 0);
  return { lines, subtotal, trip, minimumAdjustment, total, underMinimum: minimumAdjustment > 0, totalHours };
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

// Hours of labor still "free" inside the minimum, used to pitch bundling.
export function minimumHeadroomHours(q: PricedQuote, p: PricingInput) {
  if (!q.underMinimum) return 0;
  return Math.floor((q.minimumAdjustment / p.hourlyRate) * 4) / 4;
}
