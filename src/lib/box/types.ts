export type Units = "mm" | "in";

export type MeasureMode = "interior" | "exterior" | "cell";

export type JointType = "finger" | "butt";

export interface BoxConfig {
  /** Measurement reference mode */
  measure: MeasureMode;
  /** Length (X) in mm */
  length: number;
  /** Height (Z) in mm */
  height: number;
  /** Depth (Y) in mm */
  depth: number;
  /** Material thickness in mm */
  thickness: number;
  /** Grid rows (along Y) */
  rows: number;
  /** Grid columns (along X) */
  cols: number;
  /** Enable dividers along X (vertical, perpendicular to length) */
  dividersX: boolean;
  /** Enable dividers along Y (vertical, perpendicular to depth) */
  dividersY: boolean;
  /** Joint type */
  joint: JointType;
  /** Finger / tooth size in mm */
  tooth: number;
  /** Kerf / fit tolerance in mm */
  kerf: number;
  /** Alternate teeth at corners */
  alternateCorners: boolean;
  /** Include a top lid */
  lid: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export type EdgeMode = "flat" | "tab" | "slot";

export interface PanelEdges {
  bottom: EdgeMode;
  right: EdgeMode;
  top: EdgeMode;
  left: EdgeMode;
}

export interface Panel {
  id: string;
  label: string;
  /** Outer outline points (closed loop, mm) */
  outline: Point[];
  /** Interior cut-outs (slots), each a closed loop */
  holes: Point[][];
  /** Bounding box width/height in mm */
  width: number;
  height: number;
  /** 3D placement for preview */
  placement: PanelPlacement;
}

export interface PanelPlacement {
  /** size in 3D: [x, y, z] mm (thickness is the small one) */
  size: [number, number, number];
  /** center position in 3D mm */
  pos: [number, number, number];
}

export interface BuiltBox {
  panels: Panel[];
  /** resolved interior dims */
  interior: { length: number; height: number; depth: number };
  /** resolved exterior dims */
  exterior: { length: number; height: number; depth: number };
  volume: number;
  cells: { x: number; y: number };
}
