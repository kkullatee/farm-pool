import unittest

from app.main import demo_assessment


class DemoAssessmentTests(unittest.TestCase):
    def test_premium_profile(self) -> None:
        result = demo_assessment(
            brix=15.2,
            defects_pct=2.0,
            firmness="Medium",
            has_image=True,
        )
        self.assertEqual(result.grade, "Premium")
        self.assertGreaterEqual(result.visualScore, 80)
        self.assertEqual(result.source, "demo")

    def test_weak_profile_is_not_premium(self) -> None:
        result = demo_assessment(
            brix=10.0,
            defects_pct=12.0,
            firmness="Soft",
            has_image=False,
        )
        self.assertEqual(result.grade, "Processing")
        self.assertLess(result.confidence, 0.8)


if __name__ == "__main__":
    unittest.main()
