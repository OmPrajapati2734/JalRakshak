import os
import json
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

SYSTEM_INSTRUCTION = (
    "You are an agricultural irrigation advisor explaining deterministic water balance assessments to Indian farmers. "
    "Translate and explain only the supplied numbers. Never invent weather, rainfall, sensor, soil, disease, or yield data."
)

def generate_advisory(
    field_id: str,
    field_name: str,
    crop: str,
    language: str,
    assessment_id: str,
    assessment: dict
) -> dict:
    lang = language.lower().strip()
    if lang not in ["en", "hi", "gu"]:
        lang = "en"

    if assessment.get("insufficient_data"):
        return {
            "headline": "Insufficient data to recommend irrigation quantity",
            "action_now": [
                "Verify crop sowing date and location coordinates.",
                "Provide soil moisture observation if available.",
                "Check back once weather or field observations are updated."
            ],
            "why": [
                "Agronomic FAO-56 calculations require observed soil moisture or verified weather data.",
                "Operating without inputs risks inaccurate irrigation.",
                assessment.get("reasons", ["Required assessment inputs are missing."])[-1]
            ],
            "risk_warning": "Cannot calculate moisture deficit without complete assessment inputs.",
            "next_review": "Update field observations and recalculate.",
            "language": lang
        }

    project = os.getenv("GCP_PROJECT")
    region = os.getenv("GCP_REGION", "asia-south1")
    vertexai.init(project=project, location=region)

    model = GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=[SYSTEM_INSTRUCTION]
    )

    generation_config = GenerationConfig(
        temperature=0.2,
        max_output_tokens=600,
        response_mime_type="application/json"
    )

    prompt = (
        f"Field Information:\n"
        f"- Field ID: {field_id}\n"
        f"- Field Name: {field_name}\n"
        f"- Crop: {crop}\n"
        f"- Assessment ID: {assessment_id}\n\n"
        f"Verified Agronomic Assessment (water.py calculation):\n"
        f"{json.dumps(assessment, ensure_ascii=False, indent=2)}\n\n"
        f"Target Language: {lang} (en: English, hi: Hindi, gu: Gujarati)\n\n"
        f"Instructions:\n"
        f"Explain this assessment clearly to the farmer in {lang}. "
        f"You must return valid JSON with EXACTLY these keys:\n"
        f"{{\n"
        f'  "headline": "maximum 90 characters summarizing the recommendation",\n'
        f'  "action_now": ["exactly 3 concise, practical action steps based on the assessment"],\n'
        f'  "why": ["exactly 3 short factual reasons grounded ONLY in the supplied assessment numbers"],\n'
        f'  "risk_warning": "one short sentence warning about moisture stress or weather risks from assessment",\n'
        f'  "next_review": "one short sentence on when to inspect next",\n'
        f'  "language": "{lang}"\n'
        f"}}\n\n"
        f"Constraints:\n"
        f"- Use ONLY facts from the provided assessment (stress score, risk level, recommended mm, reasons).\n"
        f"- Do NOT invent weather forecasts, rainfall, soil sensors, yield, disease, or chemicals.\n"
        f"- 'action_now' must have exactly 3 items.\n"
        f"- 'why' must have exactly 3 items.\n"
        f"- 'headline' must be 90 characters or fewer.\n"
    )

    response = model.generate_content(prompt, generation_config=generation_config)
    text = response.text.strip() if response.text else ""

    if text.startswith("```json"):
        text = text[7:-3].strip()
    elif text.startswith("```"):
        text = text[3:-3].strip()

    try:
        data = json.loads(text)
    except Exception as exc:
        raise ValueError(f"Malformed JSON returned by Gemini: {str(exc)}")

    required_keys = ["headline", "action_now", "why", "risk_warning", "next_review", "language"]
    for key in required_keys:
        if key not in data:
            raise ValueError(f"Malformed Gemini output: missing key '{key}'")

    if not isinstance(data["action_now"], list) or len(data["action_now"]) != 3:
        raise ValueError("Malformed Gemini output: 'action_now' must contain exactly 3 items")

    if not isinstance(data["why"], list) or len(data["why"]) != 3:
        raise ValueError("Malformed Gemini output: 'why' must contain exactly 3 items")

    return {
        "headline": str(data["headline"])[:90],
        "action_now": [str(item) for item in data["action_now"]],
        "why": [str(item) for item in data["why"]],
        "risk_warning": str(data["risk_warning"]),
        "next_review": str(data["next_review"]),
        "language": lang
    }

