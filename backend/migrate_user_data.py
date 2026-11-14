
from sqlalchemy import text
from app.database import engine

USER_ID = 12
EXPECTED_EMAIL = "piyushkumar2211@gmail.com"

try:
    with engine.begin() as connection:

        # Step 1: Verify account ownership
        user = connection.execute(
            text("SELECT id, email FROM users WHERE id = :user_id"),
            {"user_id": USER_ID}
        ).first()

        if not user or user.email != EXPECTED_EMAIL:
            raise RuntimeError(
                "Account verification failed. No migration performed."
            )

        print(f"Verified account: {user.id} - {user.email}")

        # Step 2: Add ownership columns safely
        connection.execute(text("""
            ALTER TABLE habits
            ADD COLUMN IF NOT EXISTS user_id INTEGER
            REFERENCES users(id)
        """))

        connection.execute(text("""
            ALTER TABLE diet_plans
            ADD COLUMN IF NOT EXISTS user_id INTEGER
            REFERENCES users(id)
        """))

        connection.execute(text("""
            ALTER TABLE future_reports
            ADD COLUMN IF NOT EXISTS user_id INTEGER
            REFERENCES users(id)
        """))

        # Step 3: Assign existing records to the verified account
        connection.execute(
            text("UPDATE habits SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": USER_ID}
        )

        connection.execute(
            text("UPDATE diet_plans SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": USER_ID}
        )

        connection.execute(
            text("UPDATE future_reports SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": USER_ID}
        )

        # Step 4: Create indexes
        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_habits_user_id
            ON habits(user_id)
        """))

        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_diet_plans_user_id
            ON diet_plans(user_id)
        """))

        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_future_reports_user_id
            ON future_reports(user_id)
        """))

        # Step 5: Verify record ownership
        for table in ["habits", "diet_plans", "future_reports"]:
            result = connection.execute(
                text(f"""
                    SELECT user_id, COUNT(*)
                    FROM {table}
                    GROUP BY user_id
                """)
            ).all()

            print(f"\n{table}: {result}")

    print("\nMigration completed successfully!")

except Exception as error:
    print("\nMigration failed. Transaction rolled back.")
    print(error)
