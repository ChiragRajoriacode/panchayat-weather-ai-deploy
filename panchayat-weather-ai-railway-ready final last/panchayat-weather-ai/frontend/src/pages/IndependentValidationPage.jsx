import { useEffect, useState } from 'react'
import { VALIDATION_META } from '../data/validationData'
import { getValidation, getModelMetrics } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const tipStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }

function fmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A'
  return typeof v === 'number' ? Number(v).toFixed(2) : String(v)
}

export default function IndependentValidationPage() {
  const [rows, setRows] = useState([])
  const [modelMeta, setModelMeta] = useState(null)
  const [state, setState] = useState('loading') // loading | backend | empty
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [val, met] = await Promise.all([
          getValidation().catch((e) => ({ error: e })),
          getModelMetrics().catch(() => null),
        ])
        if (cancelled) return
        if (met?.data) setModelMeta(met.data)

        // Accept list or { metrics: {...} } or ValidationSummary[]
        let list = []
        const data = val?.data
        if (Array.isArray(data)) list = data
        else if (data?.metrics && typeof data.metrics === 'object') {
          list = Object.entries(data.metrics).map(([k, v]) => ({ target_variable: k, ...v }))
        } else if (data && typeof data === 'object' && data.model_mae != null) {
          list = [data]
        }

        if (list.length) {
          setRows(list)
          setState('backend')
        } else {
          setState('empty')
          if (val?.error) setError(String(val.error.message || val.error))
        }
      } catch (e) {
        if (!cancelled) {
          setState('empty')
          setError(String(e.message || e))
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = rows.map((r) => ({
    name: (r.target_variable || r.variable || 'var').toString().slice(0, 12),
    Baseline: r.baseline_mae ?? r.block_mae ?? null,
    Model: r.model_mae ?? r.ai_mae ?? null,
  }))

  return (
    <div>
      <h1 className="page-title">{VALIDATION_META.title}</h1>
      <p className="page-sub">
        Skill metrics only from the backend evaluation API. No hardcoded MAE, R², POD, or sample series in the frontend.
      </p>

      <div className="alert warn">
        <strong>Not independent ground truth.</strong> {VALIDATION_META.reference}. {VALIDATION_META.note}
      </div>

      {state === 'loading' && <div className="alert info">Loading /api/validation and /api/model/metrics…</div>}
      {state === 'empty' && (
        <div className="alert warn">
          <strong>No evaluation metrics available.</strong>
          {error ? ` (${error})` : ''}
          {' '}Run training/evaluation scripts, ensure models are loaded, then call GET /api/validation.
          Until then every metric cell is <strong>N/A</strong> — not simulated as real skill.
        </div>
      )}
      {state === 'backend' && (
        <div className="alert success">
          Metrics from backend · model {modelMeta?.model_version || rows[0]?.model_version || 'N/A'}
          {modelMeta?.trained_at ? ` · trained ${modelMeta.trained_at}` : ''}
        </div>
      )}

      <div className="kpi-grid">
        {(rows.length ? rows : [{ target_variable: 'rainfall' }, { target_variable: 'tmax' }, { target_variable: 'tmin' }]).map((r, i) => (
          <div className="kpi" key={r.target_variable || r.variable || ('empty-' + i)}>
            <div className="label">{r.target_variable || r.variable || 'metric'} MAE</div>
            <div className="value" style={{ fontSize: '1.1rem' }}>
              <span style={{ color: 'var(--muted)' }}>{fmt(r.baseline_mae ?? r.block_mae)}</span>
              {' → '}
              <span style={{ color: 'var(--green)' }}>{fmt(r.model_mae ?? r.ai_mae)}</span>
            </div>
            <div className="meta">
              RMSE {fmt(r.baseline_rmse ?? r.block_rmse)}→{fmt(r.model_rmse ?? r.ai_rmse)}
              {' · R² '}{fmt(r.model_r2 ?? r.ai_r2)}
              {r.n_samples != null ? ` · n=${r.n_samples}` : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Baseline vs model (from API)</h3>
        {chartData.some((d) => d.Baseline != null || d.Model != null) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip contentStyle={tipStyle} />
              <Legend />
              <Bar dataKey="Baseline" fill="#94A3B8" />
              <Bar dataKey="Model" fill="#0284C7" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: 'var(--muted)' }}>N/A — no series to plot until evaluation results are returned by the API.</p>
        )}
      </div>

      <div className="card">
        <h3>Evaluation table</h3>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Baseline MAE</th>
              <th>Model MAE</th>
              <th>Baseline RMSE</th>
              <th>Model RMSE</th>
              <th>R²</th>
              <th>n</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: 'var(--muted)' }}>N/A — empty until backend provides evaluation</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.target_variable || r.variable || 'N/A'}</td>
                <td className="num">{fmt(r.baseline_mae ?? r.block_mae)}</td>
                <td className="num">{fmt(r.model_mae ?? r.ai_mae)}</td>
                <td className="num">{fmt(r.baseline_rmse ?? r.block_rmse)}</td>
                <td className="num">{fmt(r.model_rmse ?? r.ai_rmse)}</td>
                <td className="num">{fmt(r.model_r2 ?? r.ai_r2)}</td>
                <td className="num">{r.n_samples ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="source-note">
          Heavy-rain POD/FAR/CSI: N/A until computed on a held-out set with a real classifier/threshold evaluation.
          Next step for independence: CHIRPS, IMERG, or IMD/ORSAC stations — not ERA5-only.
        </p>
      </div>
    </div>
  )
}
