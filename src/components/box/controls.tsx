import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/70">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 label-caps font-medium text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {title}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="space-y-4 px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

export function FieldLabel({
  children,
  value,
}: {
  children: ReactNode;
  value?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="label-caps text-muted-foreground">{children}</span>
      {value !== undefined && (
        <span className="text-xs font-medium text-primary tabular-nums">{value}</span>
      )}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-sm border border-border bg-field px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
      {suffix && <span className="label-caps text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
          checked ? "border-success bg-success" : "border-border bg-muted"
        }`}
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-[3px]"
          }`}
        />
      </button>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-sm border border-border bg-field p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[3px] px-2 py-1.5 label-caps font-medium transition-colors ${
            value === o.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
