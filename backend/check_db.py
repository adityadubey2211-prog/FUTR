
from sqlalchemy import text
from app.database import engine

with engine.connect() as connection:
    user = connection.execute(
        text("SELECT id, email FROM users WHERE id = 12")
    ).fetchone()

    print("\nACCOUNT CHECK:")
    print(user)

    for table in ["habits", "diet_plans", "future_reports"]:
        result = connection.execute(
            text(f"SELECT COUNT(*) FROM {table}")
        ).scalar()

        print(f"{table}: {result} records")

        columns = connection.execute(
            text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :table
                ORDER BY ordinal_position
            """),
            {"table": table}
        ).fetchall()

        print("Columns:", [row[0] for row in columns])
