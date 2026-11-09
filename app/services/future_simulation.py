
def get_weekly_growth(consistency):

    if consistency >= 80:
        return 0.25

    elif consistency >= 60:
        return 0.15

    elif consistency >= 40:
        return 0.05

    else:
        return 0


def calculate_future_projection(
    current_daily_hours,
    target_extra_hours,
    consistency_percent,
    days=180
):
    current_hours = current_daily_hours

    target_hours = (
        current_daily_hours + target_extra_hours
    )

    total_current_hours = 0
    total_improved_hours = 0

    for day in range(1, days + 1):

        # Current path
        total_current_hours += current_daily_hours

        # Improved path
        total_improved_hours += current_hours

        # Every 7 days, consider improvement
        if day % 7 == 0:

            weekly_increase = get_weekly_growth(
                consistency_percent
            )

            current_hours = min(
                current_hours + weekly_increase,
                target_hours
            )

    return {
        "days": days,
        "current_hours": round(total_current_hours, 2),
        "improved_hours": round(total_improved_hours, 2),
        "additional_hours": round(
            total_improved_hours - total_current_hours, 2
        ),
        "starting_daily_hours": current_daily_hours,
        "target_daily_hours": target_hours,
        "final_daily_hours": round(current_hours, 2),
        "consistency_percent": consistency_percent
    }
