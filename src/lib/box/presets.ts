import type { BoxConfig } from "./types";

export const defaultConfig: BoxConfig = {
  material: "plywood",
  autoKerf: true,
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
  fingerStyle: "box",
  tooth: 9,
  kerf: 0.1,
  alternateCorners: true,
  topFingers: false,
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
      topFingers: true,
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
  {
    id: "pen-holder",
    name: "Pen Holder",
    description: "Tall 2 × 1 desk caddy",
    config: {
      ...defaultConfig,
      length: 90,
      height: 110,
      depth: 60,
      cols: 2,
      rows: 1,
      tooth: 7,
    },
  },
  {
    id: "spice-rack",
    name: "Spice Rack",
    description: "5 × 1 narrow jars",
    config: {
      ...defaultConfig,
      length: 300,
      height: 70,
      depth: 60,
      cols: 5,
      rows: 1,
      tooth: 8,
    },
  },
  {
    id: "jewelry-box",
    name: "Jewelry Box",
    description: "Lidded 3 × 3 grid",
    config: {
      ...defaultConfig,
      length: 180,
      height: 45,
      depth: 180,
      cols: 3,
      rows: 3,
      lid: true,
      tooth: 7,
    },
  },
  {
    id: "battery-tray",
    name: "Battery Tray",
    description: "8 × 2 cell organizer",
    config: {
      ...defaultConfig,
      length: 160,
      height: 25,
      depth: 80,
      cols: 8,
      rows: 2,
      tooth: 5,
    },
  },
  {
    id: "tool-tray",
    name: "Tool Tray",
    description: "Wide 4 × 1 shallow tray",
    config: {
      ...defaultConfig,
      length: 320,
      height: 50,
      depth: 120,
      cols: 4,
      rows: 1,
      tooth: 10,
    },
  },
];

