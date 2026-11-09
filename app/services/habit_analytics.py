from datetime import date, timedelta


def calculate_streaks(logs):

    today = date.today()

    completed_dates = sorted({
        log.log_date
        for log in logs
        if log.completed and log.log_date <= today
    })

    # Current Streak
    if today in completed_dates:
        current_date = today

    elif today - timedelta(days=1) in completed_dates:
        current_date = today - timedelta(days=1)

    else:
        current_date = None

    current_streak = 0

    while current_date and current_date in completed_dates:
        current_streak += 1
        current_date -= timedelta(days=1)

    # Longest Streak
    longest_streak = 0
    streak = 0
    previous_date = None

    for log_date in completed_dates:

        if previous_date is not None and log_date == previous_date + timedelta(days=1):
            streak += 1

        else:
            streak = 1

        longest_streak = max(longest_streak, streak)

        previous_date = log_date

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak
    }
    
    
    
def calculate_consistency(logs):

    if not logs:
        return 0.0

    total_days = len(logs)

    completed_days = sum(
        1 for log in logs if log.completed
    )

    consistency = (completed_days / total_days) * 100

    return round(consistency, 2)

def calculate_weekly_analytics(logs):

    today = date.today()
    weekly_data = []

    for i in range(6, -1, -1):

        current_date = today - timedelta(days=i)

        daily_logs = [
            log for log in logs
            if log.log_date == current_date
        ]

        total = len(daily_logs)

        completed = sum(
            1 for log in daily_logs
            if log.completed
        )

        percentage = (
            (completed / total) * 100
            if total > 0 else 0
        )

        weekly_data.append({
            "date": current_date,
            "total": total,
            "completed": completed,
            "percentage": round(percentage, 2)
        })

    return weekly_data

def calculate_recent_consistency(logs, days=7):

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    completed_dates = {
        log.log_date
        for log in logs
        if log.completed
        and start_date <= log.log_date <= today
    }

    consistency = (
        len(completed_dates) / days
    ) * 100

    return round(consistency, 2)


def calculate_daily_score(habits, logs, target_date):

    # Get habits that existed on target date
    active_habits = [
        habit for habit in habits
        if habit.created_at.date() <= target_date
    ]

    # Store completion status for quick lookup
    log_lookup = {
        log.habit_id: log.completed
        for log in logs
        if log.log_date == target_date
    }

    total_habits = len(active_habits)

    completed_habits = sum(
        1
        for habit in active_habits
        if log_lookup.get(habit.id, False)
    )

    pending_habits = total_habits - completed_habits

    score = (
        (completed_habits / total_habits) * 100
        if total_habits > 0 else 0
    )

    habit_details = [
        {
            "habit_id": habit.id,
            "habit_name": habit.name,
            "completed": log_lookup.get(habit.id, False)
        }
        for habit in active_habits
    ]

    return {
        "date": target_date,
        "total_habits": total_habits,
        "completed_habits": completed_habits,
        "pending_habits": pending_habits,
        "score": round(score, 2),
        "habits": habit_details
    }