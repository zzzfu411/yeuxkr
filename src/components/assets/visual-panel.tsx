"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { visualAssets, type DisplayVisualAssetId } from "@/data/visuals/assets";

export type VisualPanelOverlay = "left" | "right" | "bottom" | "none";
export type VisualPanelTreatment = "paper" | "raw" | "darkCaption" | "inset" | "ambient";

const overlayClasses: Record<VisualPanelOverlay, string> = {
  left: "bg-gradient-to-r from-[rgba(233,238,235,0.88)] via-[rgba(233,238,235,0.24)] to-transparent",
  right: "bg-gradient-to-l from-[rgba(233,238,235,0.88)] via-[rgba(233,238,235,0.24)] to-transparent",
  bottom: "bg-gradient-to-t from-[rgba(24,28,27,0.44)] via-[rgba(24,28,27,0.12)] to-transparent",
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
    frame: "border border-[rgba(24,28,27,0.14)] bg-[var(--paper-deep)] shadow-[0_16px_44px_rgba(24,28,27,0.08)]",
    image: "object-cover saturate-[1.08] contrast-[1.08]",
    wash: "bg-[linear-gradient(140deg,rgba(249,251,248,0.06),rgba(63,128,106,0.03)_46%,rgba(21,61,104,0.06))]",
    grid: "opacity-[0.06] [background-image:linear-gradient(rgba(24,28,27,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(24,28,27,0.1)_1px,transparent_1px)] [background-size:28px_28px]"
  },
  raw: {
    frame: "bg-[var(--paper-deep)] shadow-[0_14px_36px_rgba(24,28,27,0.08)]",
    image: "object-cover contrast-[1.02]"
  },
  darkCaption: {
    frame: "bg-[var(--ink)] shadow-[0_18px_52px_rgba(24,28,27,0.18)]",
    image: "object-cover brightness-[0.82] saturate-[0.92]",
    wash: "bg-[linear-gradient(180deg,rgba(24,28,27,0.02),rgba(24,28,27,0.5))]"
  },
  inset: {
    frame: "border border-[rgba(24,28,27,0.14)] bg-[rgba(249,251,248,0.72)] shadow-[0_14px_36px_rgba(24,28,27,0.08)]",
    image: "object-cover scale-[1.01] saturate-[1.08] contrast-[1.06]",
    wash: "bg-[linear-gradient(135deg,rgba(249,251,248,0.06),rgba(63,128,106,0.03)_44%,rgba(21,61,104,0.05))]",
    grid: "opacity-[0.06] [background-image:linear-gradient(rgba(24,28,27,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(24,28,27,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
  },
  ambient: {
    frame: "bg-[var(--paper-deep)] shadow-[0_16px_44px_rgba(24,28,27,0.08)]",
    image: "object-cover brightness-[0.98] saturate-[1.16] contrast-[1.08]",
    wash: "bg-[linear-gradient(90deg,rgba(233,238,235,0.86)_0%,rgba(233,238,235,0.52)_28%,rgba(233,238,235,0.08)_58%,rgba(21,26,25,0.08)_100%)]"
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
      className={cn("relative isolate min-h-56 overflow-hidden rounded-[8px]", style.frame, className)}
      role={resolvedImageState.failed && !decorative ? "img" : undefined}
      aria-label={resolvedImageState.failed && !decorative ? fallbackLabel : undefined}
    >
      {resolvedImageState.failed ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(251,252,249,0.98),rgba(216,225,219,0.94))]" />
          <div className="absolute inset-0 grid place-items-center p-5 text-center">
            <span className="max-w-56 rounded-[8px] border border-[rgba(24,28,27,0.14)] bg-[rgba(249,251,248,0.8)] px-4 py-3 font-mono text-xs font-black uppercase leading-5 text-[var(--muted)] shadow-paper-sm">
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
      <div className="pointer-events-none absolute inset-[0.6rem] rounded-[6px] border border-[rgba(255,250,240,0.34)] opacity-80 mix-blend-screen" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]" />
      {style.wash ? <div className={cn("pointer-events-none absolute inset-0", style.wash)} /> : null}
      {style.grid ? <div className={cn("pointer-events-none absolute inset-0", style.grid)} /> : null}
      {overlayClass ? <div className={cn("pointer-events-none absolute inset-0", overlayClass)} /> : null}
    </div>
  );
}
