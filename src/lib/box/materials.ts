import type { LaserId, MaterialId } from "./types";

export interface Material {
  id: MaterialId;
  name: string;
  /** Typical sheet thickness in mm */
  defaultThickness: number;
  /** Advised kerf / fit tolerance in mm */
  kerf: number;
  /** Short guidance shown to the user */
  note: string;
}

export const materials: Material[] = [
  {
    id: "plywood",
    name: "Plywood",
    defaultThickness: 3,
    kerf: 0.15,
    note: "Wood fibres compress slightly — a small kerf gives a snug press fit.",
  },
  {
    id: "mdf",
    name: "MDF",
    defaultThickness: 3,
    kerf: 0.2,
    note: "MDF burns wider; use a larger kerf so joints don't bind.",
  },
  {
    id: "acrylic",
    name: "Acrylic",
    defaultThickness: 3,
    kerf: 0.1,
    note: "Rigid and brittle — keep kerf tight, acrylic has no give.",
  },
  {
    id: "hardboard",
    name: "Hardboard",
    defaultThickness: 3,
    kerf: 0.18,
    note: "Dense board, moderate kerf for a firm fit.",
  },
  {
    id: "cardboard",
    name: "Cardboard",
    defaultThickness: 2,
    kerf: 0.05,
    note: "Soft and crushable — a tiny kerf keeps tabs from tearing.",
  },
];

export function getMaterial(id: MaterialId): Material {
  return materials.find((m) => m.id === id) ?? materials[0];
}

export interface Laser {
  id: LaserId;
  name: string;
  /** Typical beam / kerf width in mm on 3 mm plywood */
  beamKerf: number;
  /** Per-mm thickness widening of the kerf (deeper cut = wider gap) */
  depthFactor: number;
  /** Short guidance shown to the user */
  note: string;
}

export const lasers: Laser[] = [
  {
    id: "xtool-10w",
    name: "xTool 10W",
    beamKerf: 0.1,
    depthFactor: 0.015,
    note: "10W diode — fine focused beam, narrow kerf. Best on ≤3 mm stock.",
  },
  {
    id: "xtool-20w",
    name: "xTool 20W",
    beamKerf: 0.14,
    depthFactor: 0.02,
    note: "20W diode — faster cutting, slightly wider beam on thicker sheets.",
  },
  {
    id: "xtool-40w",
    name: "xTool 40W",
    beamKerf: 0.2,
    depthFactor: 0.03,
    note: "40W diode — high power for thick stock, widest kerf.",
  },
];

export function getLaser(id: LaserId): Laser {
  return lasers.find((l) => l.id === id) ?? lasers[0];
}

/**
 * Advised kerf/tolerance combining the laser beam width with how the
 * material reacts (burns wide vs. crushes) at a given thickness.
 */
export function advisedKerf(
  materialId: MaterialId,
  thickness: number,
  laserId: LaserId,
): number {
  const m = getMaterial(materialId);
  const l = getLaser(laserId);
  // Material reaction relative to the plywood baseline (0.15 mm).
  const materialFactor = m.kerf / 0.15;
  // Deeper cuts lose a little more material to the beam.
  const depth = l.beamKerf + Math.max(0, thickness) * l.depthFactor;
  return Math.round(depth * materialFactor * 100) / 100;
}
