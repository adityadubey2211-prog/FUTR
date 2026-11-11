
from pydantic import BaseModel, Field


class FutureReportRequest(BaseModel):
    goal: str = Field(
        min_length=5,
        max_length=300
    )
