from __future__ import annotations

import base64
import os
from datetime import date
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

PhotoStatus = Literal["Accepted", "Retake required", "Manual review", "No photo"]
VerificationStatus = Literal["ai-screened", "needs-review", "unverified"]
VoiceField = Literal[
    "crop",
    "variety",
    "quantity",
    "unit",
    "location",
    "harvest_date",
    "price_per_kg",
    "condition",
    "notes",
]


ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")


class VisualAssessment(BaseModel):
    """Structured visual-only assessment stored with a listing.

    It deliberately avoids claims a photo cannot support: Brix, internal
    quality, food safety, exact variety and freshness are not verified here.
    """

    containsProduce: bool
    inappropriateOrIrrelevant: bool
    detectedCrop: str | None = None
    cropAgreesWithListing: bool | None = None
    observations: list[str] = Field(default_factory=list, max_length=6)
    damageOrDefectIndicators: list[str] = Field(default_factory=list, max_length=6)
    confidence: float = Field(ge=0, le=1)
    requiresAnotherPhoto: bool
    retakeReason: str | None = Field(default=None, max_length=300)
    verificationStatus: VerificationStatus
    source: Literal["anthropic", "demo"]
    disclaimer: str = (
        "Visual assessment only: this photo does not prove Brix, internal quality, "
        "food safety, exact variety or freshness."
    )


class QualityAssessment(BaseModel):
    grade: Literal["Premium", "Standard", "Processing"]
    visualScore: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    observations: list[str]
    warning: str
    source: Literal["anthropic", "demo"]
    photoStatus: PhotoStatus
    photoChecks: list[str] = []
    visualAssessment: VisualAssessment | None = None


class PhotoScreen(BaseModel):
    """Strict schema for the vision model's visual-only photo screen."""

    containsProduce: bool
    inappropriateOrIrrelevant: bool
    detectedCrop: str | None = None
    cropAgreesWithListing: bool | None = None
    imageUsable: bool
    observations: list[str] = Field(default_factory=list, max_length=6)
    damageOrDefectIndicators: list[str] = Field(default_factory=list, max_length=6)
    confidence: float = Field(ge=0, le=1)
    requiresAnotherPhoto: bool
    retakeReason: str | None = Field(default=None, min_length=1, max_length=300)
    verificationStatus: VerificationStatus


class VoiceFieldConfidence(BaseModel):
    crop: float | None = Field(default=None, ge=0, le=1)
    variety: float | None = Field(default=None, ge=0, le=1)
    quantity: float | None = Field(default=None, ge=0, le=1)
    unit: float | None = Field(default=None, ge=0, le=1)
    location: float | None = Field(default=None, ge=0, le=1)
    harvest_date: float | None = Field(default=None, ge=0, le=1)
    price_per_kg: float | None = Field(default=None, ge=0, le=1)
    condition: float | None = Field(default=None, ge=0, le=1)
    notes: float | None = Field(default=None, ge=0, le=1)


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
    field_confidence: VoiceFieldConfidence = Field(default_factory=VoiceFieldConfidence)
    uncertain: list[VoiceField] = Field(default_factory=list)
    missing: list[VoiceField] = Field(default_factory=list)
    ambiguous: list[VoiceField] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list, max_length=6)
    follow_up_questions: list[str] = Field(default_factory=list, max_length=5)


class VoiceListingResponse(BaseModel):
    transcript: str | None
    extraction: VoiceExtraction | None
    transcript_source: Literal["elevenlabs", "unavailable"]
    extraction_source: Literal["claude", "unavailable"]


class TranscriptListingRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=8000)


class CoordinatorOrder(BaseModel):
    businessName: str
    crop: str
    variety: str
    quantityKg: float
    deliveryLocation: str
    deliveryDate: str
    maximumDeliveredPricePerKg: float
    minimumCondition: str


class CoordinatorLot(BaseModel):
    farmerName: str
    crop: str
    variety: str
    allocatedKg: float | None = None
    availableKg: float
    location: str
    harvestDate: str
    condition: str
    verification: str
    reliability: float
    onTimePct: float | None = None
    pricePerKg: float
    distanceKm: float | None = None
    reasons: list[str] = Field(default_factory=list)
    visualVerificationStatus: VerificationStatus | None = None


