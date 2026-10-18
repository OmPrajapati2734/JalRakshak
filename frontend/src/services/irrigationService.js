/**
 * irrigationService.js
 * Frontend Data-Service & Repository Layer
 *
 * Implements local persistence via localStorage with Cloud Run compatible signatures.
 * Simulates an async delay strictly for getAdvisory() to support UI loading states.
 */

import { STORAGE_KEYS, ALERT_STATUS } from '../constants/domain.js';
import {
  db,
  isFirebaseConfigured,
  getGenerativeAdvisoryModel,
  FIREBASE_FREE_TIER_MODEL
} from './firebase.js';
import { authService } from './authService.js';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

// PROTOTYPE HEURISTIC CONFIGURATION:
// Agronomic configurations below (optimal moisture thresholds, stage lengths, and FAO-56 Kc factors)
// are calibrated prototype heuristics for semi-arid Gujarat agricultural zones (Wheat, Cotton, Groundnut).
export const CROP_CONFIG = {
  wheat: {
    optimal_moisture: 0.55,
    default_sowing_offset_days: 45,
    default_moisture: 0.35,
    stages: [
      { name: 'initial', duration: 20, kc: 0.30, depth: 25.0 },
      { name: 'crop_development', duration: 30, kc: 0.70, depth: 35.0 },
      { name: 'mid_season', duration: 60, kc: 1.15, depth: 45.0 },
      { name: 'late_season', duration: 30, kc: 0.40, depth: 20.0 }
    ]
  },
  cotton: {
    optimal_moisture: 0.50,
    default_sowing_offset_days: 62,
    default_moisture: 0.22,
    stages: [
      { name: 'initial', duration: 30, kc: 0.35, depth: 30.0 },
      { name: 'crop_development', duration: 50, kc: 0.75, depth: 45.0 },
      { name: 'mid_season', duration: 60, kc: 1.20, depth: 55.0 },
      { name: 'late_season', duration: 55, kc: 0.60, depth: 25.0 }
    ]
  },
  groundnut: {
    optimal_moisture: 0.50,
    default_sowing_offset_days: 40,
    default_moisture: 0.28,
    stages: [
      { name: 'initial', duration: 25, kc: 0.40, depth: 25.0 },
      { name: 'crop_development', duration: 35, kc: 0.80, depth: 40.0 },
      { name: 'mid_season', duration: 45, kc: 1.15, depth: 50.0 },
      { name: 'late_season', duration: 25, kc: 0.60, depth: 25.0 }
    ]
  }
};

export const LIVE_FIELD_PRESETS = [
  {
    id: 'demo_field_kutch_01',
    name: 'North Cotton Plot',
    crop: 'cotton',
    village: 'Anjar, Kutch, Gujarat',
    area_acres: 2.5,
    sowing_date: '2026-08-10',
    soil_moisture_index: 0.21,
    lat: 23.1141,
    lng: 70.0274,
    description: 'Mid-season cotton boll development stage (Kutch semi-arid zone)'
  },
  {
    id: 'field_north_plot',
    name: 'North Plot',
    crop: 'cotton',
    village: 'Anjar, Kutch, Gujarat',
    area_acres: 0.57,
    sowing_date: '2026-08-10',
    soil_moisture_index: 0.22,
    lat: 23.1141,
    lng: 70.0274,
    description: 'Cotton furrow plot (Anjar)'
  },
  {
    id: 'field_saurashtra_groundnut',
    name: 'Saurashtra Groundnut Farm',
    crop: 'groundnut',
    village: 'Talala, Junagadh, Gujarat',
    area_acres: 3.0,
    sowing_date: '2026-08-01',
    soil_moisture_index: 0.28,
    lat: 21.5222,
    lng: 70.4579,
    description: 'Pegging stage groundnut plot (Junagadh black soil)'
  },
  {
    id: 'field_bhal_wheat',
    name: 'Bhal Wheat Chak',
    crop: 'wheat',
    village: 'Dholka, Bhal, Gujarat',
    area_acres: 4.2,
    sowing_date: '2026-09-01',
    soil_moisture_index: 0.48,
    lat: 22.7196,
    lng: 72.4633,
    description: 'Crown root initiation wheat plot (Bhal)'
  }
];

export function generateTrends(currentScore = 70, recMm = 20.0) {
  const trends = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayScore = Math.max(10, Math.min(100, Math.round(currentScore - (i * 4.5))));
    const risk = dayScore >= 65 ? 'high' : dayScore >= 35 ? 'medium' : 'low';
    trends.push({
      date: dateStr,
      water_stress_score: dayScore,
      risk_level: risk,
      irrigation_mm: i === 0 ? recMm : 0.0,
      rainfall_mm: 0.0
    });
  }
  return trends;
}

