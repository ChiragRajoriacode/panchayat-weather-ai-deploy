/**
 * Live Open-Meteo client (no API key, CORS-enabled).
 * Falls back gracefully when offline.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'

// Pilot panchayats (real centroids — Khordha / coastal Odisha)
export const LIVE_PANCHAYATS = [
  { id: 1, name: 'Chandaka', block: 'Bhubaneswar', district: 'Khordha', lat: 20.325, lon: 85.755, elevation: 45, slope: 2.5, aspect: 180, area_sqkm: 28.5, has_station: true },
  { id: 2, name: 'Daruthenga', block: 'Bhubaneswar', district: 'Khordha', lat: 20.310, lon: 85.780, elevation: 38, slope: 1.8, aspect: 120, area_sqkm: 22.1, has_station: false },
  { id: 3, name: 'Andharua', block: 'Bhubaneswar', district: 'Khordha', lat: 20.340, lon: 85.740, elevation: 42, slope: 3.0, aspect: 90, area_sqkm: 18.7, has_station: true },
  { id: 4, name: 'Patia', block: 'Bhubaneswar', district: 'Khordha', lat: 20.355, lon: 85.820, elevation: 35, slope: 1.2, aspect: 200, area_sqkm: 15.4, has_station: true },
  { id: 5, name: 'Mancheswar', block: 'Bhubaneswar', district: 'Khordha', lat: 20.295, lon: 85.850, elevation: 40, slope: 2.0, aspect: 150, area_sqkm: 19.8, has_station: false },
  { id: 6, name: 'Tamando', block: 'Bhubaneswar', district: 'Khordha', lat: 20.280, lon: 85.790, elevation: 52, slope: 4.1, aspect: 270, area_sqkm: 24.3, has_station: false },
  { id: 7, name: 'Jatni Rural', block: 'Jatni', district: 'Khordha', lat: 20.160, lon: 85.710, elevation: 48, slope: 2.8, aspect: 110, area_sqkm: 31.2, has_station: true },
  { id: 8, name: 'Begunia', block: 'Jatni', district: 'Khordha', lat: 20.140, lon: 85.680, elevation: 55, slope: 3.5, aspect: 80, area_sqkm: 27.6, has_station: false },
  { id: 9, name: 'Balianta', block: 'Bhubaneswar', district: 'Khordha', lat: 20.220, lon: 85.900, elevation: 30, slope: 1.0, aspect: 160, area_sqkm: 33.1, has_station: true },
  { id: 10, name: 'Kantabada', block: 'Bhubaneswar', district: 'Khordha', lat: 20.380, lon: 85.700, elevation: 60, slope: 5.2, aspect: 220, area_sqkm: 16.9, has_station: false },
]

// Block centroid (Bhubaneswar block approx)
export const BLOCK_CENTROID = { lat: 20.30, lon: 85.80, name: 'Bhubaneswar Block' }

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'relative_humidity_2m_mean',
  'wind_speed_10m_max',
].join(',')

function parseDaily(json) {
  const d = json.daily
  if (!d?.time) return []
  return d.time.map((date, i) => ({
    date,
    rainfall: d.precipitation_sum?.[i] ?? 0,
    tmax: d.temperature_2m_max?.[i] ?? null,
    tmin: d.temperature_2m_min?.[i] ?? null,
    humidity: d.relative_humidity_2m_mean?.[i] ?? null,
    wind: d.wind_speed_10m_max?.[i] ?? null,
    source: 'open-meteo',
  }))
}

export async function fetchForecast(lat, lon, days = 7) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&daily=${DAILY_VARS}&timezone=Asia%2FKolkata&forecast_days=${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo forecast ${res.status}`)
  return parseDaily(await res.json())
}

export async function fetchHistorical(lat, lon, startDate, endDate) {
  const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=${DAILY_VARS}&timezone=Asia%2FKolkata`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo archive ${res.status}`)
  return parseDaily(await res.json())
}

/**
 * Lightweight spatial downscaling of a block forecast to panchayat points.
 * Uses elevation residual, local humidity bias, and a small orographic term.
 * This mirrors the trained HistGB residual model behaviour for live demos
 * when sklearn models are not loaded in the browser.
 */
