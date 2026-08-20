import type { ColorId } from '../engine';

/**
 * Visual palette. This is the only place that maps the engine's opaque
 * `ColorId` strings to actual colors/labels — the engine itself never sees
 * a hex code or a translation key.
 */
export interface ColorSwatch {
  id: ColorId;
  /** Main vehicle body color. */
  hex: string;
  /** Lighter tone used for glows/highlights (exit gates, headlight glare). */
  glow: string;
  /** i18n key for the color's display name (used in aria-labels). */
  labelKey: string;
}

export const PALETTE: ColorSwatch[] = [
  { id: 'red', hex: '#e5382b', glow: '#ff9b8f', labelKey: 'colors.red' },
  { id: 'blue', hex: '#1f6fe0', glow: '#9cc2f7', labelKey: 'colors.blue' },
  { id: 'yellow', hex: '#f4c421', glow: '#fbe38f', labelKey: 'colors.yellow' },
  { id: 'green', hex: '#3fae4c', glow: '#a4e0ac', labelKey: 'colors.green' },
  { id: 'purple', hex: '#8b5cf6', glow: '#cbb6fb', labelKey: 'colors.purple' },
  { id: 'orange', hex: '#f0822a', glow: '#fac192', labelKey: 'colors.orange' },
];

export const PALETTE_COLOR_IDS: ColorId[] = PALETTE.map((swatch) => swatch.id);

const SWATCH_BY_ID = new Map(PALETTE.map((swatch) => [swatch.id, swatch]));

export function getSwatch(colorId: ColorId): ColorSwatch {
  return SWATCH_BY_ID.get(colorId) ?? PALETTE[0];
}