class CoordinatorCombination(BaseModel):
    id: str
    rank: int
    farmNames: list[str]
    fulfilledKg: float
    deliveredPerKg: float
    totalCost: float
    withinBudget: bool
    fulfilmentProbability: float = Field(ge=0, le=1)
    logisticsScore: float = Field(ge=0, le=1)
    buyerFitScore: float = Field(ge=0, le=1)
    finalScore: float = Field(ge=0, le=1)
    explanation: str


class PoolCoordinatorRequest(BaseModel):
    order: CoordinatorOrder
    selectedLots: list[CoordinatorLot] = Field(default_factory=list)
    rejectedLots: list[CoordinatorLot] = Field(default_factory=list)
    reserveLots: list[CoordinatorLot] = Field(default_factory=list)
    rankedCombinations: list[CoordinatorCombination] = Field(default_factory=list)
    requestedKg: float
    fulfilledKg: float
    fillRate: float = Field(ge=0)
    deliveredPerKg: float
    totalCost: float
    withinBudget: bool
    withinPriceCeiling: bool


class PoolCoordinatorOutput(BaseModel):
    recommendation: str = Field(min_length=1, max_length=700)
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(default_factory=list, max_length=6)
    tradeoffs: list[str] = Field(default_factory=list, max_length=6)
    selectedReason: list[str] = Field(default_factory=list, max_length=6)
    excludedReason: list[str] = Field(default_factory=list, max_length=6)
    adjustmentSuggestions: list[str] = Field(default_factory=list, max_length=6)


class PoolCoordinatorResponse(PoolCoordinatorOutput):
    source: Literal["claude", "demo"]
    approvalRequired: bool = True


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
    visual_assessment = VisualAssessment(
        containsProduce=has_image,
        inappropriateOrIrrelevant=False,
        detectedCrop=None,
        cropAgreesWithListing=None,
        observations=[
            "Photo reference captured locally for review"
            if has_image
            else "No photo supplied"
        ],
        damageOrDefectIndicators=[],
        confidence=0.45 if has_image else 0,
        requiresAnotherPhoto=False,
        retakeReason=None,
        verificationStatus="needs-review" if has_image else "unverified",
        source="demo",
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
        visualAssessment=visual_assessment,
    )


# Media types the Anthropic vision API accepts.
IMAGE_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def normalise_photo_screen(screen: PhotoScreen, crop: str) -> PhotoScreen:
    """Constrain visual output so uncertain or unsafe screens never look valid."""
    updates: dict[str, object] = {}
    crop_mismatch = screen.cropAgreesWithListing is False
    weak_confidence = screen.confidence < 0.65

    if screen.inappropriateOrIrrelevant or not screen.containsProduce:
        updates["verificationStatus"] = "unverified"
        updates["requiresAnotherPhoto"] = True
        updates["retakeReason"] = (
            screen.retakeReason
            or "Please upload a clear produce photo rather than an unrelated image."
        )
    elif crop_mismatch:
        updates["verificationStatus"] = "unverified"
        updates["requiresAnotherPhoto"] = True
        updates["retakeReason"] = (
            screen.retakeReason
            or f"The photo does not clearly match the entered crop ({crop})."
        )
    elif not screen.imageUsable:
        updates["verificationStatus"] = "unverified"
        updates["requiresAnotherPhoto"] = True
        updates["retakeReason"] = (
            screen.retakeReason or "Please retake the photo in brighter light and closer focus."
        )
    elif screen.verificationStatus == "ai-screened" and weak_confidence:
        updates["verificationStatus"] = "needs-review"
        updates["requiresAnotherPhoto"] = False
    elif screen.verificationStatus == "ai-screened" and screen.cropAgreesWithListing is None:
        updates["verificationStatus"] = "needs-review"

    if updates:
        return screen.model_copy(update=updates)
    return screen


