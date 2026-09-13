from __future__ import annotations

import base64
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
    source: Literal["anthropic", "demo"]
    photoStatus: PhotoStatus
    photoChecks: list[str] = []


class PhotoScreen(BaseModel):
    """Strict schema for the vision model's photo screen.

    The model only screens the photo (produce visible, plausible crop match,
    usable image). It never grades quality, freshness or condition.
    """

    status: Literal["Accepted", "Retake required", "Manual review"]
    produce_visible: bool
    crop_match_plausible: bool
    image_usable: bool
    reason: str = Field(min_length=1, max_length=300)
    confidence: float = Field(ge=0, le=1)


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
    transcript_source: Literal["elevenlabs", "unavailable"]
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


ANTHROPIC_VISION_MODEL = "claude-opus-4-8"

# Media types the Anthropic vision API accepts.
IMAGE_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def screen_photo_with_claude(
    *, image_bytes: bytes, content_type: str, crop: str, variety: str
) -> PhotoScreen:
    """Run the three-check photo screen. Raises on any failure; the caller
    downgrades to manual review."""
    from anthropic import Anthropic

    media_type = content_type if content_type in IMAGE_MEDIA_TYPES else "image/jpeg"
    encoded = base64.b64encode(image_bytes).decode("ascii")
    prompt = f"""
You are screening a produce photo for the FarmPool marketplace. Check exactly three things:

1. produce_visible: is produce actually visible in the photo?
2. crop_match_plausible: could it plausibly be {crop} ({variety})? Flag only clear mismatches.
3. image_usable: is the image sharp and well lit enough to be useful to a buyer?

status, judged strictly:
- "Accepted" only when all three checks pass.
- "Retake required" when no produce is visible, the subject is wrong, or the image is too dark,
  too blurry or too far away.
- "Manual review" when you cannot tell, or anything else prevents a confident call.

Do not judge quality, freshness, ripeness, disease or condition. You are only screening whether
the photo is usable. reason: one short plain sentence the farmer can act on. confidence: your
calibrated 0-1 confidence in this screen.
""".strip()

    client = Anthropic(timeout=45.0)
    response = client.messages.parse(
        model=ANTHROPIC_VISION_MODEL,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": encoded,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        output_format=PhotoScreen,
    )
    parsed = response.parsed_output
    if parsed is None:
        raise ValueError("The model did not return a photo screen")

    # Never fake an Accepted: if the model says Accepted but any check failed,
    # the result is inconsistent and goes to manual review instead.
    if parsed.status == "Accepted" and not (
        parsed.produce_visible and parsed.crop_match_plausible and parsed.image_usable
    ):
        return parsed.model_copy(update={"status": "Manual review"})
    return parsed


def anthropic_assessment(*, screen: PhotoScreen, condition: str, crop: str) -> QualityAssessment:
    """Map a photo screen onto the response shape the app already uses.

    Grade and score come from the seller-provided condition, exactly like the
    demo path: the AI screens the photo, it does not grade produce quality.
    """
    by_condition = {
        "Premium": ("Premium", 91),
        "Standard": ("Standard", 82),
        "Economy": ("Processing", 68),
    }
    grade, visual_score = by_condition.get(condition, ("Standard", 78))

    photo_checks = [
        "Produce visible in photo" if screen.produce_visible else "No produce clearly visible",
        f"Looks consistent with {crop}"
        if screen.crop_match_plausible
        else f"Does not clearly match {crop}",
        "Image sharp and well lit" if screen.image_usable else "Image too dark, blurry or far away",
        screen.reason,
    ]

    return QualityAssessment(
        grade=grade,
        visualScore=visual_score,
        confidence=screen.confidence,
        observations=[
            f"Photo check: {screen.reason}",
            f"Condition reported by the seller: {condition}",
        ],
        warning=(
            "AI screened the photo only (produce visible, crop match, image usable). "
            "Condition is confirmed with the seller and at pickup, not by the photo."
        ),
        source="anthropic",
        photoStatus=screen.status,
        photoChecks=photo_checks,
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
        "visionAI": bool(os.getenv("ANTHROPIC_API_KEY")),
        "voiceSTT": bool(os.getenv("ELEVENLABS_API_KEY")),
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
    can_use_ai = bool(image_bytes and os.getenv("ANTHROPIC_API_KEY"))

    if can_use_ai:
        try:
            screen = screen_photo_with_claude(
                image_bytes=image_bytes,
                content_type=(file.content_type or "image/jpeg") if file else "image/jpeg",
                crop=crop,
                variety=variety,
            )
            return anthropic_assessment(screen=screen, condition=condition, crop=crop)
        except Exception:
            # Any failure, refusal, timeout or invalid model output lands here:
            # the photo goes to manual review, never a faked result.
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
