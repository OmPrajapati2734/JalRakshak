/**
 * domain.js
 * Shared domain constants for JalRakshak AI frontend.
 * Kept in pure JavaScript; aligns with Cloud Run API contracts.
 */

export const CROPS = {
  WHEAT: 'wheat',
  COTTON: 'cotton',
  GROUNDNUT: 'groundnut'
};

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const LANGUAGES = {
  EN: 'en',
  HI: 'hi',
  GU: 'gu'
};

export const ALERT_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  RESOLVED: 'resolved'
};

export const ALERT_TYPES = {
  HIGH_WATER_STRESS: 'HIGH_WATER_STRESS'
};

export const STORAGE_KEYS = {
  PROFILE: 'jalrakshak_profile',
  FIELDS: 'jalrakshak_fields',
  ASSESSMENTS: 'jalrakshak_assessments',
  ADVISORIES: 'jalrakshak_advisories',
  ALERTS: 'jalrakshak_alerts',
  TRENDS: 'jalrakshak_trends',
  WATER_SAVINGS: 'jalrakshak_water_savings',
  IRRIGATION_LOGS: 'jalrakshak_irrigation_logs',
  ONBOARDED: 'jalrakshak_onboarded',
  LANGUAGE: 'jalrakshak_language'
};
