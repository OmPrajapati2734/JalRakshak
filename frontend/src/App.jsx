import React, { useState, useEffect, useCallback } from 'react';
import FieldDashboard from './components/FieldDashboard.jsx';
import AdvisoryView from './components/AdvisoryView.jsx';
import AlertsView from './components/AlertsView.jsx';
import FieldHealthView from './components/FieldHealthView.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import JudgeAuthView from './components/JudgeAuthView.jsx';
import { Modal, GhostButton } from './components/ui/Primitives.jsx';
import { irrigationService } from './services/irrigationService.js';
import { authService } from './services/authService.js';

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return irrigationService.isOnboarded();
  });

  const [availableFields, setAvailableFields] = useState([]);
  const [activeFieldId, setActiveFieldId] = useState('');
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jalrakshak_language');
      if (saved && ['en', 'hi', 'gu'].includes(saved)) {
        return saved;
      }
    }
    return 'en';
  });
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'advisory'

  const [fieldData, setFieldData] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [freshnessTimestamp, setFreshnessTimestamp] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [advisory, setAdvisory] = useState(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryError, setAdvisoryError] = useState(null);
  const [showAdvisory, setShowAdvisory] = useState(false);

  // Firebase Auth state & Judge experience
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isGuest, setIsGuest] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Initialize fields and profile from irrigationService
  const initFields = useCallback(async () => {
    try {
      const [fields, userProfile] = await Promise.all([
        irrigationService.getFields(),
        irrigationService.getProfile()
      ]);
      setAvailableFields(fields);
      setProfile(userProfile);
      if (userProfile?.preferredLanguage) {
        setLanguage(userProfile.preferredLanguage);
      }
      if (fields.length > 0) {
        setActiveFieldId((prev) => prev || fields[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load fields.');
    }
  }, []);

  useEffect(() => {
    if (isOnboarded) {
      initFields();
    }
  }, [isOnboarded, initFields]);

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      if (currentUser && isOnboarded) {
        initFields();
      }
    });
    return () => unsubscribe();
  }, [isOnboarded, initFields]);

  const handleAuthSignIn = async (email, password) => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await authService.signIn(email, password);
      await initFields();
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAuthSignUp = async (email, password) => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await authService.signUp(email, password);
      await initFields();
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAuthSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Fetch field and assessment data when activeFieldId changes
  const loadActiveFieldData = useCallback(async (fieldId) => {
    if (!fieldId) return;

    setLoading(true);
    setError(null);
    setAdvisory(null);
    setShowAdvisory(false);
    setAdvisoryError(null);

    try {
      const [field, assess, fieldAlerts] = await Promise.all([
        irrigationService.getField(fieldId),
        irrigationService.getCurrentAssessment(fieldId),
        irrigationService.getAlerts()
      ]);

      setFieldData(field);
      setAssessment(assess);
      // Filter alerts relevant to this field
      setAlerts(fieldAlerts.filter((a) => a.fieldId === fieldId));
      setFreshnessTimestamp(assess.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Error loading field assessment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOnboarded && activeFieldId) {
      loadActiveFieldData(activeFieldId);
    }
  }, [isOnboarded, activeFieldId, loadActiveFieldData]);

  // Handle onboarding completion
  const handleOnboardingComplete = async ({ language: chosenLang, field }) => {
    try {
      setLoading(true);
      setLanguage(chosenLang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('jalrakshak_language', chosenLang);
      }

      // Persist profile language
      await irrigationService.updateProfile({ preferredLanguage: chosenLang });

      // Create new field in local service
      const createdField = await irrigationService.createField(field);

      irrigationService.setOnboarded(true);
      setIsOnboarded(true);

      const allFields = await irrigationService.getFields();
      setAvailableFields(allFields);
      setActiveFieldId(createdField.id);
    } catch (err) {
      setError(err.message || 'Failed to save onboarding data.');
      setIsOnboarded(true);
    } finally {
      setLoading(false);
    }
  };

  // On-demand AI Advisory generation
  const handleAskAI = async () => {
    if (!assessment || !activeFieldId || advisoryLoading) return;

    setAdvisoryLoading(true);
    setAdvisoryError(null);

    try {
      const adv = await irrigationService.getAdvisory(activeFieldId, language);
      setAdvisory(adv);
      setShowAdvisory(true);
    } catch (err) {
      setAdvisoryError(err.message || 'Unable to load agronomic explanation.');
    } finally {
      setAdvisoryLoading(false);
    }
  };

  // Language switch handler (dynamically updates active advisory if open)
  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalrakshak_language', newLang);
    }
    await irrigationService.updateProfile({ preferredLanguage: newLang });

    if (showAdvisory && activeFieldId) {
      setAdvisoryLoading(true);
      try {
        const adv = await irrigationService.getAdvisory(activeFieldId, newLang);
        setAdvisory(adv);
      } catch (err) {
        setAdvisoryError(err.message);
      } finally {
        setAdvisoryLoading(false);
      }
    }
  };

  // Mark irrigation complete handler
  const handleMarkIrrigationComplete = async (explicitBaselineMm = null) => {
    if (!activeFieldId) return;
    try {
      setLoading(true);
      const updated = await irrigationService.markIrrigationComplete(activeFieldId, explicitBaselineMm);
      setAssessment(updated);
      const allAlerts = await irrigationService.getAlerts();
      setAlerts(allAlerts.filter((a) => a.fieldId === activeFieldId));
      setFreshnessTimestamp(updated.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Failed to record irrigation completion.');
    } finally {
      setLoading(false);
    }
  };

  // Mark alert as read handler
  const handleMarkAlertRead = async (alertId) => {
    try {
      await irrigationService.markAlertRead(alertId);
      const allAlerts = await irrigationService.getAlerts();
      setAlerts(allAlerts.filter((a) => a.fieldId === activeFieldId));
    } catch (err) {
      console.error('Failed to mark alert read:', err);
    }
  };

  // Resolve alert handler
  const handleResolveAlert = async (alertId) => {
    try {
      await irrigationService.resolveAlert(alertId);
      const allAlerts = await irrigationService.getAlerts();
      setAlerts(allAlerts.filter((a) => a.fieldId === activeFieldId));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Reset irrigation state for demo re-testing
  const handleResetDemo = async () => {
    if (!activeFieldId) return;
    try {
      setLoading(true);
      const reset = await irrigationService.resetIrrigationDemo(activeFieldId);
      setAssessment(reset);
      setFreshnessTimestamp(reset.updatedAt || new Date().toISOString());
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Unauthenticated Judge Experience: Full login screen with visible How-to-Test guide
  if (!user && !isGuest && authService.isConfigured()) {
    return (
      <JudgeAuthView
        onSignIn={handleAuthSignIn}
        onSignUp={handleAuthSignUp}
        onContinueAsGuest={() => setIsGuest(true)}
        loading={authSubmitting}
        error={authError}
        isFirebaseConfigured={authService.isConfigured()}
      />
    );
  }

  if (!isOnboarded || (!loading && availableFields.length === 0)) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Focused AI Advisory View
  if (currentView === 'advisory') {
    return (
      <AdvisoryView
        fieldId={activeFieldId}
        fieldName={fieldData?.name || 'Farm Plot'}
        fieldData={fieldData}
        assessment={assessment}
        initialLanguage={language}
        initialAdvisory={advisory}
        onBack={() => setCurrentView('dashboard')}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  // Focused Alerts View
  if (currentView === 'alerts') {
    return (
      <AlertsView
        alerts={alerts}
        fieldId={activeFieldId}
        fieldName={fieldData?.name || 'Farm Plot'}
        language={language}
        onBack={() => setCurrentView('dashboard')}
        onViewPlan={() => setCurrentView('dashboard')}
        onMarkRead={handleMarkAlertRead}
        onResolve={handleResolveAlert}
      />
    );
  }

  // Focused Field Health & History View
  if (currentView === 'health') {
    return (
      <FieldHealthView
        fieldId={activeFieldId}
        fieldName={fieldData?.name || 'Farm Plot'}
        fieldData={fieldData}
        assessment={assessment}
        language={language}
        onBack={() => setCurrentView('dashboard')}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <div>
      {/* Top Banner with Field status & Auth Controls */}
      <div className="bg-[#EBF4ED] border-b border-[#E1E7DE] px-4 py-2 text-[11px] text-[#23613E] flex items-center justify-between max-w-xl mx-auto font-medium flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>🌱 {user ? `Active (${user.email}) • Restricted User` : 'Guest Mode (Local Storage)'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuideModal(true)}
            style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
            className="text-[#23613E] hover:text-[#17432b] underline font-bold cursor-pointer"
          >
            📋 How to Test
          </button>
          {user ? (
            <button
              onClick={handleAuthSignOut}
              style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              className="text-[#23613E] hover:text-[#17432b] underline font-bold cursor-pointer"
            >
              Sign Out
            </button>
          ) : authService.isConfigured() ? (
            <button
              onClick={() => setIsGuest(false)}
              style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              className="text-[#23613E] hover:text-[#17432b] underline font-bold cursor-pointer"
            >
              Sign In
            </button>
          ) : null}
          <button
            onClick={() => {
              irrigationService.resetOnboarding();
              setIsOnboarded(false);
            }}
            style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
            className="underline font-bold text-[#23613E] hover:text-[#17432b] focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded cursor-pointer"
          >
            + Add Field
          </button>
        </div>
      </div>

      {/* Judge How-to-Test Guidance Modal */}
      <Modal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="Judge Evaluation & Testing Guide"
        icon="📋"
        maxWidth="max-w-md"
        ariaLabelledBy="guide-modal-title"
        footer={
          <GhostButton onClick={() => setShowGuideModal(false)}>
            Close Guide
          </GhostButton>
        }
      >
        <div className="space-y-2.5 text-xs text-[var(--ink)]">
          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">1. User Authentication</span>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              {user ? `Authenticated as ${user.email}.` : 'Running in local guest mode.'}
              {' '}Firestore security rules enforce strict user isolation: all records require <code className="bg-white px-1 py-0.5 rounded border border-[var(--border)]">request.auth.uid</code> ownership matching and immutable ownership on updates.
            </p>
          </div>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">2. Field Registration (Clean Slate)</span>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              No fabricated farm measurements are preloaded as real data. Register a plot with crop, sowing date, and plot acreage to establish user-owned Firestore documents.
            </p>
          </div>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">3. Deterministic Assessment & AI Advisory</span>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              Water stress calculations are deterministic (FAO-56). Tap <em>"Explain with AI"</em> to invoke Firebase AI Logic (<code className="bg-white px-1 py-0.5 rounded border border-[var(--border)]">gemini-3.8-flash</code> on Spark free tier) to generate grounded advice. Test language toggles (EN, HI, GU).
            </p>
          </div>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">4. What-If Simulator & Irrigation Logging</span>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              Test delay projections in the what-if simulator. When logging an irrigation event, provide your baseline depth; duplicate logging for the same assessment is prevented.
            </p>
          </div>
        </div>
      </Modal>

      <FieldDashboard
        fieldData={fieldData}
        assessment={assessment}
        advisory={advisory}
        alerts={alerts}
        profile={profile}
        activeFieldId={activeFieldId}
        onFieldChange={setActiveFieldId}
        availableFields={availableFields}
        language={language}
        onLanguageChange={handleLanguageChange}
        loading={loading}
        error={error}
        onRetry={() => loadActiveFieldData(activeFieldId)}
        advisoryLoading={advisoryLoading}
        advisoryError={advisoryError}
        onAskAI={handleAskAI}
        onExplainWithAI={() => setCurrentView('advisory')}
        onViewAlerts={() => setCurrentView('alerts')}
        onViewFieldHealth={() => setCurrentView('health')}
        showAdvisory={showAdvisory}
        onToggleAdvisory={() => setShowAdvisory(!showAdvisory)}
        onMarkIrrigationComplete={handleMarkIrrigationComplete}
        onResolveAlert={handleResolveAlert}
        onResetDemo={handleResetDemo}
        freshnessTimestamp={freshnessTimestamp}
      />
    </div>
  );
}
