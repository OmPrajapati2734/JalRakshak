import React, { useState } from 'react';
import { Button, Card, Badge } from './ui/Primitives.jsx';

export default function OnboardingFlow({ onComplete, initialLanguage = 'en' }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jalrakshak_language');
      if (saved && ['en', 'hi', 'gu'].includes(saved)) return saved;
    }
    return initialLanguage || 'en';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for first field - empty inputs, no seed values presented as real
  const [formData, setFormData] = useState({
    name: '',
    crop: 'cotton',
    village: '',
    sowingDate: '',
    areaAcres: ''
  });

  const [errors, setErrors] = useState({});

  // Multilingual copy
  const t = {
    en: {
      appName: 'JalRakshak AI',
      welcomeHero: 'Know exactly when and how much to irrigate.',
      welcomeSub: 'Simple, data-driven irrigation advice designed for your fields.',
      chooseLang: 'Choose preferred language',
      stepIndicator: 'Step',
      of: 'of 3',
      continue: 'Continue',
      back: 'Back',
      addFieldTitle: 'Add your first farm plot',
      addFieldSub: 'Provide basic details to calculate today’s crop water need.',
      fieldNameLabel: 'Field Name',
      fieldNamePlaceholder: 'e.g. North Plot, Bapa nu Khetar',
      cropLabel: 'Crop Type',
      cropWheat: 'Wheat (ઘઉં / गेहूं)',
      cropCotton: 'Cotton (કપાસ / कपास)',
      cropGroundnut: 'Groundnut (મગફળી / मूंगफली)',
      villageLabel: 'Village / Location',
      villagePlaceholder: 'e.g. Anjar, Kutch',
      sowingDateLabel: 'Sowing Date',
      areaLabel: 'Field Area (in acres)',
      areaPlaceholder: 'e.g. 0.57',
      errName: 'Please enter a field name.',
      errVillage: 'Please specify the village or location.',
      errDate: 'Please select a valid sowing date.',
      errArea: 'Please enter a valid area greater than 0 acres.',
      doneTitle: 'Your field is ready!',
      doneSub: 'Initial crop parameters and soil baseline have been registered.',
      summaryPlot: 'Plot Name',
      summaryCrop: 'Crop',
      summaryLocation: 'Location',
      summarySown: 'Sown Date',
      summaryArea: 'Area',
      seeDecisionCta: 'See today’s water decision'
    },
    hi: {
      appName: 'जल रक्षक AI',
      welcomeHero: 'सटीक जानिए कब और कितना पानी देना है।',
      welcomeSub: 'आपकी फसल और मिट्टी के अनुसार बनाई गई सीधी, वैज्ञानिक सिंचाई सलाह।',
      chooseLang: 'अपनी पसंदीदा भाषा चुनें',
      stepIndicator: 'चरण',
      of: 'का 3',
      continue: 'आगे बढ़ें',
      back: 'पीछे जाएं',
      addFieldTitle: 'अपना पहला खेत जोड़ें',
      addFieldSub: 'आज की सिंचाई आवश्यकता जानने के लिए खेत की बुनियादी जानकारी दें।',
      fieldNameLabel: 'खेत का नाम',
      fieldNamePlaceholder: 'उदा. उत्तर का खेत, बड़ा चक',
      cropLabel: 'फसल का प्रकार',
      cropWheat: 'गेहूं (Wheat)',
      cropCotton: 'कपास (Cotton)',
      cropGroundnut: 'मूंगफली (Groundnut)',
      villageLabel: 'गाँव / स्थान',
      villagePlaceholder: 'उदा. अंजार, कच्छ',
      sowingDateLabel: 'बुआई की तारीख',
      areaLabel: 'खेत का क्षेत्रफल (एकड़ में)',
      areaPlaceholder: 'उदा. 0.57',
      errName: 'कृपया खेत का नाम दर्ज करें।',
      errVillage: 'कृपया गाँव या स्थान का नाम दर्ज करें।',
      errDate: 'कृपया बुआई की सही तारीख चुनें।',
      errArea: 'कृपया 0 से अधिक एकड़ का सही क्षेत्रफल दर्ज करें।',
      doneTitle: 'आपका खेत तैयार है!',
      doneSub: 'फसल की स्थिति और मिट्टी का प्रारंभिक डेटा दर्ज हो चुका है।',
      summaryPlot: 'खेत का नाम',
      summaryCrop: 'फसल',
      summaryLocation: 'स्थान',
      summarySown: 'बुआई तिथि',
      summaryArea: 'क्षेत्रफल',
      seeDecisionCta: 'आज का सिंचाई निर्णय देखें'
    },
    gu: {
      appName: 'જલ રક્ષક AI',
      welcomeHero: 'ચોક્કસ જાણો ક્યારે અને કેટલું પાણી આપવું.',
      welcomeSub: 'તમારા પાક અને જમીનની જરૂરિયાત મુજબ સરળ, વૈજ્ઞાનિક પિયત માર્ગદર્શન.',
      chooseLang: 'તમારી પસંદગીની ભાષા પસંદ કરો',
      stepIndicator: 'પગલું',
      of: 'માંથી 3',
      continue: 'આગળ વધો',
      back: 'પાછા જાઓ',
      addFieldTitle: 'તમારું પ્રથમ ખેતર ઉમેરો',
      addFieldSub: 'આજના પિયતની ગણતરી કરવા માટે ખેતરની મૂળભૂત વિગતો આપો.',
      fieldNameLabel: 'ખેતરનું નામ',
      fieldNamePlaceholder: 'દા.ત. ઉત્તરનો ટુકડો, બાપાનું ખેતર',
      cropLabel: 'પાકનો પ્રકાર',
      cropWheat: 'ઘઉં (Wheat)',
      cropCotton: 'કપાસ (Cotton)',
      cropGroundnut: 'મગફળી (Groundnut)',
      villageLabel: 'ગામ / વિસ્તાર',
      villagePlaceholder: 'દા.ત. અંજાર, કચ્છ',
      sowingDateLabel: 'વાવણી તારીખ',
      areaLabel: 'ખેતરનો વિસ્તાર (એકરમાં)',
      areaPlaceholder: 'દા.ત. 0.57',
      errName: 'કૃપા કરીને ખેતરનું નામ લખો.',
      errVillage: 'કૃપા કરીને ગામ અથવા વિસ્તાર લખો.',
      errDate: 'કૃપા કરીને વાવણી તારીખ પસંદ કરો.',
      errArea: 'કૃપા કરીને 0 કરતાં વધુ એકર વિસ્તાર લખો.',
      doneTitle: 'તમારું ખેતર નોંધાઈ ગયું છે!',
      doneSub: 'પાકનો તબક્કો અને જમીનની પ્રાથમિક વિગતો સફળતાપૂર્વક સંગ્રહાઈ છે.',
      summaryPlot: 'ખેતરનું નામ',
      summaryCrop: 'પાક',
      summaryLocation: 'વિસ્તાર',
      summarySown: 'વાવણી તારીખ',
      summaryArea: 'વિસ્તાર',
      seeDecisionCta: 'આજનો પિયત નિર્ણય જુઓ'
    }
  }[language] || t.en;

  const validateFieldStep = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t.errName;
    }
    if (!formData.village.trim()) {
      newErrors.village = t.errVillage;
    }
    if (!formData.sowingDate.trim()) {
      newErrors.sowingDate = t.errDate;
    }
    const parsedAcres = parseFloat(formData.areaAcres);
    if (isNaN(parsedAcres) || parsedAcres <= 0) {
      newErrors.areaAcres = t.errArea;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (validateFieldStep()) {
        setStep(3);
      }
    }
  };

  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (onComplete) {
      onComplete({
        language,
        field: {
          name: formData.name.trim(),
          crop: formData.crop,
          village: formData.village.trim(),
          sowing_date: formData.sowingDate,
          area_acres: parseFloat(formData.areaAcres)
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F1] text-[#17231D] font-sans p-4 sm:p-6 flex flex-col justify-between max-w-md mx-auto">
      {/* Top Header & Step Progress Bar */}
      <header className="pt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl" role="img" aria-label="Drop">💧</span>
            <span className="text-base font-extrabold text-[#23613E] tracking-tight">
              {t.appName}
            </span>
          </div>
          <Badge variant="neutral">
            {t.stepIndicator} {step} {t.of}
          </Badge>
        </div>

        {/* 3-Step Progress Indicator */}
        <div
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin="1"
          aria-valuemax="3"
          aria-label={`Onboarding step ${step} of 3`}
          className="w-full bg-[#E1E7DE] h-2 rounded-full overflow-hidden flex"
        >
          <div
            style={{ width: `${(step / 3) * 100}%` }}
            className="bg-[#23613E] h-full transition-all duration-200"
          />
        </div>
      </header>

      {/* Step Content */}
      <main className="flex-1 my-auto py-2">
        {/* STEP 1: WELCOME & LANGUAGE */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="text-center p-6 space-y-3">
              <div className="text-4xl" role="img" aria-label="Sprout">
                🌱
              </div>
              <h1 className="text-2xl font-black text-[#17231D] leading-snug">
                {t.welcomeHero}
              </h1>
              <p className="text-xs text-[#66736A] leading-relaxed">
                {t.welcomeSub}
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <label className="block text-xs font-black uppercase text-[#66736A] tracking-wider">
                {t.chooseLang}
              </label>
              <div className="space-y-2">
                {[
                  { code: 'en', title: 'English', native: 'English' },
                  { code: 'hi', title: 'Hindi', native: 'हिन्दी' },
                  { code: 'gu', title: 'Gujarati', native: 'ગુજરાતી' }
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLanguage(item.code);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('jalrakshak_language', item.code);
                      }
                    }}
                    className={`w-full min-h-[50px] px-4 py-3 rounded-xl border-2 flex items-center justify-between text-left focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none ${
                      language === item.code
                        ? 'bg-[#EBF4ED] border-[#23613E] text-[#23613E]'
                        : 'bg-white border-[#E1E7DE] text-[#17231D]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-extrabold">{item.native}</div>
                      <div className="text-xs text-[#66736A]">{item.title}</div>
                    </div>
                    {language === item.code && (
                      <span className="text-[#23613E] font-black text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* STEP 2: ADD FIRST FIELD */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextStep();
            }}
            className="space-y-4"
          >
            <div>
              <h1 className="text-xl font-black text-[#17231D]">
                {t.addFieldTitle}
              </h1>
              <p className="text-xs text-[#66736A] mt-1 leading-relaxed">
                {t.addFieldSub}
              </p>
            </div>

            <Card className="p-4 space-y-3">
              {/* Field Name */}
              <div>
                <label
                  htmlFor="field-name"
                  className="block text-xs font-bold text-[#17231D] mb-1"
                >
                  {t.fieldNameLabel} *
                </label>
                <input
                  id="field-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.fieldNamePlaceholder}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'err-name' : undefined}
                  className="w-full min-h-[44px] px-3 bg-white border border-[#E1E7DE] rounded-lg text-sm font-semibold text-[#17231D] focus:border-[#23613E] focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none"
                />
                {errors.name && (
                  <p id="err-name" className="text-xs font-bold text-[#C94B42] mt-1" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Crop Select */}
              <div>
                <label
                  htmlFor="crop-type"
                  className="block text-xs font-bold text-[#17231D] mb-1"
                >
                  {t.cropLabel} *
                </label>
                <select
                  id="crop-type"
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                  className="w-full min-h-[44px] px-3 bg-white border border-[#E1E7DE] rounded-lg text-sm font-semibold text-[#17231D] focus:border-[#23613E] focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none"
                >
                  <option value="wheat">{t.cropWheat}</option>
                  <option value="cotton">{t.cropCotton}</option>
                  <option value="groundnut">{t.cropGroundnut}</option>
                </select>
              </div>

              {/* Village/Location */}
              <div>
                <label
                  htmlFor="village-name"
                  className="block text-xs font-bold text-[#17231D] mb-1"
                >
                  {t.villageLabel} *
                </label>
                <input
                  id="village-name"
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder={t.villagePlaceholder}
                  aria-invalid={!!errors.village}
                  aria-describedby={errors.village ? 'err-village' : undefined}
                  className="w-full min-h-[44px] px-3 bg-white border border-[#E1E7DE] rounded-lg text-sm font-semibold text-[#17231D] focus:border-[#23613E] focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none"
                />
                {errors.village && (
                  <p id="err-village" className="text-xs font-bold text-[#C94B42] mt-1" role="alert">
                    {errors.village}
                  </p>
                )}
              </div>

              {/* Sowing Date & Area Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="sowing-date"
                    className="block text-xs font-bold text-[#17231D] mb-1"
                  >
                    {t.sowingDateLabel} *
                  </label>
                  <input
                    id="sowing-date"
                    type="date"
                    value={formData.sowingDate}
                    onChange={(e) => setFormData({ ...formData, sowingDate: e.target.value })}
                    aria-invalid={!!errors.sowingDate}
                    aria-describedby={errors.sowingDate ? 'err-date' : undefined}
                    className="w-full min-h-[44px] px-2.5 bg-white border border-[#E1E7DE] rounded-lg text-xs font-semibold text-[#17231D] focus:border-[#23613E] focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none"
                  />
                  {errors.sowingDate && (
                    <p id="err-date" className="text-[11px] font-bold text-[#C94B42] mt-1" role="alert">
                      {errors.sowingDate}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="area-acres"
                    className="block text-xs font-bold text-[#17231D] mb-1"
                  >
                    {t.areaLabel} *
                  </label>
                  <input
                    id="area-acres"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.areaAcres}
                    onChange={(e) => setFormData({ ...formData, areaAcres: e.target.value })}
                    placeholder={t.areaPlaceholder}
                    aria-invalid={!!errors.areaAcres}
                    aria-describedby={errors.areaAcres ? 'err-area' : undefined}
                    className="w-full min-h-[44px] px-3 bg-white border border-[#E1E7DE] rounded-lg text-xs font-semibold text-[#17231D] focus:border-[#23613E] focus-visible:ring-2 focus-visible:ring-[#23613E] focus-visible:outline-none"
                  />
                  {errors.areaAcres && (
                    <p id="err-area" className="text-[11px] font-bold text-[#C94B42] mt-1" role="alert">
                      {errors.areaAcres}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </form>
        )}

        {/* STEP 3: COMPLETION SCREEN */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="text-center p-6 space-y-3">
              <div className="text-4xl text-[#23613E]" role="img" aria-label="Success">
                ✅
              </div>
              <h1 className="text-2xl font-black text-[#17231D]">
                {t.doneTitle}
              </h1>
              <p className="text-xs text-[#66736A] leading-relaxed">
                {t.doneSub}
              </p>
            </Card>

            {/* Field Confirmation Summary */}
            <Card className="p-4 space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-[#E1E7DE] text-xs">
                <span className="text-[#66736A] font-bold">{t.summaryPlot}:</span>
                <span className="font-extrabold text-[#17231D]">{formData.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E1E7DE] text-xs">
                <span className="text-[#66736A] font-bold">{t.summaryCrop}:</span>
                <span className="font-extrabold capitalize text-[#23613E]">{formData.crop}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E1E7DE] text-xs">
                <span className="text-[#66736A] font-bold">{t.summaryLocation}:</span>
                <span className="font-extrabold text-[#17231D]">{formData.village}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E1E7DE] text-xs">
                <span className="text-[#66736A] font-bold">{t.summarySown}:</span>
                <span className="font-extrabold text-[#17231D]">{formData.sowingDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-xs">
                <span className="text-[#66736A] font-bold">{t.summaryArea}:</span>
                <span className="font-extrabold text-[#17231D]">{formData.areaAcres} Acres</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Action Footer */}
      <footer className="pt-4 pb-2 space-y-2">
        {step < 3 ? (
          <div className="flex space-x-2">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep(step - 1)}
                className="w-1/3 min-h-[48px]"
              >
                {t.back}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNextStep}
              className={`min-h-[48px] ${step === 1 ? 'w-full' : 'w-2/3'}`}
            >
              {t.continue}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="w-full min-h-[52px] text-base"
          >
            {isSubmitting ? 'Saving Field to Firestore...' : `${t.seeDecisionCta} →`}
          </Button>
        )}
      </footer>
    </div>
  );
}
