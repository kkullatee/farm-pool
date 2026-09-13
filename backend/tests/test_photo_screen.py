"""Photo screening tests with the Anthropic call mocked out.

Run from backend/:  .venv/bin/python -m unittest discover tests
"""

import asyncio
import unittest
from io import BytesIO
from unittest.mock import Mock, patch

from fastapi import UploadFile
from starlette.datastructures import Headers

from app.main import PhotoScreen, analyse_produce, health, screen_photo_with_claude


def fake_upload() -> UploadFile:
    return UploadFile(
        file=BytesIO(b"\xff\xd8\xff\xe0" + b"0" * 64),
        filename="produce.jpg",
        headers=Headers({"content-type": "image/jpeg"}),
    )


def analyse():
    return asyncio.run(
        analyse_produce(
            crop="Mango", variety="Kensington Pride", condition="Premium", file=fake_upload()
        )
    )


class PhotoScreenTests(unittest.TestCase):
    def setUp(self) -> None:
        self.env = patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_accepted(self) -> None:
        screen = PhotoScreen(
            status="Accepted",
            produce_visible=True,
            crop_match_plausible=True,
            image_usable=True,
            reason="Clear photo of mangoes in good light.",
            confidence=0.92,
        )
        with patch("app.main.screen_photo_with_claude", return_value=screen):
            result = analyse()
        self.assertEqual(result.photoStatus, "Accepted")
        self.assertEqual(result.source, "anthropic")
        self.assertIn("Produce visible in photo", result.photoChecks)

    def test_retake_required(self) -> None:
        screen = PhotoScreen(
            status="Retake required",
            produce_visible=False,
            crop_match_plausible=False,
            image_usable=False,
            reason="The photo is too dark to see any produce.",
            confidence=0.88,
        )
        with patch("app.main.screen_photo_with_claude", return_value=screen):
            result = analyse()
        self.assertEqual(result.photoStatus, "Retake required")
        self.assertEqual(result.source, "anthropic")
        self.assertIn("No produce clearly visible", result.photoChecks)

    def test_api_failure_downgrades_to_manual_review(self) -> None:
        with patch("app.main.screen_photo_with_claude", side_effect=TimeoutError("api down")):
            result = analyse()
        self.assertEqual(result.photoStatus, "Manual review")
        self.assertEqual(result.source, "demo")

    def test_inconsistent_accept_is_never_faked(self) -> None:
        # The consistency guard lives inside screen_photo_with_claude; exercise
        # it directly: an "Accepted" with a failed check must not survive.
        screen = PhotoScreen(
            status="Accepted",
            produce_visible=True,
            crop_match_plausible=True,
            image_usable=False,
            reason="Blurry but probably mangoes.",
            confidence=0.5,
        )
        fake_client = Mock()
        fake_client.messages.parse.return_value = Mock(parsed_output=screen)
        with patch("anthropic.Anthropic", return_value=fake_client):
            result = screen_photo_with_claude(
                image_bytes=b"x", content_type="image/jpeg", crop="Mango", variety="KP"
            )
        self.assertEqual(result.status, "Manual review")

    def test_health_reports_anthropic_vision(self) -> None:
        body = health()
        self.assertTrue(body["visionAI"])
        self.assertNotIn("openai", str(body).lower())


if __name__ == "__main__":
    unittest.main()
