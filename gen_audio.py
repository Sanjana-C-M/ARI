"""Makes one Tamil voice file per entry in myths.json, saved to audio/answers.

Run from C:\\Ari:  python gen_audio.py
The key is read from C:\\Ari\\backend\\.env (GNANI_API_KEY=...) or from the environment.
Existing files are skipped, so you never pay twice for the same answer.
"""
import json
import os
import sys
import time
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / "backend" / ".env"
OUT_DIR = ROOT / "audio" / "answers"
MYTHS_PATH = ROOT / "myths.json"
TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"

VOICE = "Nalini"           # the Tamil voice you chose
LANGUAGE = "ta-IN"
LIMIT = None               # None = make every missing file; set a number to test a few first
REMOVE_UNUSED = True       # delete .wav files whose entry is no longer in myths.json


def load_key():
    if ENV_PATH.is_file():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if line.startswith("GNANI_API_KEY="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("GNANI_API_KEY", "")


API_KEY = load_key()
if not API_KEY:
    sys.exit("No key found. Put GNANI_API_KEY=your_key in C:\\Ari\\backend\\.env")

OUT_DIR.mkdir(parents=True, exist_ok=True)
MYTHS = json.loads(MYTHS_PATH.read_text(encoding="utf-8"))
wanted = {m["id"] for m in MYTHS}

if REMOVE_UNUSED:
    for wav in OUT_DIR.glob("*.wav"):
        if wav.stem not in wanted:
            wav.unlink()
            print("removed unused:", wav.name)

made = 0
for myth in MYTHS:
    path = OUT_DIR / f"{myth['id']}.wav"
    if path.exists():
        print("skip (already made):", myth["id"])
        continue
    if LIMIT is not None and made >= LIMIT:
        print("Reached LIMIT. Set LIMIT = None to make the rest.")
        break

    try:
        r = requests.post(
            TTS_URL,
            headers={"Content-Type": "application/json", "X-API-Key-ID": API_KEY},
            json={
                "text": myth["answer"],
                "voice": VOICE,
                "model": "timbre-v2.5",
                "language": LANGUAGE,
                "speed": 1.0,
                "audio_config": {
                    "sample_rate": 48000,
                    "num_channels": 1,
                    "sample_width": 2,
                    "encoding": "linear_pcm",
                    "container": "wav",
                },
            },
            timeout=60,
        )
    except requests.RequestException as e:
        print("Connection failed for", myth["id"], "->", e)
        break

    if r.status_code == 200 and len(r.content) > 1000:
        path.write_bytes(r.content)
        made += 1
        print("saved:", path.name)
    else:
        print("FAILED:", myth["id"], "status", r.status_code)
        print(r.text[:300])
        break  # stop at the first problem so credits are not wasted
    time.sleep(0.5)

print("Done. New files made this run:", made)