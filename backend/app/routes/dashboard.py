from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.dashboard import calculate_dashboard_summary


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db)
):

    target_date = date.today()

    habits = db.query(Habit).all()
    logs = db.query(HabitLog).all()

    summary = calculate_dashboard_summary(
        habits,
        logs,
        target_date
    )

    return summary