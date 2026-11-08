from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.sql import func

from app.database import Base


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)

    habit_id = Column(
        Integer,
        ForeignKey("habits.id"),
        nullable=False
    )

    log_date = Column(Date, nullable=False)

    completed = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "habit_id",
            "log_date",
            name="unique_habit_daily_log"
        ),
    )