/**
 * Rich demo dataset for SIH26074 PanchayatWeather AI prototype.
 * Values are realistic for coastal Odisha (Khordha / Bhubaneswar block pilot).
 * When backend is available, live API results override these.
 */

export const DISTRICTS = [
  { id: 1, name: 'Khordha' },
  { id: 2, name: 'Cuttack' },
  { id: 3, name: 'Puri' },
]

export const BLOCKS = {
  1: [
    { id: 1, name: 'Bhubaneswar', district_id: 1 },
    { id: 2, name: 'Jatni', district_id: 1 },
  ],
  2: [{ id: 3, name: 'Cuttack Sadar', district_id: 2 }],
  3: [{ id: 4, name: 'Puri', district_id: 3 }],
}

export const PANCHAYATS = [
  { id: 1, name: 'Chandaka', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 45, slope: 2.5, aspect: 180, area_sqkm: 28.5, lat: 20.325, lon: 85.755, has_station: true },
  { id: 2, name: 'Daruthenga', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 38, slope: 1.8, aspect: 120, area_sqkm: 22.1, lat: 20.310, lon: 85.780, has_station: false },
  { id: 3, name: 'Andharua', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 42, slope: 3.0, aspect: 90, area_sqkm: 18.7, lat: 20.340, lon: 85.740, has_station: true },
  { id: 4, name: 'Patia', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 35, slope: 1.2, aspect: 200, area_sqkm: 15.4, lat: 20.355, lon: 85.820, has_station: true },
  { id: 5, name: 'Mancheswar', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 40, slope: 2.0, aspect: 150, area_sqkm: 19.8, lat: 20.295, lon: 85.850, has_station: false },
  { id: 6, name: 'Tamando', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 52, slope: 4.1, aspect: 270, area_sqkm: 24.3, lat: 20.280, lon: 85.790, has_station: false },
  { id: 7, name: 'Jatni Rural', block_id: 2, block: 'Jatni', district: 'Khordha', elevation: 48, slope: 2.8, aspect: 110, area_sqkm: 31.2, lat: 20.160, lon: 85.710, has_station: true },
  { id: 8, name: 'Begunia', block_id: 2, block: 'Jatni', district: 'Khordha', elevation: 55, slope: 3.5, aspect: 80, area_sqkm: 27.6, lat: 20.140, lon: 85.680, has_station: false },
  { id: 9, name: 'Balianta', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 30, slope: 1.0, aspect: 160, area_sqkm: 33.1, lat: 20.220, lon: 85.900, has_station: true },
  { id: 10, name: 'Kantabada', block_id: 1, block: 'Bhubaneswar', district: 'Khordha', elevation: 60, slope: 5.2, aspect: 220, area_sqkm: 16.9, lat: 20.380, lon: 85.700, has_station: false },
]

// Block-level baseline (what IMD/Open-Meteo would give for the whole block)
export const BLOCK_FORECAST = {
  rainfall: 35,
  tmin: 26.2,
  tmax: 33.5,
  humidity: 78,
  wind: 12,
  source: 'Open-Meteo (block centroid)',
  date: '2026-09-29',
}

// AI downscaled predictions — spatial variation is the whole point
export const AI_PREDICTIONS = {
  1: { rainfall: 42, tmin: 25.8, tmax: 32.9, humidity: 82, conf: 91, low: 36, high: 49, risk: 'moderate' },
  2: { rainfall: 24, tmin: 26.4, tmax: 33.8, humidity: 69, conf: 87, low: 18, high: 31, risk: 'low' },
  3: { rainfall: 57, tmin: 25.1, tmax: 31.8, humidity: 91, conf: 89, low: 49, high: 64, risk: 'high' },
  4: { rainfall: 31, tmin: 26.0, tmax: 33.2, humidity: 76, conf: 93, low: 26, high: 37, risk: 'low' },
  5: { rainfall: 39, tmin: 25.9, tmax: 33.0, humidity: 80, conf: 85, low: 32, high: 46, risk: 'moderate' },
  6: { rainfall: 48, tmin: 25.4, tmax: 32.4, humidity: 84, conf: 82, low: 40, high: 56, risk: 'moderate' },
  7: { rainfall: 28, tmin: 26.5, tmax: 34.1, humidity: 71, conf: 88, low: 22, high: 35, risk: 'low' },
  8: { rainfall: 33, tmin: 26.1, tmax: 33.4, humidity: 74, conf: 84, low: 27, high: 40, risk: 'low' },
  9: { rainfall: 51, tmin: 25.6, tmax: 32.1, humidity: 88, conf: 90, low: 44, high: 58, risk: 'high' },
  10: { rainfall: 36, tmin: 25.3, tmax: 32.6, humidity: 77, conf: 79, low: 28, high: 44, risk: 'moderate' },
}

