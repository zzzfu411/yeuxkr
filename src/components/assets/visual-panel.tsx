"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { visualAssets, type DisplayVisualAssetId } from "@/data/visuals/assets";

export type VisualPanelOverlay = "left" | "right" | "bottom" | "none";
export type VisualPanelTreatment = "paper" | "raw" | "darkCaption" | "inset" | "ambient";

const overlayClasses: Record<VisualPanelOverlay, string> = {
  left: "bg-gradient-to-r from-[color-mix(in_srgb,var(--night)_78%,transparent)] via-[color-mix(in_srgb,var(--night)_22%,transparent)] to-transparent",
  right: "bg-gradient-to-l from-[color-mix(in_srgb,var(--night)_78%,transparent)] via-[color-mix(in_srgb,var(--night)_22%,transparent)] to-transparent",
  bottom: "bg-gradient-to-t from-[color-mix(in_srgb,var(--night)_72%,transparent)] via-[color-mix(in_srgb,var(--night)_18%,transparent)] to-transparent",
  none: ""
};

const treatmentStyles: Record<
  VisualPanelTreatment,
  {
    frame: string;
    image: string;
    wash?: string;
    grid?: string;
  }
> = {
  paper: {
    frame: "overflow-hidden rounded-[var(--screen-radius)] border border-[var(--line)] bg-[var(--paper-lo)]",
    image: "object-cover saturate-[0.88] contrast-[0.98]",
    wash: "bg-[linear-gradient(180deg,var(--scene-sheen),transparent_42%,var(--scene-shade))]"
  },
  raw: {
    frame: "overflow-hidden rounded-[var(--screen-radius)] border border-[var(--line)] bg-[var(--paper-lo)]",
    image: "object-cover saturate-[0.92] contrast-[1.01]"
  },
  darkCaption: {
    frame: "overflow-hidden rounded-[var(--screen-radius)] border border-[var(--line)] bg-[var(--night)]",
    image: "object-cover brightness-[0.82] saturate-[0.82]",
    wash: "bg-[linear-gradient(180deg,transparent_36%,color-mix(in_srgb,var(--night)_66%,transparent))]"
  },
  inset: {
    frame: "overflow-hidden rounded-[var(--screen-radius-sm)] border border-[var(--line)] bg-[var(--card)]",
    image: "object-cover scale-[1.01] saturate-[0.86] contrast-[0.98]",
    wash: "bg-[linear-gradient(145deg,var(--scene-sheen),transparent_52%,var(--scene-shade))]"
  },
  ambient: {
    frame: "overflow-hidden rounded-[var(--hero-radius)] border-0 bg-[var(--night)] shadow-none",
    image: "object-cover brightness-[0.8] saturate-[0.86] contrast-[1.02]",
    wash: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--night)_80%,transparent)_0%,color-mix(in_srgb,var(--night)_38%,transparent)_48%,color-mix(in_srgb,var(--night)_8%,transparent)_78%,transparent_100%)]"
  }
};

export function VisualPanel({
  asset,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 24rem",
  overlay = "none",
  objectPosition = "center",
  treatment = "paper",
  decorative = false,
  alt
}: {
  asset: DisplayVisualAssetId;
  className?: string;
  priority?: boolean;
  sizes?: string;
  overlay?: VisualPanelOverlay;
  objectPosition?: string;
  treatment?: VisualPanelTreatment;
  decorative?: boolean;
  alt?: string;
}) {
  const item = visualAssets[asset];
  const [imageState, setImageState] = useState<{ asset: DisplayVisualAssetId; src: string; failed: boolean }>({
    asset,
    src: item.src,
    failed: false
  });
  const overlayClass = overlayClasses[overlay];
  const style = treatmentStyles[treatment];
  const resolvedImageState = imageState.asset === asset
    ? imageState
    : { asset, src: item.src, failed: false };
  const fallbackLabel = alt ?? item.alt ?? item.manifestLabel;

  return (
    <div
      className={cn("visual-panel relative isolate min-h-56", style.frame, className)}
      role={resolvedImageState.failed && !decorative ? "img" : undefined}
      aria-label={resolvedImageState.failed && !decorative ? fallbackLabel : undefined}
    >
      <div className="absolute inset-0 overflow-hidden">
        {resolvedImageState.failed ? (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(140deg,var(--paper-hi),var(--paper-lo))]" />
            <div className="absolute inset-0 grid place-items-center p-5 text-center">
              <span className="max-w-56 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                {item.manifestLabel}
              </span>
            </div>
          </>
        ) : null}
        {!resolvedImageState.failed ? (
          <Image
            src={resolvedImageState.src}
            alt={decorative ? "" : alt ?? item.alt}
            aria-hidden={decorative || undefined}
            fill
            priority={priority}
            unoptimized
            className={style.image}
            sizes={sizes}
            style={{ objectPosition }}
            onError={() => {
              if (resolvedImageState.src !== item.source) {
                setImageState({ asset, src: item.source, failed: false });
              } else {
                setImageState({ asset, src: item.source, failed: true });
              }
            }}
          />
        ) : null}
        <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,var(--scene-sheen),transparent)]" />
        {style.wash ? <div className={cn("pointer-events-none absolute inset-0", style.wash)} /> : null}
        {style.grid ? <div className={cn("pointer-events-none absolute inset-0", style.grid)} /> : null}
        {overlayClass ? <div className={cn("pointer-events-none absolute inset-0", overlayClass)} /> : null}
      </div>
    </div>
  );
}
