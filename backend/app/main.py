from __future__ import annotations

import base64
import io
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

PhotoStatus = Literal["Accepted", "Retake required", "Manual review", "No photo"]


class QualityAssessment(BaseModel):
    grade: Literal["Premium", "Standard", "Processing"]
    visualScore: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    observations: list[str]
    warning: str
    source: Literal["openai", "demo"]
    photoStatus: PhotoStatus
    photoChecks: list[str] = []


class VisionAssessment(BaseModel):
    grade: Literal["Premium", "Standard", "Processing"]
    visual_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    observations: list[str] = Field(min_length=2, max_length=5)
    photo_status: Literal["Accepted", "Retake required", "Manual review"]
    photo_checks: list[str] = Field(min_length=1, max_length=5)


class VoiceExtraction(BaseModel):
    """Listing fields pulled from a spoken harvest description.

    Any field the farmer did not mention is null. Field names the model had to
    guess go in `uncertain`; listing essentials never mentioned go in `missing`.
    """

    crop: str | None = None
    variety: str | None = None
    quantity: float | None = None
    unit: Literal["kg", "tonnes", "crates", "pallets"] | None = None
    location: str | None = None
    harvest_date: str | None = Field(default=None, description="YYYY-MM-DD")
    price_per_kg: float | None = None
    condition: Literal["Premium", "Standard", "Economy"] | None = None
    notes: str | None = None
    uncertain: list[str] = []
    missing: list[str] = []


class VoiceListingResponse(BaseModel):
    transcript: str | None
    extraction: VoiceExtraction | None
    transcript_source: Literal["elevenlabs", "openai", "unavailable"]
    extraction_source: Literal["claude", "unavailable"]


app = FastAPI(
    title="FarmPool AI API",
    version="1.2.0",
    description="Optional AI layer for the FarmPool mobile app: photo screening and voice-to-listing.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Photo assessment and screening
# --------------------------------------------------------------------------


def demo_assessment(*, condition: str, has_image: bool) -> QualityAssessment:
    by_condition = {
        "Premium": ("Premium", 91),
        "Standard": ("Standard", 82),
        "Economy": ("Processing", 68),
    }
    grade, visual_score = by_condition.get(condition, ("Standard", 78))

    # Without the AI check we cannot verify the photo, so it is held for manual
    # review and never shown to buyers as checked.
    photo_status: PhotoStatus = "Manual review" if has_image else "No photo"
    photo_checks = (
        ["AI photo check unavailable, photo held for manual review"]
        if has_image
        else ["No photo supplied"]
    )

    return QualityAssessment(
        grade=grade,
        visualScore=visual_score,
        confidence=0.84 if has_image else 0.64,
        observations=[
            "Produce image captured for visual review" if has_image else "No image supplied; confidence reduced",
            f"Condition reported by the seller: {condition}",
        ],
        warning=(
            "This is a preliminary screen based on seller-provided details. "
            "Buyers can ask the seller for more before confirming."
        ),
        source="demo",
        photoStatus=photo_status,
        photoChecks=photo_checks,
    )


def openai_assessment(
    *,
    image_bytes: bytes,
    content_type: str,
    crop: str,
    variety: str,
    condition: str,
    notes: str,
) -> QualityAssessment:
    from openai import OpenAI

    model = os.environ["OPENAI_MODEL"]
    encoded = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{content_type};base64,{encoded}"
    prompt = f"""
You are screening a produce photo for the FarmPool marketplace. Inspect only externally visible
evidence in the image. Do not claim to see taste, food safety, internal damage, origin or anything
that cannot be observed. Treat the seller-entered condition as unverified information.

Lot data:
- Crop: {crop}
- Variety: {variety}
- Seller-reported condition: {condition}
- Farmer notes: {notes or "None"}

Return:
1. A preliminary grade, a 0-100 visual-condition score, calibrated confidence, and 2-5 short
   observations.
2. photo_status, judged strictly:
   - "Accepted": the image clearly shows produce that plausibly matches the stated crop, with
     enough lighting and sharpness to judge condition.
   - "Retake required": no produce visible, wrong subject, too dark, too blurry, or too far away.
   - "Manual review": you cannot tell, the content seems unrelated or inappropriate, or anything
     else prevents a confident call.
3. photo_checks: 1-5 short findings behind that status (produce visible or not, crop match,
   lighting, clarity, anything concerning).
""".strip()

    client = OpenAI()
    response = client.responses.parse(
        model=model,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": data_url, "detail": "high"},
                ],
            }
        ],
        text_format=VisionAssessment,
    )
    parsed = response.output_parsed
    if parsed is None:
        raise ValueError("The model did not return a quality assessment")

    return QualityAssessment(
        grade=parsed.grade,
        visualScore=parsed.visual_score,
        confidence=parsed.confidence,
        observations=parsed.observations,
        warning=(
            "AI reviewed external appearance only. Condition is confirmed with the seller and "
            "at pickup, not by the photo."
        ),
        source="openai",
        photoStatus=parsed.photo_status,
        photoChecks=parsed.photo_checks,
    )


