from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User, PrescriptionQuery
from schemas.schemas import PrescriptionRequest, PrescriptionResponse
from ml.ml_client import call_prescription_ml, mock_prescription_response
from typing import List
import httpx

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

USE_MOCK = False
ML_SERVICE_URL = "http://localhost:8003"


# ── OCR: Receives base64 image, forwards to ML service, returns transcribed text
@router.post("/ocr")
async def ocr_prescription(payload: dict):
    """
    Accepts { image_base64: "..." } from frontend.
    Forwards to ML service /ml/ocr.
    Returns { transcribed_text: "..." } back to frontend.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/ml/ocr",
                json=payload
            )
            print("OCR STATUS:", response.status_code)
            print("OCR RESPONSE:", response.text[:200])
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        print("OCR CONNECTION ERROR:", e)
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to ML OCR service. Make sure ml_service is running on port 8003."
        )
    except httpx.HTTPStatusError as e:
        print("OCR HTTP ERROR:", e.response.text)
        raise HTTPException(status_code=500, detail="ML OCR service returned an error.")
    except Exception as e:
        print("OCR UNKNOWN ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Unexpected OCR error: {str(e)}")


# ── Explain: Takes prescription text, returns full medication breakdown
@router.post("/explain", response_model=PrescriptionResponse, status_code=201)
async def explain_prescription(
    payload: PrescriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(payload.prescription_text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please enter prescription details")

    try:
        if USE_MOCK:
            ml_result = mock_prescription_response(payload.prescription_text)
        else:
            ml_result = await call_prescription_ml(payload.prescription_text)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ML service unavailable: {str(e)}")

    medications = ml_result.get("medications", [])
    med_names = [m.get("name", "") for m in medications]
    summary = "Medications: " + ", ".join(med_names[:3])
    if len(med_names) > 3:
        summary += f" +{len(med_names) - 3} more"

    query = PrescriptionQuery(
        user_id=current_user.id,
        prescription_text=payload.prescription_text,
        medications=medications,
        medication_count=len(medications),
        summary=summary
    )
    db.add(query)
    db.commit()
    db.refresh(query)
    return query


# ── History: Returns all prescriptions for the current user
@router.get("/history")
def get_prescription_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queries = (
        db.query(PrescriptionQuery)
        .filter(PrescriptionQuery.user_id == current_user.id)
        .order_by(PrescriptionQuery.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": q.id,
            "prescription_text": q.prescription_text,
            "medication_count": q.medication_count,
            "summary": q.summary,
            "created_at": q.created_at,
            "type": "prescription"
        }
        for q in queries
    ]


# ── Get single result by ID
@router.get("/{query_id}", response_model=PrescriptionResponse)
def get_prescription_result(
    query_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PrescriptionQuery).filter(
        PrescriptionQuery.id == query_id,
        PrescriptionQuery.user_id == current_user.id
    ).first()
    if not query:
        raise HTTPException(status_code=404, detail="Result not found")
    return query
