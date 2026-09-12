import unittest

from app.main import demo_assessment


class DemoAssessmentTests(unittest.TestCase):
    def test_premium_condition(self) -> None:
        result = demo_assessment(condition="Premium", has_image=True)
        self.assertEqual(result.grade, "Premium")
        self.assertGreaterEqual(result.visualScore, 80)
        self.assertEqual(result.source, "demo")

    def test_economy_condition_is_not_premium(self) -> None:
        result = demo_assessment(condition="Economy", has_image=False)
        self.assertEqual(result.grade, "Processing")
        self.assertLess(result.confidence, 0.8)


if __name__ == "__main__":
    unittest.main()
