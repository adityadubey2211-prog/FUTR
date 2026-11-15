
import json

from app.services.gemini_service import client
from google.genai import types


def generate_daily_coaching(habit_summary: dict):

    prompt = f"""
You are FUTR AI Habit Coach.

Analyze the user's actual habit performance.

USER HABIT DATA:
{json.dumps(habit_summary, default=str, indent=2)}

TASK:
1. Identify the strongest habit.
2. Identify the habit needing improvement.
3. Give 3 realistic daily suggestions.
4. Generate a short motivational message.
5. Never invent statistics or habits.

Return only valid JSON in this structure:

{{
    "overall_insight": "",
    "strongest_habit": "",
    "habit_to_improve": "",
    "suggestions": [
        "",
        "",
        ""
    ],
    "motivation": ""
}}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4
        )
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response")

    result = json.loads(response.text)

    required_fields = [
        "overall_insight",
        "strongest_habit",
        "habit_to_improve",
        "suggestions",
        "motivation"
    ]

    for field in required_fields:
        if field not in result:
            raise ValueError(f"Missing AI response field: {field}")

    if not isinstance(result["suggestions"], list) or len(result["suggestions"]) != 3:
        raise ValueError("AI must return exactly 3 suggestions")

    return result
