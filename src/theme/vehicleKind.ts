import type { EntityLength } from '../engine';

/**
 * Maps the engine's generic `length` (1-3 cells) to a vehicle silhouette.
 * The engine doesn't know or care that a length-3 piece "is" a bus — this
 * is purely a UI-layer decision, same as `palette.ts` for colors.
 */
export interface VehicleKind {
  length: EntityLength;
  labelKey: string;
}

export const VEHICLE_KIND_BY_LENGTH: Record<EntityLength, VehicleKind> = {
  1: { length: 1, labelKey: 'vehicles.motorcycle' },
  2: { length: 2, labelKey: 'vehicles.car' },
  3: { length: 3, labelKey: 'vehicles.bus' },
};
