# JalRakshak AI (जल रक्षक AI / જલ રક્ષક AI)

JalRakshak AI is a precision crop-water advisory platform that combines FAO-56 dual crop-coefficient water-balance modeling with live weather forecasts and on-demand Gemini AI explanations to help smallholder farmers in India optimize irrigation scheduling and conserve water.

---

## 🌾 Problem and Intended User

### The Problem
Smallholder farmers in semi-arid and drought-prone regions of India (such as Gujarat, Rajasthan, and Maharashtra) face increasing groundwater depletion, erratic monsoon patterns, and lack of affordable, scientific irrigation guidance. Farmers frequently rely on fixed calendar intervals or visual soil dryness, often resulting in:
- **Over-irrigation:** Leaching costly soil nutrients, increasing fungal disease risk, and wasting groundwater and electrical pumping energy.
- **Under-irrigation:** Causing moisture stress during critical vegetative or flowering stages, leading to severe yield loss.

### Intended Users
- **Smallholder Farmers:** Needing straightforward, timely, and actionable irrigation advice delivered in their native languages (**Hindi**, **Gujarati**, or **English**).
- **Agricultural Extension Workers & Evaluators:** Reviewing agronomic water-balance indicators and testing localized crop advisory workflows.

---

## ✅ Features Actually Implemented

1. **Field Plot Management:** Register and manage field plots with crop types (**Wheat**, **Cotton**, **Groundnut**), acreage, sowing date, and regional coordinates.
2. **Deterministic FAO-56 Agronomic Modeling:** Computes daily reference evapotranspiration ($ET_0$), crop water requirement ($ET_c$), root-zone depletion, water stress index, and recommended irrigation depth (in mm) based on crop growth stages.
3. **Live Weather Integration:** Fetches live and 7-day forecast agro-meteorological data (temperature, relative humidity, wind speed, solar radiation, and precipitation) via Open-Meteo's open public API without requiring API keys.
4. **On-Demand AI Advisory:** Evaluators and farmers can tap **"Explain with AI"** to invoke `gemini-3.8-flash` via Firebase AI Logic. Returns validated, structured explanations containing:
   - Actionable headline
   - Immediate field actions
   - Agronomic rationale
   - Critical risk warnings
   - Suggested next review date
5. **Multilingual Localized Interface:** Full application and advisory support across **English**, **Hindi (हिन्दी)**, and **Gujarati (ગુજરાતી)** with identical numeric calculation outputs across all languages.
6. **What-If Irrigation Delay Simulator:** Simulates the agronomic risk and estimated stress progression of delaying irrigation by 24, 48, or 72 hours.
7. **Irrigation Logging & Comparison:** Log actual watering events with an explicit user-entered baseline depth to record **estimated comparison water savings** against standard flood-irrigation practices.
8. **Secure Authentication & Local Mode:** Firebase Email/Password authentication for evaluators, along with a client-side "Local Mode" for instant offline evaluation without sign-in.
9. **Granular Firestore Security Rules:** Restrictive access control rules enforcing authenticated caller ownership (`request.auth.uid`), parent-field verification (`isFieldOwner`), and update immutability.

---

## 🏛️ Actual Architecture & Active Google Services

JalRakshak AI is engineered strictly within Google's **Firebase Spark Free Tier** (Zero Billing / Zero Payment Architecture):

```
                        ┌──────────────────────────────────────────────┐
                        │             Firebase Hosting (SPA)           │
                        │             React 18 + Vite 5 + CSS          │
                        └──────────────────────┬───────────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
    │    Firebase Auth     │        │   Cloud Firestore    │        │  Firebase AI Logic   │
    │   (Email / Password) │        │  (User-Isolated DB)  │        │  (Gemini Dev API)    │
    │  Restricted accounts │        │   firestore.rules    │        │  gemini-3.8-flash    │
    └──────────────────────┘        └──────────────────────┘        └──────────────────────┘
               │                               │                               │
               └───────────────────────┬───────┴───────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │    External Open Data:      │
                        │   Open-Meteo Weather API    │
                        │ (Public, keyless forecasts) │
                        └─────────────────────────────┘
```

