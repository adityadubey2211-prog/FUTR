
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.dashboard import calculate_dashboard_summary

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.today()

    habits = db.query(Habit).filter(
        Habit.user_id == current_user.id
    ).all()

    logs = db.query(HabitLog).join(
        Habit, Habit.id == HabitLog.habit_id
    ).filter(
        Habit.user_id == current_user.id
    ).all()

    summary = calculate_dashboard_summary(
        habits,
        logs,
        target_date
    )

    return summary
