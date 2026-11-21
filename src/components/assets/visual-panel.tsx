"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { visualAssets, type DisplayVisualAssetId } from "@/data/visuals/assets";

export type VisualPanelOverlay = "left" | "right" | "bottom" | "none";
export type VisualPanelTreatment = "paper" | "raw" | "darkCaption" | "inset" | "ambient" | "cutout";

const overlayClasses: Record<VisualPanelOverlay, string> = {
  left: "bg-gradient-to-r from-[color-mix(in_srgb,var(--night)_78%,transparent)] via-[color-mix(in_srgb,var(--night)_22%,transparent)] to-transparent",
  right: "bg-gradient-to-l from-[color-mix(in_srgb,var(--night)_78%,transparent)] via-[color-mix(in_srgb,var(--night)_22%,transparent)] to-transparent",
  bottom: "bg-gradient-to-t from-[color-mix(in_srgb,var(--night)_72%,transparent)] via-[color-mix(in_srgb,var(--night)_18%,transparent)] to-transparent",
  none: ""
};

const treatmentStyles: Record<VisualPanelTreatment, { frame: string; image: string }> = {
  cutout: { frame: "overflow-visible bg-transparent", image: "object-contain" },
  paper: { frame: "overflow-hidden rounded-[var(--screen-radius)] bg-[var(--art-surface)]", image: "object-contain" },
  raw: { frame: "overflow-hidden rounded-[var(--screen-radius)] bg-[var(--art-surface)]", image: "object-contain" },
  darkCaption: { frame: "overflow-hidden rounded-[var(--screen-radius)] bg-[var(--art-surface)]", image: "object-contain" },
  inset: { frame: "overflow-hidden rounded-[var(--screen-radius-sm)] bg-[var(--art-surface)]", image: "object-contain" },
  ambient: { frame: "overflow-hidden rounded-[var(--hero-radius)] bg-[var(--art-surface)]", image: "object-contain" }
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
        {resolvedImageState.failed && !decorative ? (
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
        {overlayClass ? <div className={cn("pointer-events-none absolute inset-0", overlayClass)} /> : null}
      </div>
    </div>
  );
}