// Multi-day forecasts for time slider
export const FORECAST_DAYS = [
  { label: 'Today', date: '2026-09-29', offset: 0 },
  { label: 'Tomorrow', date: '2026-09-30', offset: 1 },
  { label: '+2 days', date: '2026-10-01', offset: 2 },
  { label: '+3 days', date: '2026-10-02', offset: 3 },
  { label: '+5 days', date: '2026-10-04', offset: 5 },
]

// Day multipliers to vary the map over the time slider
const DAY_FACTORS = [1.0, 1.35, 0.7, 0.45, 1.8]

export function getPredictionsForDay(dayIndex = 0) {
  const f = DAY_FACTORS[dayIndex] ?? 1
  const out = {}
  for (const [id, p] of Object.entries(AI_PREDICTIONS)) {
    const rf = Math.round(p.rainfall * f * 10) / 10
    out[id] = {
      ...p,
      rainfall: rf,
      tmin: Math.round((p.tmin + (f - 1) * 0.8) * 10) / 10,
      tmax: Math.round((p.tmax + (f - 1) * 1.2) * 10) / 10,
      humidity: Math.min(98, Math.round(p.humidity * (0.9 + f * 0.1))),
      low: Math.round(rf * 0.85),
      high: Math.round(rf * 1.15),
      risk: rf > 50 ? 'high' : rf > 30 ? 'moderate' : 'low',
    }
  }
  return out
}

export function getBlockForDay(dayIndex = 0) {
  const f = DAY_FACTORS[dayIndex] ?? 1
  return {
    ...BLOCK_FORECAST,
    rainfall: Math.round(BLOCK_FORECAST.rainfall * f * 10) / 10,
    tmin: Math.round((BLOCK_FORECAST.tmin + (f - 1) * 0.6) * 10) / 10,
    tmax: Math.round((BLOCK_FORECAST.tmax + (f - 1) * 1.0) * 10) / 10,
  }
}

// Historical validation event (for replay)
export const HISTORICAL_EVENT = {
  date: '2025-07-18',
  label: '18 July 2025 — Heavy monsoon spell',
  block_rainfall: 35,
  actuals: {
    1: 43, 2: 22, 3: 58, 4: 29, 5: 37,
    6: 51, 7: 26, 8: 31, 9: 54, 10: 34,
  },
  ai_preds: {
    1: 41, 2: 24, 3: 55, 4: 31, 5: 39,
    6: 48, 7: 28, 8: 33, 9: 52, 10: 36,
  },
}

// Model performance (from evaluate_model.py style experiments)
/** ILLUSTRATIVE_ONLY — shown only when /api/model/metrics is unavailable. Not claimed as measured skill. */
export const MODEL_METRICS = null // prefer backend; UI must show N/A if null

export const MODEL_METRICS_PLACEHOLDER = {
  rainfall: { block_mae: 12.4, ai_mae: 5.8, block_rmse: 15.1, ai_rmse: 7.3, ai_r2: 0.71 },
  tmax: { block_mae: 2.8, ai_mae: 1.7, block_rmse: 3.4, ai_rmse: 2.1, ai_r2: 0.68 },
  tmin: { block_mae: 2.4, ai_mae: 1.5, block_rmse: 2.9, ai_rmse: 1.9, ai_r2: 0.72 },
}

export const MODEL_COMPARISON = [
  { name: 'Baseline (Block copy)', rainfall_mae: null, tmax_mae: null, tmin_mae: null },
  { name: 'Random Forest', rainfall_mae: null, tmax_mae: null, tmin_mae: null },
  { name: 'XGBoost', rainfall_mae: null, tmax_mae: null, tmin_mae: null },
  { name: 'HistGradientBoosting', rainfall_mae: null, tmax_mae: null, tmin_mae: null },
]

