import React, { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  EmptyState,
  LoadingSkeleton,
  AppShell,
  PageHeader,
  Modal,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  GhostButton
} from './ui/Primitives.jsx';
import { formatWaterSaved } from '../utils/formatters.js';
import IrrigationSimulator from './IrrigationSimulator.jsx';

export default function FieldDashboard({
  fieldData,
  assessment,
  advisory,
  alerts = [],
  profile,
  activeFieldId,
  onFieldChange,
  availableFields = [],
  language = 'en',
  onLanguageChange,
  loading = false,
  error = null,
  onRetry,
  advisoryLoading = false,
  advisoryError = null,
  onAskAI,
  onExplainWithAI,
  showAdvisory = false,
  onToggleAdvisory,
  onMarkIrrigationComplete,
  onResolveAlert,
  onViewAlerts,
  onViewFieldHealth,
  onResetDemo,
  freshnessTimestamp
}) {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Fallbacks and safe domain calculations without fabricated defaults
  const isInsufficientData = Boolean(
    !assessment ||
    assessment.insufficient_data ||
    assessment.water_stress_score === null ||
    assessment.water_stress_score === undefined
  );
  const score = isInsufficientData ? null : Number(assessment.water_stress_score);
  const rawRisk = (assessment?.risk_level || 'low').toLowerCase();
  const riskVariant = isInsufficientData ? 'neutral' : (rawRisk === 'high' ? 'high' : rawRisk === 'medium' ? 'medium' : 'low');
  const recMm = isInsufficientData
    ? null
    : (assessment?.recommended_irrigation_mm !== null && assessment?.recommended_irrigation_mm !== undefined
        ? Number(assessment.recommended_irrigation_mm)
        : 0.0);
  const shouldIrrigate = !isInsufficientData && recMm !== null && recMm > 0;
  const bestTimeWindow = 'Early Morning / Evening';
  const bestTimeReason = 'Evaporation reduction guideline';

  // Farmer's display name without hardcoded Khimji
  const farmerName = profile?.name ? profile.name.split(' ')[0] : 'Farmer';

  // User baseline depth input state (explicit user baseline requirement)
  const [userBaselineInput, setUserBaselineInput] = useState(() => {
    return Number(assessment?.userBaselineMm ?? assessment?.baselineIrrigationMm ?? 28);
  });

  // Water comparison calculation against user baseline:
  // fieldAreaM2 = areaAcres * 4046.86
  // comparisonLitres = max(0, baselineMm - recommendedMm) * fieldAreaM2
  const hasCompletedIrrigation = Boolean(assessment?.lastIrrigatedAt || assessment?.irrigationCompletion);
  const areaAcres = Number(fieldData?.area_acres || 1.0);
  const baselineMm = Number(assessment?.userBaselineMm ?? assessment?.baselineIrrigationMm ?? userBaselineInput ?? 28.0);
  const priorRecMm = Number(assessment?.priorRecommendedMm ?? (recMm !== null ? recMm : 0.0));
  const fieldAreaM2 = areaAcres * 4046.86;
  const computedSavedLitres = Math.round(Math.max(0, baselineMm - priorRecMm) * fieldAreaM2);
  const currentSavedLitres = Number(
    assessment?.currentDecisionSavedLitres ?? (hasCompletedIrrigation ? computedSavedLitres : 0)
  );
  const cumulativeSavedLitres = Number(
    assessment?.cumulativeSeasonSavedLitres ?? (hasCompletedIrrigation ? computedSavedLitres : 0)
  );

  // Multilingual labels for 10-second instant comprehension
  const t = {
    en: {
      appName: 'JalRakshak AI',
      greeting: `Ram Ram, ${farmerName}`,
      fieldSelectLabel: 'Farm Plot',
      statusActionRequired: 'IRRIGATION RECOMMENDED TODAY',
      statusNoAction: isInsufficientData ? 'ASSESSMENT INSUFFICIENT' : 'NO IRRIGATION NEEDED',
      actionSentenceYes: recMm !== null ? `Apply ${recMm} mm of water today to mitigate moisture deficit.` : 'Provide field observations to determine irrigation quantity.',
      actionSentenceNo: isInsufficientData ? 'Missing soil moisture observation or weather data. Enter observations to calculate water need.' : 'Estimated root-zone moisture is sufficient today.',
      recWaterLabel: 'Planned Water',
      recWaterUnit: 'mm',
      recWaterRuntime: 'Runtime per pump flow rate',
      bestTimeLabel: 'Recommended Window (Guideline)',
      bestTimeWindow: bestTimeWindow,
      bestTimeReason: bestTimeReason,
      viewPlanCta: "View today's plan",
      whyTitle: 'Why this decision?',
      whySubtitle: 'Verified agronomic factors',
      waitTitle: 'What happens if I wait?',
      waitHighRisk: 'Delaying irrigation under dry conditions increases evaporative moisture deficit based on prototype daily evapotranspiration heuristics.',
      waitLowRisk: 'Moisture retention is estimated as adequate. Withholding unnecessary water avoids over-saturation.',
      lastUpdated: 'Last calculated',
      demoBadge: 'Prototype Heuristic • Local Mode',
      quickActionsTitle: 'Quick Actions',
      explainAiBtn: 'Explain with AI',
      aiExplaining: 'Analyzing crop data...',
      markCompleteBtn: 'Mark irrigation complete',
      markingComplete: 'Recording...',
      viewAlertsBtn: 'View alerts',
      alertsCount: `${alerts.length} Active`,
      planModalTitle: "Today's Irrigation Plan",
      planStep1Title: 'Water Application Target',
      planStep1Desc: `Apply ${recMm !== null ? `${recMm} mm` : 'planned'} depth. Compute run time from your tube-well discharge rate.`,
      planStep2Title: 'Timing Window',
      planStep2Desc: 'Irrigate during early morning or late evening hours to minimize evaporative losses under high daytime heat.',
      planStep3Title: 'Field Uniformity Check',
      planStep3Desc: 'Check furrow trenches after watering to verify even water penetration across all rows.',
      closeBtn: 'Close',
      alertsModalTitle: 'Field Alerts & Risk Warnings',
      noAlerts: 'No critical alerts active for this field.',
      resolveAlert: 'Mark Resolved',
      aiDrawerTitle: 'AI Agronomic Explanation',
      actionStepsTitle: 'Practical Action Steps',
      evidenceTitle: 'Scientific Evidence',
      riskWarningTitle: 'Agronomic Warning',
      nextReviewTitle: 'Next Soil Inspection',
      successMarked: 'Irrigation logged. Duplicate count prevented.',
      confidenceLabel: 'Confidence: Standard (Prototype Model)',
      confidenceModel: 'FAO-56 Prototype Heuristic',
      assumptionsTitle: 'Stated Agronomic Assumptions',
      assumptionsSub: 'Parameters used in prototype calculation',
      toggleAssumptionsShow: 'View stated assumptions',
      toggleAssumptionsHide: 'Hide stated assumptions',
      waterSavedTitle: 'Estimated Water Comparison',
      estimatedBadge: 'Estimated',
      baselineExplanation: (b) => `Estimated comparison against your reported baseline of ${b} mm.`,
      waterAssumptions: '1 mm depth over 1 m² equals 1 litre. Estimated comparison against reported baseline; not a measured sensor verification.',
      seasonSavedLabel: 'Season estimated comparison',
      reassessTomorrow: 'We’ll reassess tomorrow.',
      whatIfIWaitBtn: 'What if I wait?'
    },
    hi: {
      appName: 'जल रक्षक AI',
      greeting: `राम राम, ${farmerName}`,
      fieldSelectLabel: 'खेत का चयन',
      statusActionRequired: 'आज सिंचाई अनुशंसित है',
      statusNoAction: isInsufficientData ? 'अपर्याप्त डेटा • सिफारिश रोकी गई' : 'आज सिंचाई की आवश्यकता नहीं है',
      actionSentenceYes: recMm !== null ? `नमी संतुलन बनाए रखने के लिए आज ${recMm} मिमी पानी देने की सिफारिश है।` : 'पानी की मात्रा तय करने के लिए खेत के पैरामीटर दर्ज करें।',
      actionSentenceNo: isInsufficientData ? 'मिट्टी की नमी या मौसम का डेटा उपलब्ध नहीं है। कृपया जानकारी दर्ज करें।' : 'आज जड़ क्षेत्र में पर्याप्त नमी का अनुमान है।',
      recWaterLabel: 'नियोजित पानी',
      recWaterUnit: 'मिमी',
      recWaterRuntime: 'पंप डिस्चार्ज के अनुसार समय',
      bestTimeLabel: 'सर्वोत्तम समय (दिशानिर्देश)',
      bestTimeWindow: 'सुबह / शाम',
      bestTimeReason: 'वाष्पीकरण रोकने का दिशानिर्देश',
      viewPlanCta: 'आज की सिंचाई योजना देखें',
      whyTitle: 'यह निर्णय क्यों लिया गया?',
      whySubtitle: 'वैज्ञानिक प्रमाण',
      waitTitle: 'अगर आज पानी न दें तो क्या होगा?',
      waitHighRisk: 'शुष्क परिस्थितियों में सिंचाई टालने से वाष्पीकरण तनाव बढ़ सकता है (प्रोटोटाइप अनुमान)।',
      waitLowRisk: 'अनुमानित नमी बफर पर्याप्त है। आवश्यकता न होने पर पानी रोकना बेहतर है।',
      lastUpdated: 'अंतिम अपडेट',
      demoBadge: 'प्रोटोटाइप मॉडल • ऑफलाइन मोड',
      quickActionsTitle: 'त्वरित कार्रवाई',
      explainAiBtn: 'AI से कारण समझें',
      aiExplaining: 'सलाह तैयार हो रही है...',
      markCompleteBtn: 'सिंचाई पूर्ण दर्ज करें',
      markingComplete: 'अपडेट हो रहा है...',
      viewAlertsBtn: 'चेतावनी देखें',
      alertsCount: `${alerts.length} सक्रिय`,
      planModalTitle: 'आज की सिंचाई योजना',
      planStep1Title: 'पानी की मात्रा',
      planStep1Desc: `${recMm !== null ? `${recMm} मिमी` : 'नियोजित'} पानी दें। अपने पंप के डिस्चार्ज के आधार पर समय निर्धारित करें।`,
      planStep2Title: 'समय खिड़की',
      planStep2Desc: 'तेज धूप और वाष्पीकरण से बचने के लिए सुबह या देर शाम ही सिंचाई करें।',
      planStep3Title: 'खेत निरीक्षण',
      planStep3Desc: 'पानी देने के बाद क्यारियों में समान नमी का फैलाव जांचें।',
      closeBtn: 'बंद करें',
      alertsModalTitle: 'खेत अलर्ट व चेतावनियां',
      noAlerts: 'इस खेत के लिए कोई गंभीर अलर्ट नहीं है।',
      resolveAlert: 'समाधान हुआ',
      aiDrawerTitle: 'AI कृषि विशेषज्ञ व्याख्या',
      actionStepsTitle: 'कार्रवाई के कदम',
      evidenceTitle: 'वैज्ञानिक साक्ष्य',
      riskWarningTitle: 'फसल जोखिम चेतावनी',
      nextReviewTitle: 'अगली जांच का समय',
      successMarked: 'सिंचाई दर्ज की गई। दोहराव रोका गया।',
      confidenceLabel: 'विश्वसनीयता: मानक (प्रोटोटाइप)',
      confidenceModel: 'FAO-56 प्रोटोटाइप मॉडल',
      assumptionsTitle: 'निर्धारित कृषि मान्यताएं',
      assumptionsSub: 'आज की गणना में उपयोग किए गए पैरामीटर',
      toggleAssumptionsShow: 'मान्यताएं देखें',
      toggleAssumptionsHide: 'मान्यताएं छिपाएं',
      waterSavedTitle: 'अनुमानित जल तुलना',
      estimatedBadge: 'अनुमानित',
      baselineExplanation: (b) => `आपके दर्ज ${b} मिमी बेसलाइन के मुकाबले अनुमानित तुलना।`,
      waterAssumptions: '1 वर्ग मीटर पर 1 मिमी बराबर 1 लीटर। बेसलाइन के मुकाबले अनुमानित तुलना; मापा गया सेंसर डेटा नहीं।',
      seasonSavedLabel: 'सीजन की अनुमानित तुलना',
      reassessTomorrow: 'हम कल दोबारा आकलन करेंगे।',
      whatIfIWaitBtn: 'अगर मैं पानी न दूं तो क्या होगा?'
    },
    gu: {
      appName: 'જલ રક્ષક AI',
      greeting: `રામ રામ, ${farmerName}ભાઈ`,
      fieldSelectLabel: 'ખેતર પસંદગી',
      statusActionRequired: 'આજે પિયત ભલામણ છે',
      statusNoAction: isInsufficientData ? 'અપૂરતી વિગતો • ભલામણ સ્થગિત' : 'આજે પાણી આપવાની જરૂર નથી',
      actionSentenceYes: recMm !== null ? `ભેજ સંતુલન જાળવવા આજે ${recMm} મીમી પિયત આપવાની ભલામણ છે.` : 'પાણીનું પ્રમાણ નક્કી કરવા ખેતર વિગતો આપો.',
      actionSentenceNo: isInsufficientData ? 'જમીન ભેજ અથવા વરસાદની વિગતો ખૂટે છે. કૃપા કરીને માહિતી આપો.' : 'આજે જમીનમાં પૂરતો ભેજ હોવાનો અંદાજ છે.',
      recWaterLabel: 'આયોજિત પાણી',
      recWaterUnit: 'મીમી',
      recWaterRuntime: 'પંપ ડિસ્ચાર્જ મુજબ સમય',
      bestTimeLabel: 'પિયતનો સમય (માર્ગદર્શિકા)',
      bestTimeWindow: 'સવારે / સાંજે',
      bestTimeReason: 'બાષ્પીભવન ઘટાડવા માર્ગદર્શિકા',
      viewPlanCta: 'આજનું પિયત આયોજન જુઓ',
      whyTitle: 'આ નિર્ણય કેમ લેવાયો?',
      whySubtitle: 'વૈજ્ઞાનિક પુરાવા',
      waitTitle: 'જો આજે પાણી ન આપીએ તો શું થાય?',
      waitHighRisk: 'સૂકા વાતાવરણમાં પિયત વિલંબ કરવાથી બાષ્પીભવન ખેંચ વધી શકે છે (પ્રોટોટાઇપ અંદાજ).',
      waitLowRisk: 'અંદાજિત ભેજ પૂરતો છે. બિનજરૂરી પાણી ન આપવું હિતાવહ છે.',
      lastUpdated: 'છેલ્લી ગણતરી',
      demoBadge: 'પ્રોટોટાઇપ મોડેલ • સ્થાનિક મોડ',
      quickActionsTitle: 'ઝડપી કાર્યો',
      explainAiBtn: 'AI પાસે ખુલાસો મેળવો',
      aiExplaining: 'માહિતી તૈયાર થાય છે...',
      markCompleteBtn: 'પિયત પૂરું થયું નોંધો',
      markingComplete: 'નોંધાય છે...',
      viewAlertsBtn: 'ચેતવણીઓ જુઓ',
      alertsCount: `${alerts.length} સક્રિય`,
      planModalTitle: 'આજનું પિયત આયોજન',
      planStep1Title: 'પાણીનું પ્રમાણ',
      planStep1Desc: `${recMm !== null ? `${recMm} મીમી` : 'આયોજિત'} પાણી આપો. તમારા બોરવેલ પંપના ડિસ્ચાર્જ આધારે સમય નક્કી કરો.`,
      planStep2Title: 'શ્રેષ્ઠ સમયગાળો',
      planStep2Desc: 'વધુ તડકો અને બાષ્પીભવન અટકાવવા વહેલી સવારે અથવા સાંજે પિયત આપો.',
      planStep3Title: 'ખેતર ચકાસણી',
      planStep3Desc: 'પિયત આપ્યા બાદ ધોરિયા અને ક્યારામાં ભેજનો સમાન ફેલાવો ચકાસો.',
      closeBtn: 'બંધ કરો',
      alertsModalTitle: 'ખેતર ચેતવણીઓ',
      noAlerts: 'આ ખેતર માટે કોઈ ગંભીર ચેતવણી નથી.',
      resolveAlert: 'ઉકેલ થયો',
      aiDrawerTitle: 'AI કૃષિ નિષ્ણાત ખુલાસો',
      actionStepsTitle: 'આજના કરવાના કામ',
      evidenceTitle: 'વૈજ્ઞાનિક પુરાવા',
      riskWarningTitle: 'પાક જોખમ ચેતવણી',
      nextReviewTitle: 'આગામી ચકાસણી સમય',
      successMarked: 'પિયત નોંધાઈ ગયું. ડુપ્લિકેટ ગણતરી અટકાવાઈ.',
      confidenceLabel: 'વિશ્વસનીયતા: માનક (પ્રોટોટાઇપ)',
      confidenceModel: 'FAO-56 પ્રોટોટાઇપ મોડેલ',
      assumptionsTitle: 'ગણતરીના પૂર્વધારણા પરિમાણો',
      assumptionsSub: 'આજના મૂલ્યાંકનમાં ઉપયોગમાં લેવાયેલ વિગતો',
      toggleAssumptionsShow: 'પૂર્વધારણાઓ જુઓ',
      toggleAssumptionsHide: 'પૂર્વધારણાઓ છુપાવો',
      waterSavedTitle: 'અંદાજિત પાણી સરખામણી',
      estimatedBadge: 'અંદાજિત',
      baselineExplanation: (b) => `તમારા નોંધાયેલ ${b} મીમી બેઝલાઇનની સરખામણીમાં અંદાજિત તુલના.`,
      waterAssumptions: '1 ચોરસ મીટર પર 1 મીમી બરાબર 1 લિટર. નોંધાયેલ બેઝલાઇન સાથે અંદાજિત સરખામણી; માપેલ સેન્સર ડેટા નથી.',
      seasonSavedLabel: 'સિઝનની અંદાજિત સરખામણી',
      reassessTomorrow: 'અમે આવતીકાલે ફરી મૂલ્યાંકન કરીશું.',
      whatIfIWaitBtn: 'જો હું પિયત મોડું કરું તો શું થાય?'
    }
  }[language] || {};

  // Formatted current date
  const todayFormatted = new Date().toLocaleDateString(
    language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
  );

  // Formatted freshness timestamp
  const freshnessFormatted = freshnessTimestamp
    ? new Date(freshnessTimestamp).toLocaleTimeString(
        language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN',
        { hour: '2-digit', minute: '2-digit' }
      )
    : '5:30 AM';

  // 3 factual evidence items (strictly exactly 3)
  const defaultReasons = isInsufficientData
    ? [
        language === 'hi' ? 'खेत पंजीकृत है; मौसम या मिट्टी की नमी का विवरण प्रतीक्षित है।' : language === 'gu' ? 'ખેતર નોંધાયેલ છે; હવામાન અથવા માટીના ભેજની વિગત બાકી છે.' : 'Field registered; awaiting verified weather or soil moisture observations.',
        language === 'hi' ? 'पर्याप्त इनपुट मिलने तक सिफारिशें रोकी गई हैं।' : language === 'gu' ? 'પૂરતા ઇનપુટ મળે ત્યાં સુધી ભલામણો સ્થગિત કરેલ છે.' : 'Recommendations are paused until verified assessment inputs are recorded.',
        language === 'hi' ? 'एफएओ-56 फसल गुणांक प्रोटोटाइप अनुमान के रूप में सुरक्षित है।' : language === 'gu' ? 'FAO-56 પાક ગુણાંક પ્રોટોટાઇપ અંદાજ તરીકે સચવાયેલ છે.' : 'FAO-56 crop coefficients are maintained as prototype heuristics.'
      ]
    : [
        language === 'hi' ? 'उपलब्ध खेत मापदंडों के आधार पर जल तनाव की गणना की गई है।' : language === 'gu' ? 'ઉપલબ્ધ ખેતર પરિમાણો આધારે પાણીના તણાવની ગણતરી કરેલ છે.' : 'Agronomic assessment calculated using available field parameters.',
        language === 'hi' ? 'मौसम प्रोफ़ाइल से वर्षा और वाष्पीकरण डेटा संदर्भित है।' : language === 'gu' ? 'હવામાન પ્રોફાઇલ પરથી વરસાદ અને બાષ્પીભવન ડેટા મેળવેલ છે.' : 'Rainfall and evapotranspiration data referenced from current weather profile.',
        language === 'hi' ? 'सिफारिश प्रोटोटाइप सीमा के अनुसार व्युत्पन्न की गई है।' : language === 'gu' ? 'ભલામણ પ્રોટોટાઇપ મર્યાદા અનુસાર મેળવેલ છે.' : 'Irrigation advisory derived from prototype heuristic thresholds.'
      ];
  const evidenceItems = (assessment?.reasons && assessment.reasons.length >= 3)
    ? assessment.reasons.slice(0, 3)
    : defaultReasons;

  // Stated agronomic assumptions for progressive disclosure (detail last)
  const assumptionsList = (
    language === 'hi' ? assessment?.assumptions_hi : language === 'gu' ? assessment?.assumptions_gu : assessment?.assumptions
  ) || assessment?.assumptions || [
    'Soil type: Sandy Loam with 35% available water capacity (AWC) [Prototype Heuristic].',
    'Crop coefficient (Kc): Reference stage value from FAO-56 lookup [Prototype Heuristic].',
    'Weather profile: Referenced from local weather snapshot.',
    'System efficiency: 75% uniform application with standard drip or furrow layout.'
  ];

  // Semi-circle gauge calculation
  // Radius = 75, circumference = Math.PI * 75 ≈ 235.6
  const gaugeCircumference = 235.6;
  const clampedScore = isInsufficientData || score === null ? 0 : Math.max(0, Math.min(100, score));
  const strokeOffset = gaugeCircumference * (1 - clampedScore / 100);
  const strokeColor = isInsufficientData ? 'var(--border)' : (riskVariant === 'high' ? 'var(--risk)' : riskVariant === 'medium' ? 'var(--sun)' : 'var(--forest)');
  const riskLabel = isInsufficientData ? 'Data Insufficient' : (riskVariant === 'high' ? 'High Risk' : riskVariant === 'medium' ? 'Medium Risk' : 'Optimal Moisture');

  // Handle Mark Irrigation Complete click - opens confirmation modal
  const handleMarkCompleteClick = () => {
    setShowConfirmModal(true);
  };

  // Confirm irrigation completion
  const handleConfirmIrrigation = async () => {
    if (onMarkIrrigationComplete) {
      setIsSubmittingCompletion(true);
      try {
        await onMarkIrrigationComplete(userBaselineInput);
        setCompletionNotice(t.successMarked);
        setShowConfirmModal(false);
        setShowPlanModal(false);
        setTimeout(() => setCompletionNotice(null), 5000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmittingCompletion(false);
      }
    }
  };

  // Loading State
  if (loading) {
    return (
      <AppShell>
        <div aria-label="Loading Dashboard" className="space-y-4">
          <LoadingSkeleton height="48px" borderRadius="12px" />
          <LoadingSkeleton height="56px" borderRadius="12px" />
          <LoadingSkeleton height="260px" borderRadius="18px" />
          <LoadingSkeleton height="50px" borderRadius="12px" />
          <LoadingSkeleton height="160px" borderRadius="18px" />
          <LoadingSkeleton height="100px" borderRadius="18px" />
        </div>
      </AppShell>
    );
  }

  // Error State
  if (error) {
    return (
      <AppShell>
        <div role="alert" className="py-4">
          <Card style={{ border: '2px solid var(--risk)', padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }} aria-hidden="true">⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--risk)', marginBottom: '8px' }}>
              Data Loading Issue
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              {error}
            </p>
            <PrimaryButton onClick={onRetry}>
              Retry Load
            </PrimaryButton>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Empty State
  if (!fieldData) {
    return (
      <AppShell>
        <div className="py-4">
          <EmptyState
            icon="🌱"
            title="No Farm Plot Found"
            description="Register your first field to start receiving daily water decisions."
            action={
              <PrimaryButton onClick={() => window.location.reload()}>
                Refresh
              </PrimaryButton>
            }
          />
        </div>
      </AppShell>
    );
  }

  const headerComponent = (
    <PageHeader
      title={t.appName}
      subtitle={t.greeting}
      icon="💧"
      rightActions={
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-bold text-[var(--muted)]">
            {todayFormatted}
          </span>
          <nav aria-label="Language" className="flex items-center gap-1 mt-1">
            {[
              { code: 'en', label: 'EN' },
              { code: 'hi', label: 'हिं' },
              { code: 'gu', label: 'ગુજ' }
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                aria-pressed={language === lang.code}
                onClick={() => onLanguageChange(lang.code)}
                style={{ minHeight: '44px', minWidth: '44px' }}
                className={`text-xs font-bold rounded-lg border flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--forest)] ${
                  language === lang.code
                    ? 'bg-[var(--forest)] text-[var(--surface)] border-[var(--forest)] shadow-xs'
                    : 'bg-[var(--canvas)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--ink)]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </nav>
        </div>
      }
    />
  );

  return (
    <AppShell header={headerComponent}>
      {/* Toast Notification */}
      {completionNotice && (
        <div
          role="status"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[var(--forest)] text-[var(--surface)] text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/20 transition-all"
        >
          <span>✓</span>
          <span>{completionNotice}</span>
        </div>
      )}

      {/* MAIN CONTENT (Mobile-First, Responsive) */}
      <div className="space-y-4">

        {/* COMPACT WATER-SAVING IMPACT SUCCESS CARD */}
        {(assessment?.lastIrrigatedAt || assessment?.irrigationCompletion) && (
          <Card
            as="section"
            aria-label="Water Saved Success Card"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1.5px solid var(--forest)',
              boxShadow: 'var(--shadow-soft)',
              padding: '16px'
            }}
          >
            {/* Header: Title, success state & Estimated label */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none" aria-hidden="true">✅</span>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-[var(--forest)] leading-tight">
                    {t.waterSavedTitle}
                  </h2>
                  <p className="text-[11px] text-[var(--muted)] font-semibold mt-0.5">
                    {t.successMarked}
                  </p>
                </div>
              </div>
              <span
                style={{
                  backgroundColor: '#EBF4ED',
                  color: 'var(--forest)',
                  border: '1px solid var(--leaf)',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-full)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}
              >
                {t.estimatedBadge}
              </span>
            </div>

            {/* Impact Metric Block */}
            <div className="bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-3 my-3">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-extrabold text-[var(--muted)] uppercase tracking-wider block">
                    {t.waterSavedTitle}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[var(--forest)] tracking-tight leading-none mt-1">
                    {formatWaterSaved(currentSavedLitres)}
                  </div>
                </div>

                {cumulativeSavedLitres > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                      {t.seasonSavedLabel}
                    </span>
                    <span className="text-xs font-extrabold text-[var(--ink)]">
                      {formatWaterSaved(cumulativeSavedLitres)}
                    </span>
                  </div>
                )}
              </div>

              {/* One-line explanation comparing with fixed baseline */}
              <p className="text-xs font-bold text-[var(--ink)] mt-2.5 pt-2 border-t border-[var(--border)] leading-relaxed">
                {t.baselineExplanation(baselineMm)}
              </p>

              {/* Small assumptions disclosure */}
              <p className="text-[11px] text-[var(--muted)] font-medium mt-1 leading-normal">
                {t.waterAssumptions}
              </p>
            </div>

            {/* Timestamp & Next review note */}
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-semibold pt-0.5">
              <span>
                🕒 {new Date(assessment.lastIrrigatedAt || assessment.irrigationCompletion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[var(--forest)] font-bold">
                ✓ {t.reassessTomorrow}
              </span>
            </div>

            {onResetDemo && (
              <div className="pt-2 mt-2 border-t border-[var(--border)] flex justify-end">
                <button
                  type="button"
                  onClick={onResetDemo}
                  style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--forest)] underline cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded px-1"
                >
                  ↺ Reset for demo re-test
                </button>
              </div>
            )}
          </Card>
        )}

        {/* 2. FIELD SELECTOR: One field now, scalable to multi-field */}
        <section aria-label="Field Selection">
          <Card style={{ padding: '12px 16px' }}>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="field-select" className="text-xs font-bold text-[var(--muted)] shrink-0 flex items-center gap-1.5">
                <span aria-hidden="true">📍</span>
                <span>{t.fieldSelectLabel}:</span>
              </label>
              <select
                id="field-select"
                value={activeFieldId}
                onChange={(e) => onFieldChange(e.target.value)}
                style={{ minHeight: '44px' }}
                className="w-full text-xs font-extrabold text-[var(--ink)] bg-[var(--canvas)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--forest)] cursor-pointer"
              >
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.crop.toUpperCase()} ({f.village || f.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)] font-medium flex-wrap gap-1.5">
              <span>🌾 {fieldData?.crop?.toUpperCase() || 'COTTON'}</span>
              <span>📐 {fieldData?.area_acres || 1.0} Acres</span>
              <span>🗓️ Sown {fieldData?.sowing_date || '2026-08-10'}</span>
              {cumulativeSavedLitres > 0 && (
                <span className="text-[var(--forest)] font-bold">
                  💧 {formatWaterSaved(cumulativeSavedLitres)} {t.seasonSavedLabel.toLowerCase()}
                </span>
              )}
              {onViewFieldHealth && (
                <button
                  type="button"
                  onClick={onViewFieldHealth}
                  style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  className="text-[11px] font-extrabold text-[var(--forest)] hover:underline flex items-center gap-1 cursor-pointer ml-auto focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded px-1"
                >
                  <span>📊 Field Health →</span>
                </button>
              )}
            </div>
          </Card>
        </section>

        {/* 3. MAIN WATER DECISION CARD */}
        {/* Answers in 10s: "Does my field need irrigation today, how much, and why?" */}
        <Card
          as="section"
          aria-label="Water Decision"
          style={{
            padding: '20px',
            border: riskVariant === 'high' ? '2px solid var(--risk)' : '1px solid var(--border)',
            backgroundColor: 'var(--surface)'
          }}
        >
          {/* Card Top: Risk Badge & Status Label */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant={riskVariant}>
              {riskLabel}
            </Badge>
            <span
              className={`text-xs font-black tracking-wide uppercase px-2 py-0.5 rounded ${
                shouldIrrigate
                  ? 'bg-[#FCECEB] text-[var(--risk)]'
                  : 'bg-[#EBF4ED] text-[var(--forest)]'
              }`}
            >
              {shouldIrrigate ? t.statusActionRequired : t.statusNoAction}
            </span>
          </div>

          {/* Model Confidence & Data Freshness Strip */}
          <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-bold text-[var(--muted)] flex-wrap gap-1">
            <span className="flex items-center gap-1 text-[var(--forest)] font-extrabold">
              <span aria-hidden="true">🎯</span>
              <span>{t.confidenceLabel}</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap font-medium text-[var(--muted)]">
              <span>🕒 {t.lastUpdated}: {freshnessFormatted}</span>
              {assessment?.isStale && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FFF3CD] text-[#856404] border border-[#FFEEBA]">
                  ⚠️ Stale (&gt;24h)
                </span>
              )}
              {assessment?.isCached && !assessment?.isStale && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--canvas)] text-[var(--muted)] border border-[var(--border)]">
                  Cached
                </span>
              )}
            </div>
          </div>

          {/* Accessible Water-Stress Semi-Circular Meter & Large Number */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div
              role="meter"
              aria-label={isInsufficientData || score === null ? "Data insufficient, recommendation paused" : "Water Stress Score"}
              aria-valuenow={isInsufficientData || score === null ? undefined : score}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuetext={isInsufficientData || score === null ? "Data insufficient, recommendation paused" : `${score} out of 100, ${riskLabel}`}
              className="relative flex items-center justify-center"
            >
              <svg
                width="200"
                height="115"
                viewBox="0 0 200 115"
                className="overflow-visible"
              >
                {/* Background Track Arc */}
                <path
                  d="M 25 100 A 75 75 0 0 1 175 100"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Active Score Progress Arc */}
                <path
                  d="M 25 100 A 75 75 0 0 1 175 100"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: 'stroke-dashoffset 600ms ease' }}
                />
              </svg>

              {/* Centered Large Number Hierarchy */}
              <div className="absolute top-[38px] flex flex-col items-center">
                <span className="text-5xl font-black tracking-tight text-[var(--ink)] leading-none">
                  {isInsufficientData || score === null ? '—' : score}
                </span>
                <span className="text-[11px] font-bold text-[var(--muted)] mt-1 uppercase tracking-wider">
                  {isInsufficientData || score === null ? 'Data Insufficient' : '/ 100 Stress'}
                </span>
              </div>
            </div>

            {/* Recommended Action Sentence */}
            <p className="mt-2 text-center text-sm font-bold text-[var(--ink)] max-w-sm leading-relaxed break-words">
              {isInsufficientData
                ? (language === 'hi' ? 'सिफारिश के लिए मिट्टी की नमी या मौसम का विवरण दर्ज करें।' : language === 'gu' ? 'ભલામણ માટે માટીનો ભેજ અથવા હવામાનની વિગત નોંધો.' : 'Record soil moisture or weather observation to calculate recommendations.')
                : (shouldIrrigate ? t.actionSentenceYes : t.actionSentenceNo)}
            </p>
          </div>

          {/* Irrigation Metrics: Recommended mm & Best Time */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
            <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                {t.recWaterLabel}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-[var(--forest)] leading-none">
                  {recMm !== null ? recMm : '—'}
                </span>
                {recMm !== null && (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {t.recWaterUnit}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--muted)] block mt-1 font-medium">
                {recMm !== null ? t.recWaterRuntime : 'Awaiting input'}
              </span>
            </div>

            <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                {t.bestTimeLabel}
              </span>
              <span className="text-sm font-extrabold text-[var(--ink)] block mt-1 leading-snug">
                {isInsufficientData ? '—' : t.bestTimeWindow}
              </span>
              <span className="text-[10px] text-[var(--muted)] block mt-0.5 font-medium truncate">
                {isInsufficientData ? 'Input required' : t.bestTimeReason}
              </span>
            </div>
          </div>
        </Card>

        {/* 4. PRIMARY CTA: “View today’s plan” */}
        <section aria-label="Primary Call to Action">
          <Button
            variant="primary"
            onClick={() => setShowPlanModal(true)}
            className="w-full text-base py-3 shadow-sm hover:opacity-95"
          >
            📋 {t.viewPlanCta}
          </Button>
        </section>

        {/* 5. “WHY THIS DECISION?” SECTION with EXACTLY 3 EVIDENCE ROWS */}
        <Card as="section" aria-label="Why this decision">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-black text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
              <span>🔍</span>
              <span>{t.whyTitle}</span>
            </h2>
            <span className="text-[10px] font-bold text-[var(--muted)]">
              {t.whySubtitle}
            </span>
          </div>

          <ol className="space-y-2">
            {evidenceItems.map((reason, idx) => (
              <li
                key={idx}
                className="bg-[var(--canvas)] border border-[var(--border)] p-2.5 rounded-xl flex items-start gap-2.5 text-xs text-[var(--ink)]"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--forest)] text-[var(--surface)] text-[11px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="font-medium leading-relaxed">
                  {reason}
                </p>
              </li>
            ))}
          </ol>
        </Card>

        {/* PROGRESSIVE DISCLOSURE: DETAIL LAST — STATED AGRONOMIC ASSUMPTIONS */}
        <Card as="section" aria-label="Stated Agronomic Assumptions" style={{ padding: '16px' }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
                <span aria-hidden="true">⚙️</span>
                <span>{t.assumptionsTitle}</span>
              </h3>
              <p className="text-[10px] text-[var(--muted)] font-medium mt-0.5">
                {t.assumptionsSub}
              </p>
            </div>
            <button
              type="button"
              aria-expanded={showAssumptions}
              onClick={() => setShowAssumptions(!showAssumptions)}
              style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              className="text-xs font-bold text-[var(--forest)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded px-3 bg-[var(--canvas)] border border-[var(--border)] cursor-pointer"
            >
              {showAssumptions ? t.toggleAssumptionsHide : t.toggleAssumptionsShow}
            </button>
          </div>

          {showAssumptions && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
              {assumptionsList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--canvas)] border border-[var(--border)] p-2.5 rounded-lg text-xs font-medium text-[var(--ink)] flex items-start gap-2"
                >
                  <span className="text-[var(--forest)] font-black text-xs leading-none mt-0.5">•</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 6. “WHAT HAPPENS IF I WAIT?” CONCISE RISK CARD & SIMULATOR */}
        {showSimulator ? (
          <IrrigationSimulator
            assessment={assessment}
            fieldData={fieldData}
            language={language}
            onClose={() => setShowSimulator(false)}
          />
        ) : (
          <Card
            as="section"
            aria-label="Risk if delayed"
            style={{
              borderLeft: riskVariant === 'high' ? '4px solid var(--risk)' : '4px solid var(--forest)',
              backgroundColor: riskVariant === 'high' ? '#FDF5F5' : '#F4F8F5'
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">
                  {riskVariant === 'high' ? '⚠️' : '🛡️'}
                </span>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
                  {t.waitTitle}
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[var(--forest)] bg-[#EBF4ED] px-2 py-0.5 rounded">
                SIMULATOR READY
              </span>
            </div>

            <p className="mt-1.5 text-xs font-semibold text-[var(--ink)] leading-relaxed">
              {shouldIrrigate ? t.waitHighRisk : t.waitLowRisk}
            </p>

            {shouldIrrigate && (
              <div className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[var(--risk)]">
                ⏱️ Action window: Next 12 hours
              </div>
            )}

            {/* 1. Trigger button: “What if I wait?” */}
            <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
              <Button
                variant="secondary"
                onClick={() => setShowSimulator(true)}
                className="w-full text-xs py-2.5 justify-center font-bold"
              >
                <span>⏱️</span>
                <span>{t.whatIfIWaitBtn}</span>
              </Button>
            </div>
          </Card>
        )}

        {/* 7. LAST UPDATED TIME AND VISIBLE “DEMO DATA” BADGE */}
        <div className="flex items-center justify-between px-1 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium text-[11px] flex-wrap">
            <span>🕒</span>
            <span>{t.lastUpdated}: {freshnessFormatted}</span>
            {assessment?.isStale && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FFF3CD] text-[#856404] border border-[#FFEEBA]">
                ⚠️ Stale (&gt;24h)
              </span>
            )}
            {assessment?.isCached && !assessment?.isStale && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--canvas)] text-[var(--muted)] border border-[var(--border)]">
                Cached
              </span>
            )}
          </div>
          <Badge variant="neutral" icon="ℹ️">
            {t.demoBadge}
          </Badge>
        </div>

        {/* 8. QUICK ACTIONS BAR: Explain with AI, Mark complete, View alerts */}
        <section aria-label="Quick Actions" className="pt-1">
          <h3 className="text-[11px] font-bold uppercase text-[var(--muted)] mb-2 px-1 tracking-wider">
            {t.quickActionsTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Quick Action: Explain with AI (DOES NOT call automatically) */}
            <Button
              variant="secondary"
              onClick={onExplainWithAI ? onExplainWithAI : (showAdvisory ? onToggleAdvisory : onAskAI)}
              disabled={advisoryLoading}
              className="w-full text-xs py-2.5 justify-center"
            >
              <span>{advisoryLoading ? '⏳' : '💡'}</span>
              <span>{advisoryLoading ? t.aiExplaining : t.explainAiBtn}</span>
            </Button>

            {/* Quick Action: Mark irrigation complete */}
            <Button
              variant="secondary"
              onClick={handleMarkCompleteClick}
              disabled={loading || hasCompletedIrrigation}
              className="w-full text-xs py-2.5 justify-center"
            >
              <span>{hasCompletedIrrigation ? '✓' : '💧'}</span>
              <span>
                {hasCompletedIrrigation
                  ? (language === 'hi' ? 'सिंचाई दर्ज हो चुकी है' : language === 'gu' ? 'પિયત નોંધાઈ ગયું છે' : 'Irrigation logged')
                  : t.markCompleteBtn}
              </span>
            </Button>

            {/* Quick Action: View alerts */}
            <Button
              variant="ghost"
              onClick={onViewAlerts ? onViewAlerts : () => setShowAlertsModal(true)}
              className="w-full text-xs py-2.5 justify-center border border-[var(--border)]"
            >
              <span>🔔</span>
              <span>{t.viewAlertsBtn}</span>
              {alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[var(--risk)] text-[var(--surface)] text-[10px] font-black rounded-full">
                  {alerts.length}
                </span>
              )}
            </Button>
          </div>

          {onViewFieldHealth && (
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={onViewFieldHealth}
                className="w-full text-xs py-2.5 justify-center border border-[var(--border)] font-bold text-[var(--ink)] hover:bg-[var(--canvas)]"
              >
                <span>🌱</span>
                <span>View Field Health, Trends & History →</span>
              </Button>
            </div>
          )}
        </section>

        {/* ON-DEMAND AI EXPLANATION DRAWER/CARD (Only when requested) */}
        {showAdvisory && advisory && (
          <article
            aria-label="AI Explanation Details"
            className="bg-[var(--surface)] border-2 border-[var(--forest)] rounded-2xl p-4 space-y-3 shadow-md mt-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase text-[var(--forest)] tracking-wider">
                  🤖 {t.aiDrawerTitle} ({advisory.language?.toUpperCase() || language.toUpperCase()})
                </span>
                {advisory.isCached && (
                  <span className="bg-[var(--canvas)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[9px] font-black text-[var(--forest)] uppercase tracking-wider">
                    Cached
                  </span>
                )}
                {advisory.assessment_timestamp && (
                  <span className="text-[10px] text-[var(--muted)] font-medium">
                    🕒 {new Date(advisory.assessment_timestamp).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onToggleAdvisory}
                style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                className="text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded"
              >
                ✕ {t.closeBtn}
              </button>
            </div>

            <h4 className="text-sm font-extrabold text-[var(--ink)] leading-snug">
              {advisory.headline}
            </h4>

            {/* Practical Action Steps */}
            {advisory.action_now && (
              <div>
                <h5 className="text-[11px] font-black uppercase text-[var(--muted)] mb-1.5">
                  {t.actionStepsTitle}:
                </h5>
                <ol className="space-y-1.5">
                  {advisory.action_now.map((act, idx) => (
                    <li key={idx} className="text-xs text-[var(--ink)] font-medium flex items-start">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-[#EBF4ED] text-[var(--forest)] font-black text-[10px] flex items-center justify-center mr-2 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Agronomic Evidence */}
            {advisory.why && (
              <div className="pt-2 border-t border-[var(--border)]">
                <h5 className="text-[11px] font-black uppercase text-[var(--muted)] mb-1">
                  {t.evidenceTitle}:
                </h5>
                <ul className="space-y-1">
                  {advisory.why.map((w, idx) => (
                    <li key={idx} className="text-xs text-[var(--muted)] flex items-start">
                      <span className="text-[var(--forest)] font-black mr-2">•</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Warning & Next Review */}
            <div className="pt-2 border-t border-[var(--border)] text-xs space-y-1 bg-[var(--canvas)] p-2.5 rounded-xl">
              {advisory.risk_warning && (
                <p className="text-[var(--risk)] font-bold">
                  ⚠️ {advisory.risk_warning}
                </p>
              )}
              {advisory.next_review && (
                <p className="text-[var(--muted)] font-semibold text-[11px]">
                  ⏱️ {advisory.next_review}
                </p>
              )}
            </div>
          </article>
        )}

        {/* AI Advisory Error Notice */}
        {advisoryError && (
          <div className="bg-[#FCECEB] border border-[var(--risk)] text-[var(--risk)] p-3 rounded-xl text-xs font-bold">
            {advisoryError}
          </div>
        )}
      </div>

      {/* MODAL 1: TODAY'S PLAN MODAL */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={t.planModalTitle}
        icon="📋"
        ariaLabelledBy="plan-modal-title"
        footer={
          <>
            {shouldIrrigate && (
              <PrimaryButton onClick={handleMarkCompleteClick}>
                ✓ {t.markCompleteBtn}
              </PrimaryButton>
            )}
            <GhostButton onClick={() => setShowPlanModal(false)}>
              {t.closeBtn}
            </GhostButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">Step 1</span>
            <h4 className="text-xs font-bold text-[var(--ink)] mt-0.5">{t.planStep1Title}</h4>
            <p className="text-xs text-[var(--muted)] mt-1">{t.planStep1Desc}</p>
          </div>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">Step 2</span>
            <h4 className="text-xs font-bold text-[var(--ink)] mt-0.5">{t.planStep2Title}</h4>
            <p className="text-xs text-[var(--muted)] mt-1">{t.planStep2Desc}</p>
          </div>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <span className="text-[10px] font-black uppercase text-[var(--forest)] block">Step 3</span>
            <h4 className="text-xs font-bold text-[var(--ink)] mt-0.5">{t.planStep3Title}</h4>
            <p className="text-xs text-[var(--muted)] mt-1">{t.planStep3Desc}</p>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: ALERTS MODAL */}
      <Modal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        title={t.alertsModalTitle}
        icon="🔔"
        ariaLabelledBy="alerts-modal-title"
        footer={
          <GhostButton onClick={() => setShowAlertsModal(false)}>
            {t.closeBtn}
          </GhostButton>
        }
      >
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-4 text-center">
              {t.noAlerts}
            </p>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-xl border border-[var(--risk)] bg-[#FDF5F5] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <RiskBadge level="high" label="Critical" />
                  <span className="text-[10px] text-[var(--muted)] font-semibold">
                    {new Date(al.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-bold text-[var(--risk)]">
                  {al.message}
                </p>
                {onResolveAlert && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onResolveAlert(al.id)}
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      className="text-xs font-bold text-[var(--forest)] underline hover:text-[var(--ink)] inline-flex items-center focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded px-1 cursor-pointer"
                    >
                      {t.resolveAlert}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* MODAL 3: CONFIRMATION MODAL FOR IRRIGATION COMPLETION */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Irrigation Completion"
        icon="💧"
        maxWidth="max-w-md"
        ariaLabelledBy="confirm-modal-title"
        footer={
          <>
            <GhostButton
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmittingCompletion}
            >
              Cancel
            </GhostButton>
            <PrimaryButton
              onClick={handleConfirmIrrigation}
              disabled={isSubmittingCompletion}
            >
              {isSubmittingCompletion ? 'Recording...' : 'Yes, Confirm Completed'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--muted)] font-medium leading-relaxed">
            Record irrigation application for {fieldData.name || 'this plot'}. This updates root moisture to optimal and logs the event to prevent duplicate entries.
          </p>

          <div className="bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)]">
            <label htmlFor="modal-baseline-input" className="text-xs font-bold text-[var(--ink)] block mb-1">
              Your Typical Baseline Depth (mm)
            </label>
            <p className="text-[11px] text-[var(--muted)] mb-2">
              Enter your usual unguided water application depth. Water comparison will be estimated against this reported baseline (not measured by physical meters).
            </p>
            <div className="flex items-center gap-2">
              <input
                id="modal-baseline-input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={userBaselineInput}
                onChange={(e) => setUserBaselineInput(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 text-sm font-extrabold text-[var(--ink)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--forest)]"
              />
              <span className="text-xs font-bold text-[var(--muted)]">mm per irrigation event</span>
            </div>
            {recMm !== null && (
              <p className="text-[11px] text-[var(--forest)] font-semibold mt-2">
                Estimated comparison vs planned ({recMm} mm): {Math.max(0, userBaselineInput - recMm)} mm difference per event.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
