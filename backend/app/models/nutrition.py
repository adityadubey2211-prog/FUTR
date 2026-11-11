
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    source = Column(String(20), nullable=False)  # upload or ai
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meals = relationship(
        "DietMeal",
        back_populates="diet_plan",
        cascade="all, delete-orphan"
    )


class DietMeal(Base):
    __tablename__ = "diet_meals"

    id = Column(Integer, primary_key=True, index=True)
    diet_plan_id = Column(Integer, ForeignKey("diet_plans.id"), nullable=False)

    day = Column(String(20), nullable=False)
    meal_type = Column(String(30), nullable=False)
    meal_name = Column(String(150), nullable=False)
    food_items = Column(Text, nullable=True)

    diet_plan = relationship("DietPlan", back_populates="meals")
