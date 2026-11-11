
from pydantic import BaseModel, Field
from typing import Optional, List
from typing import Optional, List, Literal


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


class DietGenerationRequest(BaseModel):
    age: int = Field(..., ge=18, le=100)

    goal: Literal[
        "weight_loss",
        "muscle_gain",
        "maintain_weight",
        "balanced_diet"
    ]

    diet_preference: Literal[
        "vegetarian",
        "vegan",
        "eggetarian",
        "non_vegetarian"
    ]

    activity_level: Literal[
        "low",
        "moderate",
        "high"
    ]

    allergies: Optional[str] = None

    budget_per_day: Optional[float] = Field(
        default=None,
        ge=0,
        le=10000
    )

    cuisine_preference: Optional[str] = None
