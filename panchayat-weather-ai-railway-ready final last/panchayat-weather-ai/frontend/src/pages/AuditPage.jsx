import { useState, useEffect } from 'react'
import { getAuditLog, clearAudit } from '../services/auditTrail'
import { MODEL_SPEC } from '../data/mlSpec'
import { useLive } from '../context/LiveDataContext'
import { createPredictionBatch } from '../services/auditTrail'

export default function AuditPage() {
  const { block, predictions, panchayats, isLive } = useLive()
  const [log, setLog] = useState([])

  const reload = () => setLog(getAuditLog(80))
  useEffect(() => { reload() }, [])

  const recordNow = () => {
    createPredictionBatch({
      block,
      predictions,
      panchayats,
      source: isLive ? 'live-open-meteo' : 'demo',
      modelVersion: MODEL_SPEC.version,
    })
    reload()
  }

  return (
    <div>
      <h1 className="page-title">Audit Trail</h1>
      <p className="page-sub">
        Every prediction record includes ID, timestamp, model version, inputs, horizon, and confidence — for accountability.
      </p>

      <div className="status-bar">
        <span>Model: <strong>{MODEL_SPEC.version}</strong></span>
        <span>Records: {log.length}</span>
        <button className="btn btn-sm btn-primary" onClick={recordNow}>Record current forecast batch</button>
        <button className="btn btn-sm btn-secondary" onClick={() => { clearAudit(); reload() }}>Clear log</button>
      </div>

      <div className="card">
        <h3>Required audit fields</h3>
        <div className="grid grid-3" style={{ fontSize: '0.85rem' }}>
          {['prediction_id', 'timestamp', 'model_version', 'input_timestamp', 'forecast_horizon', 'panchayat_id', 'confidence', 'range', 'data_mode'].map((f) => (
            <div key={f} className="stat"><div className="value" style={{ fontSize: '0.9rem' }}>{f}</div></div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Recent predictions</h3>
        {log.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>
            No records yet. Run downscaling on the AI page or click “Record current forecast batch”.
          </p>
        )}
        {log.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th>Prediction ID</th>
                  <th>Time</th>
                  <th>Panchayat</th>
                  <th>Rain</th>
                  <th>Range</th>
                  <th>Conf</th>
                  <th>Model</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.prediction_id}>
                    <td style={{ fontSize: '0.75rem' }}>{r.prediction_id}</td>
                    <td style={{ fontSize: '0.75rem' }}>{new Date(r.timestamp).toLocaleString()}</td>
                    <td>{r.panchayat_name}</td>
                    <td className="num">{r.predicted_rainfall} mm</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>{r.range_low}–{r.range_high}</td>
                    <td className="num">{r.confidence}%</td>
                    <td style={{ fontSize: '0.75rem' }}>{r.model_version}</td>
                    <td><span className="badge blue">{r.data_mode}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
