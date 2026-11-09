from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.habit import Habit
from app.models.habit_log import HabitLog

from app.schemas.future import FutureProjectionRequest

from app.services.future_simulation import calculate_future_projection
from app.services.habit_analytics import calculate_recent_consistency
router = APIRouter(
    prefix="/future",
    tags=["Future Simulation"]
)


@router.post("/simulate")
def simulate_future(
    habit_id: int,
    data: FutureProjectionRequest,
    db: Session = Depends(get_db)
):

    # Check whether habit exists
    habit = db.query(Habit).filter(
        Habit.id == habit_id
    ).first()

    if not habit:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    # Fetch habit logs
    logs = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id
    ).all()

    # Calculate actual consistency
    consistency = calculate_recent_consistency(logs)

    # Generate projections
    six_months = calculate_future_projection(
        data.current_daily_hours,
        data.target_extra_hours,
        consistency,
        180
    )

    five_years = calculate_future_projection(
        data.current_daily_hours,
        data.target_extra_hours,
        consistency,
        1825
    )

    return {
        "habit_name": habit.name,
        "consistency": consistency,
        "six_months": six_months,
        "five_years": five_years
    }