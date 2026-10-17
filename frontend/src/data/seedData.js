/**
 * seedData.js
 * Isolated realistic seed dataset for single-field MVP demonstration:
 * - Field: North Plot
 * - Crop: Cotton
 * - Location: Kutch, Gujarat
 * - Water stress score: 78 (High)
 * - Recommended irrigation: 20 mm (6:00–8:00 AM)
 */

export const SEED_PROFILE = {
  id: 'farmer_kutch_01',
  name: 'Khimji Ahir',
  phone: '+91 94281 55021',
  preferredLanguage: 'gu',
  village: 'Anjar, Kutch',
  state: 'Gujarat',
  createdAt: '2026-08-01T00:00:00Z'
};

export const SEED_FIELD = {
  id: 'field_north_plot',
  name: 'North Plot',
  crop: 'cotton',
  sowing_date: '2026-08-10',
  village: 'Anjar, Kutch, Gujarat',
  area_acres: 0.57,
  lat: 23.1141,
  lng: 70.0274,
  createdAt: '2026-08-10T06:00:00Z'
};

export const SEED_ASSESSMENT = {
  id: 'assess_north_plot_01',
  field_id: 'field_north_plot',
  water_stress_score: 78,
  risk_level: 'high',
  crop_stage: 'mid_season',
  recommended_irrigation_mm: 20.0,
  baseline_irrigation_mm: 28.0,
  baselineIrrigationMm: 28.0,
  forecast_rainfall_48h_mm: 0.0,
  best_time: '6:00–8:00 AM',
  reasons: [
    'Cotton is in peak boll-formation stage (Kc: 1.20) with root-zone moisture index at 0.21 (optimal: 0.50).',
    'Rainfall profile: 0.0 mm received in the last 7 days; 0.0 mm forecast in the next 48 hours across Kutch.',
    'Water stress score of 78/100 indicates acute root deficit; apply 20 mm before 8:00 AM to prevent flower shedding.'
  ],
  confidence: 'high',
  confidence_score: 92,
  assumptions: [
    'Soil type: Sandy Loam with 35% available water capacity (AWC).',
    'Crop coefficient (Kc): 1.20 for mid-season cotton boll development stage.',
    'Weather forecast: 0.0 mm rainfall expected across Kutch over next 48 hours.',
    'System efficiency: 75% uniform application with standard drip or furrow layout.'
  ],
  assumptions_hi: [
    'मिट्टी का प्रकार: रेतीली दोमट (35% जल धारण क्षमता)।',
    'फसल गुणांक (Kc): 1.20 मध्य-सीजन कपास गूलर विकास अवस्था।',
    'मौसम पूर्वानुमान: अगले 48 घंटों में कच्छ क्षेत्र में 0.0 मिमी वर्षा।',
    'सिंचाई दक्षता: क्यारी/ड्रिप प्रणाली में 75% समान जल वितरण।'
  ],
  assumptions_gu: [
    'જમીનનો પ્રકાર: ગોરાડુ/રેતાળ (35% ભેજ સંગ્રહ ક્ષમતા).',
    'પાક ગુણાંક (Kc): 1.20 કપાસના જીંડવા નિર્માણનો મુખ્ય તબક્કો.',
    'હવામાન આગાહી: આગામી 48 કલાકમાં કચ્છમાં 0.0 મીમી વરસાદ.',
    'પિયત કાર્યક્ષમતા: ધોરિયા અથવા ટપક પદ્ધતિમાં 75% સમાન વિતરણ.'
  ],
  next_review_hours: 12,
  insufficient_data: false,
  updatedAt: '2026-10-12T05:30:00Z'
};

