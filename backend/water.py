from datetime import datetime
from typing import Optional

# PROTOTYPE HEURISTIC NOTICE:
# Agronomic configurations below (optimal moisture thresholds, stage lengths, and FAO-56 Kc factors)
# are simplified prototype heuristics calibrated for demonstration in semi-arid regions.
# They are not precision physical sensor calibrations, neutron-probe readings, or localized lysimeter models.
CROP_CONFIG = {
    "wheat": {
        "optimal_moisture": 0.55,
        "stages": [
            ("initial", 20, 0.30, 25.0),
            ("crop_development", 30, 0.70, 35.0),
            ("mid_season", 60, 1.15, 45.0),
            ("late_season", 30, 0.40, 20.0),
        ]
    },
    "cotton": {
        "optimal_moisture": 0.50,
        "stages": [
            ("initial", 30, 0.35, 30.0),
            ("crop_development", 50, 0.75, 45.0),
            ("mid_season", 60, 1.20, 55.0),
            ("late_season", 55, 0.60, 25.0),
        ]
    },
    "groundnut": {
        "optimal_moisture": 0.50,
        "stages": [
            ("initial", 25, 0.40, 25.0),
            ("crop_development", 35, 0.80, 40.0),
            ("mid_season", 45, 1.15, 50.0),
            ("late_season", 25, 0.60, 25.0),
        ]
    }
}

def _fallback_response(reason: str, missing_inputs: Optional[list] = None) -> dict:
    return {
        "water_stress_score": None,
        "risk_level": "unknown",
        "crop_stage": "unknown",
        "recommended_irrigation_mm": None,
        "reasons": [
            "Data validation failed or required parameters missing.",
            f"Notice: {reason}.",
            "Irrigation recommendation disabled to prevent fabricated guidance."
        ],
        "confidence": "low",
        "next_review_hours": 24,
        "insufficient_data": True,
        "missing_inputs": missing_inputs or []
    }

def compute_irrigation_need(
    crop: str,
    sowing_date: str,
    lat: float,
    lng: float,
    rainfall_last_7_days_mm: float,
    rainfall_forecast_48h_mm: float,
    soil_moisture_index: Optional[float],
    assessment_date: str
) -> dict:
    # 1. Input validation
    if not isinstance(crop, str) or crop.lower().strip() not in CROP_CONFIG:
        return _fallback_response("Crop must be wheat, cotton, or groundnut")

    crop_key = crop.lower().strip()
    config = CROP_CONFIG[crop_key]

    try:
        sow_dt = datetime.strptime(str(sowing_date).strip(), "%Y-%m-%d").date()
        assess_dt = datetime.strptime(str(assessment_date).strip(), "%Y-%m-%d").date()
        days_after_sowing = (assess_dt - sow_dt).days
        if days_after_sowing < 0:
            return _fallback_response("Assessment date cannot be earlier than sowing date")

        lat_f = float(lat)
        lng_f = float(lng)
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
            return _fallback_response("Coordinates out of range (-90..90, -180..180)")

        rain_7d = float(rainfall_last_7_days_mm)
        rain_48h = float(rainfall_forecast_48h_mm)
        if rain_7d < 0.0 or rain_48h < 0.0:
            return _fallback_response("Rainfall must be non-negative")
    except (ValueError, TypeError) as err:
        return _fallback_response(f"Format error: {str(err)}")

    if soil_moisture_index is not None:
        try:
            moisture = float(soil_moisture_index)
            if not (0.0 <= moisture <= 1.0):
                return _fallback_response("Soil moisture index must be between 0.0 and 1.0")
        except (ValueError, TypeError) as err:
            return _fallback_response(f"Soil moisture format error: {str(err)}")
    else:
        moisture = None

    # 2. Stage and Kc resolution
    cumulative_days = 0
    current_stage, current_kc, base_depth = config["stages"][-1][0], config["stages"][-1][2], config["stages"][-1][3]
    for stage_name, duration, kc, depth in config["stages"]:
        cumulative_days += duration
        if days_after_sowing <= cumulative_days:
            current_stage = stage_name
            current_kc = kc
            base_depth = depth
            break

    # If soil moisture observation is missing, do not fabricate moisture deficit or recommendation
    if moisture is None:
        return {
            "water_stress_score": None,
            "risk_level": "unknown",
            "crop_stage": current_stage,
            "recommended_irrigation_mm": None,
            "reasons": [
                f"Crop is at {current_stage} stage (Kc: {current_kc}).",
                f"Rainfall profile: {rain_7d:.1f} mm received in last 7 days, {rain_48h:.1f} mm forecast in next 48 hours.",
                "Soil moisture observation is missing. Irrigation recommendation disabled until a measured soil moisture value or user observation is provided."
            ],
            "confidence": "low",
            "next_review_hours": 24,
            "insufficient_data": True,
            "missing_inputs": ["soil_moisture"]
        }

    # 3. Moisture deficit and stress score calculation (prototype FAO-56 heuristic)
    opt_moisture = config["optimal_moisture"]
    moisture_deficit_ratio = max(0.0, (opt_moisture - moisture) / opt_moisture)
    
    # Rainfall relief: past rainfall attenuates deficit; 48h forecast mitigates urgency
    rain_relief = min(50.0, (rain_7d * 1.2) + (rain_48h * 2.0))
    raw_stress = (moisture_deficit_ratio * current_kc * 100.0) - (rain_relief * 0.4)
    water_stress_score = int(round(max(0.0, min(100.0, raw_stress))))

    # 4. Risk level and review window
    if water_stress_score >= 65:
        risk_level = "high"
        next_review_hours = 12
    elif water_stress_score >= 35:
        risk_level = "medium"
        next_review_hours = 24
    else:
        risk_level = "low"
        next_review_hours = 48

    # 5. Irrigation volume recommendation
    if rain_48h >= 15.0 or risk_level == "low":
        recommended_irrigation_mm = 0.0
    elif risk_level == "high":
        recommended_irrigation_mm = round(base_depth * (water_stress_score / 100.0), 1)
    else:
        recommended_irrigation_mm = round(base_depth * 0.6 * (water_stress_score / 100.0), 1)

    # 6. Structured factual reasons
    reasons = [
        f"Crop is at {current_stage} stage (Kc: {current_kc}) with soil moisture at {moisture:.2f} (optimal: {opt_moisture:.2f}).",
        f"Rainfall profile: {rain_7d:.1f} mm received in last 7 days, {rain_48h:.1f} mm forecast in next 48 hours.",
        f"Water stress score is {water_stress_score}/100 ({risk_level} risk); {'irrigation required to maintain yield' if recommended_irrigation_mm > 0 else 'no immediate irrigation needed'}."
    ]

    confidence = "high" if 0.05 <= moisture <= 0.95 else "medium"

    return {
        "water_stress_score": water_stress_score,
        "risk_level": risk_level,
        "crop_stage": current_stage,
        "recommended_irrigation_mm": recommended_irrigation_mm,
        "reasons": reasons,
        "confidence": confidence,
        "next_review_hours": next_review_hours,
        "insufficient_data": False
    }