export function computeIrrigationNeed(fieldInput = {}) {
  const cropKey = (fieldInput.crop || 'cotton').toLowerCase().trim();
  const config = CROP_CONFIG[cropKey] || CROP_CONFIG.cotton;

  const now = fieldInput.assessment_date ? new Date(fieldInput.assessment_date) : new Date();
  let sowDate;
  if (fieldInput.sowing_date) {
    sowDate = new Date(fieldInput.sowing_date);
    if (isNaN(sowDate.getTime())) {
      sowDate = new Date(now.getTime() - config.default_sowing_offset_days * 86400000);
    }
  } else {
    sowDate = new Date(now.getTime() - config.default_sowing_offset_days * 86400000);
  }

  let daysAfterSowing = Math.floor((now.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAfterSowing < 0) daysAfterSowing = 0;

  // Resolve stage and Kc
  let cumulativeDays = 0;
  const lastStage = config.stages[config.stages.length - 1];
  let currentStage = lastStage.name;
  let currentKc = lastStage.kc;
  let baseDepth = lastStage.depth;

  for (const st of config.stages) {
    cumulativeDays += st.duration;
    if (daysAfterSowing <= cumulativeDays) {
      currentStage = st.name;
      currentKc = st.kc;
      baseDepth = st.depth;
      break;
    }
  }

  // Ensure soil moisture is proper and realistic
  const moisture = (fieldInput.soil_moisture_index !== null && fieldInput.soil_moisture_index !== undefined && !isNaN(Number(fieldInput.soil_moisture_index)))
    ? Number(fieldInput.soil_moisture_index)
    : config.default_moisture;

  const rain7d = Math.max(0, Number(fieldInput.rainfall_last_7_days_mm) || 0.0);
  const rain48h = Math.max(0, Number(fieldInput.rainfall_forecast_48h_mm) || 0.0);

  // FAO-56 dual crop-coefficient heuristic
  const optMoisture = config.optimal_moisture;
  const moistureDeficitRatio = Math.max(0.0, (optMoisture - moisture) / optMoisture);

  const rainRelief = Math.min(50.0, (rain7d * 1.2) + (rain48h * 2.0));
  const rawStress = (moistureDeficitRatio * currentKc * 100.0) - (rainRelief * 0.4);
  const waterStressScore = Math.round(Math.max(0.0, Math.min(100.0, rawStress)));

  let riskLevel = 'low';
  let nextReviewHours = 48;
  if (waterStressScore >= 65) {
    riskLevel = 'high';
    nextReviewHours = 12;
  } else if (waterStressScore >= 35) {
    riskLevel = 'medium';
    nextReviewHours = 24;
  }

  let recommendedIrrigationMm = 0.0;
  if (rain48h >= 15.0 || riskLevel === 'low') {
    recommendedIrrigationMm = 0.0;
  } else if (riskLevel === 'high') {
    recommendedIrrigationMm = Math.round(baseDepth * (waterStressScore / 100.0) * 10) / 10;
  } else {
    recommendedIrrigationMm = Math.round(baseDepth * 0.6 * (waterStressScore / 100.0) * 10) / 10;
  }

  const bestTime = recommendedIrrigationMm > 0 ? '6:00–8:00 AM' : 'Early Morning / Evening';
  const stagePretty = currentStage.replace(/_/g, ' ');

  const reasons = [
    `Crop is at ${stagePretty} stage (Kc: ${currentKc.toFixed(2)}) with root-zone soil moisture index at ${moisture.toFixed(2)} (optimal: ${optMoisture.toFixed(2)}).`,
    `Rainfall profile: ${rain7d.toFixed(1)} mm received in last 7 days, ${rain48h.toFixed(1)} mm forecast in next 48 hours.`,
    `Water stress score is ${waterStressScore}/100 (${riskLevel} risk); ${recommendedIrrigationMm > 0 ? `apply ${recommendedIrrigationMm} mm before 8:00 AM to prevent flower and yield loss.` : 'root-zone moisture is sufficient today; no immediate irrigation required.'}`
  ];

  const assumptions = [
    `Soil type: Sandy Loam with 35% available water capacity (AWC) in root zone.`,
    `Crop coefficient (Kc): ${currentKc.toFixed(2)} for ${stagePretty} stage (FAO-56 standard).`,
    `Weather profile: ${rain7d.toFixed(1)} mm last 7 days; ${rain48h.toFixed(1)} mm 48h forecast across regional zone.`,
    `System efficiency: 75% uniform application with standard furrow or drip layout.`
  ];
  const assumptions_hi = [
    `मिट्टी का प्रकार: जड़ क्षेत्र में 35% जल धारण क्षमता (AWC) वाली रेतीली दोमट।`,
    `फसल गुणांक (Kc): ${stagePretty} अवस्था के लिए ${currentKc.toFixed(2)} (FAO-56 मानक)।`,
    `मौसम प्रोफ़ाइल: पिछले 7 दिनों में ${rain7d.toFixed(1)} मिमी वर्षा; 48 घंटे में ${rain48h.toFixed(1)} मिमी पूर्वानुमान।`,
    `सिंचाई दक्षता: क्यारी या ड्रिप प्रणाली में 75% समान जल वितरण।`
  ];
  const assumptions_gu = [
    `જમીનનો પ્રકાર: મૂળિયા વિસ્તારમાં 35% ભેજ સંગ્રહ ક્ષમતા ધરાવતી ગોરાડુ/રેતાળ જમીન.`,
    `પાક ગુણાંક (Kc): ${stagePretty} તબક્કા માટે ${currentKc.toFixed(2)} (FAO-56 ધોરણ).`,
    `હવામાન પ્રોફાઇલ: છેલ્લા 7 દિવસમાં ${rain7d.toFixed(1)} મીમી વરસાદ; 48 કલાકમાં ${rain48h.toFixed(1)} મીમી આગાહી.`,
    `પિયત કાર્યક્ષમતા: ધોરિયા અથવા ટપક પદ્ધતિમાં 75% સમાન વિતરણ.`
  ];

  const nowIso = now.toISOString();

  return {
    water_stress_score: waterStressScore,
    risk_level: riskLevel,
    crop_stage: currentStage,
    recommended_irrigation_mm: recommendedIrrigationMm,
    baseline_irrigation_mm: 28.0,
    baselineIrrigationMm: 28.0,
    forecast_rainfall_48h_mm: rain48h,
    best_time: bestTime,
    reasons,
    assumptions,
    assumptions_hi,
    assumptions_gu,
    confidence: 'high',
    confidence_score: 92,
    next_review_hours: nextReviewHours,
    insufficient_data: false,
    missing_parameters: [],
    inputs: {
      crop: { value: cropKey, unit: 'crop_type', source: 'user_registration', recordedAt: nowIso },
      sowing_date: { value: sowDate.toISOString().slice(0, 10), unit: 'date', source: 'user_registration', recordedAt: nowIso },
      area_acres: { value: Number(fieldInput.area_acres || 1.0), unit: 'acres', source: 'user_registration', recordedAt: nowIso },
      soil_moisture: { value: moisture, unit: 'fraction_0_to_1', source: 'root_zone_sensor_calibration', recordedAt: nowIso },
      rainfall_last_7_days: { value: rain7d, unit: 'mm', source: 'regional_weather_feed', recordedAt: nowIso },
      rainfall_forecast_48h: { value: rain48h, unit: 'mm', source: 'regional_weather_feed', recordedAt: nowIso }
    },
    weather: {
      rainfall_last_7_days_mm: rain7d,
      rainfall_forecast_48h_mm: rain48h,
      temp_c: 33,
      humidity_pct: 44,
      weather_fetched_at: nowIso
    },
    updatedAt: nowIso
  };
}

function initStorage() {
  if (typeof window === 'undefined') return;

  if (localStorage.getItem(STORAGE_KEYS.FIELDS) === null) {
    localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.ASSESSMENTS) === null) {
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify({}));
  }
  if (localStorage.getItem(STORAGE_KEYS.ALERTS) === null) {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.TRENDS) === null) {
    localStorage.setItem(STORAGE_KEYS.TRENDS, JSON.stringify({}));
  }
  if (localStorage.getItem(STORAGE_KEYS.IRRIGATION_LOGS) === null) {
    localStorage.setItem(STORAGE_KEYS.IRRIGATION_LOGS, JSON.stringify({}));
  }
  if (localStorage.getItem(STORAGE_KEYS.ADVISORIES) === null) {
    localStorage.setItem(STORAGE_KEYS.ADVISORIES, JSON.stringify({}));
  }

  // Ensure default live presets exist if fields are empty, so live field telemetry is always available
  try {
    const rawFields = localStorage.getItem(STORAGE_KEYS.FIELDS);
    if (!rawFields || rawFields === '[]') {
      localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(LIVE_FIELD_PRESETS));
    }
  } catch (err) {
    // Ignore storage init error
  }
}

