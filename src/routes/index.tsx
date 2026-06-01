import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Zap, Box as BoxIcon } from "lucide-react";
import { buildBox } from "@/lib/box/geometry";
import { buildSvg, downloadSvg } from "@/lib/box/svg";
import { defaultConfig, presets } from "@/lib/box/presets";
import type { BoxConfig, MeasureMode, Units } from "@/lib/box/types";
import { Viewer3D, type ViewPreset } from "@/components/box/Viewer3D";
import {
  FieldLabel,
  NumberInput,
  SegmentedControl,
  Section,
  Slider,
  Toggle,
} from "@/components/box/controls";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Box Studio — Finger Joint Box Generator" },
      {
        name: "description",
        content:
          "Design laser-cut finger joint boxes with grid dividers. Live 3D preview and instant SVG export for laser cutting.",
      },
      { property: "og:title", content: "Box Studio — Finger Joint Box Generator" },
      {
        property: "og:description",
        content:
          "Design laser-cut finger joint boxes with grid dividers and export ready-to-cut SVG files.",
      },
    ],
  }),
  component: App,
});

const num = (v: number, u: Units) =>
  u === "mm" ? v.toFixed(0) : (v / 25.4).toFixed(2);

function App() {
  const [cfg, setCfg] = useState<BoxConfig>(defaultConfig);
  const [units, setUnits] = useState<Units>("mm");
  const [view, setView] = useState<ViewPreset>("perspective");

  const box = useMemo(() => buildBox(cfg), [cfg]);
  const set = <K extends keyof BoxConfig>(k: K, v: BoxConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const u = units === "mm" ? "mm" : "in";
  const dim = (v: number) => `${num(v, units)} ${u}`;

  const handleDownload = () => {
    const svg = buildSvg(box, { labels: true });
    downloadSvg(svg, `box-studio-${box.exterior.length}x${box.exterior.depth}.svg`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-panel px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="flex items-center gap-2 font-display text-xl font-700 text-foreground">
            <BoxIcon className="h-5 w-5 text-primary" strokeWidth={2.4} />
            Box <span className="text-primary">Studio</span>
          </span>
          <span className="label-caps text-muted-foreground">Grid Divider</span>
        </div>
        <SegmentedControl
          options={[
            { value: "mm", label: "MM" },
            { value: "in", label: "IN" },
          ]}
          value={units}
          onChange={(v) => setUnits(v as Units)}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-border bg-panel">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Section title="Presets" defaultOpen>
              <p className="-mt-1 text-xs text-muted-foreground">
                Load a starting configuration.
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCfg(p.config)}
                    className="group flex items-center justify-between rounded-sm border border-border bg-field px-3 py-2 text-left transition-colors hover:border-primary"
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Zap className="h-3 w-3 text-primary" />
                        {p.name}
                      </span>
                      <span className="text-[0.7rem] text-muted-foreground">
                        {p.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Dimensions">
              <div className="space-y-1.5">
                <FieldLabel>Measurement mode</FieldLabel>
                <SegmentedControl
                  options={[
                    { value: "interior", label: "Interior" },
                    { value: "exterior", label: "Exterior" },
                    { value: "cell", label: "Cell" },
                  ]}
                  value={cfg.measure}
                  onChange={(v) => set("measure", v as MeasureMode)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <FieldLabel>Length</FieldLabel>
                  <NumberInput value={cfg.length} onChange={(v) => set("length", v)} min={10} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Height</FieldLabel>
                  <NumberInput value={cfg.height} onChange={(v) => set("height", v)} min={10} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Depth</FieldLabel>
                  <NumberInput value={cfg.depth} onChange={(v) => set("depth", v)} min={10} />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel value={`${cfg.thickness.toFixed(1)} mm`}>
                  Material thickness
                </FieldLabel>
                <Slider value={cfg.thickness} onChange={(v) => set("thickness", v)} min={1} max={12} step={0.5} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-sm border border-border bg-field/60 p-3">
                <Readout label="Ext. length" value={dim(box.exterior.length)} />
                <Readout label="Ext. height" value={dim(box.exterior.height)} />
                <Readout label="Ext. depth" value={dim(box.exterior.depth)} />
                <Readout label="Panels" value={`${box.panels.length}`} />
              </div>
            </Section>

            <Section title="Dividers">
              <div className="space-y-1.5">
                <FieldLabel value={cfg.cols}>Columns (X)</FieldLabel>
                <Slider value={cfg.cols} onChange={(v) => set("cols", v)} min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel value={cfg.rows}>Rows (Y)</FieldLabel>
                <Slider value={cfg.rows} onChange={(v) => set("rows", v)} min={1} max={10} />
              </div>
              <Toggle label="Dividers in X" checked={cfg.dividersX} onChange={(v) => set("dividersX", v)} />
              <Toggle label="Dividers in Y" checked={cfg.dividersY} onChange={(v) => set("dividersY", v)} />
            </Section>

            <Section title="Finger Joints">
              <div className="space-y-1.5">
                <FieldLabel>Joint type</FieldLabel>
                <SegmentedControl
                  options={[
                    { value: "finger", label: "Finger" },
                    { value: "butt", label: "Butt" },
                  ]}
                  value={cfg.joint}
                  onChange={(v) => set("joint", v as BoxConfig["joint"])}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel value={`${cfg.tooth.toFixed(1)} mm`}>Tooth size</FieldLabel>
                <Slider value={cfg.tooth} onChange={(v) => set("tooth", v)} min={4} max={40} step={0.5} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel value={`${cfg.kerf.toFixed(2)} mm`}>Kerf / tolerance</FieldLabel>
                <Slider value={cfg.kerf} onChange={(v) => set("kerf", v)} min={0} max={0.5} step={0.01} />
              </div>
              <Toggle
                label="Alternate corner teeth"
                checked={cfg.alternateCorners}
                onChange={(v) => set("alternateCorners", v)}
              />
            </Section>

            <Section title="Lid" defaultOpen={false}>
              <Toggle label="Include top lid" checked={cfg.lid} onChange={(v) => set("lid", v)} />
            </Section>

            <Section title="3D View" defaultOpen={false}>
              <SegmentedControl
                options={[
                  { value: "perspective", label: "3D" },
                  { value: "front", label: "Front" },
                  { value: "top", label: "Top" },
                  { value: "side", label: "Side" },
                ]}
                value={view}
                onChange={(v) => setView(v as ViewPreset)}
              />
            </Section>
          </div>

          <div className="border-t border-border p-4">
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-success px-4 py-3 label-caps font-bold text-success-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Download SVG (laser cut)
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <main className="relative min-w-0 flex-1">
          <Viewer3D box={box} view={view} />

          <div className="pointer-events-none absolute left-6 top-6 rounded-sm border border-border bg-panel/85 px-4 py-3 backdrop-blur-sm">
            <p className="label-caps text-muted-foreground">Interior volume</p>
            <p className="text-2xl font-700 tabular-nums text-foreground">
              {box.volume.toLocaleString("en-US")}{" "}
              <span className="text-sm text-muted-foreground">mm³</span>
            </p>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-sm border border-border bg-panel/85 px-4 py-2 backdrop-blur-sm">
            <span className="label-caps text-muted-foreground">Cells: </span>
            <span className="label-caps font-bold text-primary">
              {box.cells.x} × {box.cells.y} = {box.cells.x * box.cells.y}
            </span>
          </div>

          <div className="pointer-events-none absolute right-6 top-6 space-y-0.5 text-right">
            <p className="label-caps text-muted-foreground">Drag · rotate</p>
            <p className="label-caps text-muted-foreground">Scroll · zoom</p>
            <p className="label-caps text-muted-foreground">Shift + drag · pan</p>
          </div>

          <SegmentedView view={view} setView={setView} />
        </main>
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="text-sm tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function SegmentedView({
  view,
  setView,
}: {
  view: ViewPreset;
  setView: (v: ViewPreset) => void;
}) {
  const items: { v: ViewPreset; l: string }[] = [
    { v: "perspective", l: "Perspective" },
    { v: "front", l: "Front" },
    { v: "top", l: "Top" },
    { v: "side", l: "Side" },
  ];
  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-sm border border-border bg-panel/85 p-1 backdrop-blur-sm">
      {items.map((it) => (
        <button
          key={it.v}
          onClick={() => setView(it.v)}
          className={`rounded-[3px] px-3 py-1.5 label-caps font-medium transition-colors ${
            view === it.v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {it.l}
        </button>
      ))}
    </div>
  );
}
