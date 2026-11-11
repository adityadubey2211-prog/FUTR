
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.future_report import FutureReport

from app.schemas.future_report import FutureReportRequest

from app.services.future_report_service import (
    build_habit_summary,
    build_current_reality,
    generate_future_report_with_groq
)

router = APIRouter(
    prefix="/future",
    tags=["Future Report"]
)


@router.post("/generate-report")
def generate_future_report(
    data: FutureReportRequest,
    db: Session = Depends(get_db)
):

    # 1. Fetch habits
    habits = db.query(Habit).all()

    if not habits:
        raise HTTPException(
            status_code=400,
            detail="Add at least one habit before generating a report."
        )

    # 2. Fetch habit logs
    habit_ids = [habit.id for habit in habits]

    logs = db.query(HabitLog).filter(
        HabitLog.habit_id.in_(habit_ids)
    ).all()

    # 3. Calculate verified statistics
    habit_summary = build_habit_summary(
        habits,
        logs
    )
    
    current_reality = build_current_reality(habit_summary)
    
    # 4. Generate AI report
    try:

        report = generate_future_report_with_groq(
            data.goal,
            habit_summary
        )

    except Exception as error:

        print("FUTURE REPORT ERROR:", error)

        raise HTTPException(
            status_code=502,
            detail="Unable to generate report. Please try again."
        )

    # 5. Save report
    saved_report = FutureReport(
        goal=data.goal,
        report_data=json.dumps(report)
    )

    db.add(saved_report)
    db.commit()
    db.refresh(saved_report)

    # 6. Return generated report
    return {
        "id": saved_report.id,
        "goal": saved_report.goal,
        "created_at": saved_report.created_at,
        "habit_summary": habit_summary,
        "current_reality": current_reality,
        "report": report
    }

