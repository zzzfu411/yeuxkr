import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

// Mechanical export only: keep the generated artwork and Hangul intact.
const sourceDir = resolve(process.argv[2] ?? "public/assets/generated");
const assetsDir = resolve(process.argv[3] ?? "public/assets");
const outputDir = join(assetsDir, "generated");
const stems = ["seoul-street", "hangul-wall", "cafe-talk", "seoul-listening", "seoul-bookshop", "practice-stickers", "seoul-market", "seoul-records", "icon-base", "letter-k", "letter-h", "letter-annyeong", "letter-hangul", "letter-dasi", "letter-jogeumssik"];
await mkdir(outputDir, { recursive: true });
for (const stem of stems) {
  const source = join(sourceDir, stem + ".png");
  const target = join(outputDir, stem + ".png");
  if (source !== target) await copyFile(source, target);
  if (stem.startsWith("letter-")) {
    const metadata = await sharp(target).metadata();
    const stats = await sharp(target).stats();
    if (!metadata.hasAlpha || stats.isOpaque) throw new Error(`${stem} needs real transparent pixels; a painted checkerboard is not a cutout.`);
  }
  if (stem !== "icon-base") {
    await sharp(target).webp({ quality: 82, effort: 6 }).toFile(join(outputDir, stem + ".webp"));
  }
}
for (const size of [192, 512]) {
  const icon = join(outputDir, "icon-base.png");
  await sharp(icon).resize(size, size).png().toFile(join(assetsDir, `icon-${size}.png`));
  const inner = Math.round(size * .8);
  const edge = Math.floor((size - inner) / 2);
  await sharp(icon).resize(inner, inner).extend({
    top: edge, left: edge, bottom: size - inner - edge, right: size - inner - edge,
    background: "#f2eb98"
  }).flatten({ background: "#f2eb98" }).png().toFile(join(assetsDir, `icon-maskable-${size}.png`));
}
console.log("Prepared six Hangul cutouts, eight archived Seoul collages, source icon and four PWA icon variants.");
