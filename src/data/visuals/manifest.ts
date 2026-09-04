import { visualAssets, type VisualAssetId } from "./assets.ts";

export interface VisualAssetManifestEntry {
  id: VisualAssetId;
  provider: "my-image-gen";
  label: string;
  aesthetic: string;
  prompt: string;
  sourceFile: string;
  webpFile: string;
  generatedAt: string;
  derivative: "png-source-and-webp-display" | "png-source-and-pwa-icons";
}

const aesthetic = "YEUX KR hanji still life: warm gray paper near #d8d3cc, diluted graphite and ink wash, visible paper fibers, generous negative space, restrained muted celadon, and one tiny faded vermilion seal; no people, no UI, no watermark, no readable text, no fabricated letters or gibberish.";
const generatedAt = "2026-09-01";

export const visualAssetManifest: Record<VisualAssetId, VisualAssetManifestEntry> = Object.fromEntries(
  Object.values(visualAssets).map((asset) => [
    asset.id,
    {
      id: asset.id,
      provider: "my-image-gen",
      label: asset.manifestLabel,
      aesthetic,
      prompt: `${asset.promptSummary} ${aesthetic}`,
      sourceFile: `public${asset.source}`,
      // Historical key retained for validation compatibility.
      webpFile: `public${asset.src}`,
      generatedAt,
      derivative: asset.id === "iconBase" ? "png-source-and-pwa-icons" : "png-source-and-webp-display"
    }
  ])
) as Record<VisualAssetId, VisualAssetManifestEntry>;
