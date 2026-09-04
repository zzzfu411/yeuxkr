import { ABILITY_LABELS } from "@/lib/learning/workspace";
import type { AbilityId } from "@/lib/learning/types";

export function AbilityBars({ ability }: { ability: Record<AbilityId, number> }) {
  return (
    <div className="grid gap-3">
      {(Object.entries(ability) as Array<[AbilityId, number]>).map(([id, value]) => (
        <div key={id}>
          <div className="mb-1 flex justify-between gap-3 text-sm font-extrabold">
            <span id={`ability-${id}`}>{ABILITY_LABELS[id]}</span>
            <span className="font-mono">{value}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--track)]"
            role="progressbar"
            aria-labelledby={`ability-${id}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, value))}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--celadon)] via-[var(--ocean)] to-[var(--plum)]"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
