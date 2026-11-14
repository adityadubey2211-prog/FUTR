
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.habit_analytics import calculate_daily_score

router = APIRouter(
    prefix="/daily-score",
    tags=["Daily Score"]
)


@router.get("/")
def get_daily_score(
    target_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if target_date is None:
        target_date = date.today()

    habits = db.query(Habit).filter(
        Habit.user_id == current_user.id
    ).all()

    logs = db.query(HabitLog).join(
        Habit, Habit.id == HabitLog.habit_id
    ).filter(
        Habit.user_id == current_user.id,
        HabitLog.log_date == target_date
    ).all()

    result = calculate_daily_score(
        habits,
        logs,
        target_date
    )

    return result
