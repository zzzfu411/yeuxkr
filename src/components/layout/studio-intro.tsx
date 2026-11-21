import { ArtScene } from "@/components/assets/art-scene";
import type { Studio } from "@/lib/studio-navigation";

export function StudioIntro({ studio }: { studio: Studio }) {
  return <header className="studio-intro">
    <div>
      <h1>{studio === "study" ? "学习" : "练习"}</h1>
      <p>{studio === "study" ? "从一个字，到一句自然的表达。" : "把学过的，变成真正会用的。"}</p>
    </div>
    <ArtScene asset={studio === "study" ? "path" : "review"} priority sizes="96px" treatment="raw" decorative className="studio-intro__art" />
  </header>;
}
