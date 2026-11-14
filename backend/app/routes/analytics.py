
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.habit_analytics import calculate_weekly_analytics

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/weekly")
def get_weekly_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(HabitLog).join(
        Habit, Habit.id == HabitLog.habit_id
    ).filter(
        Habit.user_id == current_user.id
    ).all()

    weekly_data = calculate_weekly_analytics(logs)

    return {
        "total_days": len(weekly_data),
        "weekly_analytics": weekly_data
    }
