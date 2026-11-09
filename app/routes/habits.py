from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models.habit import Habit
from app.schemas.habit import HabitCreate
from app.schemas.habit import HabitCreate, HabitUpdate, HabitResponse
router = APIRouter(prefix="/habits", tags=["Habits"])
from app.models.habit_log import HabitLog
from app.services.habit_analytics import calculate_streaks, calculate_consistency


@router.post("/", response_model=HabitResponse, status_code=201)
def create_habit(
    habit: HabitCreate,
    db: Session = Depends(get_db)
):
    new_habit = Habit(
        name=habit.name,
        category=habit.category,
        description=habit.description
    )

    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)

    return new_habit

@router.get("/", response_model=list[HabitResponse])
def get_habits(db: Session = Depends(get_db)):
    habits = db.query(Habit).all()
    return habits

@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db)
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    db.delete(habit)
    db.commit()

    return {
        "message": "Habit deleted successfully"
    }
    
@router.put("/{habit_id}", response_model=HabitResponse)
def update_habit(
    habit_id: int,
    updated_data: HabitUpdate,
    db: Session = Depends(get_db)
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    habit.name = updated_data.name
    habit.category = updated_data.category
    habit.description = updated_data.description

    db.commit()
    db.refresh(habit)

    return habit

@router.get("/{habit_id}/stats")
def get_habit_stats(
    habit_id: int,
    db: Session = Depends(get_db)
):
    habit = db.query(Habit).filter(
        Habit.id == habit_id
    ).first()

    if habit is None:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )

    logs = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id
    ).all()

    streaks = calculate_streaks(logs)
    consistency = calculate_consistency(logs)

    return {
        "habit_id": habit_id,
        "habit_name": habit.name,
        "current_streak": streaks["current_streak"],
        "longest_streak": streaks["longest_streak"],
        "consistency": consistency
    }