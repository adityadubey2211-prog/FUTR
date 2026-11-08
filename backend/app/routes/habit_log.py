from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.schemas.habit_log import HabitLogCreate, HabitLogResponse

router = APIRouter(prefix="/habit-logs", tags=["Habit Logs"])


@router.post("/", response_model=HabitLogResponse, status_code=201)
def create_habit_log(
    log_data: HabitLogCreate,
    db: Session = Depends(get_db)
):
    habit = db.query(Habit).filter(
        Habit.id == log_data.habit_id
    ).first()

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    existing_log = db.query(HabitLog).filter(
        HabitLog.habit_id == log_data.habit_id,
        HabitLog.log_date == log_data.log_date
    ).first()

    if existing_log:
        raise HTTPException(
            status_code=409,
            detail="Habit log already exists for this date"
        )

    new_log = HabitLog(
        habit_id=log_data.habit_id,
        log_date=log_data.log_date,
        completed=log_data.completed
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return new_log