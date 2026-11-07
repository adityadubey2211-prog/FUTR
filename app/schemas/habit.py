from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HabitCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    
class HabitUpdate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    
class HabitResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }