from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.habit_log import HabitLog

from app.services.habit_analytics import calculate_weekly_analytics


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/weekly")
def get_weekly_analytics(
    db: Session = Depends(get_db)
):

    logs = db.query(HabitLog).all()

    weekly_data = calculate_weekly_analytics(logs)

    return {
        "total_days": len(weekly_data),
        "weekly_analytics": weekly_data
    }