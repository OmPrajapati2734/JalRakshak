import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Badge,
  Card,
  LoadingSkeleton,
  AppShell,
  PageHeader,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  GhostButton
} from './ui/Primitives.jsx';
import { irrigationService } from '../services/irrigationService.js';

export default function AdvisoryView({
  fieldId,
  fieldName = 'Farm Plot',
  fieldData,
  assessment,
  initialLanguage = 'en',
  initialAdvisory = null,
  onBack,
  onLanguageChange
}) {
  const [currentLang, setCurrentLang] = useState(initialLanguage);
  // Initial state: single CTA "Explain today's decision" (active immediately if initialAdvisory supplied)
  const [hasRequested, setHasRequested] = useState(() => Boolean(initialAdvisory));
  // In-session cache for advisories by language code: { en: {...}, hi: {...}, gu: {...} }
  const [advisoryCache, setAdvisoryCache] = useState(() => {
    if (initialAdvisory && (initialAdvisory.language || initialLanguage)) {
      return { [initialAdvisory.language || initialLanguage]: initialAdvisory };
    }
    return {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Multilingual content and chrome labels
  const t = {
    en: {
      backBtn: 'Back to today’s decision',
      returnActionBtn: '← Back to today’s decision',
      title: 'JalRakshak AI Advisory',
      badge: 'Verified Agronomic Guidance',
      stressLabel: 'Stress Score',
      initialHeadline: 'Explain Today’s Irrigation Decision',
      initialSub: 'Generate a structured scientific breakdown of today’s recommendation based on displayed root-zone moisture, crop coefficient, and atmospheric demand.',
      explainTodayCta: 'Explain today’s decision',
      loadingHeadline: 'Resolving agronomic advisory...',
      loadingSubtitle: 'Analyzing root-zone depletion, crop coefficient, and weather conditions...',
      doThisNow: 'Do this now',
      doThisNowSub: 'Apply strictly in this sequence',
      whyThisHelps: 'Why this helps',
      whyThisHelpsSub: 'Agronomic rationale based on root-zone data',
      riskToAvoid: 'Risk to avoid',
      reviewAgain: 'Review again',
      trustNote: 'This guidance explains your displayed field assessment. It does not replace local agricultural advice.',
      retryBtn: 'Retry Load',
      factsTitle: 'Assessment Parameters',
      recWaterLabel: 'Recommended Target',
      timingWindowLabel: 'Best Time Window'
    },
    hi: {
      backBtn: 'आज के निर्णय पर वापस जाएं',
      returnActionBtn: '← आज के निर्णय पर वापस जाएं',
      title: 'जल रक्षक AI सलाह',
      badge: 'प्रमाणित कृषि वैज्ञानिक मार्गदर्शन',
      stressLabel: 'तनाव स्कोर',
      initialHeadline: 'आज की सिंचाई सिफारिश की व्याख्या',
      initialSub: 'दिखाई गई जड़-क्षेत्र नमी, फसल गुणांक और मौसम के आधार पर आज के सिंचाई निर्णय का संरचित वैज्ञानिक विश्लेषण प्राप्त करें।',
      explainTodayCta: 'आज के निर्णय का कारण समझें',
      loadingHeadline: 'कृषि सलाह तैयार की जा रही है...',
      loadingSubtitle: 'जड़ क्षेत्र की नमी की कमी, फसल गुणांक और मौसम का अध्ययन जारी है...',
      doThisNow: 'अभी यह करें',
      doThisNowSub: 'इन 3 कदमों का क्रमवार पालन करें',
      whyThisHelps: 'इससे क्या लाभ होगा',
      whyThisHelpsSub: 'जड़ क्षेत्र और मौसम पर आधारित वैज्ञानिक कारण',
      riskToAvoid: 'बचने योग्य जोखिम',
      reviewAgain: 'पुनः समीक्षा करें',
      trustNote: 'यह मार्गदर्शन आपके प्रदर्शित खेत आकलन की व्याख्या करता है। यह स्थानीय कृषि सलाह का स्थान नहीं लेता है।',
      retryBtn: 'पुनः प्रयास करें',
      factsTitle: 'आकलन पैरामीटर',
      recWaterLabel: 'अनुशंसित मात्रा',
      timingWindowLabel: 'सर्वोत्तम समय'
    },
    gu: {
      backBtn: 'આજના નિર્ણય પર પાછા જાઓ',
      returnActionBtn: '← આજના નિર્ણય પર પાછા જાઓ',
      title: 'જલ રક્ષક AI સલાહ',
      badge: 'પ્રમાણિત કૃષિ વૈજ્ઞાનિક માર્ગદર્શન',
      stressLabel: 'ખેંચ સ્કોર',
      initialHeadline: 'આજના પિયત નિર્ણયનો ખુલાસો',
      initialSub: 'દર્શાવેલ જમીન ભેજ, પાક ગુણાંક અને હવામાન આધારિત આજના પિયત આયોજનનું માળખાકીય વૈજ્ઞાનિક વિશ્લેષણ મેળવો.',
      explainTodayCta: 'આજના નિર્ણયનો ખુલાસો મેળવો',
      loadingHeadline: 'કૃષિ સલાહ તૈયાર થઈ રહી છે...',
      loadingSubtitle: 'મૂળિયા વિસ્તારમાં ભેજની ઘટ, પાક ગુણાંક અને હવામાનનો અભ્યાસ ચાલુ છે...',
      doThisNow: 'હમણાં આટલું કરો',
      doThisNowSub: 'આ 3 પગલાં ક્રમશઃ અનુસરો',
      whyThisHelps: 'આનાથી શું ફાયદો થશે',
      whyThisHelpsSub: 'મૂળ વિસ્તાર અને વાતાવરણ આધારિત વૈજ્ઞાનિક કારણો',
      riskToAvoid: 'નિવારવા જેવું જોખમ',
      reviewAgain: 'ફરી સમીક્ષા કરો',
      trustNote: 'આ માર્ગદર્શન તમારા દર્શાવેલ ખેતર મૂલ્યાંકનની સમજ આપે છે. તે સ્થાનિક કૃષિ સલાહનું સ્થાન લેતું નથી.',
      retryBtn: 'ફરી પ્રયાસ કરો',
      factsTitle: 'મૂલ્યાંકન પરિમાણો',
      recWaterLabel: 'ભલામણ કરેલ પાણી',
      timingWindowLabel: 'પિયતનો શ્રેષ્ઠ સમય'
    }
  }[currentLang] || {};

  // Load advisory from local service layer with in-session cache
  const loadAdvisory = useCallback(async (langToLoad) => {
    if (!fieldId) return;

    // Check in-session cache
    if (advisoryCache[langToLoad]) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await irrigationService.getAdvisory(fieldId, langToLoad);
      setAdvisoryCache((prev) => ({
        ...prev,
        [langToLoad]: data
      }));
    } catch (err) {
      setError(err.message || 'Unable to load agronomic advisory.');
    } finally {
      setLoading(false);
    }
  }, [fieldId, advisoryCache]);

  // When user clicks the initial single CTA
  const handleExplainToday = () => {
    if (loading) return;
    setHasRequested(true);
    loadAdvisory(currentLang);
  };

  // Handle language switching
  const handleSelectLanguage = (langCode) => {
    setCurrentLang(langCode);
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
    // If the user already requested an explanation, fetch or show cached for new language
    if (hasRequested) {
      loadAdvisory(langCode);
    }
  };

  // Assessment facts (consistent across languages without fabricated defaults)
  const isInsufficient = Boolean(!assessment || assessment.insufficient_data || assessment.water_stress_score === null);
  const score = isInsufficient ? null : assessment.water_stress_score;
  const risk = isInsufficient ? 'insufficient' : (assessment?.risk_level || 'low').toLowerCase();
  const riskBadgeVariant = isInsufficient ? 'neutral' : (risk === 'high' ? 'high' : risk === 'medium' ? 'medium' : 'low');
  const recMm = isInsufficient ? null : (assessment?.recommended_irrigation_mm ?? null);
  const bestTime = isInsufficient ? '—' : (assessment?.best_time || 'Early Morning / Evening');
  const cropName = (fieldData?.crop || 'Crop').toUpperCase();
  const areaAcres = fieldData?.area_acres || 1.0;
  const rain48h = assessment?.inputs?.rainfall_forecast_48h?.value !== null && assessment?.inputs?.rainfall_forecast_48h?.value !== undefined
    ? `${assessment.inputs.rainfall_forecast_48h.value} mm`
    : (assessment?.weather?.rainfall_forecast_48h_mm !== null && assessment?.weather?.rainfall_forecast_48h_mm !== undefined
        ? `${assessment.weather.rainfall_forecast_48h_mm} mm`
        : 'Unrecorded');

  const activeAdvisory = advisoryCache[currentLang];

  const headerComponent = (
    <PageHeader
      title={t.title}
      icon="💡"
      onBack={onBack}
      backLabel={t.backBtn}
      rightActions={
        <nav aria-label="Language" className="flex items-center gap-1">
          {[
            { code: 'en', label: 'EN' },
            { code: 'hi', label: 'हिं' },
            { code: 'gu', label: 'ગુજ' }
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              aria-pressed={currentLang === lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              style={{ minHeight: '44px', minWidth: '44px' }}
              className={`text-xs font-bold rounded-lg border flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-[var(--forest)] ${
                currentLang === lang.code
                  ? 'bg-[var(--forest)] text-[var(--surface)] border-[var(--forest)] shadow-xs'
                  : 'bg-[var(--canvas)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--ink)]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </nav>
      }
    />
  );

  return (
    <AppShell header={headerComponent}>
      <div className="space-y-4 pb-6">

        {/* 1. Context Strip: Field & Displayed Assessment Facts */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🌾</span>
            <div>
              <span className="font-extrabold text-[var(--ink)] block leading-tight">
                {fieldName}
              </span>
              <span className="text-[10px] text-[var(--muted)] font-medium">
                {cropName} • {areaAcres} Acres
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-bold text-[var(--muted)]">
              {t.stressLabel}: <strong className="text-[var(--ink)]">{score !== null ? `${score}/100` : '—'}</strong>
            </span>
            <Badge variant={riskBadgeVariant} style={{ fontSize: '10px', padding: '2px 8px' }}>
              {risk.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* 2. INITIAL STATE: SINGLE PRIMARY CTA */}
        {!hasRequested && !loading && (
          <Card
            as="section"
            aria-label="Initial Advisory State"
            style={{
              padding: '24px 20px',
              border: '1.5px solid var(--forest)',
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            <div className="text-center max-w-md mx-auto space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EBF4ED] text-[var(--forest)] text-2xl mb-1" aria-hidden="true">
                💡
              </div>

              <h2 className="text-base sm:text-lg font-black text-[var(--ink)] leading-snug tracking-tight">
                {t.initialHeadline}
              </h2>

              <p className="text-xs text-[var(--muted)] font-medium leading-relaxed">
                {t.initialSub}
              </p>

              {/* Verified assessment facts summary card */}
              <div className="bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-3 my-3 text-left space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-wider block mb-1">
                  📋 {t.factsTitle}
                </span>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--muted)] font-semibold">{t.recWaterLabel}:</span>
                  <span className="font-black text-[var(--forest)]">{recMm !== null ? `${recMm} mm` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--muted)] font-semibold">{t.timingWindowLabel}:</span>
                  <span className="font-extrabold text-[var(--ink)]">{bestTime}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--muted)] font-semibold">Rainfall (48h):</span>
                  <span className="font-extrabold text-[var(--ink)]">{rain48h}</span>
                </div>
              </div>

              {/* Single CTA: "Explain today's decision" */}
              <div className="pt-2 space-y-2">
                <PrimaryButton
                  onClick={handleExplainToday}
                  disabled={loading}
                  className="w-full py-3.5 text-sm font-extrabold justify-center shadow-xs"
                >
                  {loading ? `⏳ ${t.loadingHeadline}` : `💡 ${t.explainTodayCta}`}
                </PrimaryButton>

                <GhostButton
                  onClick={onBack}
                  className="w-full py-2.5 text-xs font-bold justify-center"
                >
                  {t.returnActionBtn}
                </GhostButton>
              </div>
            </div>
          </Card>
        )}

        {/* 3. CALM LOADING STATE (Zero theatrics, no avatar, no fake chat bubbles) */}
        {loading && (
          <div role="status" aria-live="polite" className="space-y-4">
            <Card style={{ padding: '28px 20px', textAlign: 'center' }}>
              <div className="inline-block w-8 h-8 border-3 border-[var(--forest)] border-t-transparent rounded-full animate-spin mb-3" aria-hidden="true" />
              <h2 className="text-sm font-black text-[var(--forest)] mb-1">
                {t.loadingHeadline}
              </h2>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
                {t.loadingSubtitle}
              </p>
            </Card>

            <LoadingSkeleton height="80px" borderRadius="16px" />
            <LoadingSkeleton height="160px" borderRadius="16px" />
            <LoadingSkeleton height="160px" borderRadius="16px" />
            <LoadingSkeleton height="90px" borderRadius="16px" />
          </div>
        )}

        {/* 4. ERROR STATE */}
        {!loading && error && (
          <Card style={{ border: '2px solid var(--risk)', padding: '20px', textAlign: 'center' }}>
            <div className="text-3xl mb-2" aria-hidden="true">⚠️</div>
            <h2 className="text-sm font-bold text-[var(--risk)] mb-1">
              Failed to load advisory
            </h2>
            <p className="text-xs text-[var(--muted)] mb-3">{error}</p>
            <PrimaryButton onClick={() => loadAdvisory(currentLang)}>
              {t.retryBtn}
            </PrimaryButton>
          </Card>
        )}

        {/* 5. STRUCTURED ADVISORY READING LAYOUT (When resolved) */}
        {!loading && !error && activeAdvisory && hasRequested && (
          <article aria-label="Structured Agronomic Guidance" className="space-y-4">

            {/* SECTION 5A: HEADLINE */}
            <Card
              as="section"
              aria-label="Advisory Headline"
              style={{
                border: '1.5px solid var(--forest)',
                backgroundColor: 'var(--surface)',
                padding: '20px'
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-[var(--forest)] tracking-wider flex items-center gap-1.5">
                    <span aria-hidden="true">✨</span>
                    <span>{t.badge}</span>
                  </span>
                  {activeAdvisory.isCached && (
                    <span className="bg-[var(--canvas)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[9px] font-black text-[var(--forest)] uppercase tracking-wider">
                      Cached
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeAdvisory.assessment_timestamp && (
                    <span className="text-[10px] text-[var(--muted)] font-medium">
                      🕒 {new Date(activeAdvisory.assessment_timestamp).toLocaleDateString(currentLang === 'hi' ? 'hi-IN' : currentLang === 'gu' ? 'gu-IN' : 'en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-[var(--muted)] uppercase">
                    {currentLang.toUpperCase()}
                  </span>
                </div>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[var(--ink)] leading-snug tracking-tight break-words">
                {activeAdvisory.headline}
              </h2>
            </Card>

            {/* SECTION 5B: “DO THIS NOW” (Exactly 3 actions) */}
            <Card as="section" aria-label={t.doThisNow} style={{ padding: '20px' }}>
              <div className="mb-3">
                <h3 className="text-xs sm:text-sm font-black text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm" aria-hidden="true">⚡</span>
                  <span>{t.doThisNow}</span>
                </h3>
                <p className="text-[11px] text-[var(--muted)] font-medium mt-0.5">
                  {t.doThisNowSub}
                </p>
              </div>

              <ol className="space-y-2.5">
                {(activeAdvisory.action_now || []).slice(0, 3).map((action, idx) => (
                  <li
                    key={idx}
                    className="bg-[var(--canvas)] border border-[var(--border)] p-3 rounded-xl flex items-start gap-3 text-xs text-[var(--ink)] font-medium leading-relaxed break-words"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[11px] font-black flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{action}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* SECTION 5C: “WHY THIS HELPS” (Exactly 3 points) */}
            <Card as="section" aria-label={t.whyThisHelps} style={{ padding: '20px' }}>
              <div className="mb-3">
                <h3 className="text-xs sm:text-sm font-black text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm" aria-hidden="true">🌱</span>
                  <span>{t.whyThisHelps}</span>
                </h3>
                <p className="text-[11px] text-[var(--muted)] font-medium mt-0.5">
                  {t.whyThisHelpsSub}
                </p>
              </div>

              <ul className="space-y-2.5">
                {(activeAdvisory.why || []).slice(0, 3).map((reason, idx) => (
                  <li
                    key={idx}
                    className="bg-[var(--canvas)] border border-[var(--border)] p-3 rounded-xl flex items-start gap-3 text-xs text-[var(--ink)] font-medium leading-relaxed break-words"
                  >
                    <span className="shrink-0 text-[var(--forest)] font-black text-sm leading-none mt-0.5" aria-hidden="true">
                      •
                    </span>
                    <span className="flex-1 text-[var(--muted)]">{reason}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* SECTION 5D: “RISK TO AVOID” (One concise warning) */}
            {activeAdvisory.risk_warning && (
              <Card
                as="section"
                aria-label={t.riskToAvoid}
                style={{
                  borderLeft: '4px solid var(--risk)',
                  backgroundColor: '#FDF5F5',
                  padding: '18px'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">⚠️</span>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--risk)]">
                    {t.riskToAvoid}
                  </h3>
                </div>
                <p className="mt-2 text-xs font-bold text-[var(--ink)] leading-relaxed break-words">
                  {activeAdvisory.risk_warning}
                </p>
              </Card>
            )}

            {/* SECTION 5E: “REVIEW AGAIN” (One clear time instruction) */}
            {activeAdvisory.next_review && (
              <Card
                as="section"
                aria-label={t.reviewAgain}
                style={{
                  borderLeft: '4px solid var(--forest)',
                  backgroundColor: '#F4F8F5',
                  padding: '18px'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">⏱️</span>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--forest)]">
                    {t.reviewAgain}
                  </h3>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--ink)] leading-relaxed break-words">
                  {activeAdvisory.next_review}
                </p>
              </Card>
            )}

            {/* SECTION 5F: TRUST NOTE (Required exact text) */}
            <div className="py-2 px-1 text-center">
              <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-2xl text-[11px] text-[var(--muted)] font-medium max-w-md mx-auto leading-relaxed">
                <span className="text-sm shrink-0" aria-hidden="true">🛡️</span>
                <span>{t.trustNote}</span>
              </div>
            </div>

            {/* SECTION 5G: RETURN ACTION: “Back to today’s decision” */}
            <div className="pt-2">
              <SecondaryButton
                onClick={onBack}
                className="w-full py-3.5 text-xs sm:text-sm font-bold justify-center shadow-xs"
              >
                {t.returnActionBtn}
              </SecondaryButton>
            </div>

          </article>
        )}

      </div>
    </AppShell>
  );
}