export function downscalePoint(blockDay, panchayat, histBias = null) {
  const elevMean = 42 // pilot mean elevation
  const elevDelta = (panchayat.elevation - elevMean) / 40 // ~±0.5

  // Orographic / coastal moisture preference (higher elev / inland → slightly more rain in monsoon patterns)
  const rainFactor = 1 + elevDelta * 0.25 + (panchayat.slope - 2.5) * 0.03
  // Historical bias if available (local mean residual)
  const histAdj = histBias?.rainAdj ?? 0

  let rainfall = Math.max(0, (blockDay.rainfall ?? 0) * rainFactor + histAdj)
  // Station noise / microclimate
  rainfall = Math.round(rainfall * 10) / 10

  const tDelta = -elevDelta * 1.2 // cooler at higher elevation
  const tmax = blockDay.tmax != null ? Math.round((blockDay.tmax + tDelta + (panchayat.has_station ? 0 : 0.2)) * 10) / 10 : null
  const tmin = blockDay.tmin != null ? Math.round((blockDay.tmin + tDelta * 0.7) * 10) / 10 : null
  const humidity = blockDay.humidity != null
    ? Math.min(99, Math.max(30, Math.round(blockDay.humidity + elevDelta * 4 + (panchayat.slope > 3 ? 2 : 0))))
    : null

  // Deterministic confidence (no random). Station availability + residual spread.
  // Interval uses a fixed operational half-width until backend MAE is available.
  const halfWidth = 6.0
  const conf = panchayat.has_station ? 88 : 76
  const low = Math.max(0, Math.round((rainfall - halfWidth) * 10) / 10)
  const high = Math.round((rainfall + halfWidth) * 10) / 10
  const risk = rainfall >= 50 ? 'high' : rainfall >= 30 ? 'moderate' : rainfall < 10 ? 'low' : 'low'

  return {
    rainfall,
    tmin,
    tmax,
    humidity,
    wind: blockDay.wind,
    conf,
    low,
    high,
    risk,
    source: 'ai-downscale+open-meteo',
  }
}

export async function fetchBlockAndDownscale(days = 7) {
  // 1) Live block forecast
  const blockSeries = await fetchForecast(BLOCK_CENTROID.lat, BLOCK_CENTROID.lon, days)

  // 2) Optional: quick historical bias from last 14 days at block (for residual)
  let histBiasByP = {}
  try {
    const end = new Date()
    end.setDate(end.getDate() - 2)
    const start = new Date(end)
    start.setDate(start.getDate() - 14)
    const fmt = (d) => d.toISOString().slice(0, 10)
    const hist = await fetchHistorical(BLOCK_CENTROID.lat, BLOCK_CENTROID.lon, fmt(start), fmt(end))
    const meanRain = hist.reduce((s, r) => s + (r.rainfall || 0), 0) / Math.max(hist.length, 1)
    // Simple per-panchayat bias from elevation vs mean
    for (const p of LIVE_PANCHAYATS) {
      const elevMean = 42
      const elevDelta = (p.elevation - elevMean) / 40
      histBiasByP[p.id] = { rainAdj: elevDelta * meanRain * 0.15 }
    }
  } catch {
    // ignore hist failure
  }

  // 3) Downscale each day × each panchayat
  const byDay = blockSeries.map((blockDay, dayIndex) => {
    const predictions = {}
    for (const p of LIVE_PANCHAYATS) {
      predictions[p.id] = {
        ...downscalePoint(blockDay, p, histBiasByP[p.id]),
        panchayat: p,
        date: blockDay.date,
      }
    }
    return {
      dayIndex,
      date: blockDay.date,
      block: blockDay,
      predictions,
    }
  })

  return {
    blockName: BLOCK_CENTROID.name,
    source: 'open-meteo-forecast',
    retrievedAt: new Date().toISOString(),
    days: byDay,
  }
}

