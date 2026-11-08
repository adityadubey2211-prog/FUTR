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