import type { BuiltBox, Panel, Point } from "./types";

function pathFromLoop(loop: Point[], offX: number, offY: number): string {
  if (loop.length === 0) return "";
  const cmds = loop.map((p, i) => {
    const x = (p.x + offX).toFixed(3);
    const y = (p.y + offY).toFixed(3);
    return `${i === 0 ? "M" : "L"}${x} ${y}`;
  });
  return cmds.join(" ") + " Z";
}

interface Placed {
  panel: Panel;
  x: number;
  y: number;
}

/** Simple shelf packing of panels into rows. */
function pack(panels: Panel[], gap: number, maxWidth: number): { placed: Placed[]; w: number; h: number } {
  const placed: Placed[] = [];
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  let totalW = 0;
  for (const panel of panels) {
    if (cx > 0 && cx + panel.width > maxWidth) {
      cy += rowH + gap;
      cx = 0;
      rowH = 0;
    }
    placed.push({ panel, x: cx, y: cy });
    cx += panel.width + gap;
    rowH = Math.max(rowH, panel.height);
    totalW = Math.max(totalW, cx - gap);
  }
  return { placed, w: totalW, h: cy + rowH };
}

export interface SvgOptions {
  /** stroke colour for cut lines */
  cut?: string;
  /** show panel labels */
  labels?: boolean;
  /** background colour, null for transparent */
  background?: string | null;
}

export function buildSvg(box: BuiltBox, opts: SvgOptions = {}): string {
  const cut = opts.cut ?? "#c0532b";
  const gap = 8;
  const margin = 12;
  const target = Math.sqrt(
    box.panels.reduce((a, p) => a + p.width * p.height, 0),
  ) * 2.4;
  const maxWidth = Math.max(target, ...box.panels.map((p) => p.width));
  const { placed, w, h } = pack(box.panels, gap, maxWidth);
  const W = w + margin * 2;
  const H = h + margin * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(2)}mm" height="${H.toFixed(2)}mm" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">`,
  );
  if (opts.background) {
    parts.push(`<rect width="100%" height="100%" fill="${opts.background}"/>`);
  }
  for (const { panel, x, y } of placed) {
    const ox = x + margin;
    const oy = y + margin;
    let d = pathFromLoop(panel.outline, ox, oy);
    for (const hole of panel.holes) {
      d += " " + pathFromLoop(hole, ox, oy);
    }
    parts.push(
      `<path d="${d}" fill="none" stroke="${cut}" stroke-width="0.2" fill-rule="evenodd"/>`,
    );
    if (opts.labels) {
      parts.push(
        `<text x="${(ox + panel.width / 2).toFixed(2)}" y="${(oy + panel.height / 2).toFixed(2)}" font-family="monospace" font-size="3" fill="${cut}" fill-opacity="0.5" text-anchor="middle" dominant-baseline="middle">${panel.label}</text>`,
      );
    }
  }
  parts.push("</svg>");
  return parts.join("\n");
}

export function downloadSvg(svg: string, filename = "box.svg") {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
