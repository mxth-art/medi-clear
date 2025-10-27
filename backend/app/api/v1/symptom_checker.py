import os
import json
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
import traceback
import httpx


load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Initialize the router
router = APIRouter()

# --- Pydantic Models ---
class SymptomRequest(BaseModel):
    symptoms: str = Field(..., description="Detailed description of symptoms.")
    age: int = Field(..., ge=0, le=120)
    gender: str = Field(..., description="Gender of the patient.")
    duration: str = Field(..., description="Duration of symptoms (e.g., '3 days', '2 weeks').")
    severity: int = Field(..., ge=1, le=10, description="Severity on a scale of 1 to 10.")

class PossibleCondition(BaseModel):
    condition: str
    probability: int = Field(..., ge=0, le=100)
    description: str

class SymptomAssessment(BaseModel):
    assessment_id: str
    urgency_level: str # NORMAL | MODERATE | URGENT
    urgency_score: int = Field(..., ge=1, le=100)
    possible_conditions: List[PossibleCondition]
    recommended_tests: List[str]
    action_items: List[str]
    warning_signs: List[str]
    when_to_seek_care: str


@router.post("/symptoms/analyze", response_model=SymptomAssessment)
async def analyze_symptoms(data: SymptomRequest):
    """
    Analyzes user-provided symptoms using OpenRouter AI to provide a structured assessment.
    """
    # 1. API Key Check
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=502, detail="OpenRouter API Key is not configured in .env")

    # 2. Generate assessment ID
    assessment_id = str(uuid.uuid4())
    
    # 3. Format Prompt with System Instruction
    system_instruction = (
        "You are a medical AI assistant providing preliminary, non-diagnostic guidance. "
        "Analyze the user's symptoms and generate a comprehensive assessment strictly in JSON format. "
        "Your response MUST be valid JSON that conforms to this exact structure:\n"
        "{\n"
        '  "assessment_id": "string",\n'
        '  "urgency_level": "NORMAL or MODERATE or URGENT",\n'
        '  "urgency_score": number (1-100),\n'
        '  "possible_conditions": [{"condition": "string", "probability": number (0-100), "description": "string"}],\n'
        '  "recommended_tests": ["string"],\n'
        '  "action_items": ["string"],\n'
        '  "warning_signs": ["string"],\n'
        '  "when_to_seek_care": "string"\n'
        "}\n"
        "Do not include any text, markdown, or explanation outside the JSON object. "
        "Return ONLY valid JSON."
    )
    
    user_prompt = f"""
Analyze the following patient data for a symptom assessment:
- Symptoms Description: {data.symptoms}
- Age: {data.age} years, Gender: {data.gender}
- Duration: {data.duration}
- Severity: {data.severity}/10

The assessment_id field MUST be set to: {assessment_id}

Provide your response as a valid JSON object only.
"""

    # 4. Call OpenRouter API with DeepSeek models
    models_to_try = [
        "deepseek/deepseek-chat",  # DeepSeek V3 - very powerful and cheap
        "deepseek/deepseek-coder",  # Alternative DeepSeek model
    ]
    
    last_error = None
    
    for model_name in models_to_try:
        try:
            print(f"Trying model: {model_name}")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "MediClear Symptom Checker"
                    },
                    json={
                        "model": model_name,
                        "messages": [
                            {
                                "role": "system",
                                "content": system_instruction
                            },
                            {
                                "role": "user",
                                "content": user_prompt
                            }
                        ],
                        "temperature": 0.7,
                        "response_format": {"type": "json_object"}
                    }
                )
                
                response.raise_for_status()
                result = response.json()
                
                print(f"✓ Successfully used model: {model_name}")
                break  # Success, exit loop
                
        except httpx.HTTPStatusError as e:
            last_error = e
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            print(f"✗ Model {model_name} failed: {error_text[:200]}")
            continue  # Try next model
        except Exception as e:
            last_error = e
            print(f"✗ Model {model_name} error: {str(e)[:200]}")
            continue
    else:
        # All models failed
        raise HTTPException(
            status_code=500,
            detail=f"All DeepSeek models failed. Please check your API key. Last error: {last_error}"
        )
    
    # 5. Extract response (moved outside try block)
    try:
        if "choices" not in result or len(result["choices"]) == 0:
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected API response format: {result}"
            )

        raw_json_text = result["choices"][0]["message"]["content"]
        
        # Print raw response for debugging
        print("DEBUG: OpenRouter raw JSON response:", raw_json_text[:1000])

        # 6. Parse and Validate Response
        # Clean the response if it has markdown code blocks
        if raw_json_text.strip().startswith("```"):
            # Remove markdown code blocks
            raw_json_text = raw_json_text.strip()
            if raw_json_text.startswith("```json"):
                raw_json_text = raw_json_text[7:]
            elif raw_json_text.startswith("```"):
                raw_json_text = raw_json_text[3:]
            if raw_json_text.endswith("```"):
                raw_json_text = raw_json_text[:-3]
            raw_json_text = raw_json_text.strip()

        assessment_data = json.loads(raw_json_text)
        
        # Validate the data against the Pydantic model
        assessment = SymptomAssessment(**assessment_data)

        # 7. Return the dynamic AI-generated assessment
        return assessment

    except httpx.HTTPStatusError as e:
        traceback.print_exc()
        error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"OpenRouter API Error: {error_detail}"
        )
    except json.JSONDecodeError as e:
        snippet = raw_json_text[:1000] if 'raw_json_text' in locals() else "No response"
        raise HTTPException(
            status_code=500, 
            detail=f"AI returned malformed JSON. Raw response (truncated): {snippet}"
        )
    except Exception as e:
        traceback.print_exc()
        # Handle specific API errors
        msg = str(e).lower()
        if any(keyword in msg for keyword in ("quota", "api key", "authentication", "rate limit")):
            raise HTTPException(status_code=502, detail=f"OpenRouter API Error: Check your API key or quota. Details: {e}")
        
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during API call: {e}")