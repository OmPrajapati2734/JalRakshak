import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import firestore
from water import compute_irrigation_need
from weather_service import get_weather_data, search_locations, WeatherServiceError

app = FastAPI(title="JalRakshak AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_firestore_client():
    project = os.getenv("GCP_PROJECT")
    try:
        return firestore.Client(project=project)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Firestore service unavailable: {str(exc)}")

class FieldCreateRequest(BaseModel):
    name: str
    crop: str
    sowing_date: str
    lat: float
    lng: float
    area_acres: float
    user_id: str

class AssessmentCreateRequest(BaseModel):
    rainfall_last_7_days_mm: Optional[float] = None
    rainfall_forecast_48h_mm: Optional[float] = None
    soil_moisture_index: Optional[float] = None
    assessment_date: Optional[str] = None
    mode: Optional[str] = "live"

@app.get("/health")
def health():
    return {"status": "ok", "service": "jalrakshak-api"}

@app.get("/locations/search")
def search_locations_endpoint(q: str = ""):
    non_ws_count = len([c for c in (q or "") if not c.isspace()])
    if non_ws_count < 3:
        raise HTTPException(
            status_code=400,
            detail="Search query 'q' must contain at least 3 non-whitespace characters"
        )

    try:
        results = search_locations(q)
        return {"results": results}
    except WeatherServiceError as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding service failure: {str(exc)}")

@app.post("/fields")
def create_field(req: FieldCreateRequest):
    crop_clean = req.crop.lower().strip()
    if crop_clean not in ["wheat", "cotton", "groundnut"]:
        raise HTTPException(status_code=400, detail="Crop must be wheat, cotton, or groundnut")

    try:
        datetime.strptime(req.sowing_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="sowing_date must be in YYYY-MM-DD format")

    if not (-90.0 <= req.lat <= 90.0 and -180.0 <= req.lng <= 180.0):
        raise HTTPException(status_code=400, detail="Coordinates out of range (-90..90, -180..180)")

    if req.area_acres <= 0.0:
        raise HTTPException(status_code=400, detail="area_acres must be greater than zero")

    db = _get_firestore_client()
    try:
        doc_ref = db.collection("fields").document()
        field_payload = {
            "id": doc_ref.id,
            "name": req.name.strip(),
            "crop": crop_clean,
            "sowing_date": req.sowing_date.strip(),
            "lat": req.lat,
            "lng": req.lng,
            "area_acres": req.area_acres,
            "user_id": req.user_id.strip(),
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(field_payload)
        return {"field_id": doc_ref.id, "field": field_payload}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to save field: {str(exc)}")

@app.get("/fields/{field_id}")
def get_field(field_id: str):
    db = _get_firestore_client()
    try:
        doc = db.collection("fields").document(field_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Field with ID '{field_id}' not found")

    return {"field_id": field_id, "field": doc.to_dict()}

@app.post("/fields/{field_id}/assessment")
def create_assessment(field_id: str, req: AssessmentCreateRequest):
    mode = (req.mode or "live").lower().strip()
    if mode not in ["live", "demo"]:
        raise HTTPException(status_code=400, detail="mode must be 'live' or 'demo'")

    if req.assessment_date:
        assess_date = req.assessment_date.strip()
        try:
            datetime.strptime(assess_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="assessment_date must be in YYYY-MM-DD format")
    else:
        assess_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if req.soil_moisture_index is not None:
        if not (0.0 <= req.soil_moisture_index <= 1.0):
            raise HTTPException(status_code=400, detail="soil_moisture_index must be between 0.0 and 1.0")
        soil_moisture = float(req.soil_moisture_index)
        soil_moisture_source = "user_observation"
        soil_moisture_recorded_at = datetime.now(timezone.utc).isoformat()
    else:
        soil_moisture = None
        soil_moisture_source = "missing"
        soil_moisture_recorded_at = None

    db = _get_firestore_client()
    try:
        field_doc = db.collection("fields").document(field_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not field_doc.exists:
        raise HTTPException(status_code=404, detail=f"Field with ID '{field_id}' not found")

    field_data = field_doc.to_dict()
    crop = str(field_data.get("crop", "wheat"))
    sowing_date = str(field_data.get("sowing_date", ""))
    lat = float(field_data.get("lat", 0.0))
    lng = float(field_data.get("lng", 0.0))

    if mode == "live":
        try:
            weather_snapshot = get_weather_data(lat, lng)
        except WeatherServiceError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Weather service failure: {str(exc)}"
            )
    else:
        rain_7d = float(req.rainfall_last_7_days_mm) if req.rainfall_last_7_days_mm is not None else 0.0
        rain_48h = float(req.rainfall_forecast_48h_mm) if req.rainfall_forecast_48h_mm is not None else 0.0
        if rain_7d < 0.0 or rain_48h < 0.0:
            raise HTTPException(status_code=400, detail="Rainfall amounts cannot be negative")

        weather_snapshot = {
            "rainfall_last_7_days_mm": rain_7d,
            "rainfall_forecast_48h_mm": rain_48h,
            "temperature_current_c": 30.0,
            "weather_source": "demo",
            "weather_fetched_at": datetime.now(timezone.utc).isoformat(),
            "data_mode": "demo"
        }

    # Strict provenance on all assessment inputs
    inputs_provenance = {
        "crop": {
            "value": crop,
            "unit": "crop_type",
            "source": "user_registration",
            "recordedAt": str(field_data.get("createdAt") or datetime.now(timezone.utc).isoformat())
        },
        "sowing_date": {
            "value": sowing_date,
            "unit": "date",
            "source": "user_registration",
            "recordedAt": str(field_data.get("createdAt") or datetime.now(timezone.utc).isoformat())
        },
        "soil_moisture": {
            "value": soil_moisture,
            "unit": "fraction_0_to_1",
            "source": soil_moisture_source,
            "recordedAt": soil_moisture_recorded_at
        },
        "rainfall_last_7_days": {
            "value": weather_snapshot["rainfall_last_7_days_mm"],
            "unit": "mm",
            "source": weather_snapshot["weather_source"],
            "recordedAt": weather_snapshot["weather_fetched_at"]
        },
        "rainfall_forecast_48h": {
            "value": weather_snapshot["rainfall_forecast_48h_mm"],
            "unit": "mm",
            "source": weather_snapshot["weather_source"],
            "recordedAt": weather_snapshot["weather_fetched_at"]
        },
        "temperature": {
            "value": weather_snapshot.get("temperature_current_c"),
            "unit": "celsius",
            "source": weather_snapshot["weather_source"],
            "recordedAt": weather_snapshot["weather_fetched_at"]
        }
    }

    assessment_result = compute_irrigation_need(
        crop=crop,
        sowing_date=sowing_date,
        lat=lat,
        lng=lng,
        rainfall_last_7_days_mm=weather_snapshot["rainfall_last_7_days_mm"],
        rainfall_forecast_48h_mm=weather_snapshot["rainfall_forecast_48h_mm"],
        soil_moisture_index=soil_moisture,
        assessment_date=assess_date
    )

    if assessment_result.get("insufficient_data") and assessment_result.get("missing_inputs") != ["soil_moisture"]:
        raise HTTPException(status_code=400, detail=assessment_result["reasons"][1])

    try:
        assess_ref = db.collection("fields").document(field_id).collection("assessments").document()
        record_payload = {
            "id": assess_ref.id,
            "field_id": field_id,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "inputs": inputs_provenance,
            "soil_moisture_source": soil_moisture_source,
            "data_mode": mode,
            "weather": weather_snapshot,
            "assessment": assessment_result
        }
        assess_ref.set(record_payload)
        return {
            "field_id": field_id,
            "assessment_id": assess_ref.id,
            "assessment": assessment_result,
            "weather": weather_snapshot,
            "inputs": inputs_provenance,
            "soil_moisture_source": soil_moisture_source,
            "data_mode": mode
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to record assessment: {str(exc)}")

class AdvisoryCreateRequest(BaseModel):
    assessment_id: str
    language: Optional[str] = "en"

@app.post("/fields/{field_id}/advisory")
def create_field_advisory(field_id: str, req: AdvisoryCreateRequest):
    lang = (req.language or "en").lower().strip()
    if lang not in ["en", "hi", "gu"]:
        raise HTTPException(status_code=400, detail="Language must be 'en', 'hi', or 'gu'")

    db = _get_firestore_client()
    try:
        field_doc = db.collection("fields").document(field_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not field_doc.exists:
        raise HTTPException(status_code=404, detail=f"Field with ID '{field_id}' not found")

    field_data = field_doc.to_dict()

    try:
        assess_doc = db.collection("fields").document(field_id).collection("assessments").document(req.assessment_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not assess_doc.exists:
        raise HTTPException(status_code=404, detail=f"Assessment with ID '{req.assessment_id}' not found")

    assessment_payload = assess_doc.to_dict().get("assessment", {})

    from advisor import generate_advisory
    try:
        advisory_result = generate_advisory(
            field_id=field_id,
            field_name=field_data.get("name", "Field"),
            crop=field_data.get("crop", "wheat"),
            language=lang,
            assessment_id=req.assessment_id,
            assessment=assessment_payload
        )
    except ValueError as val_err:
        raise HTTPException(status_code=502, detail=f"AI explanation error: {str(val_err)}")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Vertex AI service error: {str(exc)}")

    try:
        adv_ref = db.collection("fields").document(field_id).collection("advisories").document()
        record_payload = {
            "id": adv_ref.id,
            "field_id": field_id,
            "assessment_id": req.assessment_id,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "advisory": advisory_result
        }
        adv_ref.set(record_payload)
        return {
            "field_id": field_id,
            "assessment_id": req.assessment_id,
            "advisory_id": adv_ref.id,
            "advisory": advisory_result
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to record advisory: {str(exc)}")

@app.get("/fields/{field_id}/advisory")
def get_field_advisory(field_id: str, assessment_id: str, language: str = "en"):
    lang = language.lower().strip()
    if lang not in ["en", "hi", "gu"]:
        raise HTTPException(status_code=400, detail="Language must be 'en', 'hi', or 'gu'")

    db = _get_firestore_client()
    try:
        field_doc = db.collection("fields").document(field_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not field_doc.exists:
        raise HTTPException(status_code=404, detail=f"Field with ID '{field_id}' not found")

    field_data = field_doc.to_dict()

    try:
        assessment_ref = db.collection("fields").document(field_id).collection("assessments").document(assessment_id)
        assess_doc = assessment_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database query failed: {str(exc)}")

    if not assess_doc.exists:
        raise HTTPException(status_code=404, detail=f"Assessment with ID '{assessment_id}' not found")

    # Check cache in fields/{field_id}/assessments/{assessment_id}/advisories/{language}
    try:
        cached_doc_ref = assessment_ref.collection("advisories").document(lang)
        cached_doc = cached_doc_ref.get()
        if cached_doc.exists:
            return cached_doc.to_dict()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Cache lookup failed: {str(exc)}")

    assessment_payload = assess_doc.to_dict().get("assessment", {})

    from advisor import generate_advisory
    try:
        advisory_result = generate_advisory(
            field_id=field_id,
            field_name=field_data.get("name", "Field"),
            crop=field_data.get("crop", "wheat"),
            language=lang,
            assessment_id=assessment_id,
            assessment=assessment_payload
        )
    except ValueError as val_err:
        raise HTTPException(status_code=502, detail=f"AI explanation error: {str(val_err)}")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Vertex AI service error: {str(exc)}")

    try:
        cache_payload = {
            "field_id": field_id,
            "assessment_id": assessment_id,
            "language": lang,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "advisory": advisory_result
        }
        cached_doc_ref.set(cache_payload)
        return cache_payload
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to cache advisory: {str(exc)}")

class CheckAlertsRequest(BaseModel):
    field_ids: list[str]

@app.post("/check-alerts")
def check_alerts(req: CheckAlertsRequest):
    db = _get_firestore_client()
    created_alerts = []
    skipped_fields = []
    errors = []

    for raw_id in req.field_ids:
        field_id = str(raw_id).strip()
        if not field_id:
            continue

        try:
            field_ref = db.collection("fields").document(field_id)
            field_doc = field_ref.get()
            if not field_doc.exists:
                errors.append({"field_id": field_id, "error": f"Field '{field_id}' not found"})
                continue

            field_data = field_doc.to_dict()
            field_name = field_data.get("name", field_id)

            # Retrieve latest assessment
            assessments = (
                field_ref.collection("assessments")
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(1)
                .get()
            )

            if not assessments:
                skipped_fields.append({
                    "field_id": field_id,
                    "reason": "No assessments recorded for this field"
                })
                continue

            latest_assess_doc = assessments[0]
            assessment_id = latest_assess_doc.id
            assess_record = latest_assess_doc.to_dict()
            assessment_result = assess_record.get("assessment", {})

            stress_score = assessment_result.get("water_stress_score", 0)
            if stress_score < 70:
                skipped_fields.append({
                    "field_id": field_id,
                    "assessment_id": assessment_id,
                    "reason": f"Water stress score ({stress_score}) is below alert threshold (70)"
                })
                continue

            # Duplicate prevention check in fields/{field_id}/alerts
            alerts_ref = field_ref.collection("alerts")
            existing_alerts = [
                doc for doc in alerts_ref.limit(50).get()
                if doc.to_dict().get("assessmentId") == assessment_id
            ]

            if existing_alerts:
                skipped_fields.append({
                    "field_id": field_id,
                    "assessment_id": assessment_id,
                    "reason": f"Alert already exists for assessment '{assessment_id}'"
                })
                continue

            # Deterministic message construction from assessment data
            rec_mm = assessment_result.get("recommended_irrigation_mm", 0.0)
            stage = assessment_result.get("crop_stage", "current")
            msg = (
                f"Critical moisture stress ({stress_score}/100) detected for {field_name} at {stage} stage. "
                f"Recommended irrigation: {rec_mm} mm."
            )

            alert_doc_ref = alerts_ref.document()
            alert_payload = {
                "id": alert_doc_ref.id,
                "fieldId": field_id,
                "assessmentId": assessment_id,
                "type": "HIGH_WATER_STRESS",
                "severity": "high",
                "message": msg,
                "status": "new",
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            alert_doc_ref.set(alert_payload)

            alert_out = dict(alert_payload)
            alert_out["createdAt"] = datetime.utcnow().isoformat() + "Z"
            created_alerts.append(alert_out)

        except Exception as exc:
            errors.append({"field_id": field_id, "error": str(exc)})

    return {
        "created_alerts": created_alerts,
        "skipped_fields": skipped_fields,
        "errors": errors
    }



