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


@router.get("/", response_model=list[HabitLogResponse])
def get_habit_logs(
    habit_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(HabitLog)

    if habit_id is not None:
        habit = db.query(Habit).filter(
            Habit.id == habit_id
        ).first()

        if habit is None:
            raise HTTPException(
                status_code=404,
                detail="Habit not found"
            )

        query = query.filter(
            HabitLog.habit_id == habit_id
        )

    return query.order_by(HabitLog.log_date.desc()).all()


@router.put("/daily", response_model=HabitLogResponse)
def update_daily_habit_status(
    log_data: HabitLogCreate,
    db: Session = Depends(get_db)
):
    # Check habit exists
    habit = db.query(Habit).filter(
        Habit.id == log_data.habit_id
    ).first()

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    # Find this habit's log for the given date
    existing_log = db.query(HabitLog).filter(
        HabitLog.habit_id == log_data.habit_id,
        HabitLog.log_date == log_data.log_date
    ).first()

    if existing_log:
        # Update existing record
        existing_log.completed = log_data.completed
        db.commit()
        db.refresh(existing_log)
        return existing_log

    # Create a new record if it doesn't exist
    new_log = HabitLog(
        habit_id=log_data.habit_id,
        log_date=log_data.log_date,
        completed=log_data.completed
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return new_log



@router.put("/{log_id}", response_model=HabitLogResponse)
def update_habit_log(
    log_id: int,
    completed: bool,
    db: Session = Depends(get_db)
):
    log = db.query(HabitLog).filter(
        HabitLog.id == log_id
    ).first()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Habit log not found"
        )

    log.completed = completed

    db.commit()
    db.refresh(log)

    return log