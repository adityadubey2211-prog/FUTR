from datetime import date, timedelta

from app.models.habit import Habit
from app.models.habit_log import HabitLog


def calculate_heatmap(habits, logs, days=365):

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Store logs for quick lookup
    log_lookup = {
        (log.habit_id, log.log_date): log.completed
        for log in logs
    }

    heatmap_data = []

    # Generate each date
    for i in range(days):

        current_date = start_date + timedelta(days=i)

        # Habits created on or before this date
        active_habits = [
            habit for habit in habits
            if habit.created_at.date() <= current_date
        ]

        total = len(active_habits)

        # Count completed habits
        completed = sum(
            1
            for habit in active_habits
            if log_lookup.get(
                (habit.id, current_date), False
            )
        )

        percentage = (
            (completed / total) * 100
            if total > 0 else 0
        )

        heatmap_data.append({
            "date": current_date,
            "total": total,
            "completed": completed,
            "percentage": round(percentage, 2)
        })

    return heatmap_data
