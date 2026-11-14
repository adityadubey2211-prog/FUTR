
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.services.heatmap import calculate_heatmap

router = APIRouter(
    prefix="/heatmap",
    tags=["Heatmap"]
)


@router.get("/")
def get_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    habits = db.query(Habit).filter(
        Habit.user_id == current_user.id
    ).all()

    logs = db.query(HabitLog).join(
        Habit, Habit.id == HabitLog.habit_id
    ).filter(
        Habit.user_id == current_user.id
    ).all()

    heatmap = calculate_heatmap(
        habits,
        logs,
        365
    )

    return {
        "total_days": len(heatmap),
        "heatmap": heatmap
    }
