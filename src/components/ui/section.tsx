import { cn } from "@/lib/utils";
import { VisualPanel, type VisualPanelTreatment } from "@/components/assets/visual-panel";
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
  return (
    <section className={cn("mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end", compact && "mb-3", className)}>
      <div className="max-w-4xl">
        <p className="eyebrow">{kicker}</p>
        <h1 className={cn(
          "mt-3 max-w-5xl font-serif font-black leading-[0.96] tracking-normal",
          compact ? "text-4xl md:text-5xl" : "text-4xl md:text-6xl"
        )}>
          {title}
        </h1>
        {copy ? (
          <p className={cn(
            "max-w-3xl leading-7 text-[var(--muted)]",
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
      variant === "plain" ? "relative min-w-0" : "surface relative overflow-hidden p-4 md:p-5",
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
  imageClassName = "min-h-72 rounded-none border-t border-[var(--line)] lg:min-h-full lg:border-l lg:border-t-0",
  imageSize = "24rem",
  objectPosition = "center",
  overlay = "none",
  imageTreatment = "raw",
  imageDecorative = false,
  imageAlt
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
}) {
  return (
    <section className="studio-panel relative grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.44fr)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-[3px] bg-[var(--yellow)]" />
      <div className="paper-rail relative p-5 md:p-6">
        <p className="eyebrow">{kicker}</p>
        <h2 className="mt-3 font-serif text-3xl font-black leading-[1.04] md:text-4xl">{title}</h2>
        {copy ? <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">{copy}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
      <VisualPanel
        asset={asset}
        priority
        sizes={`(max-width: 1024px) 100vw, ${imageSize}`}
        overlay={overlay}
        treatment={imageTreatment}
        decorative={imageDecorative}
        objectPosition={objectPosition}
        alt={imageAlt}
        className={imageClassName}
      />
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h2 className="mt-2 font-serif text-2xl font-black leading-tight">{title}</h2>
        {copy ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}
