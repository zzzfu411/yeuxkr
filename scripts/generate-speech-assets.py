import argparse
import asyncio
import json
import re
import sys
from pathlib import Path


async def generate_edge(job, output_dir, voice, rate, semaphore, retries):
    import edge_tts

    target = output_dir / job["file"]
    if valid_audio_file(target):
        return "kept", target

    async with semaphore:
        for attempt in range(1, retries + 1):
            temporary = target.with_suffix(".part")
            try:
                temporary.unlink(missing_ok=True)
                await edge_tts.Communicate(job["text"], voice, rate=rate).save(str(temporary))
                assert_valid_audio(temporary)
                temporary.replace(target)
                return "generated", target
            except Exception:
                temporary.unlink(missing_ok=True)
                if attempt == retries:
                    raise
                await asyncio.sleep(attempt * 1.5)


async def run_edge(args, jobs, output_dir):
    semaphore = asyncio.Semaphore(args.concurrency)
    tasks = [
        asyncio.create_task(generate_edge(job, output_dir, args.voice, args.rate, semaphore, args.retries))
        for job in jobs
    ]
    await report_async_results(tasks)


async def report_async_results(tasks):
    generated = 0
    kept = 0
    failures = []
    for index, task in enumerate(asyncio.as_completed(tasks), 1):
        try:
            status, _ = await task
            generated += status == "generated"
            kept += status == "kept"
            report_progress(index, len(tasks), generated, kept)
        except Exception as error:
            failures.append(str(error))

    if failures:
        raise SystemExit(f"Failed to generate {len(failures)} speech assets. First error: {failures[0]}")


def run_sherpa(args, jobs, output_dir):
    runtime_dir = Path(args.runtime_dir).resolve()
    if not runtime_dir.exists():
        raise SystemExit(f"Sherpa runtime directory does not exist: {runtime_dir}")
    sys.path.insert(0, str(runtime_dir))

    import lameenc
    import numpy as np
    import sherpa_onnx

    model_dir = Path(args.model_dir).resolve()
    model = require_file(model_dir / "ko_KO-kss_low.onnx")
    tokens = require_file(model_dir / "tokens.txt")
    data_dir = model_dir / "espeak-ng-data"
    if not data_dir.is_dir():
        raise SystemExit(f"Sherpa espeak data directory does not exist: {data_dir}")

    vits = sherpa_onnx.OfflineTtsVitsModelConfig(
        model=str(model),
        tokens=str(tokens),
        data_dir=str(data_dir)
    )
    model_config = sherpa_onnx.OfflineTtsModelConfig(
        vits=vits,
        num_threads=max(1, args.threads),
        debug=False,
        provider="cpu"
    )
    config = sherpa_onnx.OfflineTtsConfig(
        model=model_config,
        max_num_sentences=2,
        silence_scale=0.2
    )
    if not config.validate():
        raise SystemExit("Sherpa TTS configuration is invalid")

    synthesizer = sherpa_onnx.OfflineTts(config)
    generated = 0
    kept = 0
    failures = []
    for index, job in enumerate(jobs, 1):
        target = output_dir / job["file"]
        if valid_audio_file(target):
            kept += 1
            report_progress(index, len(jobs), generated, kept)
            continue

        temporary = target.with_suffix(".part")
        try:
            temporary.unlink(missing_ok=True)
            synthesis_text = prepare_sherpa_text(job["text"])
            audio = synthesizer.generate(synthesis_text, sid=0, speed=args.speed)
            samples = np.asarray(audio.samples, dtype=np.float32)
            if samples.size < 100 or audio.sample_rate <= 0:
                raise RuntimeError("local TTS returned empty audio")
            samples = pad_audio(samples, audio.sample_rate, job["text"], np)
            temporary.write_bytes(encode_mp3(samples, audio.sample_rate, args.bit_rate, lameenc, np))
            assert_valid_audio(temporary)
            temporary.replace(target)
            generated += 1
        except Exception as error:
            temporary.unlink(missing_ok=True)
            failures.append(f"{job['text']}: {error}")
        report_progress(index, len(jobs), generated, kept)

    if failures:
        raise SystemExit(f"Failed to generate {len(failures)} speech assets. First error: {failures[0]}")


def encode_mp3(samples, sample_rate, bit_rate, lameenc, np):
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bit_rate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode(pcm) + encoder.flush()


def prepare_sherpa_text(text):
    korean_syllables = re.findall(r"[\uac00-\ud7a3]", text)
    if len(korean_syllables) <= 2 and not re.search(r"[.。?？]$", text):
        return f"{text}."
    return text


def pad_audio(samples, sample_rate, text, np):
    korean_syllables = re.findall(r"[\uac00-\ud7a3]", text)
    short_prompt = len(korean_syllables) <= 2
    leading_seconds = 0.12 if short_prompt else 0.06
    trailing_seconds = 0.25 if short_prompt else 0.12
    leading = np.zeros(round(sample_rate * leading_seconds), dtype=np.float32)
    trailing = np.zeros(round(sample_rate * trailing_seconds), dtype=np.float32)
    return np.concatenate((leading, samples, trailing))


def valid_audio_file(path):
    return path.exists() and path.stat().st_size > 1024


def assert_valid_audio(path):
    if not valid_audio_file(path):
        raise RuntimeError("generated audio is unexpectedly small")
    header = path.read_bytes()[:3]
    if header != b"ID3" and not (header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
        raise RuntimeError("generated audio is not an MP3 file")


def require_file(path):
    if not path.is_file() or path.stat().st_size <= 0:
        raise SystemExit(f"Required Sherpa model file does not exist: {path}")
    return path


def report_progress(index, total, generated, kept):
    if index % 25 == 0 or index == total:
        print(f"speech assets {index}/{total} (generated={generated}, kept={kept})", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Generate bundled Korean speech assets.")
    parser.add_argument("corpus")
    parser.add_argument("output_dir")
    parser.add_argument("--provider", choices=("sherpa", "edge"), default="sherpa")
    parser.add_argument("--model-dir", default=".tools/models/vits-mimic3-ko_KO-kss_low")
    parser.add_argument("--runtime-dir", default=".tools/sherpa")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--speed", type=float, default=0.92)
    parser.add_argument("--bit-rate", type=int, default=64)
    parser.add_argument("--voice", default="ko-KR-SunHiNeural")
    parser.add_argument("--rate", default="-8%")
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    if args.threads < 1 or args.speed <= 0 or args.bit_rate < 32:
        raise SystemExit("threads, speed, and bit rate must be positive production values")
    jobs = json.loads(Path(args.corpus).read_text(encoding="utf-8"))
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if args.provider == "edge":
        asyncio.run(run_edge(args, jobs, output_dir))
    else:
        run_sherpa(args, jobs, output_dir)


if __name__ == "__main__":
    main()
