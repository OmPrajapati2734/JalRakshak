# Firestore Database Schema

This document details the actual Cloud Firestore document hierarchy, ownership validation rules, and data structures implemented in JalRakshak AI and enforced by `firestore.rules`.

---

## Collections & Document Structure

### 1. `/users/{userId}`
User profile records isolated by user ID (`request.auth.uid == userId`).
- `userId`: string (Must match authenticated user UID)
- `preferredLanguage`: string (`'en'` | `'hi'` | `'gu'`)
- `name`: string (Optional, max 100 characters)

---

### 2. `/fields/{fieldId}`
Top-level agricultural field plot documents owned by the authenticated caller.
- `userId`: string (Immutable document owner UID)
- `name`: string (Plot label, max 100 characters)
- `crop`: string (Supported crops: `'wheat'`, `'cotton'`, `'groundnut'`)
- `area_acres`: number (Plot size in acres, > 0 and <= 100,000)
- `village`: string (Optional location name, max 100 characters)
- `sowing_date`: string (Sowing date, YYYY-MM-DD, max 30 characters)

#### 2a. Subcollection: `/fields/{fieldId}/assessments/{assessmentId}`
Deterministic FAO-56 dual crop-coefficient calculation records. Access restricted to parent field owner (`isFieldOwner(fieldId)`).
- `field_id`: string (Parent field reference)
- `userId`: string (Authenticated user UID)
- `water_stress_score`: number (0–100 crop stress index)
- `risk_level`: string (`'low'` | `'medium'` | `'high'` | `'unknown'`)
- `recommended_irrigation_mm`: number (Irrigation depth in mm, 0–500)
- `root_zone_depletion_pct`: number (Root-zone soil moisture depletion percentage)
- `etc_daily_mm`: number (Daily crop evapotranspiration)
- `recordedAt`: string / timestamp (ISO 8601 calculation timestamp)

#### 2b. Subcollection: `/fields/{fieldId}/assessments/{assessmentId}/advisories/{language}`
On-demand generative AI explanations from `gemini-3.8-flash`. Access restricted to parent field owner.
- `userId`: string (Authenticated user UID)
- `fieldId`: string (Parent field reference)
- `language`: string (`'en'` | `'hi'` | `'gu'`)
- `headline`: string (Concise action summary, max 250 characters)
- `action_now`: list of strings (Immediate actionable steps, max 10 items)
- `why`: list of strings (Agronomic rationale, max 10 items)
- `risk_warning`: string (Crop stress or weather warning, max 300 characters)
- `next_review`: string (Suggested review interval, max 200 characters)
- `generatedAt`: string (ISO 8601 generation timestamp)

#### 2c. Subcollection: `/fields/{fieldId}/irrigation_logs/{logId}`
Recorded watering events and estimated comparative water savings. Access restricted to parent field owner.
- `userId`: string (Authenticated user UID)
- `fieldId`: string (Parent field reference)
- `userBaselineMm`: number (User-specified baseline irrigation depth, 0–500 mm)
- `recommendedMm`: number (FAO-56 recommended irrigation depth, 0–500 mm)
- `estimatedComparisonLitres`: number (Calculated comparison volume savings in litres, >= 0)
- `cumulativeSeasonSavedLitres`: number (Aggregated seasonal estimated water savings in litres, >= 0)
- `loggedAt`: string (ISO 8601 logging timestamp)

---

### 3. `/advisories/{advisoryId}`
Top-level advisory cache collection keyed by `{fieldId}_{assessmentId}_{language}` to allow in-session caching and fast retrieval.
- Enforces strict read/write security checking `request.auth.uid == resource.data.userId`.
- Contains the same structured advisory schema as `2b`.