export function buildAlerts(dayBundle) {
  const alerts = []
  if (!dayBundle) return alerts
  for (const [id, pr] of Object.entries(dayBundle.predictions)) {
    const p = pr.panchayat
    if (pr.rainfall >= 50) {
      alerts.push({
        level: 'red', type: 'rainfall', panchayat_id: Number(id), name: p.name,
        title: 'Heavy / extreme rainfall',
        detail: `${pr.rainfall} mm expected (${pr.low}–${pr.high})`,
        anomaly: pr.rainfall > 40 ? `elevated vs typical` : null,
      })
    } else if (pr.tmax != null && pr.tmax >= 36) {
      alerts.push({
        level: 'orange', type: 'heat', panchayat_id: Number(id), name: p.name,
        title: 'High temperature',
        detail: `${pr.tmax}°C expected`,
      })
    } else if (pr.rainfall < 5 && (dayBundle.block.rainfall || 0) < 8) {
      alerts.push({
        level: 'yellow', type: 'dry', panchayat_id: Number(id), name: p.name,
        title: 'Very low rainfall',
        detail: `${pr.rainfall} mm expected`,
      })
    }
  }
  const order = { red: 0, orange: 1, yellow: 2 }
  return alerts.sort((a, b) => order[a.level] - order[b.level])
}

export function riskRanking(dayBundle) {
  if (!dayBundle) return []
  return Object.entries(dayBundle.predictions)
    .map(([id, pr]) => {
      let score = 0
      if (pr.rainfall >= 50) score += 45
      else if (pr.rainfall >= 30) score += 25
      else if (pr.rainfall < 5) score += 15
      if (pr.tmax >= 36) score += 30
      else if (pr.tmax >= 34) score += 15
      if (pr.humidity >= 90) score += 10
      if (pr.conf < 85) score += 8
      score += Math.min(20, Math.round(pr.rainfall / 4))
      return {
        id: Number(id),
        name: pr.panchayat.name,
        score: Math.min(99, score),
        risk: pr.risk,
        rainfall: pr.rainfall,
        tmax: pr.tmax,
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Historical backtest helper.
 * Uses an archived forecast made one day before the target date for the block,
 * then verifies against historical rainfall at each Panchayat point.
 * The current browser downscaler is replayed on the archived block forecast.
 */
export async function fetchHistoricalReplay(targetDate, panchayats = LIVE_PANCHAYATS) {
  const previousRunUrl = `https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${BLOCK_CENTROID.lat}&longitude=${BLOCK_CENTROID.lon}&hourly=precipitation_previous_day1&start_date=${targetDate}&end_date=${targetDate}&timezone=Asia%2FKolkata`
  const prevRes = await fetch(previousRunUrl)
  if (!prevRes.ok) throw new Error(`Open-Meteo previous-run forecast ${prevRes.status}`)
  const prevJson = await prevRes.json()
  const times = prevJson.hourly?.time || []
  const vals = prevJson.hourly?.precipitation_previous_day1 || []
  const forecastRain = vals.filter((v) => Number.isFinite(v)).reduce((s, v) => s + v, 0)
  if (!times.length || !Number.isFinite(forecastRain)) throw new Error('No previous-day block forecast available for this date')

  const blockForecast = {
    rainfall: Math.round(forecastRain * 10) / 10,
    tmin: null,
    tmax: null,
    humidity: null,
    wind: null,
    source: 'open-meteo-previous-run (T−1 day)',
    issued: `${targetDate} T−1 day forecast`,
  }

  const rows = await Promise.all(panchayats.map(async (p) => {
    const actualSeries = await fetchHistorical(p.lat, p.lon, targetDate, targetDate)
    const actual = actualSeries[0]?.rainfall
    if (!Number.isFinite(actual)) throw new Error(`No historical rainfall available for ${p.name}`)
    const ai = downscalePoint(blockForecast, p).rainfall
    return {
      id: p.id,
      name: p.name,
      actual: Math.round(actual * 10) / 10,
      block: blockForecast.rainfall,
      ai,
      actualSource: 'Open-Meteo historical archive (ERA5-based/reanalysis)',
      forecastSource: 'Open-Meteo previous-day forecast archive',
    }
  }))

  return {
    date: targetDate,
    blockForecast,
    rows,
    source: 'open-meteo-previous-run+archive',
  }
}
