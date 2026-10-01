import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getStatus, getHealth, getDistricts, getBlocks, getPanchayats, downscale, getMapPanchayats, getModelMetrics, getBlockForecast,
} from '../services/api'
import { fetchBlockAndDownscale, buildAlerts, riskRanking, LIVE_PANCHAYATS } from '../services/liveWeather'
import {
  getPredictionsForDay, getBlockForDay,
  getAlerts as demoAlerts, getRiskRanking as demoRanking, FORECAST_DAYS,
} from '../data/demoData'

const LiveCtx = createContext(null)

function na(v) {
  return v === null || v === undefined || Number.isNaN(v) ? null : v
}

export function LiveDataProvider({ children }) {
  const [status, setStatus] = useState('loading') // loading | backend | live | demo
  const [live, setLive] = useState(null)
  const [dayIdx, setDayIdx] = useState(0)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [districts, setDistricts] = useState([])
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [modelMetrics, setModelMetrics] = useState(null)
  const [downscaleResult, setDownscaleResult] = useState(null)

  const refresh = useCallback(async () => {
    setError(null)
    // 1) Try backend health/status
    try {
      const st = await getStatus()
      setBackendStatus(st.data)
      try { await getHealth() } catch (_) {}
      try {
        const d = await getDistricts()
        setDistricts(d.data || [])
        if (d.data?.length && !selectedDistrict) setSelectedDistrict(d.data[0])
      } catch { /* ignore */ }
      try {
        const m = await getModelMetrics()
        setModelMetrics(m.data)
      } catch { /* ignore */ }
    } catch {
      setBackendStatus(null)
    }

    // 2) Prefer Open-Meteo live (real weather, no fabricated values)
    try {
      const data = await fetchBlockAndDownscale(7)
      setLive(data)
      setStatus('live')
      setLastFetch(new Date().toISOString())
      return
    } catch (e) {
      console.warn('Open-Meteo failed', e)
      setError(String(e.message || e))
    }

    // 3) Demo fallback — clearly labelled
    setStatus('demo')
    setLastFetch(new Date().toISOString())
  }, [selectedDistrict])

  useEffect(() => { refresh() }, [refresh])

  const runBackendDownscale = useCallback(async (blockId, targetDate) => {
    const r = await downscale(blockId, targetDate || new Date().toISOString().slice(0, 10), true)
    setDownscaleResult(r.data)
    setStatus((s) => (s === 'demo' ? s : 'backend'))
    return r.data
  }, [])

  const dayBundle = live?.days?.[dayIdx] ?? null
  const isLive = (status === 'live' || status === 'backend') && !!dayBundle
  const isDemo = status === 'demo'

  // Prefer backend downscale result for "today" predictions when available
  let predictions, block, panchayats
  if (downscaleResult?.panchayat_predictions?.length && dayIdx === 0) {
    panchayats = downscaleResult.panchayat_predictions.map((p) => ({
      id: p.panchayat_id,
      name: p.panchayat_name,
      block: downscaleResult.block_name,
      district: 'Odisha',
      elevation: null,
      has_station: true,
    }))
    predictions = Object.fromEntries(
      downscaleResult.panchayat_predictions.map((p) => [
        p.panchayat_id,
        {
          rainfall: na(p.predicted_rainfall),
          tmin: na(p.predicted_tmin),
          tmax: na(p.predicted_tmax),
          humidity: null,
          conf: na(p.confidence) != null ? Math.round(p.confidence * (p.confidence <= 1 ? 100 : 1)) : null,
          low: na(p.lower_bound_rainfall),
          high: na(p.upper_bound_rainfall),
          risk: (p.predicted_rainfall ?? 0) >= 50 ? 'high' : (p.predicted_rainfall ?? 0) >= 30 ? 'moderate' : 'low',
          model_version: p.model_version,
          data_quality: p.data_quality,
          feature_importance: p.feature_importance,
        },
      ])
    )
    const bf = downscaleResult.block_forecast
    block = {
      rainfall: na(bf?.rainfall),
      tmin: na(bf?.temperature_min),
      tmax: na(bf?.temperature_max),
      humidity: na(bf?.humidity),
      wind: na(bf?.wind_speed),
      source: bf?.source || 'backend',
      date: downscaleResult.target_date,
    }
  } else if (isLive && dayBundle) {
    panchayats = LIVE_PANCHAYATS
    predictions = Object.fromEntries(
      Object.entries(dayBundle.predictions).map(([id, pr]) => [
        id,
        {
          rainfall: na(pr.rainfall),
          tmin: na(pr.tmin),
          tmax: na(pr.tmax),
          humidity: na(pr.humidity),
          conf: na(pr.conf),
          low: na(pr.low),
          high: na(pr.high),
          risk: pr.risk,
        },
      ])
    )
    block = {
      rainfall: na(dayBundle.block.rainfall),
      tmin: na(dayBundle.block.tmin),
      tmax: na(dayBundle.block.tmax),
      humidity: na(dayBundle.block.humidity),
      wind: na(dayBundle.block.wind),
      source: live.source,
      date: dayBundle.date,
    }
  } else {
    panchayats = LIVE_PANCHAYATS
    predictions = getPredictionsForDay(dayIdx)
    block = getBlockForDay(dayIdx)
  }

  const alerts = isDemo && !dayBundle ? demoAlerts(dayIdx) : (dayBundle ? buildAlerts(dayBundle) : demoAlerts(dayIdx))
  const ranking = isDemo && !dayBundle ? demoRanking(dayIdx) : (dayBundle ? riskRanking(dayBundle) : demoRanking(dayIdx))

  const dayLabels = live?.days
    ? live.days.map((d, i) => ({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `+${i}d`,
        date: d.date,
        offset: i,
      }))
    : FORECAST_DAYS

  const fmt = (v, suffix = '') => (v === null || v === undefined ? 'N/A' : `${v}${suffix}`)

  return (
    <LiveCtx.Provider
      value={{
        status, isLive, isDemo, live, dayIdx, setDayIdx, dayLabels,
        panchayats, predictions, block, alerts, ranking,
        error, lastFetch, refresh, backendStatus, districts,
        selectedDistrict, setSelectedDistrict,
        selectedBlock, setSelectedBlock,
        modelMetrics, downscaleResult, runBackendDownscale,
        retrievedAt: live?.retrievedAt || lastFetch,
        blockName: downscaleResult?.block_name || live?.blockName || 'Bhubaneswar Block',
        fmt,
      }}
    >
      {children}
    </LiveCtx.Provider>
  )
}

export function useLive() {
  const ctx = useContext(LiveCtx)
  if (!ctx) throw new Error('useLive requires LiveDataProvider')
  return ctx
}
