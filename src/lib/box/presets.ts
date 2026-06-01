import type { BoxConfig } from "./types";

export const defaultConfig: BoxConfig = {
  measure: "interior",
  length: 150,
  height: 50,
  depth: 100,
  thickness: 3,
  rows: 1,
  cols: 1,
  dividersX: true,
  dividersY: true,
  joint: "finger",
  tooth: 9,
  kerf: 0.1,
  alternateCorners: true,
  lid: false,
};

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: BoxConfig;
}

export const presets: Preset[] = [
  {
    id: "tray",
    name: "Open Tray",
    description: "Shallow open box · 1 cell",
    config: { ...defaultConfig, length: 200, height: 40, depth: 140, tooth: 10 },
  },
  {
    id: "drawer-organizer",
    name: "Drawer Organizer",
    description: "3 × 2 grid divider",
    config: {
      ...defaultConfig,
      length: 240,
      height: 50,
      depth: 160,
      cols: 3,
      rows: 2,
      tooth: 8,
    },
  },
  {
    id: "lidded-case",
    name: "Lidded Case",
    description: "Closed box with top",
    config: {
      ...defaultConfig,
      length: 120,
      height: 80,
      depth: 90,
      lid: true,
      cols: 1,
      rows: 1,
      tooth: 8,
    },
  },
  {
    id: "card-box",
    name: "Card Box",
    description: "Tall single compartment",
    config: { ...defaultConfig, length: 70, height: 100, depth: 100, tooth: 7 },
  },
  {
    id: "seed-grid",
    name: "Seed Grid",
    description: "4 × 4 micro compartments",
    config: {
      ...defaultConfig,
      length: 200,
      height: 35,
      depth: 200,
      cols: 4,
      rows: 4,
      tooth: 6,
    },
  },
];
