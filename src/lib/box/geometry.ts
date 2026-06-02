import type { BoxConfig, BuiltBox, FingerStyle, Panel, Point } from "./types";

function fingerCount(length: number, tooth: number): { n: number; fw: number } {
  let n = Math.max(1, Math.round(length / Math.max(tooth, 0.5)));
  if (n % 2 === 0) n += 1;
  return { n, fw: length / n };
}

function pushPoint(points: Point[], x: number, y: number) {
  const prev = points[points.length - 1];
  if (!prev || Math.abs(prev.x - x) > 1e-6 || Math.abs(prev.y - y) > 1e-6) {
    points.push({ x, y });
  }
}

function featureOnIndex(i: number, flip = false) {
  return flip ? i % 2 === 0 : i % 2 !== 0;
}

/**
 * Emit one tooth (tab) along an edge. The tooth baseline runs from
 * (sx,sy) to (ex,ey); (ox,oy) is the outward protrusion vector (= depth).
 * The shape of the protruding tip is controlled by `style`:
 *  - box: square tab (default)
 *  - chamfer: 45° cut on the two outer corners
 *  - dovetail: trapezoidal tab, wider at the tip
 */
function emitTab(
  pts: Point[],
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  ox: number,
  oy: number,
  style: FingerStyle = "box",
) {
  const len = Math.hypot(ex - sx, ey - sy) || 1;
  const ux = (ex - sx) / len;
  const uy = (ey - sy) / len;

  pushPoint(pts, sx, sy);

  if (style === "dovetail") {
    const d = Math.min(len * 0.18, len / 3);
    pushPoint(pts, sx + ox - ux * d, sy + oy - uy * d);
    pushPoint(pts, ex + ox + ux * d, ey + oy + uy * d);
  } else if (style === "chamfer") {
    const depth = Math.hypot(ox, oy) || 1;
    const c = Math.min(len * 0.28, depth * 0.7);
    const fx = c / depth;
    pushPoint(pts, sx + ox * (1 - fx), sy + oy * (1 - fx));
    pushPoint(pts, sx + ox + ux * c, sy + oy + uy * c);
    pushPoint(pts, ex + ox - ux * c, ey + oy - uy * c);
    pushPoint(pts, ex + ox * (1 - fx), ey + oy * (1 - fx));
  } else {
    pushPoint(pts, sx + ox, sy + oy);
    pushPoint(pts, ex + ox, ey + oy);
  }

  pushPoint(pts, ex, ey);
}

interface EdgeSlot {
  start: number;
  end: number;
  depth: number;
}

function mergeEdgeSlots(length: number, slots: EdgeSlot[]) {
  const cleaned = slots
    .map((slot) => ({
      start: Math.max(0, Math.min(length, slot.start)),
      end: Math.max(0, Math.min(length, slot.end)),
      depth: Math.max(0, slot.depth),
    }))
    .filter((slot) => slot.end - slot.start > 1e-6 && slot.depth > 1e-6);

  if (cleaned.length === 0) return [] as EdgeSlot[];

  const boundaries = Array.from(
    new Set([0, length, ...cleaned.flatMap((slot) => [slot.start, slot.end])].map((v) => Number(v.toFixed(6)))),
  ).sort((a, b) => a - b);

  const merged: EdgeSlot[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (end - start <= 1e-6) continue;
    const mid = (start + end) / 2;
    const depth = cleaned.reduce((max, slot) => {
      return mid >= slot.start - 1e-6 && mid <= slot.end + 1e-6 ? Math.max(max, slot.depth) : max;
    }, 0);
    if (depth <= 1e-6) continue;

    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.end - start) <= 1e-6 && Math.abs(prev.depth - depth) <= 1e-6) {
      prev.end = end;
    } else {
      merged.push({ start, end, depth });
    }
  }

  return merged;
}

function fingerTopEdgeSlots(length: number, tooth: number, thickness: number, kerf: number) {
  const { n, fw } = fingerCount(length, tooth);
  const k = kerf / 2;
  const slots: EdgeSlot[] = [];

  for (let i = 0; i < n; i++) {
    if (!featureOnIndex(i, false)) continue;
    slots.push({
      start: i * fw + k,
      end: (i + 1) * fw - k,
      depth: thickness,
    });
  }

  return slots;
}

