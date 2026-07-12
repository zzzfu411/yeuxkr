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

const aesthetic = "Seoul Editorial Learning Atlas: premium Korean stationery, warm paper texture, abstract Hangul typography, celadon green, deep ocean blue, cinnabar red, brass details, preserve generous negative space for editorial layouts, no people, no watermark, no readable Chinese/English UI text.";
const generatedAt = "2026-06-09";

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
