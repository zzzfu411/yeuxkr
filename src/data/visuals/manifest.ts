import { visualAssets, type VisualAssetId } from "./assets.ts";

export interface VisualAssetManifestEntry {
  id: VisualAssetId;
  provider: "openai-imagegen";
  label: string;
  aesthetic: string;
  prompt: string;
  sourceFile: string;
  webpFile: string;
  generatedAt: string;
  derivative: "png-source-and-webp-display" | "png-source-and-pwa-icons";
}

const aesthetic = "Original Korean slice-of-life drama frame: seasonal natural light, porcelain white, mist blue, subtitle navy, muted camellia and leaf green, believable everyday texture, restrained 35mm grain, generous breathing room; no copied shows or actors, no readable text, no logos, no watermark, no fake interface.";
const generatedAt = "2026-09-05";

export const visualAssetManifest: Record<VisualAssetId, VisualAssetManifestEntry> = Object.fromEntries(
  Object.values(visualAssets).map((asset) => [
    asset.id,
    {
      id: asset.id,
      provider: "openai-imagegen",
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
