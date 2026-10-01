import { useEffect, useState } from 'react'
import { getValidation, getModelMetrics } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function ValidationPage() {
  const [data, setData] = useState(null)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    getValidation().then((r) => setData(r.data)).catch(() => {})
    getModelMetrics().then((r) => setMetrics(r.data)).catch(() => {})
  }, [])

  const runs = metrics?.runs || []
  const chartData = runs.map((r) => ({
    variable: r.target_variable,
    baseline_mae: r.metrics?.baseline_mae,
    model_mae: r.metrics?.mae,
    improvement: r.metrics?.improvement_pct,
  }))

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Model Validation</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        Time-aware hold-out evaluation. Baseline = block-level value copied to panchayat.
        Ground truth = Open-Meteo ERA5 reanalysis at panchayat location (not station observations).
        Metrics are computed from the actual evaluation dataset — not fabricated.
      </p>

      {data?.message && (
        <div className="alert">{data.message}</div>
      )}

      {runs.length === 0 && (
        <div className="card">
          <p>
            No trained model metrics yet. Run the pipeline:
          </p>
          <pre style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 8, fontSize: '0.85rem' }}>
{`python scripts/ingest_weather.py
python scripts/prepare_dataset.py
python scripts/train_model.py
python scripts/evaluate_model.py`}
          </pre>
        </div>
      )}

      {runs.length > 0 && (
        <>
          <div className="card">
            <h2>Improvement over Block Baseline</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>N samples</th>
                  <th>Block baseline MAE</th>
                  <th>AI model MAE</th>
                  <th>Improvement</th>
                  <th>AI RMSE</th>
                  <th>AI R²</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.target_variable}>
                    <td><strong>{r.target_variable}</strong></td>
                    <td>{r.metrics?.n}</td>
                    <td>{r.metrics?.baseline_mae ?? '—'}</td>
                    <td>{r.metrics?.mae ?? '—'}</td>
                    <td>
                      {r.metrics?.improvement_pct != null
                        ? `${r.metrics.improvement_pct}%`
                        : '—'}
                    </td>
                    <td>{r.metrics?.rmse ?? '—'}</td>
                    <td>{r.metrics?.r2 ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="source-note">{data?.baseline_note}</p>
          </div>

          {chartData.length > 0 && (
            <div className="card">
              <h2>MAE Comparison</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="variable" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #E2E8F0' }}
                  />
                  <Legend />
                  <Bar dataKey="baseline_mae" name="Block baseline MAE" fill="#f59e0b" />
                  <Bar dataKey="model_mae" name="AI model MAE" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <h2>Notes</h2>
            <ul style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              <li>Training uses time-ordered split (no random shuffle of time series).</li>
              <li>Baseline is the block mean of co-located reanalysis (proxy for coarse forecast).</li>
              <li>Positive improvement means AI MAE is lower than baseline MAE.</li>
              <li>With few pilot panchayats and short history, metrics are indicative only.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
