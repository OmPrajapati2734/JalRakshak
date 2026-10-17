import React, { useState } from 'react';
import { Card, Badge, RiskBadge, PrimaryButton, SecondaryButton, GhostButton } from './ui/Primitives.jsx';
import { simulateWaitingImpact } from '../utils/simulation.js';

export default function IrrigationSimulator({
  assessment,
  fieldData,
  language = 'en',
  onClose
}) {
  const [waitHours, setWaitHours] = useState(24);

  // Extract actual assessment inputs without seed fallbacks
  const currentScore = assessment?.water_stress_score;
  const currentRisk = (assessment?.risk_level || 'unknown').toLowerCase();
  const recMm = assessment?.recommended_irrigation_mm;
  const forecastRainfallMm = assessment?.forecast_rainfall_48h_mm ?? assessment?.weather?.rainfall_forecast_48h_mm ?? 0.0;
  const cropStage = assessment?.crop_stage || 'unknown';
  const timestamp = assessment?.updatedAt || assessment?.recordedAt || null;
  const insufficientData = Boolean(assessment?.insufficient_data || currentScore === null || currentScore === undefined);

  // Run prototype simulation
  const result = simulateWaitingImpact({
    score: currentScore,
    riskLevel: currentRisk,
    recMm,
    forecastRainfallMm,
    cropStage,
    timestamp,
    waitHours,
    insufficientData
  });

  const { waterToday, waitSelected, inputs } = result;

  // Multilingual labels
  const t = {
    en: {
      simTitle: 'What if I wait?',
      simSubtitle: 'Compare today’s recommended plan with delaying irrigation',
      btn24h: 'Wait 24 Hours',
      btn48h: 'Wait 48 Hours',
      recommendedBadge: 'RECOMMENDED PLAN',
      delayedBadge: 'DELAYED IRRIGATION',
      waterTodayTitle: 'Water Today',
      waitOptionTitle: `Wait ${waitHours} Hours`,
      stressScoreLabel: 'Projected Stress Score',
      riskLevelLabel: 'Risk Level',
      expectedConsequence: 'Expected Consequence',
      disclaimer: 'Estimated from your current assessment and forecast inputs. Actual soil moisture progression may vary with local conditions.',
      inputsUsedTitle: 'Inputs Used in Simulation',
      currentStress: 'Current Stress',
      rainfallForecast: '48h Rain Forecast',
      cropStageLabel: 'Crop Stage',
      backToPlanBtn: '← Back to recommended plan',
      closeBtn: 'Close Simulator'
    },
    hi: {
      simTitle: 'अगर मैं पानी न दूं तो क्या होगा?',
      simSubtitle: 'आज की अनुशंसित योजना की तुलना सिंचाई टालने से करें',
      btn24h: '24 घंटे रुकें',
      btn48h: '48 घंटे रुकें',
      recommendedBadge: 'अनुशंसित योजना',
      delayedBadge: 'देरी से सिंचाई',
      waterTodayTitle: 'आज पानी दें',
      waitOptionTitle: `${waitHours} घंटे रुकें`,
      stressScoreLabel: 'अनुमानित तनाव स्कोर',
      riskLevelLabel: 'जोखिम स्तर',
      expectedConsequence: 'संभावित परिणाम',
      disclaimer: 'आपके वर्तमान खेत आकलन और मौसम पूर्वानुमान पर आधारित अनुमान। स्थानीय परिस्थितियों के अनुसार वास्तविक नमी भिन्न हो सकती है।',
      inputsUsedTitle: 'सिमुलेशन में प्रयुक्त पैरामीटर',
      currentStress: 'वर्तमान तनाव',
      rainfallForecast: '48 घंटे वर्षा पूर्वानुमान',
      cropStageLabel: 'फसल अवस्था',
      backToPlanBtn: '← अनुशंसित योजना पर वापस जाएं',
      closeBtn: 'सिम्युलेटर बंद करें'
    },
    gu: {
      simTitle: 'જો હું પિયત મોડું કરું તો શું થાય?',
      simSubtitle: 'આજની ભલામણ કરેલ યોજનાની સરખામણી પિયત વિલંબ સાથે કરો',
      btn24h: '24 કલાક વિલંબ',
      btn48h: '48 કલાક વિલંબ',
      recommendedBadge: 'ભલામણ કરેલ આયોજન',
      delayedBadge: 'વિલંબિત પિયત',
      waterTodayTitle: 'આજે પિયત આપો',
      waitOptionTitle: `${waitHours} કલાક વિલંબ`,
      stressScoreLabel: 'અંદાજિત ખેંચ સ્કોર',
      riskLevelLabel: 'જોખમ સ્તર',
      expectedConsequence: 'સંભવિત પરિણામ',
      disclaimer: 'તમારા વર્તમાન ખેતર મૂલ્યાંકન અને હવામાન આગાહી પર આધારિત અંદાજ. સ્થાનિક પરિસ્થિતિ મુજબ વાસ્તવિક ભેજ બદલાઈ શકે છે.',
      inputsUsedTitle: 'ગણતરીમાં વપરાયેલ વિગતો',
      currentStress: 'હાલનો સ્કોર',
      rainfallForecast: '48 કલાક વરસાદ આગાહી',
      cropStageLabel: 'પાકનો તબક્કો',
      backToPlanBtn: '← ભલામણ કરેલ આયોજન પર પાછા જાઓ',
      closeBtn: 'સિમ્યુલેટર બંધ કરો'
    }
  }[language] || {};

  const getRiskColor = (risk) => {
    if (risk === 'high') return 'var(--risk)';
    if (risk === 'medium') return 'var(--sun)';
    return 'var(--forest)';
  };

  const getRiskBg = (risk) => {
    if (risk === 'high') return '#FDF5F5';
    if (risk === 'medium') return '#FFFDF5';
    return '#F4F8F5';
  };

  if (result.insufficientData) {
    return (
      <Card
        as="section"
        aria-label="What if I wait irrigation simulator"
        style={{
          border: '1.5px solid var(--border)',
          backgroundColor: 'var(--surface)',
          padding: '20px',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">⏱️</span>
              <h2 className="text-sm sm:text-base font-black text-[var(--ink)] tracking-tight">
                {t.simTitle}
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[var(--canvas)] border border-[var(--border)] text-[var(--muted)] rounded-md">
                Prototype Heuristic
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
              {t.simSubtitle}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeBtn}
              style={{ minWidth: '44px', minHeight: '44px' }}
              className="flex items-center justify-center text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--forest)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <div className="bg-[#FFFDF5] border border-[#E8DAB2] rounded-xl p-4 my-4 text-center space-y-2">
          <span className="text-2xl" aria-hidden="true">ℹ️</span>
          <p className="text-xs font-bold text-[var(--ink)]">
            {result.disabledReason}
          </p>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            To prevent fabricated recommendations, delay simulation is disabled until verified soil moisture observations and weather forecasts are recorded.
          </p>
        </div>
        <PrimaryButton onClick={onClose} className="w-full py-2.5 text-xs font-bold justify-center">
          {t.backToPlanBtn}
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <Card
      as="section"
      aria-label="What if I wait irrigation simulator"
      style={{
        border: '2px solid var(--forest)',
        backgroundColor: 'var(--surface)',
        padding: '20px',
        boxShadow: 'var(--shadow-soft)'
      }}
    >
      {/* 1. Header with title and quick exit action */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">⏱️</span>
            <h2 className="text-sm sm:text-base font-black text-[var(--ink)] tracking-tight">
              {t.simTitle}
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#EBF4ED] text-[var(--forest)] border border-[var(--leaf)]/40 rounded-md">
              Prototype Heuristic
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
            {t.simSubtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            style={{ minWidth: '44px', minHeight: '44px' }}
            className="flex items-center justify-center text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--forest)] cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Simulation Inputs Summary Strip */}
      <div className="bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 my-3 text-[11px] flex items-center justify-between flex-wrap gap-2">
        <span className="font-extrabold text-[var(--ink)]">
          📊 {t.currentStress}: <strong className="text-[var(--forest)]">{inputs.score !== null ? `${inputs.score}/100` : 'Unobserved'}</strong>
        </span>
        <span className="font-semibold text-[var(--muted)]">
          🌧️ {t.rainfallForecast}: <strong className="text-[var(--ink)]">{inputs.forecastRainfallMm} mm</strong>
        </span>
        <span className="font-semibold text-[var(--muted)] capitalize">
          🌱 {t.cropStageLabel}: <strong className="text-[var(--ink)]">{inputs.cropStage.replace('_', ' ')}</strong>
        </span>
      </div>

      {/* 3. Duration Selector (24 hours vs 48 hours) */}
      <div className="my-3">
        <div
          role="group"
          aria-label="Simulation wait duration"
          className="grid grid-cols-2 gap-2 bg-[var(--canvas)] p-1 rounded-xl border border-[var(--border)]"
        >
          <button
            type="button"
            aria-pressed={waitHours === 24}
            onClick={() => setWaitHours(24)}
            style={{ minHeight: '44px' }}
            className={`text-xs font-extrabold rounded-lg flex items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--forest)] ${
              waitHours === 24
                ? 'bg-[var(--forest)] text-[var(--surface)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)] bg-transparent'
            }`}
          >
            ⏱️ {t.btn24h}
          </button>

          <button
            type="button"
            aria-pressed={waitHours === 48}
            onClick={() => setWaitHours(48)}
            style={{ minHeight: '44px' }}
            className={`text-xs font-extrabold rounded-lg flex items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--forest)] ${
              waitHours === 48
                ? 'bg-[var(--forest)] text-[var(--surface)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)] bg-transparent'
            }`}
          >
            ⏱️ {t.btn48h}
          </button>
        </div>
      </div>

      {/* 4. Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        {/* OPTION A: WATER TODAY (VISUALLY PRIMARY - RECOMMENDED) */}
        <div
          className="rounded-2xl p-4 flex flex-col justify-between transition-all"
          style={{
            border: '2.5px solid var(--forest)',
            backgroundColor: '#F4F8F5',
            boxShadow: '0 4px 14px rgba(35, 97, 62, 0.12)'
          }}
        >
          <div>
            {/* Header / Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                style={{
                  backgroundColor: 'var(--forest)',
                  color: 'var(--surface)',
                  fontSize: '10px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                ★ {t.recommendedBadge}
              </span>
              <RiskBadge level="low" label="Optimal" />
            </div>

            <h3 className="text-sm font-black text-[var(--forest)] mt-1">
              💧 {t.waterTodayTitle}
            </h3>
            <p className="text-xs font-bold text-[var(--ink)] mt-0.5">
              {waterToday.actionText}
            </p>

            {/* Score Metric */}
            <div className="my-3 py-2 px-3 bg-white/80 rounded-xl border border-[var(--border)] flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {t.stressScoreLabel}
                </span>
                <span className="text-2xl font-black text-[var(--forest)] leading-none mt-0.5 block">
                  {waterToday.score}
                  <span className="text-xs text-[var(--muted)] font-normal ml-1">/ 100</span>
                </span>
              </div>
              <span className="text-xs font-extrabold text-[var(--forest)] bg-[#EBF4ED] px-2 py-0.5 rounded-md">
                -{(currentScore - waterToday.score)} Stress
              </span>
            </div>

            {/* Consequence */}
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-1">
                {t.expectedConsequence}:
              </span>
              <p className="text-xs font-medium text-[var(--ink)] leading-relaxed break-words">
                {waterToday.consequence[language] || waterToday.consequence.en}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[var(--leaf)]/30 flex items-center gap-1.5 text-[11px] font-bold text-[var(--forest)]">
            <span>✓</span>
            <span>Recommended to mitigate estimated evaporative deficit</span>
          </div>
        </div>

        {/* OPTION B: WAIT SELECTED DURATION */}
        <div
          className="rounded-2xl p-4 flex flex-col justify-between transition-all"
          style={{
            border: `2px solid ${getRiskColor(waitSelected.riskLevel)}`,
            backgroundColor: getRiskBg(waitSelected.riskLevel),
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div>
            {/* Header / Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                style={{
                  backgroundColor: 'var(--canvas)',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {t.delayedBadge}
              </span>
              <RiskBadge
                level={waitSelected.riskLevel}
                label={waitSelected.riskLevel === 'high' ? 'High Risk' : waitSelected.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
              />
            </div>

            <h3 className="text-sm font-black text-[var(--ink)] mt-1">
              ⏳ {t.waitOptionTitle}
            </h3>
            <p className="text-xs font-bold text-[var(--muted)] mt-0.5">
              {waitSelected.actionText}
            </p>

            {/* Score Metric */}
            <div className="my-3 py-2 px-3 bg-white/80 rounded-xl border border-[var(--border)] flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {t.stressScoreLabel}
                </span>
                <span
                  className="text-2xl font-black leading-none mt-0.5 block"
                  style={{ color: getRiskColor(waitSelected.riskLevel) }}
                >
                  {waitSelected.score}
                  <span className="text-xs text-[var(--muted)] font-normal ml-1">/ 100</span>
                </span>
              </div>
              <span
                className="text-xs font-extrabold px-2 py-0.5 rounded-md"
                style={{
                  color: getRiskColor(waitSelected.riskLevel),
                  backgroundColor: waitSelected.stressDelta > 0 ? '#FCECEB' : '#EBF4ED'
                }}
              >
                {waitSelected.stressDelta > 0 ? `+${waitSelected.stressDelta}` : waitSelected.stressDelta} Stress
              </span>
            </div>

            {/* Consequence */}
            <div>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-1">
                {t.expectedConsequence}:
              </span>
              <p className="text-xs font-medium text-[var(--ink)] leading-relaxed break-words">
                {waitSelected.consequence[language] || waitSelected.consequence.en}
              </p>
            </div>
          </div>

          <div
            className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center gap-1.5 text-[11px] font-bold"
            style={{ color: getRiskColor(waitSelected.riskLevel) }}
          >
            <span>⚠️</span>
            <span>Estimated moisture deficit risk if delayed</span>
          </div>
        </div>
      </div>

      {/* 5. Visible Agronomic Disclaimer */}
      <div className="bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-3 my-2 text-center">
        <p className="text-[11px] text-[var(--muted)] font-medium leading-relaxed">
          ℹ️ {t.disclaimer}
        </p>
      </div>

      {/* 6. Clear Exit Action back to Recommended Plan */}
      <div className="mt-4 pt-2">
        <PrimaryButton
          onClick={onClose}
          className="w-full py-3 text-xs sm:text-sm font-bold justify-center shadow-xs"
        >
          {t.backToPlanBtn}
        </PrimaryButton>
      </div>
    </Card>
  );
}
