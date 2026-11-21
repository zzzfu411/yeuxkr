"use client";

import { cn } from "@/lib/utils";
import { useEmbeddedPage } from "@/components/layout/embedded-page";
import type { VisualPanelTreatment } from "@/components/assets/visual-panel";
import { ArtScene } from "@/components/assets/art-scene";
import type { DisplayVisualAssetId } from "@/data/visuals/assets";

export function PageHeader({
  kicker,
  title,
  copy,
  children,
  className,
  compact = false
}: {
  kicker: string;
  title: string;
  copy?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const embedded = useEmbeddedPage();
  if (embedded) return children ? <div className="embedded-actions">{children}</div> : null;
  return (
    <section className={cn("page-header", compact && "page-header--compact", className)}>
      <div className="max-w-[72ch]">
        <p className="eyebrow">{kicker}</p>
        <h1 className={cn(
          "page-title",
          compact ? "text-[clamp(1.8rem,3.5vw,2.7rem)]" : "text-[clamp(2rem,4vw,3.2rem)]"
        )}>
          {title}
        </h1>
        {copy ? (
          <p className={cn(
            "max-w-[64ch] leading-7 text-[var(--muted)]",
            compact ? "mt-3 text-sm md:text-base" : "mt-4 text-base md:text-lg"
          )}>
            {copy}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Surface({
  children,
  className,
  id,
  variant = "panel"
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "panel" | "plain";
}) {
  return (
    <section id={id} className={cn(
      variant === "plain" ? "relative min-w-0" : "surface relative p-4 md:p-5",
      className
    )}>
      {children}
    </section>
  );
}

export function ModuleHero({
  kicker,
  title,
  copy,
  asset,
  children,
  imageClassName = "min-h-64 border-0 lg:min-h-full",
  imageSize = "24rem",
  objectPosition = "center",
  overlay = "none",
  imageTreatment = "raw",
  imageDecorative = false,
  imageAlt,
  priority = true
}: {
  kicker: string;
  title: string;
  copy?: string;
  asset: DisplayVisualAssetId;
  children?: React.ReactNode;
  imageClassName?: string;
  imageSize?: string;
  objectPosition?: string;
  overlay?: "left" | "right" | "bottom" | "none";
  imageTreatment?: VisualPanelTreatment;
  imageDecorative?: boolean;
  imageAlt?: string;
  priority?: boolean;
}) {
  const embedded = useEmbeddedPage();
  return (
    <section className={cn("module-hero studio-panel", embedded && "module-hero--embedded")}>
      <div className="module-hero__copy">
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
        {copy ? <p>{copy}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
      {embedded ? null : <ArtScene
        asset={asset}
        priority={priority}
        sizes={`(max-width: 1024px) 100vw, ${imageSize}`}
        overlay={overlay}
        treatment={imageTreatment}
        decorative={imageDecorative}
        objectPosition={objectPosition}
        alt={imageAlt}
        className={imageClassName}
      />}
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  copy,
  action
}: {
  kicker?: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h2>{title}</h2>
        {copy ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}