function dividerTopEdgeSlots(length: number, positions: number[], slotWidth: number, depth: number) {
  return positions
    .map((x) => ({
      start: x - slotWidth / 2,
      end: x + slotWidth / 2,
      depth,
    }))
    .filter((slot) => slot.start >= 0 && slot.end <= length);
}

function traceTopEdge(points: Point[], length: number, slots: EdgeSlot[]) {
  pushPoint(points, 0, 0);
  for (const slot of mergeEdgeSlots(length, slots)) {
    pushPoint(points, slot.start, 0);
    pushPoint(points, slot.start, slot.depth);
    pushPoint(points, slot.end, slot.depth);
    pushPoint(points, slot.end, 0);
  }
  pushPoint(points, length, 0);
}

function buildBottomOutline(
  W: number,
  D: number,
  t: number,
  tooth: number,
  kerf: number,
  style: FingerStyle = "box",
) {
  const { n: nW, fw } = fingerCount(W, tooth);
  const { n: nD, fw: fd } = fingerCount(D, tooth);
  const k = kerf / 2;
  const pts: Point[] = [];

  pushPoint(pts, 0, 0);
  for (let i = 0; i < nW; i++) {
    const x1 = i * fw + k;
    const x2 = (i + 1) * fw - k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, x1, 0, x2, 0, 0, -t, style);
    }
    pushPoint(pts, (i + 1) * fw, 0);
  }
  for (let i = 0; i < nD; i++) {
    const y1 = i * fd + k;
    const y2 = (i + 1) * fd - k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, W, y1, W, y2, t, 0, style);
    }
    pushPoint(pts, W, (i + 1) * fd);
  }
  for (let i = nW - 1; i >= 0; i--) {
    const x1 = (i + 1) * fw - k;
    const x2 = i * fw + k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, x1, D, x2, D, 0, t, style);
    }
    pushPoint(pts, i * fw, D);
  }
  for (let i = nD - 1; i >= 0; i--) {
    const y1 = (i + 1) * fd - k;
    const y2 = i * fd + k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, 0, y1, 0, y2, -t, 0, style);
    }
    pushPoint(pts, 0, i * fd);
  }
  return pts;
}

function buildFrontBackOutline(
  W: number,
  H: number,
  t: number,
  tooth: number,
  kerf: number,
  slotPositions: number[],
  includeTopFingerSlots: boolean,
  style: FingerStyle = "box",
  closeTopSlots = false,
): { pts: Point[]; holes: Point[][] } {
  const { n: nW, fw } = fingerCount(W, tooth);
  const { n: nH, fw: fh } = fingerCount(H, tooth);
  const k = kerf / 2;
  const slotWidth = t + kerf;
  const slotDepth = H / 2;
  const pts: Point[] = [];

  traceTopEdge(pts, W, [
    ...(closeTopSlots ? [] : dividerTopEdgeSlots(W, slotPositions, slotWidth, slotDepth)),
    ...(includeTopFingerSlots ? fingerTopEdgeSlots(W, tooth, t, kerf) : []),
  ]);

  for (let i = 0; i < nH; i++) {
    const y1 = i * fh + k;
    const y2 = (i + 1) * fh - k;
    if (featureOnIndex(i, true)) {
      if (i === 0) {
        pushPoint(pts, W + t, y1);
        pushPoint(pts, W + t, y2);
      } else if (i === nH - 1) {
        pushPoint(pts, W, y1);
        pushPoint(pts, W + t, y1);
        pushPoint(pts, W + t, H);
        pushPoint(pts, W + t, H + t);
      } else {
        emitTab(pts, W, y1, W, y2, t, 0, style);
      }
    }
    if (!(featureOnIndex(i, true) && i === nH - 1)) {
      pushPoint(pts, W, (i + 1) * fh);
    }
  }

  for (let i = nW - 1; i >= 0; i--) {
    const x1 = (i + 1) * fw - k;
    const x2 = i * fw + k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, x1, H + t, x2, H + t, 0, -t, style);
    }
    pushPoint(pts, i * fw, H + t);
  }

  pushPoint(pts, -t, H + t);
  pushPoint(pts, -t, H);
  for (let i = nH - 1; i >= 0; i--) {
    const y1 = (i + 1) * fh - k;
    const y2 = i * fh + k;
    if (featureOnIndex(i, true)) {
      if (i === nH - 1) {
        pushPoint(pts, -t, y1);
        pushPoint(pts, -t, y2);
        pushPoint(pts, 0, y2);
      } else {
        emitTab(pts, 0, y1, 0, y2, -t, 0, style);
      }
    }
    pushPoint(pts, 0, i * fh);
  }

  const holes: Point[][] = [];
  if (closeTopSlots) {
    for (const x of slotPositions) {
      const x1 = x - slotWidth / 2;
      const x2 = x + slotWidth / 2;
      if (x1 < 0 || x2 > W) continue;
      const y1 = t;
      const y2 = t + slotDepth;
      holes.push([
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ]);
    }
  }

  return { pts, holes };
}

