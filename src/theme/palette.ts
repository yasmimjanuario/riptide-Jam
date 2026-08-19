import type { ColorId } from '../engine';

/**
 * Visual palette. This is the only place that maps the engine's opaque
 * `ColorId` strings to actual colors/labels — the engine itself never sees
 * a hex code or a translation key.
 */
export interface ColorSwatch {
  id: ColorId;
  /** Main fish body color. */
  hex: string;
  /** Lighter tone used for glows/highlights (exit markers, idle pulse). */
  glow: string;
  /** i18n key for the color's display name (used in aria-labels). */
  labelKey: string;
}

export const PALETTE: ColorSwatch[] = [
  { id: 'coral-pink', hex: '#ff6f91', glow: '#ffc2d1', labelKey: 'colors.coralPink' },
  { id: 'turquoise', hex: '#1fc8b6', glow: '#9be9de', labelKey: 'colors.turquoise' },
  { id: 'sun-yellow', hex: '#ffcc33', glow: '#ffe89e', labelKey: 'colors.sunYellow' },
  { id: 'algae-green', hex: '#6ec24d', glow: '#b8e6a4', labelKey: 'colors.algaeGreen' },
  { id: 'sea-lavender', hex: '#9b8cf2', glow: '#d3caf9', labelKey: 'colors.seaLavender' },
  { id: 'clownfish-orange', hex: '#ff8c42', glow: '#ffc59a', labelKey: 'colors.clownfishOrange' },
  { id: 'deep-blue', hex: '#3d84f7', glow: '#a8c8fc', labelKey: 'colors.deepBlue' },
  { id: 'berry-red', hex: '#e6483f', glow: '#f5aca7', labelKey: 'colors.berryRed' },
];

export const PALETTE_COLOR_IDS: ColorId[] = PALETTE.map((swatch) => swatch.id);

const SWATCH_BY_ID = new Map(PALETTE.map((swatch) => [swatch.id, swatch]));

export function getSwatch(colorId: ColorId): ColorSwatch {
  return SWATCH_BY_ID.get(colorId) ?? PALETTE[0];
}
