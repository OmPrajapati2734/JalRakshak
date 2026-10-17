import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Standard public Firebase Web Client config (Safe to run in browser).
// Gemini Developer API key is managed securely server-side by Firebase AI Logic / App Check proxy.
// NEVER embed secret server keys or Gemini API keys in client code or VITE variables.
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || '',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || '',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || '',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || '',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId && firebaseConfig.apiKey
);

let app = null;
let auth = null;
let db = null;
let ai = null;
let appCheck = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // Initialize Firebase AI Logic with Gemini Developer API backend (Spark free tier, billing not required)
    ai = getAI(app, { backend: new GoogleAIBackend() });

    // App Check: Optional verification provider (reCAPTCHA v3)
    // Register deployed domain in reCAPTCHA and Firebase Console -> App Check before enforcing.
    // Debug tokens MUST NEVER be committed to source code or git.
    const appCheckSiteKey = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_FIREBASE_APPCHECK_SITE_KEY || import.meta.env?.VITE_RECAPTCHA_SITE_KEY)) || '';
    if (appCheckSiteKey && typeof window !== 'undefined') {
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      } catch (checkErr) {
        console.warn('App Check initialization notice (verify domain registration):', checkErr);
      }
    }
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

// Supported free-tier model verified from official Firebase AI Logic documentation (billing not required)
export const FIREBASE_FREE_TIER_MODEL = 'gemini-3.8-flash';

export function getGenerativeAdvisoryModel() {
  if (!ai) {
    throw new Error('Firebase AI Logic is not initialized. Please configure Firebase project settings.');
  }
  return getGenerativeModel(ai, {
    model: FIREBASE_FREE_TIER_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });
}

export { app, auth, db, ai, appCheck, firebaseConfig };
