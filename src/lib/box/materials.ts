import type { MaterialId } from "./types";

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

/** Advised kerf/tolerance for a material at a given thickness. */
export function advisedKerf(id: MaterialId, thickness: number): number {
  const m = getMaterial(id);
  // thicker sheets lose a little more material to the beam
  const scale = 1 + Math.max(0, thickness - m.defaultThickness) * 0.02;
  return Math.round(m.kerf * scale * 100) / 100;
}
