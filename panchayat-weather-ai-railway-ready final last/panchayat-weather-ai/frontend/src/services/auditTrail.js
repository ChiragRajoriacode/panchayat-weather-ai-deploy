/**
 * Prediction audit trail — in-memory + localStorage for demo.
 * Each downscale run creates auditable prediction records.
 */

const KEY = 'pw_audit_log'
const MAX = 200

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}

export function createPredictionBatch({ block, predictions, panchayats, source, modelVersion }) {
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`
  const ts = new Date().toISOString()
  const horizon = '24h'
  const records = Object.entries(predictions).map(([id, pr]) => {
    const p = panchayats.find((x) => x.id === Number(id))
    return {
      prediction_id: `${batchId}-P${id}`,
      batch_id: batchId,
      timestamp: ts,
      model_version: modelVersion || 'spatial-residual-v1.2',
      input_timestamp: block?.date || ts.slice(0, 10),
      forecast_horizon: horizon,
      panchayat_id: Number(id),
      panchayat_name: p?.name || id,
      block_rainfall: block?.rainfall,
      predicted_rainfall: pr.rainfall,
      predicted_tmin: pr.tmin,
      predicted_tmax: pr.tmax,
      confidence: pr.conf,
      range_low: pr.low,
      range_high: pr.high,
      risk: pr.risk,
      data_mode: source || 'unknown',
      station: p?.has_station ? 'direct' : 'estimated',
    }
  })
  const prev = load()
  save([...records, ...prev])
  return { batchId, records, timestamp: ts }
}

export function getAuditLog(limit = 50) {
  return load().slice(0, limit)
}

export function getAuditByPanchayat(panchayatId, limit = 20) {
  return load()
    .filter((r) => r.panchayat_id === Number(panchayatId))
    .slice(0, limit)
}

export function clearAudit() {
  localStorage.removeItem(KEY)
}