# --------------------------------------------------------------------------
# Voice to listing
# --------------------------------------------------------------------------

VOICE_EXTRACTION_SYSTEM = """
You turn a farmer's spoken harvest description into produce listing fields for FarmPool,
a marketplace that pools produce from small farms.

Rules:
- The transcript may be in any language. Always answer in English.
- Extract only what the farmer actually said. Leave a field null if it was not mentioned.
- quantity and unit: numbers only in quantity; unit is one of kg, tonnes, crates, pallets.
- harvest_date: YYYY-MM-DD only when the farmer names a clear date.
- condition: map words like "top quality" or "export grade" to Premium, "good" or "normal"
  to Standard, "mixed" or "seconds" to Economy. Leave null if unclear.
- uncertain: list the field names you filled but had to interpret or guess.
- missing: list the essentials the farmer never mentioned, from: crop, variety, quantity,
  location, harvest_date, price_per_kg.
- notes: one short sentence of extra useful detail from the recording, or null.
""".strip()


def transcribe_audio(audio: bytes, filename: str, content_type: str) -> tuple[str | None, str]:
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    if elevenlabs_key:
        try:
            import httpx

            response = httpx.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": elevenlabs_key},
                data={"model_id": os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1")},
                files={"file": (filename, audio, content_type)},
                timeout=60,
            )
            response.raise_for_status()
            text = response.json().get("text")
            if text:
                return text, "elevenlabs"
        except Exception:
            pass

    openai_model = os.getenv("OPENAI_TRANSCRIBE_MODEL")
    if os.getenv("OPENAI_API_KEY") and openai_model:
        try:
            from openai import OpenAI

            buffer = io.BytesIO(audio)
            buffer.name = filename
            result = OpenAI().audio.transcriptions.create(model=openai_model, file=buffer)
            if result.text:
                return result.text, "openai"
        except Exception:
            pass

    return None, "unavailable"


def extract_listing(transcript: str) -> tuple[VoiceExtraction | None, str]:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None, "unavailable"
    try:
        from datetime import date

        from anthropic import Anthropic

        today = date.today().isoformat()
        client = Anthropic()
        response = client.messages.parse(
            model="claude-opus-4-8",
            max_tokens=2048,
            system=(
                f"{VOICE_EXTRACTION_SYSTEM}\n"
                f"- Today is {today}. Convert relative dates like 'next Friday' or "
                "'in two weeks' into YYYY-MM-DD, and add harvest_date to uncertain "
                "when you converted a relative date."
            ),
            messages=[{"role": "user", "content": transcript}],
            output_format=VoiceExtraction,
        )
        if response.parsed_output is None:
            return None, "unavailable"
        return response.parsed_output, "claude"
    except Exception:
        return None, "unavailable"


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "visionAI": bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_MODEL")),
        "voiceSTT": bool(
            os.getenv("ELEVENLABS_API_KEY")
            or (os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_TRANSCRIBE_MODEL"))
        ),
        "voiceExtraction": bool(os.getenv("ANTHROPIC_API_KEY")),
    }


@app.post("/analyse-produce", response_model=QualityAssessment)
async def analyse_produce(
    crop: str = Form(...),
    variety: str = Form(...),
    condition: str = Form(...),
    notes: str = Form(""),
    file: UploadFile | None = File(default=None),
) -> QualityAssessment:
    image_bytes = await file.read() if file else b""
    can_use_ai = bool(
        image_bytes and os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_MODEL")
    )

    if can_use_ai:
        try:
            return openai_assessment(
                image_bytes=image_bytes,
                content_type=(file.content_type or "image/jpeg") if file else "image/jpeg",
                crop=crop,
                variety=variety,
                condition=condition,
                notes=notes,
            )
        except Exception:
            # The demo must keep working if the network or model is unavailable.
            # An AI refusal or failure also lands here: the photo goes to manual review.
            pass

    return demo_assessment(condition=condition, has_image=bool(image_bytes))


@app.post("/voice-to-listing", response_model=VoiceListingResponse)
async def voice_to_listing(file: UploadFile = File(...)) -> VoiceListingResponse:
    audio = await file.read()
    filename = file.filename or "harvest-note.m4a"
    transcript, transcript_source = transcribe_audio(
        audio, filename, file.content_type or "audio/m4a"
    )

    if not transcript:
        return VoiceListingResponse(
            transcript=None,
            extraction=None,
            transcript_source="unavailable",
            extraction_source="unavailable",
        )

    extraction, extraction_source = extract_listing(transcript)
    return VoiceListingResponse(
        transcript=transcript,
        extraction=extraction,
        transcript_source=transcript_source,  # type: ignore[arg-type]
        extraction_source=extraction_source,  # type: ignore[arg-type]
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, object]:
    audio = await file.read()
    text, source = transcribe_audio(
        audio, file.filename or "harvest-note.m4a", file.content_type or "audio/m4a"
    )
    return {"text": text, "source": source if text else "unavailable"}
