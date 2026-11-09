from datetime import date, timedelta

from app.services.habit_analytics import (
    calculate_daily_score,
    calculate_streaks
)

def calculate_dashboard_summary(habits, logs, target_date):

    # Today's score
    today_data = calculate_daily_score(
        habits,
        logs,
        target_date
    )

    # Last 7 days
    weekly_completed = 0
    weekly_expected = 0

    for i in range(6, -1, -1):

        current_date = target_date - timedelta(days=i)

        active_habits = [
            habit for habit in habits
            if habit.created_at.date() <= current_date
        ]

        daily_logs = [
            log for log in logs
            if log.log_date == current_date
        ]

        completed = sum(
            1 for habit in active_habits
            if any(
                log.habit_id == habit.id and log.completed
                for log in daily_logs
            )
        )

        weekly_completed += completed
        weekly_expected += len(active_habits)

    weekly_consistency = (
        (weekly_completed / weekly_expected) * 100
        if weekly_expected > 0 else 0
    )

    # Habit-wise streaks
    current_streaks = []
    longest_streaks = []

    for habit in habits:

        habit_logs = [
            log for log in logs
            if log.habit_id == habit.id
        ]

        streak_data = calculate_streaks(habit_logs)

        current_streaks.append(
            streak_data["current_streak"]
        )

        longest_streaks.append(
            streak_data["longest_streak"]
        )

    return {
        "total_habits": today_data["total_habits"],

        "today": {
            "completed": today_data["completed_habits"],
            "pending": today_data["pending_habits"],
            "score": today_data["score"]
        },

        "weekly": {
            "total_days": 7,
            "completed": weekly_completed,
            "expected": weekly_expected,
            "average_score": round(weekly_consistency, 2)
        },

        "streaks": {
            "best_current_streak": max(current_streaks, default=0),
            "longest_streak": max(longest_streaks, default=0)
        },

        "overall_consistency": round(weekly_consistency, 2)
    }