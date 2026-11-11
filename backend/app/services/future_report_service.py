
import json
import os
import re
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
from groq import Groq


# ─────────────────────────────────────────────
# GROQ CONFIGURATION
# ─────────────────────────────────────────────

load_dotenv(".env")

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from backend/.env")

groq_client = Groq(api_key=api_key)

MODEL_NAME = "openai/gpt-oss-120b"


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def normalize_date(value):
    """Convert datetime/string/date into a date object."""

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        return date.fromisoformat(value[:10])

    return None


def calculate_consistency(completed, total):
    if total == 0:
        return 0.0

    return round((completed / total) * 100, 2)


def calculate_streaks_for_habit(completed_dates):
    """Calculate current and longest completed-day streak."""

    if not completed_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0
        }

    today = date.today()

    current_streak = 0
    check_date = today

    if check_date not in completed_dates:
        check_date -= timedelta(days=1)

    while check_date in completed_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    longest_streak = 0
    running_streak = 0
    previous_date = None

    for completed_date in sorted(completed_dates):

        if (
            previous_date is not None
            and completed_date == previous_date + timedelta(days=1)
        ):
            running_streak += 1
        else:
            running_streak = 1

        longest_streak = max(longest_streak, running_streak)
        previous_date = completed_date

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak
    }


# ─────────────────────────────────────────────
# HABIT SUMMARY
# ─────────────────────────────────────────────

def build_habit_summary(habits, logs):

    today = date.today()

    log_map = {}

    for log in logs:

        log_date = normalize_date(log.log_date)

        if log_date is None:
            continue

        log_map[(log.habit_id, log_date)] = bool(log.completed)

    habit_performance = []

    total_completed = {7: 0, 30: 0, 90: 0}
    total_recorded = {7: 0, 30: 0, 90: 0}

    for habit in habits:

        created_date = normalize_date(habit.created_at)

        if created_date is None:
            created_date = today

        habit_logs = {
            log_date: completed
            for (habit_id, log_date), completed in log_map.items()
            if habit_id == habit.id
            and created_date <= log_date <= today
        }

        completed_dates = {
            log_date
            for log_date, completed in habit_logs.items()
            if completed
        }

        window_stats = {}

        for days in [7, 30, 90]:

            start_date = today - timedelta(days=days - 1)

            recorded_dates = {
                log_date
                for log_date in habit_logs
                if start_date <= log_date <= today
            }

            completed_count = sum(
                1
                for log_date in recorded_dates
                if habit_logs[log_date]
            )

            recorded_count = len(recorded_dates)

            consistency = calculate_consistency(
                completed_count,
                recorded_count
            )

            window_stats[days] = {
                "completed_days": completed_count,
                "recorded_days": recorded_count,
                "consistency": consistency
            }

            total_completed[days] += completed_count
            total_recorded[days] += recorded_count

        streaks = calculate_streaks_for_habit(completed_dates)

        habit_performance.append({

            "habit_id": habit.id,
            "habit_name": habit.name,
            "category": habit.category,
            "description": habit.description,
            "created_at": created_date.isoformat(),

            "recorded_completed_days": len(completed_dates),

            "recorded_days_7": window_stats[7]["recorded_days"],
            "recorded_days_30": window_stats[30]["recorded_days"],
            "recorded_days_90": window_stats[90]["recorded_days"],

            "consistency_7_days": window_stats[7]["consistency"],
            "consistency_30_days": window_stats[30]["consistency"],
            "consistency_90_days": window_stats[90]["consistency"],

            "current_streak": streaks["current_streak"],
            "longest_streak": streaks["longest_streak"]
        })

    # Overall consistency uses only recorded entries.
    overall = {}

    for days in [7, 30, 90]:

        overall[days] = calculate_consistency(
            total_completed[days],
            total_recorded[days]
        )

    # Ignore habits with no recorded entries when ranking.
    ranked_habits = [
        habit
        for habit in habit_performance
        if habit["recorded_days_30"] > 0
    ]

    ranked_habits.sort(
        key=lambda x: x["consistency_30_days"]
    )

    strongest_habit = None
    weakest_habit = None

    if ranked_habits:

        strongest_habit = ranked_habits[-1]["habit_name"]
        weakest_habit = ranked_habits[0]["habit_name"]

    # Calculate distinct dates across all habits.
    recorded_dates = {
        log_date
        for _, log_date in log_map
        if log_date <= today
    }

    return {

        "total_habits": len(habits),

        "overall_consistency_7_days": overall[7],
        "overall_consistency_30_days": overall[30],
        "overall_consistency_90_days": overall[90],

        "completed_entries_7_days": total_completed[7],
        "possible_entries_7_days": total_recorded[7],

        "completed_entries_30_days": total_completed[30],
        "possible_entries_30_days": total_recorded[30],

        "completed_entries_90_days": total_completed[90],
        "possible_entries_90_days": total_recorded[90],

        "recorded_data_days": len(recorded_dates),

        "strongest_habit": strongest_habit,
        "weakest_habit": weakest_habit,

        "habit_performance": habit_performance
    }


# ─────────────────────────────────────────────
# CURRENT REALITY
# ─────────────────────────────────────────────

def build_current_reality(habit_summary):

    return {

        "total_habits": habit_summary["total_habits"],

        "overall_consistency": habit_summary[
            "overall_consistency_7_days"
        ],

        "completed_days": habit_summary[
            "completed_entries_7_days"
        ],

        "strongest_habit": habit_summary["strongest_habit"],

        "weakest_habit": habit_summary["weakest_habit"],

        "habit_performance": habit_summary["habit_performance"],

        "recorded_data_days": habit_summary["recorded_data_days"]
    }


# ─────────────────────────────────────────────
# JSON PARSER
# ─────────────────────────────────────────────

def parse_groq_json(content):

    if not content:
        raise ValueError("Groq returned an empty report")

    content = content.strip()

    # Remove accidental Markdown code fences.
    if content.startswith("```"):

        content = re.sub(
            r"^```(?:json)?\s*",
            "",
            content,
            flags=re.IGNORECASE
        )

        content = re.sub(r"\s*```$", "", content)

    # Remove accidental Markdown bold markers.
    content = content.replace("**", "")

    try:
        return json.loads(content)

    except json.JSONDecodeError:
        pass

    # Ask Groq to repair malformed JSON.
    repair_response = groq_client.chat.completions.create(

        model=MODEL_NAME,

        messages=[
            {
                "role": "system",
                "content": (
                    "You are a JSON repair tool. "
                    "Return only valid JSON. "
                    "Do not add Markdown or explanations. "
                    "Do not invent or change information."
                )
            },
            {
                "role": "user",
                "content": (
                    "Repair this malformed JSON. "
                    "Preserve all existing information and structure:\n\n"
                    + content
                )
            }
        ],

        temperature=0,
        max_tokens=6000
    )

    repaired_content = repair_response.choices[0].message.content

    if not repaired_content:
        raise ValueError("Groq JSON repair returned an empty response")

    repaired_content = repaired_content.strip()

    if repaired_content.startswith("```"):

        repaired_content = re.sub(
            r"^```(?:json)?\s*",
            "",
            repaired_content,
            flags=re.IGNORECASE
        )

        repaired_content = re.sub(
            r"\s*```$",
            "",
            repaired_content
        )

    repaired_content = repaired_content.replace("**", "")

    return json.loads(repaired_content)


# ─────────────────────────────────────────────
# FUTURE REPORT GENERATION
# ─────────────────────────────────────────────

