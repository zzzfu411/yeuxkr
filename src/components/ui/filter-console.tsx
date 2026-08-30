import type { KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { VisualPanel } from "@/components/assets/visual-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  id: string;
  label: string;
}

export function SearchField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-normal text-[var(--ink-soft)]">
      {label}
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_62%,transparent)] px-10 text-base text-[var(--ink)] shadow-[inset_0_1px_0_var(--sheen)] transition placeholder:text-[var(--ink-faint)] hover:border-[var(--line-strong)]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

export function SegmentedFilter({
  label,
  value,
  options,
  onChange,
  className
}: {
  label: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number, direction: -1 | 1 | "first" | "last") => {
    const nextIndex = direction === "first"
      ? 0
      : direction === "last"
        ? options.length - 1
        : (currentIndex + direction + options.length) % options.length;
    const next = options[nextIndex];
    if (!next) return;

    const nextButton = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      .item(nextIndex);
    onChange(next.id);
    nextButton?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(event, index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(event, index, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveSelection(event, index, "first");
    } else if (event.key === "End") {
      event.preventDefault();
      moveSelection(event, index, "last");
    }
  };

  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-normal text-[var(--ink-soft)]">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={value === item.id}
            tabIndex={value === item.id ? 0 : -1}
            className={cn(
              "focus-ring min-h-10 rounded-[var(--radius)] border px-3 text-sm font-normal transition",
              value === item.id
                ? "border-[var(--line-strong)] bg-[var(--wash-3)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--ink-soft)]"
                : "border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_48%,transparent)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-[var(--wash-2)] hover:text-[var(--ink)]"
            )}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckboxFilter({
  label,
  checked,
  onChange,
  className
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "focus-ring grid min-h-10 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius)] border px-3 text-sm font-normal transition focus-within:border-[var(--line-strong)]",
        checked
          ? "border-[var(--line-strong)] bg-[var(--wash-3)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--ink-soft)]"
          : "border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_48%,transparent)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-[var(--wash-2)]",
        className
      )}
    >
      <input className="h-4 w-4 accent-[var(--ink-soft)]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function FilterSummary({
  count,
  unit = "results",
  filters
}: {
  count: number;
  unit?: string;
  filters: Array<string | null | undefined | false>;
}) {
  const activeFilters = filters.filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-normal text-[var(--muted)]">
      <span className="font-script text-sm font-normal text-[var(--ink-soft)]">
        {count} {unit}
      </span>
      {activeFilters.map((item) => (
        <span key={item} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] px-2.5 py-1 text-xs font-normal text-[var(--ink-soft)]">
          {item}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  copy,
  asset = "empty",
  actionLabel = "重置筛选",
  onAction
}: {
  title: string;
  copy: string;
  asset?: "empty" | "complete" | "review";
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <div className="grid gap-5 p-1 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
      <div>
        <p className="eyebrow">No Match</p>
        <h2 className="mt-1 font-brush text-2xl font-normal">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy}</p>
        <Button className="mt-4 w-fit" type="button" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
      <VisualPanel asset={asset} treatment="inset" overlay="bottom" className="min-h-44" sizes="15rem" />
    </div>
  );
}
