
from pydantic import BaseModel, Field
from typing import Optional, List


class DietMealCreate(BaseModel):
    day: str = Field(..., min_length=1, max_length=20)
    meal_type: str = Field(..., min_length=1, max_length=30)
    meal_name: str = Field(..., min_length=1, max_length=150)
    food_items: Optional[str] = None


class DietMealResponse(DietMealCreate):
    id: int

    model_config = {"from_attributes": True}


class DietPlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    source: str = Field(..., pattern="^(upload|ai)$")
    description: Optional[str] = None
    meals: List[DietMealCreate] = []


class DietPlanResponse(BaseModel):
    id: int
    name: str
    source: str
    description: Optional[str] = None
    meals: List[DietMealResponse] = []

    model_config = {"from_attributes": True}
