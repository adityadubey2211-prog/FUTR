
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user

from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.habit_analytics import (
    calculate_streaks,
    calculate_consistency,
    calculate_weekly_analytics
)

from app.services.ai_coach_service import generate_daily_coaching


router = APIRouter(
    prefix="/ai-coach",
    tags=["AI Habit Coach"]
)


@router.get("/daily")
def get_daily_coaching(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    habits = db.query(Habit).filter(
        Habit.user_id == current_user.id
    ).all()

    if not habits:
        raise HTTPException(
            status_code=400,
            detail="Add at least one habit before using AI Coach."
        )

    habit_ids = [habit.id for habit in habits]

    logs = db.query(HabitLog).filter(
        HabitLog.habit_id.in_(habit_ids)
    ).all()

    habit_summary = {
        "habits": [
            {
                "name": habit.name,
                "category": habit.category,
                "description": habit.description
            }
            for habit in habits
        ],
        "streaks": {},
        "consistency": calculate_consistency(logs),
        "weekly_analytics": calculate_weekly_analytics(logs)
    }

    for habit in habits:
        habit_logs = [
            log for log in logs
            if log.habit_id == habit.id
        ]

        habit_summary["streaks"][habit.name] = (
            calculate_streaks(habit_logs)
        )

    try:
        coaching = generate_daily_coaching(habit_summary)

    except Exception as error:
        print("AI COACH ERROR:", error)

        raise HTTPException(
            status_code=502,
            detail="Unable to generate AI coaching. Please try again."
        )

    return {
        "user_id": current_user.id,
        "habit_summary": habit_summary,
        "coaching": coaching
    }
