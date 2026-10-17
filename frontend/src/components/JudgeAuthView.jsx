import React, { useState } from 'react';
import {
  Card,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  Badge
} from './ui/Primitives.jsx';

export default function JudgeAuthView({
  onSignIn,
  onSignUp,
  onContinueAsGuest,
  loading = false,
  error = null,
  isFirebaseConfigured = true
}) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [showGuideDetails, setShowGuideDetails] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setValidationError('Please enter an email address.');
      return;
    }
    if (!password) {
      setValidationError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signin') {
      onSignIn(cleanEmail, password);
    } else {
      onSignUp(cleanEmail, password);
    }
  };

  const activeError = error || validationError;

  return (
    <main className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        {/* App Title Header */}
        <header className="text-center space-y-1.5 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EBF4ED] text-[var(--forest)] text-3xl mb-1 shadow-xs border border-[var(--leaf)]/40">
            💧
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
            JalRakshak AI
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[var(--muted)] max-w-md mx-auto">
            Zero-Payment Spark Architecture • Precision Irrigation Decisions for Indian Agriculture
          </p>
        </header>

        {/* 1. VISIBLE "HOW TO TEST" GUIDANCE FOR JUDGES */}
        <Card
          as="section"
          aria-label="Judge Evaluation & Testing Guide"
          style={{
            border: '2px solid var(--forest)',
            backgroundColor: 'var(--surface)',
            padding: '20px',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">📋</span>
                <h2 className="text-sm font-black uppercase tracking-wider text-[var(--forest)]">
                  How to Test (Judge Evaluation Guide)
                </h2>
              </div>
              <p className="text-[11px] text-[var(--muted)] font-medium mt-0.5">
                Evaluator checklist for verifying real-time integrations and data integrity.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideDetails(!showGuideDetails)}
              className="text-xs font-bold text-[var(--forest)] hover:underline px-2 py-1 bg-[var(--canvas)] border border-[var(--border)] rounded cursor-pointer"
            >
              {showGuideDetails ? 'Hide' : 'Show'}
            </button>
          </div>

          {showGuideDetails && (
            <ol className="mt-3 space-y-2.5 text-xs text-[var(--ink)]">
              <li className="flex items-start gap-2.5 bg-[var(--canvas)] p-2.5 rounded-xl border border-[var(--border)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[10px] font-black flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <strong className="block text-[11px] font-black text-[var(--ink)] uppercase">
                    Authenticate as a Restricted User
                  </strong>
                  <span className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Sign in with the test credentials provided in your private submission form, or register a new user in the Create Account tab. The account is a standard restricted user (never admin).
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-2.5 bg-[var(--canvas)] p-2.5 rounded-xl border border-[var(--border)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[10px] font-black flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-[11px] font-black text-[var(--ink)] uppercase">
                    Register Your Own Field (Clean Slate)
                  </strong>
                  <span className="text-[11px] text-[var(--muted)] leading-relaxed">
                    No preloaded seed data. Enter crop (Cotton, Wheat, or Groundnut), sowing date, and plot acreage to establish a clean, user-owned Firestore record under <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-[var(--border)]">fields/{'{fieldId}'}</code>.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-2.5 bg-[var(--canvas)] p-2.5 rounded-xl border border-[var(--border)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[10px] font-black flex items-center justify-center mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-[11px] font-black text-[var(--ink)] uppercase">
                    Request AI Advisory & Switch Language
                  </strong>
                  <span className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Click <em>"Explain with AI"</em> to invoke Firebase AI Logic (<code className="text-[10px] bg-white px-1 py-0.5 rounded border border-[var(--border)]">gemini-3.8-flash</code> on Spark free-tier). Toggle between EN, HI (हिन्दी), and GU (ગુજરાતી) to verify dynamic multilingual explanations.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-2.5 bg-[var(--canvas)] p-2.5 rounded-xl border border-[var(--border)]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[10px] font-black flex items-center justify-center mt-0.5">
                  4
                </span>
                <div>
                  <strong className="block text-[11px] font-black text-[var(--ink)] uppercase">
                    Test Simulator & Record Irrigation
                  </strong>
                  <span className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Explore the <em>"What if I wait?"</em> delay impact simulator, then record an irrigation event with your explicit baseline depth. Observe that duplicate counting for the same event is prevented.
                  </span>
                </div>
              </li>
            </ol>
          )}

          <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-bold text-[var(--muted)] flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-[var(--forest)]">
              <span aria-hidden="true">🛡️</span>
              <span>Account Scope: Restricted User (request.auth.uid isolated)</span>
            </span>
            <span className="text-[10px] font-medium bg-[var(--canvas)] px-2 py-0.5 rounded border border-[var(--border)]">
              Firestore Rules: Authenticated Owner Only
            </span>
          </div>
        </Card>

        {/* 2. NORMAL EMAIL / PASSWORD LOGIN SCREEN */}
        <Card
          as="section"
          aria-label="User Authentication Form"
          style={{
            padding: '24px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)'
          }}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[var(--border)] mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setValidationError(null);
              }}
              className={`flex-1 py-2 text-xs font-black tracking-wide uppercase transition-colors border-b-2 cursor-pointer ${
                mode === 'signin'
                  ? 'border-[var(--forest)] text-[var(--forest)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Sign In (Existing User)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setValidationError(null);
              }}
              className={`flex-1 py-2 text-xs font-black tracking-wide uppercase transition-colors border-b-2 cursor-pointer ${
                mode === 'signup'
                  ? 'border-[var(--forest)] text-[var(--forest)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Create Account (New User)
            </button>
          </div>

          {activeError && (
            <div
              role="alert"
              className="p-3 mb-4 bg-[#FDF5F5] border border-[#DE5959] rounded-xl text-xs text-[#B92B27] font-semibold flex items-center gap-2"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{activeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="auth-email-input"
                className="block text-xs font-bold text-[var(--ink)] mb-1"
              >
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. judge@example.com"
                autoComplete="email"
                required
                className="w-full px-3 py-2.5 text-xs text-[var(--ink)] bg-[var(--canvas)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--forest)]"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password-input"
                className="block text-xs font-bold text-[var(--ink)] mb-1"
              >
                Password
              </label>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                className="w-full px-3 py-2.5 text-xs text-[var(--ink)] bg-[var(--canvas)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--forest)]"
              />
              <span className="text-[10px] text-[var(--muted)] mt-1 block">
                {mode === 'signin'
                  ? 'Credentials provided in the private hackathon submission form.'
                  : 'Minimum 6 characters.'}
              </span>
            </div>

            <div className="pt-2 space-y-2">
              <PrimaryButton
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs sm:text-sm font-black justify-center shadow-xs"
              >
                {loading
                  ? 'Authenticating...'
                  : mode === 'signin'
                  ? 'Sign In & Access My Fields'
                  : 'Create Restricted Account & Begin'}
              </PrimaryButton>

              {onContinueAsGuest && (
                <GhostButton
                  type="button"
                  onClick={onContinueAsGuest}
                  className="w-full py-2.5 text-xs font-bold justify-center"
                >
                  Continue in Local Mode (Offline Guest)
                </GhostButton>
              )}
            </div>
          </form>

          {!isFirebaseConfigured && (
            <div className="mt-4 p-3 bg-[#FFFDF5] border border-[#E8DAB2] rounded-xl text-[11px] text-[var(--ink)] font-medium">
              ℹ️ Firebase configuration not detected in environment. Local guest mode persists your data in browser storage.
            </div>
          )}
        </Card>

        {/* Footer Security Note */}
        <footer className="text-center text-[11px] text-[var(--muted)] font-medium py-1">
          🔒 Zero-Payment Security • Firebase Spark Architecture • App Check Ready
        </footer>
      </div>
    </main>
  );
}
