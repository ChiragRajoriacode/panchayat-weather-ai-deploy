import { useEffect, useState } from 'react'
import {
  getDistricts, getBlocks, getPanchayats, downscale, getStatus,
} from '../services/api'

export default function ForecastPage() {
  const [districts, setDistricts] = useState([])
  const [blocks, setBlocks] = useState([])
  const [districtId, setDistrictId] = useState('')
  const [blockId, setBlockId] = useState('')
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getDistricts().then((r) => setDistricts(r.data)).catch(() => {})
    getStatus().then((r) => setStatus(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!districtId) {
      setBlocks([])
      setBlockId('')
      return
    }
    getBlocks(districtId).then((r) => setBlocks(r.data)).catch(() => setBlocks([]))
  }, [districtId])

  const runDownscale = async () => {
    if (!blockId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await downscale(Number(blockId), targetDate, true)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const bf = result?.block_forecast
  const preds = result?.panchayat_predictions || []

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Block → Panchayat Downscaling</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        Core demonstration: given a coarse block-level forecast, estimate localized weather for each panchayat
        using historical weather + geospatial features + trained ML models.
      </p>

      {status && (
        <div className="status-bar">
          <span>
            <span className={`status-dot ${status.weather_api.toLowerCase()}`} />
            Weather: {status.weather_api}
          </span>
          <span>
            <span className={`status-dot ${status.ml_model === 'LOADED' ? 'loaded' : 'missing'}`} />
            Model: {status.ml_model}
          </span>
        </div>
      )}

      <div className="card">
        <div className="form-row">
          <div>
            <label>District (Odisha)</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Block</label>
            <select value={blockId} onChange={(e) => setBlockId(e.target.value)}>
              <option value="">Select block</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Target date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <button onClick={runDownscale} disabled={!blockId || loading}>
            {loading ? 'Downscaling…' : 'Run AI Downscale'}
          </button>
        </div>
      </div>

      {error && <div className="alert warn">{error}</div>}

      {result && (
        <>
          {/* Visual flow */}
          <div className="card">
            <h2>Downscaling Flow</h2>
            <div className="flow">
              <div className="flow-box">
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>BLOCK FORECAST</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                  {bf?.rainfall != null ? `${bf.rainfall} mm` : '—'}
                </div>
                <div style={{ fontSize: '0.75rem' }}>
                  Tmin {bf?.temperature_min}° / Tmax {bf?.temperature_max}°
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>
                  {result.block_name}
                </div>
              </div>
              <div className="flow-arrow">↓</div>
              <div className="flow-box highlight">
                <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>AI DOWNSCALING</div>
                <div style={{ fontWeight: 600 }}>{result.model_version}</div>
                <div style={{ fontSize: '0.7rem' }}>{result.processing_time_ms} ms</div>
              </div>
              <div className="flow-arrow">↓</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {preds.map((p) => (
                  <div key={p.panchayat_id} className="flow-box">
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.panchayat_name}</div>
                    <div style={{ fontWeight: 700 }}>
                      {p.predicted_rainfall != null ? `${p.predicted_rainfall} mm` : '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                      {p.predicted_tmin}° / {p.predicted_tmax}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="source-note">{result.message}</p>
          </div>

          {/* Block detail */}
          <div className="card">
            <h2>Block-level Forecast — {result.block_name}</h2>
            <div className="grid grid-4">
              <div className="stat">
                <div className="label">Rainfall</div>
                <div className="value">{bf?.rainfall ?? '—'} <span className="unit">mm</span></div>
              </div>
              <div className="stat">
                <div className="label">Tmin</div>
                <div className="value">{bf?.temperature_min ?? '—'} <span className="unit">°C</span></div>
              </div>
              <div className="stat">
                <div className="label">Tmax</div>
                <div className="value">{bf?.temperature_max ?? '—'} <span className="unit">°C</span></div>
              </div>
              <div className="stat">
                <div className="label">Humidity / Wind</div>
                <div className="value" style={{ fontSize: '1rem' }}>
                  {bf?.humidity ?? '—'}% / {bf?.wind_speed ?? '—'} m/s
                </div>
              </div>
            </div>
            <p className="source-note">
              Source: {bf?.source} · Model: {bf?.model_name} · Open-Meteo (not IMD)
            </p>
          </div>

          {/* Panchayat table */}
          <div className="card">
            <h2>Panchayat-level AI Predictions</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Panchayat</th>
                  <th>Rainfall (mm)</th>
                  <th>Interval</th>
                  <th>Tmin</th>
                  <th>Tmax</th>
                  <th>Confidence</th>
                  <th>Block baseline rain</th>
                  <th>Data quality</th>
                </tr>
              </thead>
              <tbody>
                {preds.map((p) => (
                  <tr key={p.panchayat_id}>
                    <td>{p.panchayat_name}</td>
                    <td><strong>{p.predicted_rainfall ?? '—'}</strong></td>
                    <td>
                      {p.lower_bound_rainfall != null
                        ? `${p.lower_bound_rainfall} – ${p.upper_bound_rainfall}`
                        : '—'}
                    </td>
                    <td>{p.predicted_tmin ?? '—'}</td>
                    <td>{p.predicted_tmax ?? '—'}</td>
                    <td>
                      {p.confidence != null
                        ? `${(p.confidence * 100).toFixed(0)}%`
                        : 'unavailable'}
                    </td>
                    <td>{p.block_baseline_rainfall ?? '—'}</td>
                    <td>
                      {p.data_quality &&
                        Object.entries(p.data_quality).map(([k, v]) => (
                          <span key={k} className={`badge ${v === 'Good' ? 'good' : 'limited'}`} style={{ marginRight: 4 }}>
                            {k}: {v}
                          </span>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {preds[0]?.feature_importance && Object.keys(preds[0].feature_importance).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem' }}>Model feature influence (rainfall) — first panchayat</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Labeled as model feature influence (not causal claims).
                </p>
                <div className="grid grid-3">
                  {Object.entries(preds[0].feature_importance).map(([k, v]) => (
                    <div key={k} className="stat">
                      <div className="label">{k}</div>
                      <div className="value" style={{ fontSize: '1rem' }}>{(v * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
