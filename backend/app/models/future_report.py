
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class FutureReport(Base):
    __tablename__ = "future_reports"

    id = Column(Integer, primary_key=True, index=True)

    goal = Column(String(300), nullable=False)

    report_data = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
