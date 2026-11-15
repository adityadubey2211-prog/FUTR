
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Database
from app.database import engine, Base

# Models - register all tables before create_all
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.nutrition import DietPlan, DietMeal
from app.models.future_report import FutureReport

# Routes
from app.routes.auth import router as auth_router
from app.routes.habits import router as habits_router
from app.routes.habit_log import router as habit_logs_router
from app.routes.heatmap import router as heatmap_router
from app.routes.daily_score import router as daily_score_router
from app.routes.analytics import router as analytics_router
from app.routes.dashboard import router as dashboard_router
from app.routes.nutrition import router as nutrition_router
from app.routes.future_report import router as future_report_router
from app.routes.ai_coach import router as ai_coach_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Initialize FastAPI
app = FastAPI(
    title="FUTR",
    description="Understand your habits. Explore your future.",
    version="1.0.0"
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost",
        "https://futr-frontend-tawny.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API Routers
app.include_router(auth_router)
app.include_router(habits_router)
app.include_router(habit_logs_router)
app.include_router(heatmap_router)
app.include_router(daily_score_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(nutrition_router)
app.include_router(future_report_router)
app.include_router(ai_coach_router)

# Root Endpoint
@app.get("/")
def home():
    return {
        "message": "Welcome to FUTR",
        "status": "running"
    }


# Health Check
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "FUTR"
    }
