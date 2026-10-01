import { useEffect, useState } from 'react'
import { MODEL_SPEC } from '../data/mlSpec'
import { MODEL_COMPARISON, FEATURE_IMPORTANCE } from '../data/demoData'
import { getModelMetrics, getModelFeatures } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const tipStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }
const gridStroke = '#E2E8F0'
const axisStroke = '#64748B'

function fmtMetric(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A'
  return typeof v === 'number' ? v.toFixed(2) : String(v)
}

export default function ModelPage() {
  const m = MODEL_SPEC
  const [apiMetrics, setApiMetrics] = useState(null)
  const [apiFeatures, setApiFeatures] = useState(null)
  const [loadState, setLoadState] = useState('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [met, feat] = await Promise.all([
          getModelMetrics().catch(() => null),
          getModelFeatures().catch(() => null),
        ])
        if (cancelled) return
        if (met?.data) setApiMetrics(met.data)
        if (feat?.data) setApiFeatures(feat.data)
        setLoadState(met?.data ? 'backend' : 'unavailable')
      } catch {
        if (!cancelled) setLoadState('unavailable')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Normalize metrics from API shape (ModelMetricsOut) if present
  const metricRows = []
  if (apiMetrics?.metrics) {
    for (const [key, val] of Object.entries(apiMetrics.metrics)) {
      metricRows.push({
        key,
        baseline_mae: val.baseline_mae ?? val.block_mae,
        model_mae: val.model_mae ?? val.ai_mae,
        baseline_rmse: val.baseline_rmse ?? val.block_rmse,
        model_rmse: val.model_rmse ?? val.ai_rmse,
        model_r2: val.model_r2 ?? val.ai_r2,
        n: val.n_samples,
      })
    }
  }

  const features = apiFeatures?.feature_list || apiMetrics?.feature_list || m.features.map((f) => f.name)
  const importance = apiFeatures?.importance || FEATURE_IMPORTANCE

  return (
    <div>
      <h1 className="page-title">Model & ML Spec</h1>
      <p className="page-sub">
        Algorithm, features, and validation metrics. Metrics show N/A until GET /api/model/metrics returns a training run.
      </p>

      {loadState === 'unavailable' && (
        <div className="alert warn">
          <strong>No training metrics loaded from backend.</strong> Run scripts/train_model.py and scripts/evaluate_model.py,
          then restart the API. UI will not invent MAE/R².
        </div>
      )}
      {loadState === 'backend' && (
        <div className="alert success">Metrics loaded from backend · version {apiMetrics?.model_version || 'N/A'}</div>
      )}

      <div className="card">
        <h3>Model card</h3>
        <table className="cmp-table">
          <tbody>
            <tr><td>Name</td><td>{m.name}</td></tr>
            <tr><td>Version</td><td><code>{apiMetrics?.model_version || m.version}</code></td></tr>
            <tr><td>Family</td><td>{m.family}</td></tr>
            <tr><td>Selected</td><td>{m.training.selected}</td></tr>
            <tr><td>Targets</td><td>{m.targets.join(', ')}</td></tr>
            <tr><td>Baseline</td><td>{m.baseline}</td></tr>
            <tr><td>Validation protocol</td><td>{m.training.method}</td></tr>
            <tr><td>Trained at</td><td>{apiMetrics?.trained_at || 'N/A'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="kpi-grid">
        {metricRows.length > 0 ? metricRows.map((row) => (
          <div className="kpi" key={row.key}>
            <div className="label">{row.key} MAE</div>
            <div className="value" style={{ fontSize: '1.15rem' }}>
              <span style={{ color: 'var(--muted)' }}>{fmtMetric(row.baseline_mae)}</span>
              {' → '}
              <span style={{ color: 'var(--green)' }}>{fmtMetric(row.model_mae)}</span>
            </div>
            <div className="meta">RMSE {fmtMetric(row.baseline_rmse)}→{fmtMetric(row.model_rmse)} · R² {fmtMetric(row.model_r2)}</div>
          </div>
        )) : (
          ['rainfall', 'tmax', 'tmin'].map((k) => (
            <div className="kpi" key={k}>
              <div className="label">{k} MAE</div>
              <div className="value">N/A</div>
              <div className="meta">Awaiting /api/model/metrics</div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Model comparison table</h3>
        <p className="source-note" style={{ marginTop: 0 }}>
          Candidate comparison below is structural documentation. Prefer backend evaluation when available.
          Placeholder rows are <strong>not</strong> claimed as current measured skill.
        </p>
        <table className="cmp-table">
          <thead>
            <tr><th>Model</th><th>Rain MAE</th><th>Tmax MAE</th><th>Tmin MAE</th></tr>
          </thead>
          <tbody>
            {MODEL_COMPARISON.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td className="num">N/A</td>
                <td className="num">N/A</td>
                <td className="num">N/A</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Feature list</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
            {(Array.isArray(features) ? features : []).map((f) => (
              <li key={typeof f === 'string' ? f : f.name}>{typeof f === 'string' ? f : f.name}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Feature influence</h3>
          {Array.isArray(importance) && importance.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={importance} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" stroke={axisStroke} fontSize={11} />
                <YAxis type="category" dataKey="name" stroke={axisStroke} width={120} fontSize={11} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="value" name="Relative %" fill="#0284C7" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--muted)' }}>N/A — no importance vector from API</p>
          )}
        </div>
      </div>
    </div>
  )
}
