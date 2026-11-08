from fastapi import APIRouter

from app.schemas.future import FutureProjectionRequest
from app.services.future_simulation import calculate_future_projection

router = APIRouter(
    prefix="/future",
    tags=["Future Simulation"]
)


@router.post("/simulate")
def simulate_future(data: FutureProjectionRequest):

    six_months = calculate_future_projection(
        current_daily_hours=data.current_daily_hours,
        target_extra_hours=data.target_extra_hours,
        consistency_percent=data.consistency_percent,
        days=180
    )

    five_years = calculate_future_projection(
        current_daily_hours=data.current_daily_hours,
        target_extra_hours=data.target_extra_hours,
        consistency_percent=data.consistency_percent,
        days=1825
    )

    return {
        "six_months": six_months,
        "five_years": five_years
    }