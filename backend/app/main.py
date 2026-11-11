from fastapi import FastAPI
from app.database import engine, Base
from app.models.habit import Habit
from app.routes.habits import router as habits_router
from app.routes.habit_log import router as habit_logs_router
from app.routes import future
from app.routes import heatmap
from app.routes import daily_score
from app.routes import analytics
from app.routes import dashboard
from fastapi.middleware.cors import CORSMiddleware
from app.models.nutrition import DietPlan, DietMeal
from app.routes import nutrition
from fastapi import UploadFile, File
from app.services.nutrition_service import extract_pdf_text
Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="FUTR",
    description="Understand your habits. Explore your future.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(habits_router)
app.include_router(habit_logs_router)
app.include_router(future.router)
app.include_router(heatmap.router)
app.include_router(daily_score.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(nutrition.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to FUTR",
        "status": "running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "FUTR"
    }
    
