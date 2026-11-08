"""Ari backend: Prisma speech-to-text, answer matching, and saved audio files.

Run from C:\\Ari\\backend:  python -m uvicorn server:app --port 8000
The key is read from C:\\Ari\\backend\\.env (GNANI_API_KEY=...) or from the environment.
"""
import csv
import datetime
import json
import logging
import os
import re
import time
from pathlib import Path

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# The folder that holds myths.json, audio/answers and query_log.csv (the parent of this backend folder).
DATA_DIR = Path(os.environ.get("ARI_DATA_DIR", Path(__file__).resolve().parent.parent))
MYTHS_PATH = DATA_DIR / "myths.json"
AUDIO_DIR = DATA_DIR / "audio" / "answers"
QUERY_LOG = DATA_DIR / "query_log.csv"
STT_URL = "https://api.vachana.ai/stt/v3"

log = logging.getLogger("ari")
logging.basicConfig(level=logging.INFO)


def _load_key() -> str:
    """Read GNANI_API_KEY from backend/.env first, then from the environment."""
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("GNANI_API_KEY="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("GNANI_API_KEY", "")


API_KEY = _load_key()

with open(MYTHS_PATH, encoding="utf-8") as f:
    MYTHS = json.load(f)


# ---------- boosted Tamil words for the speech service ----------
_WORD = re.compile(r"[\u0B80-\u0BFFa-zA-Z]+")


def build_boost_list(myths, limit=100):
    words = []
    for e in myths:
        for k in e.get("keywords", []) + e.get("strong", []):
            for w in k.split():
                if len(w) >= 3 and _WORD.fullmatch(w) and w not in words:
                    words.append(w)
    return words[:limit]


BOOST_WORDS = build_boost_list(MYTHS)


# ---------- query log (transcript and result only, never audio or key) ----------
def log_query(transcript, entry_id, status, ms):
    is_new = not QUERY_LOG.exists()
    with open(QUERY_LOG, "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if is_new:
            w.writerow(["time", "transcript", "status", "entry_id", "ms"])
        w.writerow([datetime.datetime.now().isoformat(timespec="seconds"),
                    transcript, status, entry_id or "", int(ms)])


app = FastAPI(title="Ari backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextQuestion(BaseModel):
    question: str


# ---------- answer matching ----------
_KEEP = re.compile(r"[^\u0B80-\u0BFFa-z0-9]+")  # Tamil letters, English letters, digits only


def _normalize(s: str) -> str:
    return _KEEP.sub("", s.lower())


def _bigrams(s: str) -> set:
    return {s[i:i + 2] for i in range(len(s) - 1)}


def _similarity(a: str, b: str) -> float:
    A, B = _bigrams(a), _bigrams(b)
    if not A or not B:
        return 0.0
    return 2 * len(A & B) / (len(A) + len(B))


KEYWORD_MIN = 2        # keyword score accepted without the similarity step
SIMILARITY_MIN = 0.55  # below this, the answer is "not found" rather than a guess


def _prepare(myths):
    prepared = []
    for m in myths:
        prepared.append({
            "entry": m,
            "keywords": [_normalize(k) for k in m.get("keywords", []) if len(_normalize(k)) >= 2],
            "strong": [_normalize(s) for s in m.get("strong", []) if len(_normalize(s)) >= 2],
            "questions": [_normalize(q) for q in m.get("questions", []) if _normalize(q)],
        })
    return prepared


PREPARED = _prepare(MYTHS)


def match_answer(question: str):
    """1) Keyword score. 2) If that is weak, compare with the example phrasings using character
    similarity. If nothing is close enough, return None so the app says 'not found'."""
    q = _normalize(question)
    if not q:
        return None

    best, best_score = None, 0
    for p in PREPARED:
        score = sum(1 for k in p["keywords"] if k in q)
        score += sum(2 for s in p["strong"] if s in q)
        if score > best_score:
            best, best_score = p["entry"], score
    if best_score >= KEYWORD_MIN:
        return best

    best, best_sim = None, 0.0
    for p in PREPARED:
        sim = max((_similarity(q, x) for x in p["questions"]), default=0.0)
        if sim > best_sim:
            best, best_sim = p["entry"], sim
    return best if best_sim >= SIMILARITY_MIN else None


def build_response(question: str, transcript: str) -> dict:
    match = match_answer(question)
    if match is None:
        return {
            "status": "not_found",
            "transcript": transcript,
            "answer": None,
            "source": None,
            "audio_url": None,
            "entry_id": None,
        }
    audio_file = AUDIO_DIR / f"{match['id']}.wav"
    return {
        "status": "found",
        "transcript": transcript,
        "answer": match["answer"],
        "source": match["source"].removeprefix("Source: "),
        "audio_url": f"/audio/{match['id']}.wav" if audio_file.is_file() else None,
        "entry_id": match["id"],
    }


# ---------- speech to text (Gnani Prisma) ----------
def transcribe(wav_bytes: bytes, filename: str) -> str:
    if not API_KEY:
        raise HTTPException(500, "GNANI_API_KEY is not set on the server.")
    try:
        r = requests.post(
            STT_URL,
            headers={"X-API-Key-ID": API_KEY},
            files={"audio_file": (filename, wav_bytes, "audio/wav")},
            data={
                "language_code": "ta-IN",
                "bias_list": json.dumps(BOOST_WORDS, ensure_ascii=False),
                "bias_score": "1.0",
            },
            timeout=60,
        )
    except requests.RequestException as e:
        raise HTTPException(502, f"Speech service unreachable: {e}")
    if r.status_code != 200:
        raise HTTPException(502, f"Speech service error {r.status_code}: {r.text[:200]}")
    return r.json().get("transcript", "")


# ---------- endpoints ----------
@app.get("/api/health")
def health():
    return {"ok": True, "entries": len(MYTHS), "key_set": bool(API_KEY)}


@app.post("/api/ask/text")
def ask_text(body: TextQuestion):
    question = body.question.strip()
    if not question:
        raise HTTPException(400, "Empty question")
    t0 = time.perf_counter()
    result = build_response(question, question)
    ms = (time.perf_counter() - t0) * 1000
    log_query(question, result["entry_id"], result["status"], ms)
    return result


@app.post("/api/ask/audio")
def ask_audio(audio: UploadFile = File(...)):
    data = audio.file.read()
    if not data:
        raise HTTPException(400, "Empty audio")

    t0 = time.perf_counter()
    transcript = transcribe(data, audio.filename or "question.wav")
    t1 = time.perf_counter()
    result = build_response(transcript, transcript)
    t2 = time.perf_counter()

    log.info("bytes=%d stt_ms=%d match_ms=%d status=%s",
             len(data), (t1 - t0) * 1000, (t2 - t1) * 1000, result["status"])
    log_query(transcript, result["entry_id"], result["status"], (t2 - t0) * 1000)
    return result


@app.get("/audio/{name}")
def get_audio(name: str):
    if "/" in name or "\\" in name or ".." in name or not name.endswith(".wav"):
        raise HTTPException(404)
    path = AUDIO_DIR / name
    if not path.is_file():
        raise HTTPException(404)
    return FileResponse(path, media_type="audio/wav")