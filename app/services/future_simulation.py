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

    weekly_increase = 0.25

    growth_factor = consistency_percent / 100

    total_current_hours = 0
    total_improved_hours = 0

    for day in range(1, days + 1):

        # Current path
        total_current_hours += current_daily_hours

        # Improved path
        total_improved_hours += current_hours

        # Every 7 days, consider improvement
        if day % 7 == 0:

            increase = weekly_increase * growth_factor

            current_hours = min(
                current_hours + increase,
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