### Active Google & Firebase Services
- **Firebase Hosting:** Delivers the optimized single-page web application bundle and handles SPA client-side routing.
- **Firebase Authentication:** Handles secure user session management using Email/Password authentication.
- **Cloud Firestore:** Document database persisting user profiles, fields, calculated assessments, advisory caches, and irrigation logs under strict ownership validation.
- **Firebase AI Logic (`@firebase/ai`):** Connects to the **Gemini Developer API** (`GoogleAIBackend`) using the verified free-tier model (`gemini-3.8-flash`) without embedding private server keys in browser code.
- **Firebase App Check (Optional):** Integrated client support for reCAPTCHA v3 site token verification.

*Note: No Blaze plan, Cloud Functions, Cloud Run, Vertex AI paid billing, or third-party paid APIs are enabled or required.*

---

## 💻 Prerequisites & Local Setup Commands

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python:** v3.10 or higher *(optional, only needed if running standalone backend service)*

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OmPrajapati2734/JalRakshak.git
   cd JalRakshak
   ```

2. **Configure environment variables:**
   ```bash
   cd frontend
   cp .env.example .env
   ```
   *(Edit `frontend/.env` to include your Firebase Web App configuration if connecting to your own Firebase project).*

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🔑 Required Environment Variables

All client-facing environment variables are defined in [frontend/.env.example](frontend/.env.example) and [.env.example](.env.example). **Never commit real credentials or private keys to git.**

```env
# Firebase Web App Public Configuration (from Firebase Console -> Project Settings)
VITE_FIREBASE_API_KEY=your_firebase_web_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=1:your_project_number:web:your_web_app_id

# Optional: Firebase App Check reCAPTCHA v3 site key (if App Check is enabled)
# VITE_FIREBASE_APPCHECK_SITE_KEY=your_recaptcha_v3_site_key_here

