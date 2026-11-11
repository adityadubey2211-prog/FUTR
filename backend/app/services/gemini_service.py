
import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

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