export const FEATURE_IMPORTANCE = [
  { name: 'Block rainfall', value: 32 },
  { name: 'Historical rainfall (7d)', value: 22 },
  { name: 'Humidity', value: 14 },
  { name: 'Elevation', value: 11 },
  { name: 'Season / DOY', value: 8 },
  { name: 'Slope', value: 6 },
  { name: 'Aspect', value: 4 },
  { name: 'Distance to coast', value: 3 },
]

// Per-panchayat SHAP-style influence for explainability
export function getFeatureInfluence(panchayatId) {
  const p = AI_PREDICTIONS[panchayatId] || AI_PREDICTIONS[1]
  const elev = PANCHAYATS.find((x) => x.id === panchayatId)?.elevation || 40
  return [
    { name: 'Block rainfall', value: 28 + (p.rainfall > 40 ? 8 : 0) },
    { name: 'Historical rainfall', value: 18 + (p.rainfall > 45 ? 6 : 2) },
    { name: 'Humidity', value: 12 + Math.round((p.humidity - 70) / 5) },
    { name: 'Elevation', value: 8 + Math.round((elev - 35) / 5) },
    { name: 'Season', value: 7 },
    { name: 'Slope / GIS', value: 5 },
  ].sort((a, b) => b.value - a.value)
}

// Data quality per panchayat
export function getDataQuality(panchayatId) {
  const p = PANCHAYATS.find((x) => x.id === panchayatId)
  const station = p?.has_station
  return {
    weather: station ? 'good' : 'limited',
    historical: 'good',
    gis: 'good',
    elevation: 'good',
    local_obs: station ? 'good' : 'limited',
    overall: station ? 92 : 74,
    note: station
      ? 'Direct station + reanalysis available'
      : 'No direct station — nearest observations + GIS + block forecast used',
  }
}

// Extreme weather + alerts
export function getAlerts(dayIndex = 0) {
  const preds = getPredictionsForDay(dayIndex)
  const alerts = []
  for (const p of PANCHAYATS) {
    const pr = preds[p.id]
    if (!pr) continue
    if (pr.rainfall >= 50) {
      alerts.push({
        level: 'red',
        type: 'rainfall',
        panchayat_id: p.id,
        name: p.name,
        title: 'Extreme rainfall expected',
        detail: `${pr.rainfall} mm / 24h (hist. avg ~41 mm)`,
        anomaly: `+${Math.round(((pr.rainfall - 41) / 41) * 100)}%`,
      })
    } else if (pr.tmax >= 34) {
      alerts.push({
        level: 'orange',
        type: 'heat',
        panchayat_id: p.id,
        name: p.name,
        title: 'High temperature',
        detail: `${pr.tmax}°C expected`,
      })
    } else if (pr.rainfall < 15 && dayIndex < 2) {
      alerts.push({
        level: 'yellow',
        type: 'dry',
        panchayat_id: p.id,
        name: p.name,
        title: 'Low rainfall',
        detail: `Only ${pr.rainfall} mm expected`,
      })
    }
  }
  return alerts.sort((a, b) => {
    const order = { red: 0, orange: 1, yellow: 2 }
    return order[a.level] - order[b.level]
  })
}

// Ranking by risk
export function getRiskRanking(dayIndex = 0) {
  const preds = getPredictionsForDay(dayIndex)
  return PANCHAYATS.map((p) => {
    const pr = preds[p.id]
    let score = 0
    if (pr.rainfall > 50) score += 40
    else if (pr.rainfall > 35) score += 25
    else if (pr.rainfall < 15) score += 15
    if (pr.tmax >= 34) score += 30
    if (pr.humidity > 88) score += 15
    if (pr.conf < 85) score += 10
    return {
      id: p.id,
      name: p.name,
      score: Math.min(99, score + Math.round(pr.rainfall / 3)),
      risk: pr.risk,
      rainfall: pr.rainfall,
      tmax: pr.tmax,
    }
  }).sort((a, b) => b.score - a.score)
}

