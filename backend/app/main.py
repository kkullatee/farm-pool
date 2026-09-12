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


class QualityAssessment(BaseModel):
    grade: Literal["Premium", "Standard", "Processing"]
    visualScore: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    observations: list[str]
    warning: str
    source: Literal["openai", "demo"]


class VisionAssessment(BaseModel):
    grade: Literal["Premium", "Standard", "Processing"]
    visual_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    observations: list[str] = Field(min_length=2, max_length=5)


app = FastAPI(
    title="FarmPool AI API",
    version="1.0.0",
    description="Optional multimodal layer for the FarmPool hackathon mobile app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def demo_assessment(
    *,
    brix: float,
    defects_pct: float,
    firmness: str,
    has_image: bool,
) -> QualityAssessment:
    visual_score = max(45, min(97, round(86 + (brix - 14) * 3 - defects_pct * 1.4)))
    if brix >= 14.5 and defects_pct <= 3:
        grade = "Premium"
    elif brix >= 12 and defects_pct <= 7:
        grade = "Standard"
    else:
        grade = "Processing"

    return QualityAssessment(
        grade=grade,
        visualScore=visual_score,
        confidence=0.84 if has_image else 0.64,
        observations=[
            "Produce image captured for visual review" if has_image else "No image supplied; confidence reduced",
            f"{brix:.1f} Brix entered by the farmer",
            f"{defects_pct:.1f}% visible defects reported",
            f"{firmness} firmness profile",
        ],
        warning=(
            "This is a preliminary screen. Taste, food safety and internal defects require "
            "a physical sample and verified measurements."
        ),
        source="demo",
    )


def openai_assessment(
    *,
    image_bytes: bytes,
    content_type: str,
    crop: str,
    variety: str,
    brix: float,
    defects_pct: float,
    firmness: str,
    notes: str,
) -> QualityAssessment:
    from openai import OpenAI

    model = os.environ["OPENAI_MODEL"]
    encoded = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{content_type};base64,{encoded}"
    prompt = f"""
You are screening a produce lot for FarmPool. Inspect only externally visible evidence in the
image. Do not claim to see taste, sweetness, food safety, internal damage, origin or anything that
cannot be observed. Treat the farmer-entered Brix, defect percentage and firmness as unverified
measurements which require a physical checkpoint.

Lot data:
- Crop: {crop}
- Variety: {variety}
- Entered Brix: {brix}
- Entered visible defects: {defects_pct}%
- Entered firmness: {firmness}
- Farmer notes: {notes or "None"}

Return a preliminary grade, a 0-100 visual-condition score, calibrated confidence, and 2-5 short
observations. Penalise poor visibility and avoid unsupported conclusions.
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
            "AI reviewed external appearance only. Taste, food safety and internal defects require "
            "a physical sample and verified measurements."
        ),
        source="openai",
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "visionAI": bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_MODEL")),
        "voiceAI": bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_TRANSCRIBE_MODEL")),
    }


@app.post("/analyse-produce", response_model=QualityAssessment)
async def analyse_produce(
    crop: str = Form(...),
    variety: str = Form(...),
    brix: float = Form(...),
    defects_pct: float = Form(...),
    firmness: str = Form(...),
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
                brix=brix,
                defects_pct=defects_pct,
                firmness=firmness,
                notes=notes,
            )
        except Exception:
            # The judge demo must keep working if the network or model is unavailable.
            pass

    return demo_assessment(
        brix=brix,
        defects_pct=defects_pct,
        firmness=firmness,
        has_image=bool(image_bytes),
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, object]:
    model = os.getenv("OPENAI_TRANSCRIBE_MODEL")
    if not os.getenv("OPENAI_API_KEY") or not model:
        return {"text": None, "source": "disabled"}

    try:
        from openai import OpenAI

        audio = io.BytesIO(await file.read())
        audio.name = file.filename or "harvest-note.m4a"
        result = OpenAI().audio.transcriptions.create(model=model, file=audio)
        return {"text": result.text, "source": "openai"}
    except Exception:
        return {"text": None, "source": "unavailable"}