def photo_status_for(screen: PhotoScreen) -> PhotoStatus:
    if screen.verificationStatus == "ai-screened":
        return "Accepted"
    if screen.requiresAnotherPhoto and screen.verificationStatus == "unverified":
        return "Retake required"
    return "Manual review"


def screen_photo_with_claude(
    *, image_bytes: bytes, content_type: str, crop: str, variety: str
) -> PhotoScreen:
    """Run the three-check photo screen. Raises on any failure; the caller
    downgrades to manual review."""
    from anthropic import Anthropic

    media_type = content_type if content_type in IMAGE_MEDIA_TYPES else "image/jpeg"
    encoded = base64.b64encode(image_bytes).decode("ascii")
    prompt = f"""
You are screening a produce photo for the FarmPool marketplace.

Entered listing crop: {crop}
Entered listing variety: {variety}

Return only the structured fields. Judge from visible evidence only.
- containsProduce: true only if edible produce is actually visible.
- inappropriateOrIrrelevant: true for non-produce, unsafe, offensive or unrelated images.
- detectedCrop: common crop name if visible, else null.
- cropAgreesWithListing: true if the visible produce plausibly agrees with the entered crop,
  false only for a clear mismatch, null if uncertain.
- observations: short visible observations such as colour, size consistency, packaging, lighting.
- damageOrDefectIndicators: visible bruising, rot, wilting, mould, cuts, surface marks or pests.
- confidence: calibrated 0-1 confidence in the visual screen.
- requiresAnotherPhoto: true when the photo is irrelevant, inappropriate, no produce is visible,
  the crop clearly mismatches, or the image is not usable.
- retakeReason: short farmer-facing reason when another photo is required, else null.
- verificationStatus:
  "ai-screened" only when produce is visible, the image is usable, the crop agrees or is not in
  doubt, and confidence is high.
  "needs-review" for uncertainty, low confidence, visible concerns, or an unclear crop match.
  "unverified" for irrelevant, inappropriate, no-produce or clear mismatch cases.

Do not claim the photo proves Brix, internal quality, food safety, exact variety or freshness.
""".strip()

    client = Anthropic(timeout=45.0)
    response = client.messages.parse(
        model=ANTHROPIC_MODEL,
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
    return normalise_photo_screen(parsed, crop)


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

    visual = VisualAssessment(
        containsProduce=screen.containsProduce,
        inappropriateOrIrrelevant=screen.inappropriateOrIrrelevant,
        detectedCrop=screen.detectedCrop,
        cropAgreesWithListing=screen.cropAgreesWithListing,
        observations=screen.observations,
        damageOrDefectIndicators=screen.damageOrDefectIndicators,
        confidence=screen.confidence,
        requiresAnotherPhoto=screen.requiresAnotherPhoto,
        retakeReason=screen.retakeReason,
        verificationStatus=screen.verificationStatus,
        source="anthropic",
    )
    crop_check = (
        f"Looks visually consistent with {crop}"
        if screen.cropAgreesWithListing
        else (
            f"Does not clearly match {crop}"
            if screen.cropAgreesWithListing is False
            else f"Crop match with {crop} is uncertain"
        )
    )
    photo_checks = [
        "Produce visible in photo" if screen.containsProduce else "No produce clearly visible",
        crop_check,
        "Image sharp and well lit enough" if screen.imageUsable else "Image not usable enough",
        f"Visual status: {screen.verificationStatus}",
    ]
    if screen.retakeReason:
        photo_checks.append(screen.retakeReason)

    return QualityAssessment(
        grade=grade,
        visualScore=visual_score,
        confidence=screen.confidence,
        observations=[
            f"Visual assessment: {screen.verificationStatus}",
            f"Condition reported by the seller: {condition}",
            *screen.observations[:2],
        ],
        warning=(
            "AI visually screened the photo only. It does not prove Brix, internal quality, "
            "food safety, exact variety or freshness; condition is confirmed with the seller "
            "and at pickup."
        ),
        source="anthropic",
        photoStatus=photo_status_for(screen),
        photoChecks=photo_checks,
        visualAssessment=visual,
    )


# --------------------------------------------------------------------------
# Voice to listing
# --------------------------------------------------------------------------

VOICE_EXTRACTION_SYSTEM = """
You are the FarmPool AI Coordinator for farmer intake. You turn a farmer's
messy spoken harvest description into produce listing suggestions for
FarmPool, a marketplace that pools produce from small farms.

Rules:
- The transcript may be in any language. Always answer in English.
- Extract only what the farmer actually said. Leave a field null if it was not mentioned.
- quantity and unit: numbers only in quantity; unit is one of kg, tonnes, crates, pallets.
- harvest_date: YYYY-MM-DD only when the farmer names a clear date.
- condition: map words like "top quality" or "export grade" to Premium, "good" or "normal"
  to Standard, "mixed" or "seconds" to Economy. Leave null if unclear.
- field_confidence: calibrated 0-1 confidence for every non-null field. Use null when empty.
- uncertain: list the field names you filled but had to interpret.
- ambiguous: list fields where multiple interpretations are plausible; do not guess low-confidence values.
- conflicts: short descriptions of contradictions in the transcript, such as two quantities or dates.
- missing: list the essentials the farmer never mentioned, from: crop, variety, quantity,
  location, harvest_date, price_per_kg.
- follow_up_questions: short questions that would resolve missing, ambiguous or conflicting details.
- notes: one short sentence of extra useful detail from the recording, or null.
- Do not invent physical measurements such as Brix, firmness, size or defects. If the farmer
  mentioned them, keep them in notes only.
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
        from anthropic import Anthropic

        today = date.today().isoformat()
        client = Anthropic()
        response = client.messages.parse(
            model=ANTHROPIC_MODEL,
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
        return clean_voice_extraction(response.parsed_output), "claude"
    except Exception:
        return None, "unavailable"


def clean_voice_extraction(extraction: VoiceExtraction) -> VoiceExtraction:
    """Validate model semantics beyond Pydantic's shape checks."""
    updates: dict[str, object] = {}
    if extraction.quantity is not None and extraction.quantity <= 0:
        updates["quantity"] = None
    if extraction.price_per_kg is not None and extraction.price_per_kg <= 0:
        updates["price_per_kg"] = None

    field_values = extraction.model_dump()
    confidence = extraction.field_confidence.model_dump()
    low_confidence = [
        field
        for field, value in confidence.items()
        if field_values.get(field) is not None and value is not None and value < 0.55
    ]
    ambiguous = list(dict.fromkeys([*extraction.ambiguous, *low_confidence]))
    if ambiguous != extraction.ambiguous:
        updates["ambiguous"] = ambiguous

    if not extraction.follow_up_questions:
        questions = []
        for field in [*extraction.missing, *ambiguous]:
            label = field.replace("_", " ")
            questions.append(f"What is the {label}?")
            if len(questions) == 4:
                break
        if questions:
            updates["follow_up_questions"] = questions

    return extraction.model_copy(update=updates) if updates else extraction


# --------------------------------------------------------------------------
# Pool coordinator
# --------------------------------------------------------------------------


def demo_pool_coordination(request: PoolCoordinatorRequest) -> PoolCoordinatorResponse:
    complete = request.fulfilledKg >= request.requestedKg
    selected_names = ", ".join(lot.farmerName for lot in request.selectedLots) or "no farms"
    if complete and request.withinBudget:
        recommendation = (
            "Use the current top-ranked pool if the buyer is comfortable with the seller mix; "
            "it already passed deterministic crop, timing, quality and price checks."
        )
    elif complete:
        recommendation = (
            "A complete pool exists, but it misses the buyer's price ceiling. Treat it as an "
            "alternative only after the buyer explicitly relaxes the price limit."
        )
    else:
        recommendation = (
            "No complete pool is available yet. Keep the partial plan as a lead list and adjust "
            "the order or request more supply before approval."
        )

    suggestions: list[str] = []
    if not complete:
        shortfall = max(0, request.requestedKg - request.fulfilledKg)
        suggestions.append(
            f"Request at least {shortfall:,.0f} kg more supply for {request.order.crop}."
        )
        suggestions.append("Try a later delivery date to include farms harvesting after the current date.")
    if not request.withinPriceCeiling:
        suggestions.append("Ask the buyer to confirm a higher delivered price limit before choosing any pool.")
    if request.rejectedLots:
        suggestions.append("Review excluded farms and confirm whether variety, date or condition requirements can change.")

    return PoolCoordinatorResponse(
        source="demo",
        approvalRequired=True,
        recommendation=recommendation,
        confidence=0.68 if request.rankedCombinations else 0.56,
        evidence=[
            f"Deterministic matching found {len(request.rankedCombinations)} complete candidate pool(s).",
            f"Selected plan uses {selected_names}.",
            f"Current fill is {request.fulfilledKg:,.0f} kg of {request.requestedKg:,.0f} kg.",
        ],
        tradeoffs=[
            "Financial totals, delivered price and route distance come from deterministic code.",
            "The ranking model orders feasible pools but does not override hard rules.",
        ],
        selectedReason=[
            lot.farmerName
            + f": {lot.condition} condition, {lot.reliability:.0f}% reliability, {lot.location}"
            for lot in request.selectedLots[:4]
        ],
        excludedReason=[
            lot.farmerName + ": " + ("; ".join(lot.reasons) or "not needed in the chosen pool")
            for lot in request.rejectedLots[:4]
        ],
        adjustmentSuggestions=suggestions,
    )


def coordinate_pool_with_claude(request: PoolCoordinatorRequest) -> PoolCoordinatorResponse:
    from anthropic import Anthropic

    system = """
You are the FarmPool AI Coordinator. The app has already calculated deterministic
feasibility, candidate pools, route/cost totals and model rankings.

Your job:
- Compare the provided feasible pool plans.
- Explain why selected farms were selected and why excluded farms were excluded.
- Summarise quality, timing, reliability, transport and price trade-offs.
- Recommend a balanced plan using only the provided deterministic facts.
- Never calculate or change financial totals, route distances, quantities or dates.
- Never approve the order. Always say buyer/farmer confirmation is still required.
- When no complete or affordable match exists, suggest actionable adjustments such
  as delivery date, quantity, price limit or requesting more supply.

Return concise user-facing explanations only. Do not reveal hidden chain-of-thought.
""".strip()
    client = Anthropic(timeout=45.0)
    response = client.messages.parse(
        model=ANTHROPIC_MODEL,
        max_tokens=2048,
        system=system,
        messages=[
            {
                "role": "user",
                "content": "Deterministic FarmPool plan data:\n"
                + request.model_dump_json(indent=2),
            }
        ],
        output_format=PoolCoordinatorOutput,
    )
    parsed = response.parsed_output
    if parsed is None:
        raise ValueError("The model did not return a pool coordination result")
    return PoolCoordinatorResponse(
        **parsed.model_dump(),
        source="claude",
        approvalRequired=True,
    )


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
        "poolCoordinator": bool(os.getenv("ANTHROPIC_API_KEY")),
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


@app.post("/extract-listing", response_model=VoiceListingResponse)
async def extract_listing_from_transcript(
    request: TranscriptListingRequest,
) -> VoiceListingResponse:
    extraction, extraction_source = extract_listing(request.transcript)
    return VoiceListingResponse(
        transcript=request.transcript,
        extraction=extraction,
        transcript_source="unavailable",
        extraction_source=extraction_source,  # type: ignore[arg-type]
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, object]:
    audio = await file.read()
    text, source = transcribe_audio(
        audio, file.filename or "harvest-note.m4a", file.content_type or "audio/m4a"
    )
    return {"text": text, "source": source if text else "unavailable"}


@app.post("/coordinate-pool", response_model=PoolCoordinatorResponse)
async def coordinate_pool(request: PoolCoordinatorRequest) -> PoolCoordinatorResponse:
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return coordinate_pool_with_claude(request)
        except Exception:
            pass
    return demo_pool_coordination(request)
