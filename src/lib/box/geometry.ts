import type {
  BoxConfig,
  BuiltBox,
  EdgeMode,
  Panel,
  PanelEdges,
  Point,
} from "./types";

/** Number of fingers (always odd so edges start & end with the same finger type). */
function fingerCount(length: number, tooth: number): { n: number; fw: number } {
  let n = Math.max(1, Math.round(length / Math.max(tooth, 0.5)));
  if (n % 2 === 0) n -= 1;
  if (n < 1) n = 1;
  return { n, fw: length / n };
}

/**
 * Generate the profile of a single edge running from (0,0) to (length,0).
 * Outward (tab protrusion) is +y. Slots cut to -y.
 * Returns points from x=0 to x=length.
 */
function edgeProfile(
  length: number,
  tooth: number,
  thickness: number,
  mode: EdgeMode,
  kerf: number,
  startExtended: boolean,
): Point[] {
  if (mode === "flat" || length <= 0) {
    return [
      { x: 0, y: 0 },
      { x: length, y: 0 },
    ];
  }
  const { n, fw } = fingerCount(length, tooth);
  const depth = mode === "tab" ? thickness : -thickness;
  const k = kerf / 2;
  // grow direction: widen tabs, shrink slot notches for a snug press fit
  const grow = mode === "tab" ? 1 : -1;

  const isExtended = (i: number) => (i % 2 === 0) === startExtended;

  const pts: Point[] = [];
  pts.push({ x: 0, y: isExtended(0) ? depth : 0 });

  for (let i = 1; i < n; i++) {
    const x = i * fw;
    const prevExt = isExtended(i - 1);
    const curExt = isExtended(i);
    const shift = (prevExt ? grow : -grow) * k;
    const xb = clamp(x + shift, 0, length);
    pts.push({ x: xb, y: prevExt ? depth : 0 });
    pts.push({ x: xb, y: curExt ? depth : 0 });
  }
  pts.push({ x: length, y: isExtended(n - 1) ? depth : 0 });
  return pts;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

interface RectPanelOpts {
  width: number;
  height: number;
  tooth: number;
  thickness: number;
  kerf: number;
  edges: PanelEdges;
  /** Per-edge starting finger parity (for alternate corners). */
  start?: Partial<Record<keyof PanelEdges, boolean>>;
}

/**
 * Build a rectangular panel outline of nominal size width x height with
 * finger-jointed edges. Tabs extend OUTSIDE the nominal rectangle, slots cut in.
 * Traversed counter-clockwise.
 */
function rectPanel(opts: RectPanelOpts): Point[] {
  const { width: w, height: h, tooth, thickness: t, kerf, edges } = opts;
  const s = opts.start ?? {};
  const out: Point[] = [];

  // bottom edge: along +x at y=0, outward = -y
  const bottom = edgeProfile(w, tooth, t, edges.bottom, kerf, s.bottom ?? true);
  for (const p of bottom) out.push({ x: p.x, y: -p.y });

  // right edge: along +y at x=w, outward = +x
  const right = edgeProfile(h, tooth, t, edges.right, kerf, s.right ?? true);
  for (let i = 1; i < right.length; i++) {
    out.push({ x: w + right[i].y, y: right[i].x });
  }

  // top edge: along -x at y=h, outward = +y
  const top = edgeProfile(w, tooth, t, edges.top, kerf, s.top ?? true);
  for (let i = 1; i < top.length; i++) {
    out.push({ x: w - top[i].x, y: h + top[i].y });
  }

  // left edge: along -y at x=0, outward = -x
  const left = edgeProfile(h, tooth, t, edges.left, kerf, s.left ?? true);
  for (let i = 1; i < left.length - 1; i++) {
    out.push({ x: -left[i].y, y: h - left[i].x });
  }
  return out;
}

function bounds(pts: Point[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function normalize(pts: Point[]): { pts: Point[]; w: number; h: number } {
  const b = bounds(pts);
  return {
    pts: pts.map((p) => ({ x: p.x - b.minX, y: p.y - b.minY })),
    w: b.w,
    h: b.h,
  };
}

/** Resolve interior dimensions from the chosen measurement mode. */
function resolveInterior(cfg: BoxConfig) {
  const t = cfg.thickness;
  if (cfg.measure === "interior") {
    return { length: cfg.length, height: cfg.height, depth: cfg.depth };
  }
  if (cfg.measure === "exterior") {
    return {
      length: Math.max(1, cfg.length - 2 * t),
      height: Math.max(1, cfg.height - (cfg.lid ? 2 : 1) * t),
      depth: Math.max(1, cfg.depth - 2 * t),
    };
  }
  // cell mode: dimensions describe a single cell interior
  return {
    length: cfg.length * cfg.cols + t * (cfg.cols - 1),
    height: cfg.height,
    depth: cfg.depth * cfg.rows + t * (cfg.rows - 1),
  };
}

export function buildBox(cfg: BoxConfig): BuiltBox {
  const t = cfg.thickness;
  const interior = resolveInterior(cfg);
  const W = interior.length; // X
  const D = interior.depth; // Y
  const H = interior.height; // Z

  const OW = W + 2 * t;
  const OD = D + 2 * t;
  const OH = H + (cfg.lid ? 2 : 1) * t;

  const finger = cfg.joint === "finger";
  const tab = (m: EdgeMode): EdgeMode => (finger ? m : "flat");

  const panels: Panel[] = [];

  const alt = cfg.alternateCorners;

  // ---- Front / Back walls (in XZ plane). Own X-corners (tab) + own Z (tab). ----
  // nominal rect = (OW - 2t) x OH ; vertical edges tab outward in X, horizontal tab in Z(down/up)
  const fbW = OW - 2 * t;
  const fbEdges: PanelEdges = {
    bottom: tab("tab"),
    top: cfg.lid ? tab("tab") : "flat",
    left: tab("tab"),
    right: tab("tab"),
  };
  for (const which of ["Front", "Back"] as const) {
    const raw = rectPanel({
      width: fbW,
      height: OH,
      tooth: cfg.tooth,
      thickness: t,
      kerf: cfg.kerf,
      edges: fbEdges,
    });
    const nz = normalize(raw);
    panels.push({
      id: which.toLowerCase(),
      label: which,
      outline: nz.pts,
      holes: [],
      width: nz.w,
      height: nz.h,
      placement: {
        size: [OW, t, OH],
        pos: [0, which === "Front" ? -OD / 2 + t / 2 : OD / 2 - t / 2, 0],
      },
    });
  }

  // ---- Left / Right walls (in YZ plane). Slot in X (receive FB tabs), tab in Z. ----
  const lrEdges: PanelEdges = {
    bottom: tab("tab"),
    top: cfg.lid ? tab("tab") : "flat",
    left: tab("slot"),
    right: tab("slot"),
  };
  const lrStart = alt
    ? { left: false, right: false, bottom: false, top: false }
    : undefined;
  for (const which of ["Left", "Right"] as const) {
    const raw = rectPanel({
      width: OD,
      height: OH,
      tooth: cfg.tooth,
      thickness: t,
      kerf: cfg.kerf,
      edges: lrEdges,
      start: lrStart,
    });
    const nz = normalize(raw);
    panels.push({
      id: which.toLowerCase(),
      label: which,
      outline: nz.pts,
      holes: [],
      width: nz.w,
      height: nz.h,
      placement: {
        size: [t, OD, OH],
        pos: [which === "Left" ? -OW / 2 + t / 2 : OW / 2 - t / 2, 0, 0],
      },
    });
  }

  // ---- Bottom / Top plates (in XY plane). Slot on all edges (receive wall tabs). ----
  const plateEdges: PanelEdges = {
    bottom: tab("slot"),
    top: tab("slot"),
    left: tab("slot"),
    right: tab("slot"),
  };
  const makePlate = (id: string, label: string, zPos: number) => {
    const raw = rectPanel({
      width: OW - 2 * t,
      height: OD - 2 * t,
      tooth: cfg.tooth,
      thickness: t,
      kerf: cfg.kerf,
      edges: plateEdges,
    });
    // divider slots in the plate
    const holes: Point[][] = [];
    const b = bounds(raw);
    const innerW = OW - 2 * t;
    const innerD = OD - 2 * t;
    if (cfg.dividersX && cfg.cols > 1 && finger) {
      for (let c = 1; c < cfg.cols; c++) {
        const x = b.minX + (innerW * c) / cfg.cols;
        holes.push(slotRect(x, b.minY + innerD / 2, t, innerD - 4 * t, "v"));
      }
    }
    if (cfg.dividersY && cfg.rows > 1 && finger) {
      for (let r = 1; r < cfg.rows; r++) {
        const y = b.minY + (innerD * r) / cfg.rows;
        holes.push(slotRect(b.minX + innerW / 2, y, innerW - 4 * t, t, "h"));
      }
    }
    const nz = normalize(raw);
    const dx = nz.pts[0].x - raw[0].x;
    const dy = nz.pts[0].y - raw[0].y;
    panels.push({
      id,
      label,
      outline: nz.pts,
      holes: holes.map((h) => h.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
      width: nz.w,
      height: nz.h,
      placement: {
        size: [OW, OD, t],
        pos: [0, 0, zPos],
      },
    });
  };
  makePlate("bottom", "Bottom", -OH / 2 + t / 2);
  if (cfg.lid) makePlate("top", "Top", OH / 2 - t / 2);

  // ---- Dividers (cross-lapped grid) ----
  if (finger) {
    if (cfg.dividersX && cfg.cols > 1) {
      for (let c = 1; c < cfg.cols; c++) {
        const p = makeDivider(`div-x-${c}`, `Divider X${c}`, D, H, t, cfg, "x");
        const xPos = -W / 2 + (W * c) / cfg.cols;
        p.placement = { size: [t, D, H], pos: [xPos, 0, -OH / 2 + t + H / 2] };
        panels.push(p);
      }
    }
    if (cfg.dividersY && cfg.rows > 1) {
      for (let r = 1; r < cfg.rows; r++) {
        const p = makeDivider(`div-y-${r}`, `Divider Y${r}`, W, H, t, cfg, "y");
        const yPos = -D / 2 + (D * r) / cfg.rows;
        p.placement = { size: [W, t, H], pos: [0, yPos, -OH / 2 + t + H / 2] };
        panels.push(p);
      }
    }
  }

  const volume = W * D * H;
  return {
    panels,
    interior: { length: W, height: H, depth: D },
    exterior: { length: OW, height: OH, depth: OD },
    volume,
    cells: { x: cfg.cols, y: cfg.rows },
  };
}

/** Axis-aligned rectangular slot (clockwise hole) centred at (cx,cy). */
function slotRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  _dir: "h" | "v",
): Point[] {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: cx - hw, y: cy - hh },
    { x: cx - hw, y: cy + hh },
    { x: cx + hw, y: cy + hh },
    { x: cx + hw, y: cy - hh },
  ];
}

/**
 * Cross-lapped divider panel. `length` along its run, `height` vertical.
 * Bottom edge tabs into the base plate; the run edges are flat; cross-lap
 * notches let X and Y dividers interlock.
 */
function makeDivider(
  id: string,
  label: string,
  length: number,
  height: number,
  t: number,
  cfg: BoxConfig,
  axis: "x" | "y",
): Panel {
  const edges: PanelEdges = {
    bottom: "tab",
    top: "flat",
    left: "flat",
    right: "flat",
  };
  const raw = rectPanel({
    width: length,
    height,
    tooth: cfg.tooth,
    thickness: t,
    kerf: cfg.kerf,
    edges,
  });
  const b = bounds(raw);
  const holes: Point[][] = [];
  // cross-lap notches: X dividers notch from top, Y dividers from bottom
  const crossCount = axis === "x" ? cfg.rows : cfg.cols;
  const crossOn = axis === "x" ? cfg.dividersY : cfg.dividersX;
  if (crossOn && crossCount > 1) {
    for (let i = 1; i < crossCount; i++) {
      const along = b.minX + (length * i) / crossCount;
      // half-height open notch (rendered as a hole that breaks one edge visually)
      const half = height / 2;
      const yc = axis === "x" ? b.maxY - half / 2 : b.minY + half / 2;
      holes.push(slotRect(along, yc, t + cfg.kerf, half, "v"));
    }
  }
  const nz = normalize(raw);
  const dx = nz.pts[0].x - raw[0].x;
  const dy = nz.pts[0].y - raw[0].y;
  return {
    id,
    label,
    outline: nz.pts,
    holes: holes.map((h) => h.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
    width: nz.w,
    height: nz.h,
    placement: { size: [t, length, height], pos: [0, 0, 0] },
  };
}
