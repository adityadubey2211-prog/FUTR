from fastapi import FastAPI
from app.database import engine, Base
from app.models.habit import Habit
from app.routes.habits import router as habits_router

Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="FUTR",
    description="Understand your habits. Explore your future.",
    version="1.0.0"
)
app.include_router(habits_router)

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
    