export const SEED_TRENDS = [
  { date: '2026-10-06', water_stress_score: 45, risk_level: 'medium', irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-07', water_stress_score: 52, risk_level: 'medium', irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-08', water_stress_score: 59, risk_level: 'medium', irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-09', water_stress_score: 66, risk_level: 'high',   irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-10', water_stress_score: 71, risk_level: 'high',   irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-11', water_stress_score: 75, risk_level: 'high',   irrigation_mm: 0.0, rainfall_mm: 0.0 },
  { date: '2026-10-12', water_stress_score: 78, risk_level: 'high',   irrigation_mm: 20.0, rainfall_mm: 0.0 }
];

export const SEED_ALERTS = [
  {
    id: 'alert_np_01',
    fieldId: 'field_north_plot',
    assessmentId: 'assess_north_plot_01',
    type: 'HIGH_WATER_STRESS',
    title: 'Critical Water Stress Deficit',
    severity: 'high',
    status: 'unread',
    category: 'action_needed',
    message: 'Root-zone moisture dropped to 0.21. Apply 20 mm irrigation between 6:00–8:00 AM today to prevent flower shedding.',
    createdAt: '2026-10-12T05:30:00Z',
    isIrrigationAlert: true
  },
  {
    id: 'alert_np_02',
    fieldId: 'field_north_plot',
    assessmentId: 'assess_north_plot_01',
    type: 'WEATHER_FORECAST',
    title: 'Upcoming Arid Heat Spike',
    severity: 'medium',
    status: 'unread',
    category: 'upcoming',
    message: 'Temperatures reaching 41°C with dry winds forecast across Kutch over the next 48 hours. Ensure root moisture before midday heat.',
    createdAt: '2026-10-12T07:00:00Z',
    isIrrigationAlert: false
  },
  {
    id: 'alert_np_03',
    fieldId: 'field_north_plot',
    assessmentId: 'assess_north_plot_00',
    type: 'IRRIGATION_LOGGED',
    title: 'Vegetative Stage Watering',
    severity: 'low',
    status: 'resolved',
    category: 'resolved',
    message: 'Scheduled 15 mm irrigation completed successfully. Optimal root moisture was restored.',
    createdAt: '2026-10-05T06:15:00Z',
    resolvedAt: '2026-10-05T08:30:00Z',
    isIrrigationAlert: true
  }
];

export const SEED_ALERT = SEED_ALERTS[0];

export const SEED_ADVISORIES = {
  en: {
    headline: 'Irrigate 20 mm between 6:00–8:00 AM to protect cotton boll development.',
    action_now: [
      'Apply 20 mm of water (approximately 3.5 hours tube-well run per acre).',
      'Irrigate strictly between 6:00 AM and 8:00 AM to prevent arid wind evaporation.',
      'Inspect furrow channels after watering for even moisture penetration.'
    ],
    why: [
      'Root-zone soil moisture is 0.21, significantly below the 0.50 threshold for cotton.',
      'Peak boll development cannot endure moisture deficit without shedding flowers.',
      'Zero rainfall has been recorded for 7 days with dry atmospheric conditions across Kutch.'
    ],
    risk_warning: 'Delaying irrigation beyond today will lead to boll shedding and stunted fiber length.',
    next_review: 'Re-inspect soil moisture in 12 hours after morning irrigation.',
    language: 'en'
  },
  hi: {
    headline: 'कपास के गूलर (boll) विकास की सुरक्षा के लिए सुबह 6:00–8:00 बजे 20 मिमी सिंचाई करें।',
    action_now: [
      '20 मिमी पानी दें (प्रति एकड़ लगभग 3.5 घंटे ट्यूबवेल चलाएं)।',
      'गर्म शुष्क हवाओं से वाष्पीकरण रोकने के लिए सुबह 6:00 से 8:00 बजे के बीच ही सिंचाई करें।',
      'पानी देने के बाद खेत की क्यारियों में समान नमी की जांच करें।'
    ],
    why: [
      'जड़-क्षेत्र की नमी 0.21 है, जो कपास के 0.50 के इष्टतम स्तर से बहुत नीचे है।',
      'गूलर निर्माण की मुख्य अवस्था में पानी की कमी से फूल और गूलर झड़ने लगते हैं।',
      'कच्छ क्षेत्र में पिछले 7 दिनों से वर्षा शून्य है और शुष्क हवाएं चल रही हैं।'
    ],
    risk_warning: 'आज सिंचाई टालने से गूलर झड़ने और रेशे की गुणवत्ता में गिरावट का गंभीर जोखिम है।',
    next_review: 'सुबह की सिंचाई के 12 घंटे बाद मिट्टी की नमी की दोबारा जांच करें।',
    language: 'hi'
  },
  gu: {
    headline: 'કપાસમાં જીંડવા રક્ષણ માટે સવારે 6:00–8:00 વચ્ચે 20 મીમી પિયત આપો.',
    action_now: [
      '20 મીમી પાણી આપો (એકર દીઠ આશરે 3.5 કલાક બોરવેલ ચલાવો).',
      'સૂકા પવન અને બાષ્પીભવનથી બચવા સવારે 6:00 થી 8:00 વચ્ચે જ પિયત પૂર્ણ કરો.',
      'પિયત પછી કપાસના પાળા અને ધોરિયામાં સમાન ભેજ તપાસો.'
    ],
    why: [
      'જમીનમાં મૂળિયા વિસ્તારનો ભેજ 0.21 છે, જે કપાસ માટે જરૂરી 0.50 કરતાં ખૂબ ઓછો છે.',
      'જીંડવા બંધાવાના મુખ્ય તબક્કે પાણીની ખેંચથી ફૂલ અને નાના જીંડવા ખરી પડે છે.',
      'કચ્છમાં છેલ્લા 7 દિવસથી શૂન્ય વરસાદ છે અને વાતાવરણ સૂકું છે.'
    ],
    risk_warning: 'પિયતમાં વિલંબ કરવાથી જીંડવા ખરી જશે અને રૂના ઉત્પાદનમાં મોટો ઘટાડો થશે.',
    next_review: 'સવારના પિયત પછી 12 કલાકે ફરીથી ભેજ ચકાસો.',
    language: 'gu'
  }
};
