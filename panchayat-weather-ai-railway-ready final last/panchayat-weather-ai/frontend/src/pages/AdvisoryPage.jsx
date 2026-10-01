import { useState, useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'
import { CROPS, STAGES, getAdvisory } from '../data/demoData'

export default function AdvisoryPage() {
  const { panchayats, predictions, alerts: allAlerts, isLive, block } = useLive()
  const [crop, setCrop] = useState('Rice')
  const [stage, setStage] = useState('Flowering')
  const [panchayatId, setPanchayatId] = useState(3)

  const pred = predictions[panchayatId] || { rainfall: 0, tmax: 30 }
  const panchayat = panchayats.find((p) => p.id === panchayatId)
  const advisory = useMemo(
    () => getAdvisory(crop, stage, pred.rainfall, pred.tmax),
    [crop, stage, pred.rainfall, pred.tmax]
  )
  const alerts = allAlerts.filter((a) => a.panchayat_id === panchayatId)

  const calendar = {
    Rice: { July: 'Vegetative / Transplant', August: 'Vegetative', September: 'Flowering' },
    Wheat: { July: 'Off-season', August: 'Off-season', September: 'Land prep' },
    Maize: { July: 'Vegetative', August: 'Tasseling', September: 'Grain filling' },
    Vegetables: { July: 'Vegetative / Fruiting', August: 'Fruiting', September: 'Harvest' },
  }

  return (
    <div>
      <h1 className="page-title">Agro Advisory</h1>
      <p className="page-sub">
        Crop × stage × {isLive ? 'live AI panchayat forecast' : 'forecast'}. Indicative — follow local AO / KVK guidance.
      </p>

      <div className="card">
        <div className="form-row">
          <div>
            <label>Panchayat</label>
            <select value={panchayatId} onChange={(e) => setPanchayatId(Number(e.target.value))}>
              {panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>Crop</label>
            <select value={crop} onChange={(e) => { setCrop(e.target.value); setStage(STAGES[e.target.value][0]) }}>
              {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Growth stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {(STAGES[crop] || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat"><div className="label">Rainfall</div><div className="value">{pred.rainfall} <span className="unit">mm</span></div></div>
        <div className="stat"><div className="label">Tmax</div><div className="value">{pred.tmax}°</div></div>
        <div className="stat"><div className="label">Humidity</div><div className="value">{pred.humidity}%</div></div>
        <div className="stat">
          <div className="label">Risk</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            <span className={`badge ${pred.risk === 'high' ? 'red' : pred.risk === 'moderate' ? 'orange' : 'green'}`}>{pred.risk}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{
        borderColor: advisory.severity === 'alert' ? 'var(--red)' : advisory.severity === 'watch' ? 'var(--yellow)' : 'var(--border)',
      }}>
        <div className="card-header">
          <h3>🌱 {crop.toUpperCase()} ADVISORY — {panchayat?.name}</h3>
          <span className={`badge ${advisory.severity === 'alert' ? 'red' : advisory.severity === 'watch' ? 'yellow' : 'green'}`}>
            {advisory.severity}
          </span>
        </div>
        <p style={{ fontSize: '1rem', fontWeight: 560, marginBottom: '0.75rem' }}>{advisory.summary}</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {advisory.recommendations.map((r, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: '0.9rem' }}>{r}</li>
          ))}
        </ul>
        <p className="source-note">
          Driven by {isLive ? 'live' : 'demo'} downscaled forecast (block {block.rainfall} mm → local {pred.rainfall} mm).
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Crop Calendar</h3>
          <table className="cmp-table">
            <thead><tr><th>Month</th><th>Typical ({crop})</th></tr></thead>
            <tbody>
              {Object.entries(calendar[crop] || {}).map(([m, s]) => (
                <tr key={m}><td>{m}</td><td>{s}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Local Alerts</h3>
          {alerts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No extreme alerts for this panchayat.</p>}
          {alerts.map((a, i) => (
            <div key={i} className={`alert-item ${a.level}`}>
              <div>
                <div style={{ fontWeight: 560 }}>{a.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{a.detail}</div>
              </div>
            </div>
          ))}
          {pred.rainfall >= 50 && (
            <div className="alert danger" style={{ marginBottom: 0 }}>
              🔴 HEAVY RAINFALL — {pred.rainfall} mm expected. Critical for {stage.toLowerCase()} stage of {crop}.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
