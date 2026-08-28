from pathlib import Path
from PIL import Image
import shutil
import sys


ASSET_NAMES = [
    "hero.png",
    "workspace.png",
    "path.png",
    "self-study.png",
    "hangul.png",
    "vocabulary.png",
    "grammar.png",
    "native.png",
    "immersion.png",
    "quiz.png",
    "lesson.png",
    "review.png",
    "empty.png",
    "complete.png",
    "lesson-pronunciation.png",
    "lesson-cafe.png",
    "lesson-transit.png",
    "lesson-time.png",
    "lesson-health.png",
    "lesson-media.png",
    "lesson-honorific.png",
    "lesson-output.png",
    "icon-base.png",
]
WEBP_QUALITY = 86
MASKABLE_PADDING_RATIO = 0.16


def cover_resize(image, size):
    target_w, target_h = size
    src_w, src_h = image.size
    scale = max(target_w / src_w, target_h / src_h)
    resized = image.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def contain_resize(image, size, padding_ratio=0):
    target_w, target_h = size
    safe_w = round(target_w * (1 - padding_ratio * 2))
    safe_h = round(target_h * (1 - padding_ratio * 2))
    src_w, src_h = image.size
    scale = min(safe_w / src_w, safe_h / src_h)
    resized = image.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (233, 238, 235))
    left = (target_w - resized.width) // 2
    top = (target_h - resized.height) // 2
    canvas.paste(resized, (left, top))
    return canvas


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/prepare-imagegen-assets.py <generated-dir> <public-assets-dir>")

    generated_dir = Path(sys.argv[1])
    public_assets_dir = Path(sys.argv[2])
    generated_assets_dir = public_assets_dir / "generated"
    generated_assets_dir.mkdir(parents=True, exist_ok=True)

    missing = [name for name in ASSET_NAMES if not (generated_dir / name).exists()]
    if missing:
        raise SystemExit(f"Missing generated assets: {', '.join(missing)}")

    for name in ASSET_NAMES:
        source = generated_dir / name
        target = generated_assets_dir / name
        if source.resolve() != target.resolve():
            shutil.copy2(source, target)
        if name != "icon-base.png":
            image = Image.open(target).convert("RGB")
            image.save(generated_assets_dir / name.replace(".png", ".webp"), "WEBP", quality=WEBP_QUALITY, method=6)

    icon_source = Image.open(generated_assets_dir / "icon-base.png").convert("RGB")
    for size in (512, 192):
        icon = cover_resize(icon_source, (size, size))
        icon.save(public_assets_dir / f"icon-{size}.png")
        maskable_icon = contain_resize(icon_source, (size, size), MASKABLE_PADDING_RATIO)
        maskable_icon.save(public_assets_dir / f"icon-maskable-{size}.png")

    print(f"Prepared {len(ASSET_NAMES)} generated assets in {generated_assets_dir}")


if __name__ == "__main__":
    main()