// Crop advisories (rule-based, agronomic)
export const CROPS = ['Rice', 'Wheat', 'Maize', 'Vegetables']
export const STAGES = {
  Rice: ['Sowing', 'Vegetative', 'Flowering', 'Grain filling', 'Harvest'],
  Wheat: ['Sowing', 'Tillering', 'Flowering', 'Grain filling', 'Harvest'],
  Maize: ['Sowing', 'Vegetative', 'Tasseling', 'Grain filling', 'Harvest'],
  Vegetables: ['Transplanting', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest'],
}

export function getAdvisory(crop, stage, rainfall, tmax) {
  const recs = []
  let severity = 'info'
  let summary = 'Conditions generally favourable.'

  if (rainfall >= 50) {
    severity = 'alert'
    summary = 'Heavy rainfall expected — take protective measures.'
    recs.push('Check and clear drainage channels immediately')
    recs.push('Avoid unnecessary irrigation')
    recs.push('Monitor for waterlogging in low-lying fields')
    if (stage === 'Flowering' || stage === 'Grain filling') {
      recs.push('Risk of lodging / grain damage — consider delayed harvest if possible')
    }
    if (crop === 'Rice' && (stage === 'Sowing' || stage === 'Vegetative')) {
      recs.push('Maintain bund height to retain beneficial water, but prevent overflow')
    }
  } else if (rainfall >= 25) {
    severity = 'watch'
    summary = 'Moderate rainfall expected — useful for most crops.'
    recs.push('Reduce supplemental irrigation')
    recs.push('Good opportunity for top-dressing after rain stops')
  } else if (rainfall < 10) {
    severity = 'watch'
    summary = 'Low rainfall — monitor soil moisture.'
    recs.push('Plan supplemental irrigation if soil moisture drops')
    if (stage === 'Flowering') recs.push('Critical stage — do not allow moisture stress')
  }

  if (tmax >= 34) {
    severity = severity === 'alert' ? 'alert' : 'watch'
    recs.push('High temperature stress possible — ensure adequate soil moisture')
    if (crop === 'Wheat') recs.push('Wheat is sensitive to heat during grain filling')
  }

  if (recs.length === 0) {
    recs.push('Continue standard crop management practices')
    recs.push('Follow local agricultural department guidance')
  }
  recs.push('Always cross-check with local Krishi Vigyan Kendra / AO advice')

  return { severity, summary, recommendations: recs }
}

// Historical analogues
export const SIMILAR_EVENTS = [
  { date: '18 July 2024', similarity: 94, rainfall: 48, note: 'Similar monsoon pulse; localised flooding in low areas' },
  { date: '02 August 2023', similarity: 89, rainfall: 52, note: 'Heavy spell; drainage issues reported in Andharua' },
  { date: '21 July 2022', similarity: 83, rainfall: 41, note: 'Moderate-heavy; good for paddy transplant' },
]

// Scenario simulation helper
export function runScenario(rainfallAdjPct, tempAdjC, dayIndex = 0) {
  const base = getPredictionsForDay(dayIndex)
  const out = {}
  for (const [id, p] of Object.entries(base)) {
    const rf = Math.round(p.rainfall * (1 + rainfallAdjPct / 100) * 10) / 10
    out[id] = {
      ...p,
      rainfall: Math.max(0, rf),
      tmin: Math.round((p.tmin + tempAdjC) * 10) / 10,
      tmax: Math.round((p.tmax + tempAdjC) * 10) / 10,
      low: Math.round(Math.max(0, rf) * 0.85),
      high: Math.round(Math.max(0, rf) * 1.15),
      risk: rf > 50 ? 'high' : rf > 30 ? 'moderate' : 'low',
    }
  }
  return out
}

export const LAYER_OPTIONS = [
  { id: 'rainfall', label: '🌧 Rainfall', unit: 'mm' },
  { id: 'tmax', label: '🌡 Temperature (max)', unit: '°C' },
  { id: 'humidity', label: '💧 Humidity', unit: '%' },
  { id: 'elevation', label: '⛰ Elevation', unit: 'm' },
  { id: 'risk', label: '⚠️ Risk', unit: '' },
  { id: 'confidence', label: '🎯 Confidence', unit: '%' },
]
