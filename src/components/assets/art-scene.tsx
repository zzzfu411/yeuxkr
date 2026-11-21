import type { ComponentProps } from "react";
import { VisualPanel } from "@/components/assets/visual-panel";
import type { DisplayVisualAssetId, LetterAssetId } from "@/data/visuals/assets";
import { cn } from "@/lib/utils";

const pairs: Partial<Record<DisplayVisualAssetId, readonly [LetterAssetId, LetterAssetId]>> = {
  hero: ["letterHello", "letterK"], workspace: ["letterHangul", "letterH"], path: ["letterHangul", "letterK"],
  selfStudy: ["letterSlowly", "letterH"], hangul: ["letterHangul", "letterH"],
  vocabulary: ["letterHello", "letterK"], grammar: ["letterHangul", "letterH"], native: ["letterHello", "letterK"],
  immersion: ["letterSlowly", "letterH"], quiz: ["letterAgain", "letterK"], review: ["letterAgain", "letterH"],
  complete: ["letterK", "letterSlowly"], empty: ["letterSlowly", "letterH"],
  lessonPronunciation: ["letterHangul", "letterH"], lessonOutput: ["letterSlowly", "letterK"],
  lessonCafe: ["letterHello", "letterK"], lessonTransit: ["letterHangul", "letterH"]
};

/** Each node is one separate image containing only one character or short word. */
export function LetterFragment({ asset, className, priority = false, sizes = "140px" }: {
  asset: LetterAssetId; className?: string; priority?: boolean; sizes?: string;
}) {
  return <div className={cn("letter-fragment", className)} data-letter-fragment={asset} aria-hidden="true">
    <VisualPanel asset={asset} decorative treatment="cutout" priority={priority} sizes={sizes} className="letter-fragment__image" />
  </div>;
}

/** Quiet corner accents used in existing module artwork slots. */
export function ArtScene({ asset, className, priority = false }: ComponentProps<typeof VisualPanel>) {
  const [word, glyph] = pairs[asset] ?? ["letterHello", "letterK"];
  return <div className={cn("art-scene", className)} aria-hidden="true">
    <LetterFragment asset={word} priority={priority} className="art-scene__word" />
    <LetterFragment asset={glyph} className="art-scene__glyph" sizes="70px" />
  </div>;
}
