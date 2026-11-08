from pydantic import BaseModel, Field
from pydantic import BaseModel, Field

class FutureProjectionRequest(BaseModel):

    current_daily_hours: float = Field(ge=0)

    target_extra_hours: float = Field(ge=0)

    consistency_percent: float = Field(
        ge=0,
        le=100
    )

    days: int = Field(default=180, gt=0)


class FutureProjectionRequest(BaseModel):

    current_daily_hours: float = Field(ge=0)

    target_extra_hours: float = Field(ge=0)