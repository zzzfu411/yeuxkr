"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { visualAssets, type DisplayVisualAssetId } from "@/data/visuals/assets";

export type VisualPanelOverlay = "left" | "right" | "bottom" | "none";
export type VisualPanelTreatment = "paper" | "raw" | "darkCaption" | "inset" | "ambient";

const overlayClasses: Record<VisualPanelOverlay, string> = {
  left: "bg-gradient-to-r from-[color-mix(in_srgb,var(--paper)_88%,transparent)] via-[color-mix(in_srgb,var(--paper)_24%,transparent)] to-transparent",
  right: "bg-gradient-to-l from-[color-mix(in_srgb,var(--paper)_88%,transparent)] via-[color-mix(in_srgb,var(--paper)_24%,transparent)] to-transparent",
  bottom: "bg-gradient-to-t from-[color-mix(in_srgb,var(--ink)_44%,transparent)] via-[color-mix(in_srgb,var(--ink)_12%,transparent)] to-transparent",
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
    frame: "border border-[var(--line)] bg-[var(--paper-deep)] shadow-paper-sm",
    image: "object-cover saturate-[0.72] contrast-[0.98]",
    wash: "bg-[linear-gradient(145deg,var(--sheen),transparent_44%,var(--shade))]"
  },
  raw: {
    frame: "border border-[var(--line)] bg-[var(--paper-deep)] shadow-paper-sm",
    image: "object-cover saturate-[0.78] contrast-[0.98]"
  },
  darkCaption: {
    frame: "border border-[var(--line)] bg-[var(--paper-lo)] shadow-paper-sm",
    image: "object-cover brightness-[0.86] saturate-[0.68]",
    wash: "bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--ink)_32%,transparent))]"
  },
  inset: {
    frame: "border border-[var(--line)] bg-[var(--card)] shadow-paper-sm",
    image: "object-cover scale-[1.01] saturate-[0.7] contrast-[0.98]",
    wash: "bg-[linear-gradient(135deg,var(--sheen),transparent_48%,var(--shade))]"
  },
  ambient: {
    frame: "border-0 bg-[var(--paper)] shadow-none",
    image: "object-cover brightness-[0.98] saturate-[0.7] contrast-[0.96] mix-blend-multiply",
    wash: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--paper)_92%,transparent)_0%,color-mix(in_srgb,var(--paper)_56%,transparent)_32%,color-mix(in_srgb,var(--paper)_10%,transparent)_68%,transparent_100%)]"
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
      className={cn("visual-panel relative isolate min-h-56 rounded-none", style.frame, className)}
      role={resolvedImageState.failed && !decorative ? "img" : undefined}
      aria-label={resolvedImageState.failed && !decorative ? fallbackLabel : undefined}
    >
      <div className="absolute inset-0 overflow-hidden">
        {resolvedImageState.failed ? (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(140deg,var(--paper-hi),var(--paper-lo))]" />
            <div className="absolute inset-0 grid place-items-center p-5 text-center">
              <span className="max-w-56 rounded-none border border-[var(--line)] bg-[var(--card)] px-4 py-3 font-mono text-xs font-black uppercase leading-5 text-[var(--muted)] shadow-paper-sm">
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,var(--sheen),transparent)]" />
        {style.wash ? <div className={cn("pointer-events-none absolute inset-0", style.wash)} /> : null}
        {style.grid ? <div className={cn("pointer-events-none absolute inset-0", style.grid)} /> : null}
        {overlayClass ? <div className={cn("pointer-events-none absolute inset-0", overlayClass)} /> : null}
      </div>
      {treatment !== "ambient" ? <span className="paper-tape left-6 top-[-7px]" aria-hidden="true" /> : null}
    </div>
  );
}