function buildSideOutline(
  D: number,
  H: number,
  t: number,
  tooth: number,
  kerf: number,
  slotPositions: number[],
  includeTopFingerSlots: boolean,
  style: FingerStyle = "box",
  closeTopSlots = false,
): { pts: Point[]; holes: Point[][] } {
  const { n: nD, fw: fd } = fingerCount(D, tooth);
  const { n: nH, fw: fh } = fingerCount(H, tooth);
  const k = kerf / 2;
  const slotWidth = t + kerf;
  const slotDepth = H / 2;
  const pts: Point[] = [];

  traceTopEdge(pts, D, [
    ...(closeTopSlots ? [] : dividerTopEdgeSlots(D, slotPositions, slotWidth, slotDepth)),
    ...(includeTopFingerSlots ? fingerTopEdgeSlots(D, tooth, t, kerf) : []),
  ]);

  for (let i = 0; i < nH; i++) {
    const y1 = i * fh + k;
    const y2 = (i + 1) * fh - k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, D, y1, D, y2, t, 0, style);
    }
    pushPoint(pts, D, (i + 1) * fh);
  }
  pushPoint(pts, D, H + t);

  for (let i = nD - 1; i >= 0; i--) {
    const x1 = (i + 1) * fd - k;
    const x2 = i * fd + k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, x1, H + t, x2, H + t, 0, -t, style);
    }
    pushPoint(pts, i * fd, H + t);
  }

  pushPoint(pts, 0, H);
  for (let i = nH - 1; i >= 0; i--) {
    const y1 = (i + 1) * fh - k;
    const y2 = i * fh + k;
    if (featureOnIndex(i, false)) {
      emitTab(pts, 0, y1, 0, y2, -t, 0, style);
    }
    pushPoint(pts, 0, i * fh);
  }

  return pts;
}

function buildDividerOutline(
  length: number,
  height: number,
  t: number,
  crossCount: number,
  crossSpacing: number,
  slotFromTop: boolean,
  kerf: number,
) {
  const bx = t;
  const by = 0;
  const sw = t + kerf * 2;
  const sh = height / 2;
  const pts: Point[] = [];

  pushPoint(pts, bx, by + height);
  if (!slotFromTop) {
    for (let s = 1; s < crossCount; s++) {
      const cp = s * crossSpacing;
      pushPoint(pts, bx + cp - sw / 2, by + height);
      pushPoint(pts, bx + cp - sw / 2, by + sh);
      pushPoint(pts, bx + cp + sw / 2, by + sh);
      pushPoint(pts, bx + cp + sw / 2, by + height);
    }
  }
  pushPoint(pts, bx + length, by + height);
  pushPoint(pts, bx + length, by + sh);
  pushPoint(pts, bx + length + t, by + sh);
  pushPoint(pts, bx + length + t, by);
  pushPoint(pts, bx + length, by);

  if (slotFromTop) {
    for (let s = crossCount - 1; s >= 1; s--) {
      const cp = s * crossSpacing;
      pushPoint(pts, bx + cp + sw / 2, by);
      pushPoint(pts, bx + cp + sw / 2, by + sh);
      pushPoint(pts, bx + cp - sw / 2, by + sh);
      pushPoint(pts, bx + cp - sw / 2, by);
    }
  }

  pushPoint(pts, bx, by);
  pushPoint(pts, bx - t, by);
  pushPoint(pts, bx - t, by + sh);
  pushPoint(pts, bx, by + sh);
  return pts;
}