def generate_future_report_with_groq(goal: str, habit_summary: dict):

    prompt = f"""
You are FUTR, an intelligent personal growth and future-planning assistant.

Generate a detailed, realistic and personalized future report.

USER'S MAJOR LIFE GOAL:
{goal}

USER'S ACTUAL HABIT DATA:
{json.dumps(habit_summary, indent=2)}

IMPORTANT DATA RULES:

1. Use only supplied habit data as verified facts.
2. Never invent user statistics, achievements, habits or routines.
3. recorded_data_days represents distinct dates with actual logs.
4. Consistency percentages are calculated only from recorded entries.
5. Never describe a short recorded period as established long-term behavior.
6. Distinguish measured facts, assumptions and recommendations.
7. A habit with zero recorded entries means insufficient data, not failure.
8. Never diagnose personality, mental health or medical conditions.
9. Predictions are estimates, never guarantees.
10. Never guarantee salary, placement or success.
11. If data is limited, explicitly mention low confidence.
12. Recommendations must be practical and achievable.
13. Use simple, clear English.
14. Do not use Markdown inside JSON strings.
15. Never use **, *, backticks or code fences.
16. Return exactly the required JSON structure.

IMPORTANT OVERALL CONSISTENCY RULE:

The overall consistency percentage represents completed recorded entries
divided by all recorded entries.

It does not represent consistency across every calendar day.

A habit with zero recorded days must not be described as failed.

Do not claim that the user has maintained a long-term routine based
on only a few recorded days.

GENERATE THESE SEVEN SECTIONS:

1. habit_personality

Analyze possible habit patterns using actual evidence.
Avoid making strong personality claims from limited data.
Include confidence levels and data limitations.

2. goal_mind_map

Break the user's major goal into smaller areas, skills,
milestones and actions.

Make it visually structured for a frontend mind map.

3. future_timeline

Create exactly FIVE milestones:

- 3 months
- 6 months
- 12 months
- 24 months
- 36 months

The 36-month milestone is the final goal checkpoint.

For the 36-month milestone, directly evaluate progress
toward the user's major life goal.

For salary goals, explain that compensation depends on
skills, experience, interview performance and market conditions.

Never guarantee the target salary or career outcome.

Each milestone must include:

- timeframe
- title
- description
- expected_progress
- key_actions
- confidence
- assumptions

4. habit_gap_analysis

Compare current recorded habits with the requirements
of the user's goal.

Identify missing habits and practical improvements.

Do not treat untracked activities as proof of failure.

5. action_roadmap

Create practical short-term, medium-term and long-term actions.

Cover the complete 36-month journey.

6. seven_day_plan

Create exactly seven daily entries.

Each day should have a focus, tasks and expected outcome.

Keep the plan practical.

7. future_self_letter

Write a motivating but realistic letter from the user's future self.

Do not promise guaranteed success.

REQUIRED JSON STRUCTURE:

{{
    "habit_personality": {{
        "title": "string",
        "summary": "string",
        "traits": [
            {{
                "name": "string",
                "description": "string",
                "evidence": "string",
                "confidence": "Low/Medium/High"
            }}
        ],
        "strengths": ["string"],
        "areas_to_improve": ["string"],
        "data_limitations": "string"
    }},

    "goal_mind_map": {{
        "central_goal": "string",
        "description": "string",
        "branches": [
            {{
                "name": "string",
                "importance": "High/Medium/Low",
                "description": "string",
                "milestones": ["string"],
                "actions": ["string"]
            }}
        ]
    }},

    "future_timeline": [
        {{
            "timeframe": "3 months",
            "title": "string",
            "description": "string",
            "expected_progress": "string",
            "key_actions": ["string"],
            "confidence": "Low/Medium/High",
            "assumptions": ["string"]
        }},
        {{
            "timeframe": "6 months",
            "title": "string",
            "description": "string",
            "expected_progress": "string",
            "key_actions": ["string"],
            "confidence": "Low/Medium/High",
            "assumptions": ["string"]
        }},
        {{
            "timeframe": "12 months",
            "title": "string",
            "description": "string",
            "expected_progress": "string",
            "key_actions": ["string"],
            "confidence": "Low/Medium/High",
            "assumptions": ["string"]
        }},
        {{
            "timeframe": "24 months",
            "title": "string",
            "description": "string",
            "expected_progress": "string",
            "key_actions": ["string"],
            "confidence": "Low/Medium/High",
            "assumptions": ["string"]
        }},
        {{
            "timeframe": "36 months",
            "title": "string",
            "description": "string",
            "expected_progress": "string",
            "key_actions": ["string"],
            "confidence": "Low/Medium/High",
            "assumptions": ["string"]
        }}
    ],

    "habit_gap_analysis": {{
        "summary": "string",
        "gaps": [
            {{
                "area": "string",
                "current_state": "string",
                "required_state": "string",
                "gap": "string",
                "priority": "High/Medium/Low",
                "suggested_action": "string"
            }}
        ],
        "overall_recommendation": "string"
    }},

    "action_roadmap": {{
        "short_term": {{
            "duration": "0-3 months",
            "focus": "string",
            "actions": ["string"],
            "success_indicators": ["string"]
        }},
        "medium_term": {{
            "duration": "3-12 months",
            "focus": "string",
            "actions": ["string"],
            "success_indicators": ["string"]
        }},
        "long_term": {{
            "duration": "12-36 months",
            "focus": "string",
            "actions": ["string"],
            "success_indicators": ["string"]
        }}
    }},

    "seven_day_plan": [
        {{
            "day": 1,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 2,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 3,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 4,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 5,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 6,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }},
        {{
            "day": 7,
            "focus": "string",
            "tasks": ["string"],
            "expected_outcome": "string"
        }}
    ],

    "future_self_letter": {{
        "title": "string",
        "letter": "string",
        "closing_message": "string"
    }}
}}

FINAL VALIDATION RULES:

- All seven top-level keys must exist exactly as written.
- future_timeline must contain exactly 5 objects.
- Timeline timeframes must be 3, 6, 12, 24 and 36 months.
- seven_day_plan must contain exactly 7 objects.
- Every JSON key and string must use double quotes.
- Return valid JSON only.
"""

    response = groq_client.chat.completions.create(

        model=MODEL_NAME,

        messages=[
            {
                "role": "system",
                "content": (
                    "You are FUTR. Generate realistic personal growth reports. "
                    "Return strictly valid JSON only. "
                    "Never use Markdown, bold markers, code fences or explanations. "
                    "Use double quotes for all JSON keys and string values. "
                    "Never invent user data. "
                    "Treat predictions as estimates, not guarantees."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2,
        max_tokens=6000
    )

    content = response.choices[0].message.content

    report = parse_groq_json(content)

    if not isinstance(report, dict):
        raise ValueError("Groq report must be a JSON object")

    required_sections = [
        "habit_personality",
        "goal_mind_map",
        "future_timeline",
        "habit_gap_analysis",
        "action_roadmap",
        "seven_day_plan",
        "future_self_letter"
    ]

    for section in required_sections:

        if section not in report:
            raise ValueError(
                f"Missing report section: {section}"
            )

    # Validate future timeline.
    timeline = report["future_timeline"]

    if not isinstance(timeline, list):
        raise ValueError("future_timeline must be a list")

    expected_timeframes = [
        "3 months",
        "6 months",
        "12 months",
        "24 months",
        "36 months"
    ]

    actual_timeframes = [
        item.get("timeframe")
        for item in timeline
        if isinstance(item, dict)
    ]

    if len(timeline) != 5:
        raise ValueError(
            "Future timeline must contain exactly 5 milestones"
        )

    if actual_timeframes != expected_timeframes:
        raise ValueError(
            "Future timeline must contain milestones in the correct order"
        )

    # Validate seven-day plan.
    seven_day_plan = report["seven_day_plan"]

    if not isinstance(seven_day_plan, list):
        raise ValueError("seven_day_plan must be a list")

    if len(seven_day_plan) != 7:
        raise ValueError(
            "Seven day plan must contain exactly 7 entries"
        )

    return report