# Optional: Remote Backend API Base URL (if running standalone FastAPI service)
# VITE_API_BASE_URL=http://localhost:8000
```

---

## 🛠️ Existing Build, Lint, and Test Commands

### Frontend (`frontend/package.json`)
- **Development Server:**
  ```bash
  cd frontend && npm run dev
  ```
- **Production Build:**
  ```bash
  cd frontend && npm run build
  ```
  *(Compiles JSX and bundles assets into `frontend/dist/` using Vite).*
- **Build Preview:**
  ```bash
  cd frontend && npm run preview
  ```

### Backend (`backend/`)
- **Python Syntax & Bytecode Compilation:**
  ```bash
  python -m compileall backend/
  ```
- **Local Standalone Backend Server:**
  ```bash
  cd backend && uvicorn main:app --reload --port 8000
  ```

*Note: Automated unit test runners (such as Vitest or Jest) and standalone linters (such as ESLint) are not configured in `frontend/package.json`. Code correctness is validated via Vite production compilation and Python syntax checking.*

---

## 🚀 Deployment Instructions

The production deployment target is **Firebase Hosting** on the existing project `jalrakshak-513a7`:

1. **Build the production frontend:**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
   *(Verifies bundle creation in `frontend/dist/`).*

2. **Authenticate with Firebase CLI:**
   ```bash
   npx firebase-tools login
   ```

3. **Verify project target:**
   Ensure [.firebaserc](.firebaserc) points to the intended project:
   ```json
   {
     "projects": {
       "default": "jalrakshak-513a7"
     }
   }
   ```

4. **Deploy Hosting and Firestore Security Rules:**
   ```bash
   npx firebase-tools deploy --only hosting,firestore:rules
   ```

---

## 🧪 Concise Judge Walkthrough

Follow these steps to evaluate the end-to-end functionality of JalRakshak AI:

1. **Access the Application:** Open the application in your browser.
2. **Authentication:**
   - Sign in using the test account credentials provided **privately in the hackathon submission notes**.
   - *Alternatively:* Click **"Continue in Local Mode"** to evaluate the platform immediately offline via client-side storage without requiring credentials.
3. **Add a Plot:**
   - Tap **"+ Add Field"** on the dashboard.
   - Enter plot details: Plot Name (e.g., *"North Field"*), Crop Type (e.g., **Cotton**), Area (e.g., **2.5** acres), and Sowing Date (e.g., 30 days prior).
   - Save the plot.
4. **Inspect FAO-56 Agronomic Assessment:**
   - View the calculated Water Stress Score (0–100), Root-Zone Depletion, and Recommended Irrigation Depth (in mm).
5. **Request AI Advisory:**
   - Tap **"Explain with AI"**.
   - Firebase AI Logic invokes `gemini-3.8-flash` on the Spark free tier to return a grounded, structured advisory.
6. **Switch Languages:**
   - Use the language selector in the navigation bar to toggle between **English**, **हिन्दी**, and **ગુજરાતી**.
   - Notice that calculations, dates, and units remain consistent, while labels and AI explanations adjust to the chosen language.
7. **Simulate Delays & Log Irrigation:**
   - Open the **What-If Simulator** to review estimated stress impacts for 24h, 48h, or 72h irrigation delays.
   - Enter your baseline irrigation depth (e.g., 50 mm) and tap **"Confirm Irrigation"** to log the event and review **estimated comparison savings** in litres.

> [!NOTE]
> Evaluator login credentials are provided **privately in the submission notes** to protect account access. No passwords are published in this repository.

---

## 📊 Data Sources, Provenance, Assumptions & Limitations

### Data Sources
- **FAO-56 Methodology:** Dual crop-coefficient calculation guidelines (FAO Irrigation and Drainage Paper 56) providing basal crop coefficients ($K_{cb}$), soil evaporation coefficients ($K_e$), and depletion fractions ($p$) for Wheat, Cotton, and Groundnut.
- **Open-Meteo Weather API:** Open-access forecast API providing hourly and daily temperature, precipitation, humidity, solar radiation, and wind speed.
- **User Observations:** Farmer-reported sowing date, acreage, crop type, and optional soil texture estimates.

### Calculation Assumptions & Provenance
- **Heuristic Assessment:** Soil moisture balance is computed from cumulative rainfall, modeled evapotranspiration ($ET_c$), and soil water holding capacity heuristics. It provides agronomic decision support, not lab-calibrated physical measurement.
- **Root Growth Model:** Root depth is assumed to expand linearly from initial planting depth to maximum maturity depth across phenological stages.
- **Estimated Savings:** Calculated as the difference between farmer-reported baseline application depth and model-recommended depth multiplied by plot area. All displayed water savings are **modeled estimates**, not metered pipe-flow measurements.

### Limitations
- Does not account for localized soil salinity, hardpans, or micro-topographical drainage variations.
- Weather data relies on grid-interpolated numerical forecast models; localized microclimatic precipitation may vary from actual plot conditions.
- Should be used alongside traditional local farming judgment and professional agronomic extension advice.

---

## 🤖 Responsible-AI Principles

1. **Grounded Outputs (Zero Hallucination of Core Data):** Gemini does not generate the irrigation numbers. All numeric metrics (stress score, recommended mm, root depletion) are deterministically computed by the FAO-56 engine. The LLM only receives and explains verified figures.
2. **Schema-Enforced Structured Outputs:** Responses from `gemini-3.8-flash` are constrained to a strict JSON schema (`headline`, `action_now`, `why`, `risk_warning`, `next_review`) to prevent unformatted or erratic text.
3. **No Autonomous Actuation:** JalRakshak AI is an informational advisory tool. It does not automatically trigger irrigation pumps, valves, or physical machinery without human review and confirmation.
4. **User Isolation & Privacy:** Firestore security rules strictly prevent users from reading or editing other users' plots, assessments, or logs. No personal identifying information (PII) is included in prompts or logged in telemetry.
5. **Linguistic Equity:** Built specifically with native Hindi and Gujarati support to ensure technological access for non-English-speaking smallholder farmers.

---

## 📡 Current Deployment Status

- **Status:** **Ready for Deployment**
- **Build Status:** Verified production build generated via Vite (`frontend/dist/`).
- **Target Platform:** Firebase Hosting (`jalrakshak-513a7`).
- **Live Production URL:** Pending execution of `firebase deploy --only hosting`. *(A live production URL will be generated upon running the deployment command and will be included in the official submission form).*

---

## 📄 License

This project is licensed under the Apache 2.0 License.