function buildRectOutline(width: number, height: number) {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
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
      height: Math.max(1, cfg.height - t),
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
  const W = interior.length;
  const H = interior.height;
  const D = interior.depth;

  const OW = W + 2 * t;
  const OD = D + 2 * t;
  const OH = H + t;
  const useFinger = cfg.joint === "finger";
  const panels: Panel[] = [];

  const pushPanel = (
    id: string,
    label: string,
    raw: Point[],
    size: [number, number, number],
    pos: [number, number, number],
  ) => {
    const nz = normalize(raw);
    panels.push({
      id,
      label,
      outline: nz.pts,
      holes: [],
      width: nz.w,
      height: nz.h,
      placement: { size, pos },
    });
  };

  const divXSlots = cfg.dividersX && cfg.cols > 1
    ? Array.from({ length: cfg.cols - 1 }, (_, i) => ((i + 1) * W) / cfg.cols)
    : [];
  const divYSlots = cfg.dividersY && cfg.rows > 1
    ? Array.from({ length: cfg.rows - 1 }, (_, i) => ((i + 1) * D) / cfg.rows)
    : [];

  const fs = cfg.fingerStyle;
  const topFingers = useFinger && cfg.topFingers;

  pushPanel(
    "bottom",
    "Bottom",
    useFinger ? buildBottomOutline(W, D, t, cfg.tooth, cfg.kerf, fs) : buildRectOutline(W, D),
    [useFinger ? OW : W, useFinger ? OD : D, t],
    [0, 0, t / 2],
  );

  const frontRaw = useFinger
    ? buildFrontBackOutline(W, H, t, cfg.tooth, cfg.kerf, divXSlots, topFingers, fs)
    : buildRectOutline(OW, OH);
  const backRaw = useFinger
    ? buildFrontBackOutline(W, H, t, cfg.tooth, cfg.kerf, divXSlots, topFingers, fs)
    : buildRectOutline(OW, OH);
  pushPanel("front", "Front", frontRaw, [OW, t, OH], [0, -(D / 2 + t / 2), OH / 2]);
  pushPanel("back", "Back", backRaw, [OW, t, OH], [0, D / 2 + t / 2, OH / 2]);

  const sideRaw = useFinger
    ? buildSideOutline(D, H, t, cfg.tooth, cfg.kerf, divYSlots, topFingers, fs)
    : buildRectOutline(D, OH);
  pushPanel("left", "Left", sideRaw, [t, useFinger ? OD : D, OH], [-(W / 2 + t / 2), 0, OH / 2]);
  pushPanel("right", "Right", sideRaw, [t, useFinger ? OD : D, OH], [W / 2 + t / 2, 0, OH / 2]);

  if (cfg.lid) {
    pushPanel(
      "top",
      "Top",
      topFingers
        ? buildBottomOutline(W, D, t, cfg.tooth, cfg.kerf, "box")
        : buildRectOutline(OW, OD),
      [OW, OD, t],
      [0, 0, OH - t / 2],
    );
  }

  // When a lid is present, dividers stop exactly at the underside of the lid
  // (one material thickness below the wall top) so they seat flush against the
  // lid without leaving a visible gap.
  const divH = cfg.lid ? Math.max(1, H - t) : H;

  if (cfg.dividersY && cfg.rows > 1) {
    for (let r = 1; r < cfg.rows; r++) {
      const raw = useFinger
        ? buildDividerOutline(W, divH, t, cfg.cols, W / cfg.cols, true, cfg.kerf)
        : buildRectOutline(W, divH);
      pushPanel(
        `div-y-${r}`,
        `Divider Y${r}`,
        raw,
        [useFinger ? OW : W, t, divH],
        [0, -D / 2 + (r * D) / cfg.rows, t + divH / 2],
      );
    }
  }

  if (cfg.dividersX && cfg.cols > 1) {
    for (let c = 1; c < cfg.cols; c++) {
      const raw = useFinger
        ? buildDividerOutline(D, divH, t, cfg.rows, D / cfg.rows, false, cfg.kerf)
        : buildRectOutline(D, divH);
      pushPanel(
        `div-x-${c}`,
        `Divider X${c}`,
        raw,
        [t, useFinger ? OD : D, divH],
        [-W / 2 + (c * W) / cfg.cols, 0, t + divH / 2],
      );
    }
  }

  return {
    panels,
    interior: { length: W, height: H, depth: D },
    exterior: { length: OW, height: OH, depth: OD },
    volume: W * D * H,
    cells: { x: cfg.cols, y: cfg.rows },
  };
}
