/**
 * simulation.js
 * Prototype Heuristic: "What if I wait?" irrigation delay impact estimation.
 *
 * PROTOTYPE HEURISTIC NOTICE:
 * Projections below are simplified prototype heuristics based on daily reference
 * evapotranspiration deficit in semi-arid conditions without rainfall.
 * They do not model physical soil hydraulic conductivity, neutron probe readings,
 * or guaranteed crop yield protection/decline percentages.
 */

export function simulateWaitingImpact({
  score = null,
  riskLevel = 'unknown',
  recMm = null,
  forecastRainfallMm = 0.0,
  cropStage = 'mid_season',
  timestamp = null,
  waitHours = 24,
  insufficientData = false
} = {}) {
  // If baseline assessment is missing or incomplete, disable simulation rather than fabricate results
  if (insufficientData || score === null || score === undefined) {
    return {
      insufficientData: true,
      disabledReason: 'Assessment inputs (soil moisture or weather rainfall) are incomplete. Delay simulation is disabled.',
      inputs: { score, riskLevel, recMm, forecastRainfallMm, cropStage, timestamp, waitHours }
    };
  }

  const currentScore = Math.max(0, Math.min(100, Number(score || 0)));
  const rainfall = Number(forecastRainfallMm ?? 0.0);
  const hours = Number(waitHours) === 48 ? 48 : 24;
  const numRecMm = recMm !== null ? Number(recMm) : 0;

  // 1. Water Today (Recommended Plan)
  // Mitigates estimated moisture deficit based on prototype heuristic
  const waterTodayScore = numRecMm > 0
    ? Math.max(15, Math.min(30, Math.round(currentScore * 0.3)))
    : currentScore;
  const waterTodayRisk = waterTodayScore >= 70 ? 'high' : waterTodayScore >= 35 ? 'medium' : 'low';

  // 2. Wait Selected Duration (24h or 48h)
  // Prototype heuristic: In dry conditions (< 5 mm rain), daily evaporative depletion increases stress
  let stressDelta = 0;
  if (rainfall < 5.0) {
    stressDelta = hours === 48 ? 12 : 6;
    if (cropStage === 'mid_season' || cropStage === 'flowering') {
      stressDelta += hours === 48 ? 4 : 2;
    }
  } else if (rainfall >= 5.0 && rainfall < 15.0) {
    stressDelta = hours === 48 ? 2 : 0;
  } else {
    // Significant rain (>= 15 mm) mitigates atmospheric demand
    stressDelta = hours === 48 ? -4 : -2;
  }

  const simulatedScore = Math.max(0, Math.min(100, currentScore + stressDelta));
  const simulatedRisk = simulatedScore >= 70 ? 'high' : simulatedScore >= 35 ? 'medium' : 'low';

  return {
    insufficientData: false,
    isPrototypeHeuristic: true,
    methodology: 'Simplified daily evapotranspiration deficit heuristic; not a verified physical yield model.',
    inputs: {
      score: currentScore,
      riskLevel,
      recMm: numRecMm,
      forecastRainfallMm: rainfall,
      cropStage,
      timestamp,
      waitHours: hours
    },
    waterToday: {
      score: waterTodayScore,
      riskLevel: waterTodayRisk,
      actionText: numRecMm > 0 ? `Apply estimated ${numRecMm} mm today` : 'Maintain current schedule',
      consequence: {
        en: numRecMm > 0
          ? `Applies planned irrigation depth to mitigate estimated daily evaporative deficit.`
          : 'Moisture balance estimated as adequate. Withholds unnecessary water application.',
        hi: numRecMm > 0
          ? `अनुमानित दैनिक वाष्पीकरण कमी को पूरा करने के लिए नियोजित सिंचाई की जाती है।`
          : 'नमी संतुलन पर्याप्त माना गया है। अनावश्यक पानी देने से बचाव होता है।',
        gu: numRecMm > 0
          ? `અંદાજિત દૈનિક બાષ્પીભવન ઘટ ઘટાડવા માટે આયોજિત પિયત આપવામાં આવે છે.`
          : 'ભેજ સંતુલન પર્યાપ્ત મનાય છે. બિનજરૂરી પાણી આપવાનું ટાળે છે.'
      }
    },
    waitSelected: {
      score: simulatedScore,
      riskLevel: simulatedRisk,
      stressDelta,
      waitHours: hours,
      actionText: hours === 48 ? 'Delay irrigation by 48 hours' : 'Delay irrigation by 24 hours',
      consequence: {
        en: simulatedRisk === 'high'
          ? (hours === 48
              ? 'Elevated evaporative moisture deficit. High atmospheric demand without irrigation increases crop water stress.'
              : 'Soil moisture depletion continues under dry conditions. Monitor crop for moisture stress signs.')
          : (simulatedRisk === 'medium'
              ? (hours === 48
                  ? 'Moderate moisture decline projected. Watch root-zone moisture progression.'
                  : 'Slight moisture decline. Forecast rainfall may partially offset deficit.')
              : 'Estimated moisture buffer remains adequate; no immediate stress spike projected.'),
        hi: simulatedRisk === 'high'
          ? (hours === 48
              ? 'वाष्पीकरण में वृद्धि। बिना सिंचाई के शुष्क मौसम में फसल पर जल तनाव बढ़ सकता है।'
              : 'शुष्क परिस्थितियों में नमी में गिरावट जारी रहेगी। फसल की स्थिति पर नजर रखें।')
          : (simulatedRisk === 'medium'
              ? (hours === 48
                  ? 'मध्यम नमी कमी का अनुमान। जड़ क्षेत्र की नमी की जांच करें।'
                  : 'हल्की नमी गिरावट। संभावित वर्षा कमी को आंशिक रूप से संतुलित कर सकती है।')
              : 'अनुमानित नमी बफर पर्याप्त है; तत्काल तनाव की संभावना कम है।'),
        gu: simulatedRisk === 'high'
          ? (hours === 48
              ? 'બાષ્પીભવન ખેંચમાં વધારો. પિયત વિના સૂકા વાતાવરણમાં પાક પર પાણીની ખેંચ વધી શકે છે.'
              : 'સૂકા વાતાવરણમાં ભેજ ઘટવાનું ચાલુ રહેશે. પાકની સ્થિતિ પર નજર રાખો.')
          : (simulatedRisk === 'medium'
              ? (hours === 48
                  ? 'મધ્યમ ભેજ ઘટનું અનુમાન. મૂળ વિસ્તારમાં ભેજની ચકાસણી કરો.'
                  : 'સામાન્ય ભેજ ઘટ. આગાહી કરેલ વરસાદ આંશિક રાહત આપી શકે છે.')
              : 'અંદાજિત ભેજ પૂરતો છે; તાત્કાલિક ખેંચની શક્યતા ઓછી છે.')
      }
    }
  };
}
