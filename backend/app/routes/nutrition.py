from app.services.gemini_service import extract_diet_plan_with_gemini
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.nutrition import DietPlan, DietMeal
from app.schemas.nutrition import (
    DietPlanCreate,
    DietPlanResponse
)
from fastapi import UploadFile, File
from app.services.nutrition_service import extract_pdf_text

router = APIRouter(
    prefix="/nutrition",
    tags=["Nutrition"]
)


# CREATE DIET PLAN
@router.post("/plans/", response_model=DietPlanResponse)
def create_diet_plan(
    plan_data: DietPlanCreate,
    db: Session = Depends(get_db)
):
    if plan_data.source not in ["upload", "ai"]:
        raise HTTPException(
            status_code=400,
            detail="Source must be upload or ai"
        )

    new_plan = DietPlan(
        name=plan_data.name,
        source=plan_data.source,
        description=plan_data.description
    )

    for meal_data in plan_data.meals:
        new_meal = DietMeal(**meal_data.model_dump())
        new_plan.meals.append(new_meal)

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return new_plan


# GET ALL DIET PLANS
@router.get("/plans/", response_model=list[DietPlanResponse])
def get_diet_plans(db: Session = Depends(get_db)):
    return db.query(DietPlan).all()


# GET ONE DIET PLAN
@router.get("/plans/{plan_id}", response_model=DietPlanResponse)
def get_diet_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    return plan


# UPDATE DIET PLAN
@router.put("/plans/{plan_id}", response_model=DietPlanResponse)
def update_diet_plan(
    plan_id: int,
    plan_data: DietPlanCreate,
    db: Session = Depends(get_db)
):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    plan.name = plan_data.name
    plan.source = plan_data.source
    plan.description = plan_data.description

    # Replace existing meals with updated meals
    plan.meals.clear()

    for meal_data in plan_data.meals:
        new_meal = DietMeal(**meal_data.model_dump())
        plan.meals.append(new_meal)

    db.commit()
    db.refresh(plan)

    return plan


# DELETE DIET PLAN
@router.delete("/plans/{plan_id}")
def delete_diet_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    db.delete(plan)
    db.commit()

    return {"message": "Diet plan deleted successfully"}



@router.post("/upload-pdf/")
async def upload_diet_pdf(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="PDF size cannot exceed 10 MB"
        )

    try:
        extracted_pages = extract_pdf_text(content)

        return {
            "filename": file.filename,
            "total_pages": len(extracted_pages),
            "extracted_content": extracted_pages
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read this PDF file"
        )


@router.post("/extract-pdf/")
async def extract_diet_pdf(file: UploadFile = File(...)):

    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="PDF size cannot exceed 10 MB"
        )

    try:
        extracted_pages = extract_pdf_text(content)

        pdf_text = "\n".join(
            page["text"] for page in extracted_pages
        )

        diet_plan = extract_diet_plan_with_gemini(pdf_text)

        return {
            "message": "Diet plan extracted successfully",
            "filename": file.filename,
            "diet_plan": diet_plan
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except Exception as error:
        print("GEMINI EXTRACTION ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )