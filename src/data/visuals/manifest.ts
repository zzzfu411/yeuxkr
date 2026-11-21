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

const aesthetic = "Original Seoul street photography collage and oversized accurate Hangul die-cut stickers; cobalt blue, lemon, tangerine, lilac, clean white breathing room. Original fictional street composition, no copied branding, no fake interface, no watermark.";
const generatedAt = "2026-09-08";
const letterAesthetic = "One independent Hangul letter or short word, bold printed typography, white die-cut outline, cobalt blue, lemon, tangerine or lilac; real transparent alpha, no scenery, no shared collage, no watermark.";

export const visualAssetManifest: Record<VisualAssetId, VisualAssetManifestEntry> = Object.fromEntries(
  Object.values(visualAssets).map((asset) => [
    asset.id,
    {
      id: asset.id,
      provider: "openai-imagegen",
      label: asset.manifestLabel,
      aesthetic: asset.id.startsWith("letter") ? letterAesthetic : aesthetic,
      prompt: `${asset.promptSummary} ${asset.id.startsWith("letter") ? letterAesthetic : aesthetic}`,
      sourceFile: `public${asset.source}`,
      // Historical key retained for validation compatibility.
      webpFile: `public${asset.src}`,
      generatedAt: asset.id.startsWith("letter") ? "2026-09-09" : generatedAt,
      derivative: asset.id === "iconBase" ? "png-source-and-pwa-icons" : "png-source-and-webp-display"
    }
  ])
) as Record<VisualAssetId, VisualAssetManifestEntry>;
