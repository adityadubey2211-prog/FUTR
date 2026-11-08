from pydantic import BaseModel
from datetime import date, datetime


class HabitLogCreate(BaseModel):
    habit_id: int
    log_date: date
    completed: bool = False


class HabitLogResponse(BaseModel):
    id: int
    habit_id: int
    log_date: date
    completed: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }