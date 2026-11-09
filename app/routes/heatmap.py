
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.services.heatmap import calculate_heatmap


router = APIRouter(
    prefix="/heatmap",
    tags=["Heatmap"]
)


@router.get("/")
def get_heatmap(db: Session = Depends(get_db)):

    habits = db.query(Habit).all()

    logs = db.query(HabitLog).all()

    heatmap = calculate_heatmap(
        habits,
        logs,
        365
    )

    return {
        "total_days": len(heatmap),
        "heatmap": heatmap
    }
