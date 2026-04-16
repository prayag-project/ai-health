from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os, json
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI(title="MediAI ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────
class OCRRequest(BaseModel):
    image_base64: str

class TriageRequest(BaseModel):
    symptoms: str
    history: str = "No previous history."

class PrescriptionRequest(BaseModel):
    prescription_text: str

class AdvisoryRequest(BaseModel):
    query: str

# ── Helpers ───────────────────────────────────────────────
def call_llm(prompt: str):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return json.loads(text.strip())

BLOCKED = ["suicide", "kill myself", "overdose on purpose"]

def safety_check(text: str):
    for word in BLOCKED:
        if word in text.lower():
            raise HTTPException(status_code=400, detail="Query blocked. Call iCall: 9152987821")

# ── OCR endpoint ──────────────────────────────────────────
@app.post("/ml/ocr")
async def ocr_prescription(req: OCRRequest):
    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{req.image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": """This is a medical prescription written by a doctor — handwriting may be messy.

Please read it carefully and extract:
1. All drug/medicine names (guess if handwriting is unclear)
2. Dosage for each drug (e.g. 500mg, 10ml)
3. How often to take it (e.g. twice daily, every 8 hours)
4. How many days to take it
5. Any special instructions (e.g. take with food, avoid sunlight)

Write your answer in plain English, one line per medicine.
Example format:
Amoxicillin 500mg - 3 times daily for 7 days
Paracetamol 650mg - twice daily for 5 days

Only output the medicine list, nothing else."""
                    }
                ]
            }],
            temperature=0.1
        )
        text = response.choices[0].message.content.strip()
        print("OCR SUCCESS:", text[:100])
        return {"transcribed_text": text}

    except Exception as e:
        print("OCR ERROR:", e)
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

# ── Triage endpoint (with history) ───────────────────────
@app.post("/ml/triage")
async def triage(req: TriageRequest):
    safety_check(req.symptoms)
    prompt = f"""You are a medical triage AI.

PATIENT HISTORY (last visits):
{req.history}

CURRENT SYMPTOMS: "{req.symptoms}"

Consider the history when assessing risk. Reply ONLY with this exact JSON, no markdown:
{{
  "risk_level": "URGENT|HIGH|MEDIUM|LOW",
  "conditions": [
    {{
      "name": "condition name",
      "confidence": 0.85,
      "explanation": "why this condition matches",
      "contributing_symptoms": ["symptom1", "symptom2"]
    }}
  ],
  "home_care": "what the patient can do at home",
  "doctor_recommendation": "when and why to see a doctor"
}}
"""
    return call_llm(prompt)

# ── Prescription explain endpoint ────────────────────────
@app.post("/ml/prescription")
async def prescription(req: PrescriptionRequest):
    safety_check(req.prescription_text)
    prompt = f"""You are a pharmacist AI. Explain this prescription in simple English: "{req.prescription_text}"

Reply ONLY with this exact JSON, no extra text, no markdown:
{{
  "medications": [
    {{
      "name": "drug name",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "duration": "7 days",
      "purpose": "what this drug treats",
      "instructions": "how to take it correctly",
      "side_effects": ["nausea", "dizziness"],
      "warnings": ["avoid alcohol", "do not drive"]
    }}
  ]
}}
"""
    return call_llm(prompt)

# ── Advisory endpoint ─────────────────────────────────────
@app.post("/ml/advisory")
async def advisory(req: AdvisoryRequest):
    safety_check(req.query)
    prompt = f"""You are a general health advisor AI. Answer this health question: "{req.query}"

Reply ONLY with this exact JSON, no extra text, no markdown:
{{
  "advice": "clear helpful health guidance",
  "lifestyle_tips": ["tip 1", "tip 2", "tip 3"],
  "when_to_see_doctor": "specific signs that need professional help",
  "disclaimer": "This is general health information, not a substitute for professional medical advice."
}}
"""
    return call_llm(prompt)