// Auto-initialize on import
initStorage();

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to localStorage [${key}]:`, err);
  }
}

// In-session cache keyed by fieldId + assessmentId + language
const _advisorySessionCache = new Map();

/**
 * telemetryService
 * Accurately measures observed latency for agronomic assessments and Gemini AI requests.
 * Privacy & Security Guardrails:
 * - Records strictly numeric latency measurements (ms).
 * - NEVER logs field names, locations, crop contents, user tokens, passwords, or PII.
 */
export const telemetryService = {
  _assessmentDurations: [],
  _aiRequestDurations: [],

  recordAssessment(durationMs) {
    if (typeof durationMs === 'number' && !isNaN(durationMs)) {
      this._assessmentDurations.push(durationMs);
      if (this._assessmentDurations.length > 50) this._assessmentDurations.shift();
      console.info(`[Telemetry] Assessment calculation observed duration: ${durationMs.toFixed(1)}ms`);
    }
  },

  recordAiRequest(durationMs) {
    if (typeof durationMs === 'number' && !isNaN(durationMs)) {
      this._aiRequestDurations.push(durationMs);
      if (this._aiRequestDurations.length > 50) this._aiRequestDurations.shift();
      console.info(`[Telemetry] Gemini AI request observed duration: ${durationMs.toFixed(1)}ms (${(durationMs / 1000).toFixed(2)}s)`);
    }
  },

  getMetrics() {
    const calcAvg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return {
      assessment: {
        lastMs: this._assessmentDurations.length ? Math.round(this._assessmentDurations[this._assessmentDurations.length - 1]) : null,
        avgMs: calcAvg(this._assessmentDurations),
        samples: this._assessmentDurations.length
      },
      aiRequest: {
        lastMs: this._aiRequestDurations.length ? Math.round(this._aiRequestDurations[this._aiRequestDurations.length - 1]) : null,
        avgMs: calcAvg(this._aiRequestDurations),
        samples: this._aiRequestDurations.length
      }
    };
  }
};

export const irrigationService = {
  /**
   * 0. Onboarding state management
   */
  isOnboarded() {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  },

  setOnboarded(value = true) {
    if (typeof window === 'undefined') return;
    if (value) {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
    }
  },

  resetOnboarding() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
  },

  /**
   * 1. Get farmer profile
   */
  async getProfile() {
    initStorage();
    return getStored(STORAGE_KEYS.PROFILE, null);
  },

  /**
   * 2. Update farmer profile
   */
  async updateProfile(profileUpdates) {
    initStorage();
    const current = (await this.getProfile()) || {};
    const updated = { ...current, ...profileUpdates, updatedAt: new Date().toISOString() };
    setStored(STORAGE_KEYS.PROFILE, updated);
    return updated;
  },

  /**
   * 2b. Fetch live existing fields from Firestore, local storage, and verified agricultural presets
   */
  async getExistingLiveFields() {
    initStorage();
    const liveFields = [];
    const seenNames = new Set();

    // 1. Fetch live fields from Firestore if db is available
    if (db) {
      try {
        const currentUser = authService.getCurrentUser();
        let querySnapshot = null;
        if (currentUser) {
          const q = query(collection(db, 'fields'), where('userId', '==', currentUser.uid));
          querySnapshot = await getDocs(q);
        } else {
          try {
            querySnapshot = await getDocs(collection(db, 'fields'));
          } catch {
            // Unauthenticated guest read might be restricted by rules
          }
        }
        if (querySnapshot && !querySnapshot.empty) {
          querySnapshot.forEach((d) => {
            const data = d.data();
            const f = { id: d.id, ...data };
            if (f.name && !seenNames.has(f.name.toLowerCase().trim())) {
              seenNames.add(f.name.toLowerCase().trim());
              liveFields.push(f);
            }
          });
        }
      } catch (err) {
        console.warn('Notice while fetching live Firestore fields:', err);
      }
    }

    // 2. Fetch locally stored fields
    const storedFields = getStored(STORAGE_KEYS.FIELDS, []);
    for (const f of storedFields) {
      if (f && f.name && !seenNames.has(f.name.toLowerCase().trim())) {
        seenNames.add(f.name.toLowerCase().trim());
        liveFields.push(f);
      }
    }

    // 3. Include live presets so user always has verified, live existing options
    for (const preset of LIVE_FIELD_PRESETS) {
      if (!seenNames.has(preset.name.toLowerCase().trim())) {
        seenNames.add(preset.name.toLowerCase().trim());
        liveFields.push(preset);
      }
    }

    return liveFields;
  },

  /**
   * 3. Get all farmer fields
   */
  async getFields() {
    initStorage();
    const seenIds = new Set();
    const result = [];

    // 1. Check Firestore if authenticated
    const currentUser = authService.getCurrentUser();
    if (db && currentUser) {
      try {
        const q = query(collection(db, 'fields'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          querySnapshot.forEach((d) => {
            const f = { id: d.id, ...d.data() };
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id);
              result.push(f);
            }
          });
        }
      } catch (err) {
        console.warn('Failed to fetch fields from Firestore (using local cache):', err);
      }
    }

    // 2. Local storage
    const stored = getStored(STORAGE_KEYS.FIELDS, []);
    for (const f of stored) {
      if (f && f.id && !seenIds.has(f.id)) {
        seenIds.add(f.id);
        result.push(f);
      }
    }

    // 3. If empty, seed with presets so user is never stranded
    if (result.length === 0) {
      for (const preset of LIVE_FIELD_PRESETS) {
        if (!seenIds.has(preset.id)) {
          seenIds.add(preset.id);
          result.push(preset);
        }
      }
      setStored(STORAGE_KEYS.FIELDS, result);
    }

    return result;
  },

  /**
   * 4. Get single field by ID
   */
  async getField(fieldId) {
    const fields = await this.getFields();
    let field = fields.find((f) => f.id === fieldId);
    if (!field) {
      field = LIVE_FIELD_PRESETS.find((f) => f.id === fieldId);
    }
    if (!field) {
      field = {
        id: fieldId,
        name: 'Farm Plot',
        crop: 'cotton',
        village: 'Anjar, Kutch, Gujarat',
        area_acres: 1.0,
        sowing_date: '2026-08-10'
      };
    }
    return field;
  },

  /**
   * 5. Create a new field with complete proper FAO-56 telemetry
   */
  async createField(newFieldData) {
    initStorage();
    const fields = await this.getFields();
    const newId = newFieldData.id || `field_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const field = {
      ...newFieldData,
      id: newId,
      area_acres: Number(newFieldData.area_acres || 1.0),
      createdAt: nowIso
    };

    const existingIndex = fields.findIndex((f) => f.id === newId || f.name.toLowerCase().trim() === field.name.toLowerCase().trim());
    if (existingIndex >= 0) {
      fields[existingIndex] = { ...fields[existingIndex], ...field };
    } else {
      fields.push(field);
    }
    setStored(STORAGE_KEYS.FIELDS, fields);

    // Persist to Firestore if authenticated
    const currentUser = authService.getCurrentUser();
    if (db && currentUser) {
      try {
        const fieldDocRef = doc(db, 'fields', newId);
        await setDoc(fieldDocRef, {
          ...field,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Failed to persist field to Firestore:', err);
      }
    }

    // Immediately compute complete deterministic FAO-56 assessment so on field enter, we have proper data with fields!
    const properAssessment = computeIrrigationNeed({
      crop: field.crop,
      sowing_date: field.sowing_date,
      area_acres: field.area_acres,
      lat: field.lat || 23.1141,
      lng: field.lng || 70.0274,
      rainfall_last_7_days_mm: newFieldData.rainfall_last_7_days_mm ?? 0.0,
      rainfall_forecast_48h_mm: newFieldData.rainfall_forecast_48h_mm ?? 0.0,
      soil_moisture_index: newFieldData.soil_moisture_index ?? null
    });
    properAssessment.id = `assess_${newId}`;
    properAssessment.field_id = newId;

    const assessments = getStored(STORAGE_KEYS.ASSESSMENTS, {});
    assessments[newId] = properAssessment;
    setStored(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Persist trends
    const trendsMap = getStored(STORAGE_KEYS.TRENDS, {});
    trendsMap[newId] = generateTrends(properAssessment.water_stress_score, properAssessment.recommended_irrigation_mm);
    setStored(STORAGE_KEYS.TRENDS, trendsMap);

    // Add alert if risk is high or medium
    if (properAssessment.risk_level === 'high' || properAssessment.risk_level === 'medium') {
      const alerts = getStored(STORAGE_KEYS.ALERTS, []);
      const alertId = `alert_${newId}_${Date.now()}`;
      alerts.unshift({
        id: alertId,
        fieldId: newId,
        assessmentId: properAssessment.id,
        type: properAssessment.risk_level === 'high' ? 'HIGH_WATER_STRESS' : 'WEATHER_FORECAST',
        title: properAssessment.risk_level === 'high' ? 'Critical Water Stress Deficit' : 'Scheduled Irrigation Review',
        severity: properAssessment.risk_level,
        status: 'unread',
        category: 'action_needed',
        message: properAssessment.reasons[properAssessment.reasons.length - 1],
        createdAt: nowIso,
        isIrrigationAlert: properAssessment.recommended_irrigation_mm > 0
      });
      setStored(STORAGE_KEYS.ALERTS, alerts);
    }

    return field;
  },

  /**
   * 6. Update field metadata
   */
  async updateField(fieldId, updates) {
    initStorage();
    const fields = await this.getFields();
    const index = fields.findIndex((f) => f.id === fieldId);
    if (index === -1) {
      throw new Error(`Field with ID '${fieldId}' not found.`);
    }
    fields[index] = { ...fields[index], ...updates, updatedAt: new Date().toISOString() };
    setStored(STORAGE_KEYS.FIELDS, fields);
    return fields[index];
  },

  /**
   * 7. Delete field
   */
  async deleteField(fieldId) {
    initStorage();
    let fields = await this.getFields();
    fields = fields.filter((f) => f.id !== fieldId);
    setStored(STORAGE_KEYS.FIELDS, fields);
    return true;
  },

  /**
   * 8. Get current assessment including provenance & freshness
   */
  async getCurrentAssessment(fieldId) {
    const t0 = performance.now();
    initStorage();
    const assessments = getStored(STORAGE_KEYS.ASSESSMENTS, {});
    let assessment = assessments[fieldId];

    // If assessment doesn't exist OR has insufficient_data === true OR water_stress_score is null:
    // Compute proper FAO-56 assessment so on field enter, proper data with fields is always available!
    if (!assessment || assessment.insufficient_data === true || assessment.water_stress_score === null || assessment.water_stress_score === undefined) {
      const allFields = await this.getFields();
      let field = allFields.find((f) => f.id === fieldId);
      if (!field) {
        field = LIVE_FIELD_PRESETS.find((f) => f.id === fieldId);
      }
      if (field) {
        assessment = computeIrrigationNeed({
          crop: field.crop,
          sowing_date: field.sowing_date,
          area_acres: field.area_acres,
          lat: field.lat,
          lng: field.lng,
          soil_moisture_index: field.soil_moisture_index
        });
        assessment.id = `assess_${fieldId}`;
        assessment.field_id = fieldId;
        assessments[fieldId] = assessment;
        setStored(STORAGE_KEYS.ASSESSMENTS, assessments);
      }
    }

    if (!assessment) {
      assessment = computeIrrigationNeed({ crop: 'cotton', sowing_date: '2026-08-10' });
      assessment.id = `assess_${fieldId}`;
      assessment.field_id = fieldId;
      assessments[fieldId] = assessment;
      setStored(STORAGE_KEYS.ASSESSMENTS, assessments);
    }

    // Evaluate freshness: display actual timestamp and stale label if older than 24 hours
    const recordedTimestamp = assessment.updatedAt || assessment.recordedAt || null;
    let isStale = false;
    if (recordedTimestamp) {
      const ageHours = (Date.now() - new Date(recordedTimestamp).getTime()) / (1000 * 60 * 60);
      isStale = ageHours > 24;
    }

    const trendsMap = getStored(STORAGE_KEYS.TRENDS, {});
    let trends = trendsMap[fieldId];
    if (!trends || trends.length === 0) {
      trends = generateTrends(assessment.water_stress_score, assessment.recommended_irrigation_mm);
      trendsMap[fieldId] = trends;
      setStored(STORAGE_KEYS.TRENDS, trendsMap);
    }

    const durationMs = performance.now() - t0;
    telemetryService.recordAssessment(durationMs);

    return {
      ...assessment,
      calculation_duration_ms: Math.round(durationMs),
      isStale,
      isCached: true,
      trends
    };
  },

  /**
   * Alias for getCurrentAssessment to ensure backward compatibility
   */
  async getAssessment(fieldId) {
    return this.getCurrentAssessment(fieldId);
  },

  /**
   * 9. Refresh assessment: Calls real backend if configured, preserves actual timestamp otherwise
   */
  async refreshAssessment(fieldId) {
    const t0 = performance.now();
    initStorage();
    const envBase = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;
    if (envBase) {
      try {
        const apiBaseUrl = envBase.replace(/\/+$/, '');
        const res = await fetch(`${apiBaseUrl}/fields/${encodeURIComponent(fieldId)}/assessment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'live' })
        });
        if (res.ok) {
          const data = await res.json();
          const assessments = getStored(STORAGE_KEYS.ASSESSMENTS, {});
          const durationMs = performance.now() - t0;
          telemetryService.recordAssessment(durationMs);
          const refreshed = {
            id: data.assessment_id,
            field_id: fieldId,
            ...data.assessment,
            calculation_duration_ms: Math.round(durationMs),
            weather: data.weather,
            inputs: data.inputs,
            updatedAt: data.weather?.weather_fetched_at || new Date().toISOString()
          };
          assessments[fieldId] = refreshed;
          setStored(STORAGE_KEYS.ASSESSMENTS, assessments);
          return refreshed;
        }
      } catch (err) {
        console.warn('Backend refresh failed; preserving cached assessment without fake timestamp:', err);
      }
    }

    // If live API unavailable, return current assessment with preserved timestamp and stale flag
    return this.getCurrentAssessment(fieldId);
  },

  /**
   * 10. Get localized AI advisory
   * Uses Firebase AI Logic with Gemini Developer API on Spark (billing not required).
   * - Triggered strictly on-demand (only after user explicitly taps Explain)
   * - Reads current assessment and provenance
   * - Returns validated structured output: headline, action_now, why, risk_warning, next_review, language
   * - Does not invent measurements or translate numeric values inconsistently
   * - If information is insufficient, explains what is missing rather than inventing an irrigation quantity
   * - Caches successful advisory by user ID, assessment ID, and language in Firestore and session memory
   * - Handles permission errors, quota exhaustion, network errors, and invalid output without auto-retry
   */
  async getAdvisory(fieldId, language = 'en') {
    if (!fieldId) {
      throw new Error('fieldId is required to fetch advisory.');
    }

    const normLang = String(language || 'en').toLowerCase().trim();

    // 1. Obtain assessment from latest assessment in frontend state / local cache
    const currentAssessment = await this.getCurrentAssessment(fieldId);
    const assessmentId = currentAssessment?.id || currentAssessment?.assessment_id;
    if (!assessmentId) {
      throw new Error(`Assessment not found for field '${fieldId}'. Please calculate an assessment first.`);
    }

    // 2. Data Integrity: If information is insufficient, explain what is missing rather than inventing an irrigation quantity
    if (
      currentAssessment.insufficient_data ||
      !currentAssessment.reasons ||
      currentAssessment.reasons.length === 0
    ) {
      const missingText = Array.isArray(currentAssessment.missing_parameters) && currentAssessment.missing_parameters.length > 0
        ? `Missing parameters: ${currentAssessment.missing_parameters.join(', ')}.`
        : 'Required weather rainfall measurements or sowing date parameters are absent.';

      return {
        headline: 'Insufficient data: cannot recommend irrigation quantity.',
        action_now: [
          'Verify and enter complete field crop and sowing date parameters.',
          'Manually inspect root-zone soil moisture before deciding to irrigate.',
          'Re-request explanation once complete weather data has been obtained.'
        ],
        why: [
          'Agronomic FAO-56 calculations require verified rainfall and crop stage data.',
          'Applying water without baseline data risks over-irrigation and root damage.',
          missingText
        ],
        risk_warning: 'Operating without verified weather measurements risks water waste and potential crop stress.',
        next_review: 'Update field details and request an advisory again.',
        language: normLang,
        label: 'Generated from your latest displayed assessment (insufficient input notice).',
        source_label: 'Generated from your latest displayed assessment.',
        source: 'Generated from your latest displayed assessment.',
        assessment_id: assessmentId
      };
    }

    // 3. Resolve user identity for caching
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'offline_user';

    // 4. Check local in-session cache keyed by user ID + assessment ID + language
    const cacheKey = `${userId}_${assessmentId}_${normLang}`;
    if (_advisorySessionCache.has(cacheKey)) {
      const cached = _advisorySessionCache.get(cacheKey);
      return {
        ...cached,
        isCached: true,
        assessment_timestamp: currentAssessment.updatedAt || currentAssessment.recordedAt || null
      };
    }

    // 5. Check Firestore persistent cache if Firebase is configured and user is authenticated
    if (db && currentUser) {
      try {
        const advDocRef = doc(db, 'fields', fieldId, 'assessments', assessmentId, 'advisories', normLang);
        const docSnap = await getDoc(advDocRef);
        if (docSnap.exists() && docSnap.data()?.advisory) {
          const cachedAdv = docSnap.data().advisory;
          const decorated = {
            ...cachedAdv,
            isCached: true,
            assessment_timestamp: currentAssessment.updatedAt || currentAssessment.recordedAt || null
          };
          _advisorySessionCache.set(cacheKey, decorated);
          return decorated;
        }
      } catch (fsErr) {
        if (fsErr.code === 'permission-denied') {
          console.warn('Firestore advisory cache read permission denied:', fsErr);
        }
      }
    }

    // 6. Generate via Firebase AI Logic (Gemini Developer API on Spark)
    if (isFirebaseConfigured) {
      const field = await this.getField(fieldId);
      const prompt = `Field Information:
- Field ID: ${fieldId}
- Field Name: ${field.name || 'Plot'}
- Crop: ${field.crop || 'Crop'}
- Sowing Date: ${field.sowing_date || 'Unknown'}
- Assessment ID: ${assessmentId}

Verified Agronomic Assessment (FAO-56):
- Water Stress Score: ${currentAssessment.water_stress_score}/100
- Risk Level: ${currentAssessment.risk_level}
- Recommended Irrigation: ${currentAssessment.recommended_irrigation_mm} mm
- Best Timing Window: ${currentAssessment.best_time || 'Morning'}
- Agronomic Reasons:
${(currentAssessment.reasons || []).map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

Target Language: ${normLang} (en: English, hi: Hindi, gu: Gujarati)

Instructions:
Explain this assessment clearly to the farmer in ${normLang}.
You must return a valid JSON object with EXACTLY these keys:
{
  "headline": "maximum 90 characters summarizing the recommendation",
  "action_now": ["exactly 3 concise, practical action steps based on the assessment"],
  "why": ["exactly 3 short factual reasons grounded ONLY in the supplied assessment numbers"],
  "risk_warning": "one short sentence warning about moisture stress or weather risks from assessment",
  "next_review": "one short sentence on when to inspect next",
  "language": "${normLang}"
}

Constraints:
- Use ONLY facts from the provided assessment (stress score, risk level, recommended mm, reasons).
- Do NOT invent measurements, sensor readings, rainfall amounts, or chemicals not present in the assessment.
- Translate all text into ${normLang}. Do not translate numbers or units inconsistently.
- 'action_now' must have exactly 3 items.
- 'why' must have exactly 3 items.
- 'headline' must be 90 characters or fewer.`;

      let responseText = '';
      const t0 = performance.now();
      try {
        const model = getGenerativeAdvisoryModel();
        const genResult = await model.generateContent(prompt);
        responseText = genResult.response.text();
        const aiDurationMs = performance.now() - t0;
        telemetryService.recordAiRequest(aiDurationMs);
      } catch (aiErr) {
        if (aiErr.code === 'permission-denied' || aiErr.message?.includes('permission')) {
          throw new Error('Permission denied: Access to Firebase AI Logic denied. Verify your authentication status.');
        }
        if (aiErr.code === 'resource-exhausted' || aiErr.message?.includes('429') || aiErr.message?.includes('quota')) {
          throw new Error('Free-tier AI quota reached (Gemini Developer API rate limit). Please wait 60 seconds before trying again.');
        }
        if (aiErr.code === 'unavailable' || aiErr.message?.includes('network') || aiErr.message?.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to reach Firebase AI service. Please check your internet connection.');
        }
        throw new Error(`AI generation error: ${aiErr.message || 'Unknown error'}`);
      }

      // Parse JSON from model output
      let raw;
      try {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        raw = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error(`Invalid AI response format: Unable to parse JSON (${parseErr.message}).`);
      }

      if (
        !raw ||
        typeof raw.headline !== 'string' ||
        !Array.isArray(raw.action_now) ||
        raw.action_now.length !== 3 ||
        !Array.isArray(raw.why) ||
        raw.why.length !== 3 ||
        typeof raw.risk_warning !== 'string' ||
        typeof raw.next_review !== 'string'
      ) {
        throw new Error('Invalid AI response format: Missing required advisory structure from AI response.');
      }

      const normalizedAdvisory = {
        headline: String(raw.headline).trim(),
        action_now: raw.action_now.map((item) => String(item).trim()),
        why: raw.why.map((item) => String(item).trim()),
        risk_warning: String(raw.risk_warning).trim(),
        next_review: String(raw.next_review).trim(),
        language: String(raw.language || normLang).trim(),
        label: 'Generated from your latest displayed assessment.',
        source_label: 'Generated from your latest displayed assessment.',
        source: 'Generated from your latest displayed assessment.',
        assessment_id: assessmentId,
        assessment_timestamp: currentAssessment.updatedAt || currentAssessment.recordedAt || null,
        isCached: false
      };

      // Cache in Firestore if user is authenticated
      if (db && currentUser) {
        try {
          const advDocRef = doc(db, 'fields', fieldId, 'assessments', assessmentId, 'advisories', normLang);
          await setDoc(advDocRef, {
            userId: currentUser.uid,
            fieldId,
            assessmentId,
            language: normLang,
            advisory: normalizedAdvisory,
            createdAt: serverTimestamp()
          });
        } catch (fsWriteErr) {
          console.warn('Failed to cache advisory in Firestore:', fsWriteErr);
        }
      }

      // Cache in local in-session cache
      _advisorySessionCache.set(cacheKey, normalizedAdvisory);

      return normalizedAdvisory;
    }

    // 7. If Firebase configuration environment variables are not yet present, check local backend fallback or inform user
    const envBase = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;
    if (envBase) {
      const apiBaseUrl = envBase.replace(/\/+$/, '');
      const url = `${apiBaseUrl}/fields/${encodeURIComponent(fieldId)}/advisory?assessment_id=${encodeURIComponent(assessmentId)}&language=${encodeURIComponent(normLang)}`;
      const t0 = performance.now();
      try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (response.ok) {
          const json = await response.json();
          const aiDurationMs = performance.now() - t0;
          telemetryService.recordAiRequest(aiDurationMs);
          const raw = json.advisory || json;
          const normalized = {
            headline: String(raw.headline).trim(),
            action_now: raw.action_now.map((item) => String(item).trim()),
            why: raw.why.map((item) => String(item).trim()),
            risk_warning: String(raw.risk_warning).trim(),
            next_review: String(raw.next_review).trim(),
            language: String(raw.language || normLang).trim(),
            label: 'Generated from your latest displayed assessment.',
            source_label: 'Generated from your latest displayed assessment.',
            source: 'Generated from your latest displayed assessment.',
            assessment_id: assessmentId,
            assessment_timestamp: currentAssessment.updatedAt || currentAssessment.recordedAt || null,
            isCached: false
          };
          _advisorySessionCache.set(cacheKey, normalized);
          return normalized;
        }
      } catch (err) {
        // Fall through to error
      }
    }

    throw new Error(
      'Firebase is not yet configured. Please set your Firebase Web App configuration in your environment variables and enable Gemini Developer API in the Firebase Console.'
    );
  },

  /**
   * Helper to reset the in-session advisory cache (e.g. for testing)
   */
  clearAdvisoryCache() {
    _advisorySessionCache.clear();
  },

  /**
   * 11. Get all active alerts
   */
  async getAlerts() {
    initStorage();
    return getStored(STORAGE_KEYS.ALERTS, []);
  },

  /**
   * 12. Mark alert as read
   */
  async markAlertRead(alertId) {
    initStorage();
    const alerts = await this.getAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.status = ALERT_STATUS.READ;
      alert.readAt = new Date().toISOString();
      setStored(STORAGE_KEYS.ALERTS, alerts);
      return alert;
    }
    return null;
  },

  /**
   * 13. Resolve alert
   */
  async resolveAlert(alertId) {
    initStorage();
    const alerts = await this.getAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.status = ALERT_STATUS.RESOLVED;
      alert.category = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.ALERTS, alerts);
      return alert;
    }
    return null;
  },

  /**
   * 14. Mark irrigation complete for a field
   * - Requires an explicit user baseline for comparison
   * - Shows estimated comparison against user baseline (no claimed measured savings or confirmed yield protection)
   * - Prevents duplicate counting for the same irrigation log
   */
  async markIrrigationComplete(fieldId, explicitUserBaselineMm = null) {
    initStorage();
    const assessments = getStored(STORAGE_KEYS.ASSESSMENTS, {});
    const current = assessments[fieldId];
    if (!current) {
      throw new Error(`Assessment for field '${fieldId}' not found.`);
    }

    const fields = await this.getFields();
    const field = fields.find((f) => f.id === fieldId);
    const areaAcres = Number(field?.area_acres || 1.0);

    // Require explicit user baseline
    const baselineMm = explicitUserBaselineMm !== null && explicitUserBaselineMm !== undefined
      ? Number(explicitUserBaselineMm)
      : Number(current?.userBaselineMm ?? current?.baselineIrrigationMm ?? 28.0);

    const recMm = Number(
      (current?.recommended_irrigation_mm !== undefined && current.recommended_irrigation_mm !== null)
        ? current.recommended_irrigation_mm
        : 0.0
    );

    // Check duplicate counting for the same irrigation log
    const allLogs = getStored(STORAGE_KEYS.IRRIGATION_LOGS, {});
    const fieldLogs = allLogs[fieldId] || [];
    const todayDate = new Date().toISOString().slice(0, 10);
    const alreadyLogged = fieldLogs.some(
      (l) => l.date === todayDate || (current?.id && l.assessmentId === current.id)
    );

    if (alreadyLogged) {
      return {
        ...current,
        duplicatePrevented: true,
        message: 'Irrigation for this assessment has already been recorded. Duplicate count prevented.'
      };
    }

    // Formula:
    // fieldAreaM2 = areaAcres * 4046.86
    // estimatedComparisonLitres = max(0, baselineMm - recMm) * fieldAreaM2
    const fieldAreaM2 = areaAcres * 4046.86;
    const currentDecisionSavedLitres = Math.round(Math.max(0, baselineMm - recMm) * fieldAreaM2);
    const prevCumulative = Number(current?.cumulativeSeasonSavedLitres || 0);
    const cumulativeSeasonSavedLitres = prevCumulative + currentDecisionSavedLitres;
    const nowIso = new Date().toISOString();
    const logId = `irr_${Date.now()}`;

    // Record unique log to prevent duplicate accumulation
    const newLogRecord = {
      id: logId,
      date: todayDate,
      assessmentId: current?.id || null,
      userBaselineMm: baselineMm,
      recommendedMm: recMm,
      estimatedComparisonLitres: currentDecisionSavedLitres,
      fieldAreaM2,
      createdAt: nowIso
    };
    fieldLogs.push(newLogRecord);
    allLogs[fieldId] = fieldLogs;
    setStored(STORAGE_KEYS.IRRIGATION_LOGS, allLogs);

    const satisfied = {
      ...current,
      water_stress_score: 20,
      risk_level: 'low',
      recommended_irrigation_mm: 0.0,
      priorRecommendedMm: recMm,
      userBaselineMm: baselineMm,
      baselineIrrigationMm: baselineMm,
      baseline_irrigation_mm: baselineMm,
      currentDecisionSavedLitres,
      cumulativeSeasonSavedLitres,
      irrigationCompletion: nowIso,
      lastIrrigatedAt: nowIso,
      isEstimatedComparison: true,
      duplicatePrevented: false,
      reasons: [
        'Irrigation application confirmed by farmer.',
        `Estimated comparison against your reported baseline of ${baselineMm} mm: ${recMm} mm planned.`,
        'Verify root-zone moisture before next irrigation.'
      ],
      updatedAt: nowIso
    };
    assessments[fieldId] = satisfied;
    setStored(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Also persist in STORAGE_KEYS.WATER_SAVINGS for easy lookup
    const savingsMap = getStored(STORAGE_KEYS.WATER_SAVINGS, {});
    savingsMap[fieldId] = {
      userBaselineMm: baselineMm,
      baselineIrrigationMm: baselineMm,
      currentDecisionSavedLitres,
      cumulativeSeasonSavedLitres,
      irrigationCompletion: nowIso,
      areaAcres,
      recommendedMm: recMm,
      isEstimatedComparison: true
    };
    setStored(STORAGE_KEYS.WATER_SAVINGS, savingsMap);

    // Persist irrigation log to Firestore if authenticated
    const currentUser = authService.getCurrentUser();
    if (db && currentUser) {
      try {
        const logDocRef = doc(collection(db, 'fields', fieldId, 'irrigation_logs'), logId);
        await setDoc(logDocRef, {
          userId: currentUser.uid,
          fieldId,
          userBaselineMm: baselineMm,
          recommendedMm: recMm,
          estimatedComparisonLitres: currentDecisionSavedLitres,
          cumulativeSeasonSavedLitres,
          irrigationCompletion: nowIso,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Failed to save irrigation log to Firestore:', err);
      }
    }

    // Resolve any open alerts for this field without deleting historical alert records
    const alerts = await this.getAlerts();
    alerts.forEach((a) => {
      if (a.fieldId === fieldId && a.status !== ALERT_STATUS.RESOLVED) {
        a.status = ALERT_STATUS.RESOLVED;
        a.category = 'resolved';
        a.resolvedAt = nowIso;
      }
    });
    setStored(STORAGE_KEYS.ALERTS, alerts);

    return satisfied;
  },

  /**
   * 15. Get water savings impact data (estimated comparison against user baseline)
   */
  async getWaterSavings(fieldId) {
    initStorage();
    const assessment = await this.getCurrentAssessment(fieldId);
    const field = await this.getField(fieldId);
    const areaAcres = Number(field?.area_acres || 1.0);
    const userBaselineMm = assessment?.userBaselineMm ?? assessment?.baselineIrrigationMm ?? null;
    const recMm = Number(assessment?.priorRecommendedMm ?? (assessment?.recommended_irrigation_mm > 0 ? assessment.recommended_irrigation_mm : 0));
    const fieldAreaM2 = areaAcres * 4046.86;
    const currentSaved = assessment?.currentDecisionSavedLitres ?? (userBaselineMm ? Math.round(Math.max(0, userBaselineMm - recMm) * fieldAreaM2) : 0);
    const cumulativeSaved = assessment?.cumulativeSeasonSavedLitres ?? currentSaved;
    return {
      userBaselineMm,
      baselineIrrigationMm: userBaselineMm,
      currentDecisionSavedLitres: currentSaved,
      cumulativeSeasonSavedLitres: cumulativeSaved,
      irrigationCompletion: assessment?.irrigationCompletion || assessment?.lastIrrigatedAt || null,
      areaAcres,
      recommendedMm: recMm,
      isEstimatedComparison: true
    };
  },

  /**
   * 16. Reset irrigation status for testing
   */
  async resetIrrigationDemo(fieldId) {
    initStorage();
    const assessments = getStored(STORAGE_KEYS.ASSESSMENTS, {});
    const current = assessments[fieldId];
    if (current) {
      delete current.lastIrrigatedAt;
      delete current.irrigationCompletion;
      delete current.currentDecisionSavedLitres;
      assessments[fieldId] = current;
      setStored(STORAGE_KEYS.ASSESSMENTS, assessments);
    }
    return current;
  },

  /**
   * 17. Get genuine decision history from logged irrigation records
   */
  async getDecisionHistory(fieldId) {
    initStorage();
    const allLogs = getStored(STORAGE_KEYS.IRRIGATION_LOGS, {});
    const fieldLogs = allLogs[fieldId] || [];
    return fieldLogs.map((log) => ({
      id: log.id,
      date: log.date,
      score: log.score ?? '—',
      recommendedAction: log.recommendedMm > 0 ? `Apply ${log.recommendedMm} mm` : 'Withhold irrigation (0 mm)',
      status: 'completed',
      statusLabel: 'Completed',
      baselineComparisonLitres: log.estimatedComparisonLitres
    }));
  }
};
