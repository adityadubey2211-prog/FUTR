from google import genai
import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Get Gemini API key
# GEMINI_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")

# Create Gemini client using v1beta API
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options=types.HttpOptions(
        api_version="v1beta"
    )
)

# Test Gemini connection
def test_gemini_connection():

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Reply with exactly: Gemini connection successful"
    )

    return response.text

# Extract structured diet plan from PDF
def extract_diet_plan_with_gemini(pdf_text: str):

    if not pdf_text or not pdf_text.strip():
        raise ValueError("PDF text is empty")

    prompt = f"""
    You are a nutrition document extraction assistant.

    TASK:
    Extract the weekly diet plan from the provided PDF text.

    RULES:
    1. Extract only information present in the document.
    2. Never invent meals or food items.
    3. Organize meals by day.
    4. Identify Breakfast, Lunch, Evening Meal and Snacks.
    5. Keep food items readable and accurate.
    6. If a meal is missing, do not invent it.
    7. Ignore nutritional guidelines and unrelated content.
    8. Do not provide medical advice.
    9. Return only valid JSON.

    REQUIRED JSON STRUCTURE:

    {{
        "plan_name": "Adult Weekly Meal Plan",
        "description": "",
        "meals": [
            {{
                "day": "Monday",
                "meal_type": "Breakfast",
                "meal_name": "Breakfast items",
                "food_items": "Food item details"
            }}
        ]
    }}

    PDF TEXT:
    {pdf_text}
    """

    response = None

    # Retry temporary Gemini 503 errors
    for attempt in range(3):

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            break

        except Exception as error:

            error_message = str(error)

            if "503" in error_message and attempt < 2:
                wait_time = 2 * (attempt + 1)

                print(
                    f"Gemini busy. Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

            else:
                raise

    # Check response
    if response is None or not response.text:
        raise ValueError("Gemini returned an empty response")

    # Parse JSON
    try:
        diet_plan = json.loads(response.text)

    except json.JSONDecodeError:
        print("RAW GEMINI RESPONSE:", response.text)
        raise ValueError("Gemini returned invalid JSON")

    # Validate response structure
    if not isinstance(diet_plan, dict):
        raise ValueError("Invalid diet plan structure")

    if not isinstance(diet_plan.get("meals"), list):
        raise ValueError("Diet plan meals must be a list")

    if not isinstance(diet_plan.get("plan_name"), str):
        raise ValueError("Diet plan name is missing")

    required_fields = [
        "day",
        "meal_type",
        "meal_name",
        "food_items"
    ]

    for meal in diet_plan["meals"]:

        if not isinstance(meal, dict):
            raise ValueError("Invalid meal entry")

        for field in required_fields:

            if field not in meal:
                raise ValueError(
                    f"Missing field in meal: {field}"
                )

    return diet_plan



def generate_diet_plan_with_gemini(preferences: dict):

    if not isinstance(preferences, dict):
        raise ValueError("Invalid diet preferences")

    prompt = f"""
You are an expert general wellness meal-planning assistant.

TASK:
Generate a practical, budget-conscious 7-day Indian diet plan
based on the user's preferences.

USER PROFILE:
{json.dumps(preferences, ensure_ascii=False, indent=2)}

REQUIREMENTS:
1. Generate meals for all 7 days, Monday to Sunday.
2. Include exactly 4 meals per day:
   Breakfast, Lunch, Snacks, Dinner.
3. Generate exactly 28 meal entries.
4. Respect the user's dietary preference.
5. Strictly avoid the listed food allergies.
6. Consider the user's daily budget when suggesting meals.
7. Prefer practical, easily available Indian ingredients.
8. Include variety across the week.
9. Keep meal names short and food items descriptive.
10. Do not invent medical benefits or promise weight changes.
11. Do not provide medical treatment or disease-specific advice.
12. Return only valid JSON. No markdown or extra text.

REQUIRED JSON STRUCTURE:

{{
    "plan_name": "AI Generated Weekly Diet Plan",
    "description": "A short description of the plan",
    "meals": [
        {{
            "day": "Monday",
            "meal_type": "Breakfast",
            "meal_name": "Vegetable poha",
            "food_items": "Poha, peas, onion, peanuts (only if no allergy), lemon"
        }}
    ]
}}

IMPORTANT:
Return exactly 28 meal entries.
Use only these day names:
Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.

Use only these meal types:
Breakfast, Lunch, Snacks, Dinner.
"""

    response = None

    # Retry temporary Gemini 503 errors
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4
                )
            )
            break

        except Exception as error:
            error_message = str(error)

            if "503" in error_message and attempt < 2:
                wait_time = 2 * (attempt + 1)
                print(
                    f"Gemini busy. Retrying in {wait_time} seconds..."
                )
                time.sleep(wait_time)
            else:
                raise

    if response is None or not response.text:
        raise ValueError("Gemini returned an empty response")

    try:
        diet_plan = json.loads(response.text)
    except json.JSONDecodeError:
        print("RAW GEMINI RESPONSE:", response.text)
        raise ValueError("Gemini returned invalid JSON")

    if not isinstance(diet_plan, dict):
        raise ValueError("Invalid diet plan structure")

    if not isinstance(diet_plan.get("meals"), list):
        raise ValueError("Diet plan meals must be a list")

    if not isinstance(diet_plan.get("plan_name"), str):
        raise ValueError("Diet plan name is missing")

    required_days = {
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
    }

    required_meal_types = {
        "Breakfast", "Lunch", "Snacks", "Dinner"
    }

    if len(diet_plan["meals"]) != 28:
        raise ValueError(
            "AI must generate exactly 28 meal entries"
        )

    seen_combinations = set()

    for meal in diet_plan["meals"]:

        if not isinstance(meal, dict):
            raise ValueError("Invalid meal entry")

        required_fields = [
            "day", "meal_type", "meal_name", "food_items"
        ]

        for field in required_fields:
            if not isinstance(meal.get(field), str) or not meal[field].strip():
                raise ValueError(f"Invalid or missing meal field: {field}")

        if meal["day"] not in required_days:
            raise ValueError(f"Invalid day: {meal['day']}")

        if meal["meal_type"] not in required_meal_types:
            raise ValueError(
                f"Invalid meal type: {meal['meal_type']}"
            )

        combination = (meal["day"], meal["meal_type"])

        if combination in seen_combinations:
            raise ValueError("Duplicate meal entry generated")

        seen_combinations.add(combination)

    if len(seen_combinations) != 28:
        raise ValueError("Some meals are missing from the weekly plan")

    return diet_plan
