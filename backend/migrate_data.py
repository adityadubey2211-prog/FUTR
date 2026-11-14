
from sqlalchemy import create_engine, MetaData, Table, select, text

from app.database import engine as target_engine, Base

# Import all models
import app.models.habit
import app.models.habit_log
import app.models.nutrition
import app.models.future_report

# Source: Existing SQLite database
source_engine = create_engine("sqlite:///./futr.db")

# Migration order: parents before children
table_order = [
    "habits",
    "diet_plans",
    "habit_logs",
    "diet_meals",
    "future_reports"
]

metadata = MetaData()
metadata.reflect(bind=source_engine, only=table_order)

# Verify source and destination tables
Base.metadata.create_all(bind=target_engine)

try:
    with source_engine.connect() as source, target_engine.begin() as target:

        # Safety check: destination must be empty
        for table_name in table_order:
            count = target.execute(
                text(f"SELECT COUNT(*) FROM {table_name}")
            ).scalar()

            if count != 0:
                raise Exception(
                    f"{table_name} is not empty. Migration stopped."
                )

        # Copy records
        for table_name in table_order:
            table = metadata.tables[table_name]

            rows = source.execute(
                select(table)
            ).mappings().all()

            if rows:
                target.execute(
                    table.insert(),
                    [dict(row) for row in rows]
                )

            print(f"{table_name}: {len(rows)} records migrated")

# Preserve deleted habit ID 3 for its historical log
            if table_name == "habits":
                target.execute(
                    table.insert().values(
                        id=3,
                        name="Previously Deleted Habit",
                        category="Archived",
                        description="Placeholder to preserve historical habit log"
                    )
                )
                print("Placeholder habit ID 3 created")

        # Reset PostgreSQL auto-increment sequences
        for table_name in table_order:
            target.execute(text(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table_name}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                    EXISTS (SELECT 1 FROM {table_name})
                )
            """))

    print("\nMigration completed successfully!")

except Exception as error:
    print("\nMigration failed:", error)
    raise

finally:
    source_engine.dispose()
