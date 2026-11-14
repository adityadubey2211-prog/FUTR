
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user

from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.nutrition import DietPlan
from app.models.future_report import FutureReport

from app.schemas.user import (
    UserSignup,
    UserLogin,
    TokenResponse
)

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(
    user_data: UserSignup,
    db: Session = Depends(get_db)
):
    email = user_data.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    new_user = User(
        name=user_data.name.strip(),
        email=email,
        hashed_password=hash_password(user_data.password)
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create account"
        )

    token = create_access_token({
        "sub": str(new_user.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/login", response_model=TokenResponse)
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    email = user_data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        user_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": str(user.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.delete("/delete-account")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Find user's habits
        habits = db.query(Habit).filter(
            Habit.user_id == current_user.id
        ).all()

        habit_ids = [habit.id for habit in habits]

        # 2. Delete related habit logs
        if habit_ids:
            db.query(HabitLog).filter(
                HabitLog.habit_id.in_(habit_ids)
            ).delete(synchronize_session=False)

        # 3. Delete user's diet plans
        diet_plans = db.query(DietPlan).filter(
            DietPlan.user_id == current_user.id
        ).all()

        for plan in diet_plans:
            db.delete(plan)

        # 4. Delete user's future reports
        db.query(FutureReport).filter(
            FutureReport.user_id == current_user.id
        ).delete(synchronize_session=False)

        # 5. Delete user's habits
        for habit in habits:
            db.delete(habit)

        # 6. Delete user account
        db.delete(current_user)

        db.commit()

        return {
            "message": "Account and associated data deleted successfully"
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete account"
        )
