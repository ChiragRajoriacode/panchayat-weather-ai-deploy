import { useMemo, useState } from 'react'
import {
  PANCHAYATS, HISTORICAL_EVENT, SIMILAR_EVENTS,
} from '../data/demoData'
import { BLOCK_CENTROID, fetchHistoricalReplay } from '../services/liveWeather'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, ZAxis,
} from 'recharts'
import axios from 'axios'

const DEFAULT_DATE = HISTORICAL_EVENT.date

function mae(rows, key, actualKey = 'actual') {
  const valid = rows.filter((r) => Number.isFinite(r[key]) && Number.isFinite(r[actualKey]))
  return valid.length ? valid.reduce((s, r) => s + Math.abs(r[actualKey] - r[key]), 0) / valid.length : null
}

function rmse(rows, key, actualKey = 'actual') {
  const valid = rows.filter((r) => Number.isFinite(r[key]) && Number.isFinite(r[actualKey]))
  return valid.length ? Math.sqrt(valid.reduce((s, r) => s + (r[actualKey] - r[key]) ** 2, 0) / valid.length) : null
}

function pctImprovement(base, model) {
  if (!Number.isFinite(base) || !Number.isFinite(model) || base === 0) return null
  return ((base - model) / base) * 100
}

function round(v, digits = 1) {
  return Number.isFinite(v) ? Number(v.toFixed(digits)) : null
}

export default function HistoricalPage() {
  const [date, setDate] = useState(DEFAULT_DATE)
  const [selectedId, setSelectedId] = useState(PANCHAYATS[0]?.id || 1)
  const [rows, setRows] = useState([])
  const [blockForecast, setBlockForecast] = useState(null)
  const [source, setSource] = useState('bundled')
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [showSimilar, setShowSimilar] = useState(false)

  // Multi-date backtest state
  const [btStart, setBtStart] = useState('2025-07-01')
  const [btEnd, setBtEnd] = useState('2025-08-15')
  const [btState, setBtState] = useState('idle') // idle | loading | ready | error
  const [btError, setBtError] = useState(null)
  const [btResult, setBtResult] = useState(null)

  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  const metrics = useMemo(() => {
    const b = mae(rows, 'block')
    const a = mae(rows, 'ai')
    return {
      blockMae: round(b),
      aiMae: round(a),
      blockRmse: round(rmse(rows, 'block')),
      aiRmse: round(rmse(rows, 'ai')),
      improvement: round(pctImprovement(b, a)),
      n: rows.filter((r) => Number.isFinite(r.actual)).length,
    }
  }, [rows])

  const chartData = rows.map((r) => ({
    name: r.name.length > 10 ? `${r.name.slice(0, 10)}…` : r.name,
    Actual: r.actual,
    Block: r.block,
    AI: r.ai,
  }))

  async function runReplay() {
    setState('loading')
    setError(null)
    try {
      // Prefer backend ML replay when available
      try {
        const { data } = await axios.get('/api/historical/replay', {
          params: { target_date: date },
          timeout: 90000,
        })
        setBlockForecast(data.blockForecast)
        setRows(data.rows)
        setSource(data.source || 'backend-ml')
        setState('ready')
        return
      } catch {
        // fall through to browser path
      }

      const result = await fetchHistoricalReplay(date, PANCHAYATS)
      setBlockForecast(result.blockForecast)
      setRows(result.rows)
      setSource(result.source)
      setState('ready')
    } catch (e) {
      console.warn('Historical replay live fetch failed', e)
      if (date === HISTORICAL_EVENT.date) {
        const fallbackRows = PANCHAYATS.map((p) => ({
          id: p.id,
          name: p.name,
          actual: HISTORICAL_EVENT.actuals[p.id],
          block: HISTORICAL_EVENT.block_rainfall,
          ai: HISTORICAL_EVENT.ai_preds[p.id],
          actualSource: 'Bundled pilot replay',
          forecastSource: 'Bundled pilot replay',
        }))
        setBlockForecast({
          rainfall: HISTORICAL_EVENT.block_rainfall,
          source: 'Bundled pilot replay',
          issued: 'Historical replay example',
        })
        setRows(fallbackRows)
        setSource('bundled')
        setState('ready')
        setError(`Live historical APIs were unavailable. Showing the bundled pilot replay for ${date}.`)
      } else {
        setState('error')
        setRows([])
        setBlockForecast(null)
        setError(String(e.message || e))
      }
    }
  }

  async function runBacktest() {
    setBtState('loading')
    setBtError(null)
    setBtResult(null)
    try {
      const { data } = await axios.get('/api/historical/backtest', {
        params: { start: btStart, end: btEnd, max_days: 30 },
        timeout: 300000,
      })
      setBtResult(data)
      setBtState('ready')
    } catch (e) {
      setBtState('error')
      setBtError(String(e.response?.data?.detail || e.message || e))
    }
  }

  const isLive = source.includes('open-meteo') || source.includes('backend')

  const scatterData = (btResult?.series || []).map((s) => ({
    actual: s.actual,
    ai: s.ai,
    block: s.block,
  }))

  return (
    <div>
      <h1 className="page-title">Historical Replay & Backtest</h1>
      <p className="page-sub">
        <strong>T−1 only</strong> — archived previous-day block forecast → spatial downscaler → archive actuals at each of 10 Panchayats.
        No future-data leakage. Metrics: Block MAE vs AI MAE, RMSE, R², improvement %.
      </p>

      {/* ========== MULTI-DATE BACKTEST ========== */}
      <div className="card" style={{ border: '2px solid var(--ocean)' }}>
        <div className="card-header">
          <h3>📊 Genuine multi-date T−1 backtest (all 10 Panchayats)</h3>
          <span className={`badge ${btState === 'ready' ? 'green' : 'blue'}`}>
            {btState === 'ready' ? 'EVIDENCE READY' : 'BACKEND ML'}
          </span>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginTop: 0 }}>
          Uses Open-Meteo <strong>Previous Runs</strong> precipitation (issued the day before each target date)
          as the block forecast, then the trained HistGradientBoosting residual model (or heuristic fallback).
          Verification = archive rainfall at each Panchayat coordinate. Many dates × 10 GPs.
        </p>
        <div className="grid grid-3" style={{ alignItems: 'end' }}>
          <div>
            <label>Start date</label>
            <input type="date" value={btStart} min="2024-06-01" max="2025-09-01"
              onChange={(e) => setBtStart(e.target.value)} />
          </div>
          <div>
            <label>End date</label>
            <input type="date" value={btEnd} min="2024-06-01" max="2025-09-15"
              onChange={(e) => setBtEnd(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg" onClick={runBacktest} disabled={btState === 'loading'}>
            {btState === 'loading' ? <><span className="spinner" /> Running backtest…</> : '▶ RUN MULTI-DATE BACKTEST'}
          </button>
        </div>
        <p className="source-note" style={{ marginBottom: 0 }}>
          Tip: monsoon window Jul–Aug 2025 is a good stress test. Backend must be running (<code>uvicorn backend.main:app --port 8000</code>).
        </p>
      </div>

      {btError && <div className="alert warn"><strong>Backtest failed.</strong> {btError}</div>}

      {btState === 'loading' && (
        <div className="alert info">
          Fetching T−1 previous-run forecasts and archive actuals for many dates × 10 Panchayats. This can take 1–3 minutes…
        </div>
      )}

      {btState === 'ready' && btResult && (
        <>
          <div className="card">
            <div className="card-header">
              <h3>Evidence summary — {btResult.start} → {btResult.end}</h3>
              <span className="badge green">{btResult.n_days} days · {btResult.n_samples} samples · 10 GPs</span>
            </div>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="label">Block MAE</div>
                <div className="value" style={{ color: 'var(--red)' }}>{btResult.metrics.block_mae} <span className="unit">mm</span></div>
                <div className="meta">T−1 forecast copied to every GP</div>
              </div>
              <div className="kpi">
                <div className="label">AI MAE</div>
                <div className="value" style={{ color: 'var(--green)' }}>{btResult.metrics.ai_mae} <span className="unit">mm</span></div>
                <div className="meta">Residual downscaler</div>
              </div>
              <div className="kpi">
                <div className="label">Improvement</div>
                <div className="value" style={{ color: 'var(--accent)' }}>{btResult.metrics.improvement_pct}%</div>
                <div className="meta">MAE reduction vs block</div>
              </div>
              <div className="kpi">
                <div className="label">AI RMSE</div>
                <div className="value">{btResult.metrics.ai_rmse} <span className="unit">mm</span></div>
                <div className="meta">Block RMSE {btResult.metrics.block_rmse}</div>
              </div>
              <div className="kpi">
                <div className="label">R² (AI vs actual)</div>
                <div className="value">{btResult.metrics.r2}</div>
                <div className="meta">All samples pooled</div>
              </div>
              <div className="kpi">
                <div className="label">Lead time</div>
                <div className="value" style={{ fontSize: '1.1rem' }}>T−1</div>
                <div className="meta">{btResult.lead_time}</div>
              </div>
            </div>
            <p className="source-note">{btResult.baseline_note}</p>
            <p className="source-note">Leakage controls: {btResult.leakage}. Models: {(btResult.models_used || []).join(', ')}</p>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>Daily MAE — Block vs AI</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={btResult.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#64748B" fontSize={11} unit=" mm" />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="block_mae" name="Block MAE" stroke="#f59e0b" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="ai_mae" name="AI MAE" stroke="#38bdf8" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3>Actual vs AI predicted</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" dataKey="actual" name="Actual" unit=" mm" stroke="#64748B" fontSize={11} />
                  <YAxis type="number" dataKey="ai" name="AI" unit=" mm" stroke="#64748B" fontSize={11} />
                  <ZAxis range={[40, 40]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#fff', border: '1px solid #E2E8F0' }} />
                  <Scatter name="AI vs Actual" data={scatterData} fill="#38bdf8" fillOpacity={0.55} />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="source-note">Points near the diagonal (y = x) indicate good skill. n={scatterData.length}</p>
            </div>
          </div>

          <div className="card">
            <h3>Metric table</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Block baseline</th>
                  <th>AI model</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>MAE (mm)</strong></td>
                  <td>{btResult.metrics.block_mae}</td>
                  <td>{btResult.metrics.ai_mae}</td>
                  <td>{btResult.metrics.improvement_pct}% improvement</td>
                </tr>
                <tr>
                  <td><strong>RMSE (mm)</strong></td>
                  <td>{btResult.metrics.block_rmse}</td>
                  <td>{btResult.metrics.ai_rmse}</td>
                  <td>Root mean squared error</td>
                </tr>
                <tr>
                  <td><strong>R²</strong></td>
                  <td>—</td>
                  <td>{btResult.metrics.r2}</td>
                  <td>AI predictions vs actuals</td>
                </tr>
                <tr>
                  <td><strong>Samples</strong></td>
                  <td colSpan={2}>{btResult.n_samples} ({btResult.n_days} days × up to 10 GPs)</td>
                  <td>T−1 lead only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========== SINGLE-DATE REPLAY ========== */}
      <div className="card" style={{ border: '1px solid var(--ocean)', marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3>⏪ Single-date forecast replay</h3>
          <span className={`badge ${isLive ? 'green' : 'blue'}`}>{isLive ? 'LIVE / BACKEND' : 'PILOT REPLAY'}</span>
        </div>
        <div className="grid grid-3" style={{ alignItems: 'end' }}>
          <div>
            <label>Past date</label>
            <input
              type="date"
              value={date}
              max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
              min="2024-01-02"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label>Panchayat to inspect</label>
            <select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}>
              {PANCHAYATS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-lg" onClick={runReplay} disabled={state === 'loading'}>
            {state === 'loading' ? <><span className="spinner" /> Replaying…</> : '▶ RUN HISTORICAL REPLAY'}
          </button>
        </div>
        <p className="source-note" style={{ marginBottom: 0 }}>
          Prefers <code>/api/historical/replay</code> (ML backend). Falls back to browser Open-Meteo client, then bundled pilot data.
        </p>
      </div>

      {error && <div className={`alert ${source === 'bundled' ? 'warn' : 'info'}`}>{error}</div>}

      {state === 'idle' && (
        <div className="alert info">
          Select a date and click <strong>RUN HISTORICAL REPLAY</strong>. Start with <strong>{DEFAULT_DATE}</strong> for the bundled pilot event.
        </div>
      )}

      {state === 'error' && <div className="alert warn"><strong>Replay unavailable.</strong> {error}</div>}

      {state === 'ready' && rows.length > 0 && (
        <>
          <div className="card">
            <div className="card-header">
              <h3>📅 {date} — What happened?</h3>
              <span className="badge blue">{isLive ? 'API-backed replay' : 'Bundled pilot data'}</span>
            </div>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="label">Block forecast</div>
                <div className="value">{round(blockForecast?.rainfall)} <span className="unit">mm</span></div>
                <div className="meta">Bhubaneswar Block · issued 1 day before</div>
              </div>
              <div className="kpi">
                <div className="label">Panchayat selected</div>
                <div className="value" style={{ fontSize: '1.2rem' }}>{selected?.name || '—'}</div>
                <div className="meta">{selected?.actualSource || 'Historical archive'}</div>
              </div>
              <div className="kpi">
                <div className="label">Actual rainfall</div>
                <div className="value">{round(selected?.actual)} <span className="unit">mm</span></div>
                <div className="meta">Observed/reanalysis archive at Panchayat point</div>
              </div>
              <div className="kpi">
                <div className="label">AI/downscaled estimate</div>
                <div className="value">{round(selected?.ai)} <span className="unit">mm</span></div>
                <div className="meta">Spatial residual downscaler</div>
              </div>
            </div>

            <div className="before-after">
              <div className="ba-panel before">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)' }}>BLOCK BASELINE</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{round(selected?.block)} mm</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Same block value for every Panchayat</div>
              </div>
              <div className="ba-arrow"><div>→</div><div style={{ fontSize: '0.7rem' }}>DOWNSCALE</div></div>
              <div className="ba-panel after">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ocean)' }}>PANCHAYAT ESTIMATE</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{round(selected?.ai)} mm</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Uses location + elevation + slope + block forecast</div>
              </div>
              <div className="ba-arrow"><div>→</div><div style={{ fontSize: '0.7rem' }}>COMPARE</div></div>
              <div className="ba-panel">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)' }}>ACTUAL</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{round(selected?.actual)} mm</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Verification value</div>
              </div>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="stat">
              <div className="label">Block error</div>
              <div className="value" style={{ color: 'var(--red)' }}>{round(Math.abs((selected?.actual ?? 0) - (selected?.block ?? 0)))} <span className="unit">mm</span></div>
            </div>
            <div className="stat">
              <div className="label">AI error</div>
              <div className="value" style={{ color: 'var(--green)' }}>{round(Math.abs((selected?.actual ?? 0) - (selected?.ai ?? 0)))} <span className="unit">mm</span></div>
            </div>
            <div className="stat">
              <div className="label">Error reduction</div>
              <div className="value" style={{ color: 'var(--accent)' }}>
                {round(pctImprovement(Math.abs((selected?.actual ?? 0) - (selected?.block ?? 0)), Math.abs((selected?.actual ?? 0) - (selected?.ai ?? 0)))) ?? 'N/A'}%
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>All 10 Panchayats — same date</h3>
              <span className="badge blue">n={metrics.n}</span>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} unit=" mm" />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0' }} />
                <Legend />
                <Bar dataKey="Actual" fill="#34d399" />
                <Bar dataKey="Block" fill="#64748b" />
                <Bar dataKey="AI" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>Accuracy for this replay</h3>
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div className="stat"><div className="label">Block MAE</div><div className="value" style={{ color: 'var(--red)' }}>{metrics.blockMae} mm</div></div>
              <div className="stat"><div className="label">AI MAE</div><div className="value" style={{ color: 'var(--green)' }}>{metrics.aiMae} mm</div></div>
              <div className="stat"><div className="label">AI improvement</div><div className="value" style={{ color: 'var(--accent)' }}>{metrics.improvement != null ? `${metrics.improvement}%` : 'N/A'}</div></div>
            </div>
            <div className="grid grid-2">
              <div className="stat"><div className="label">Block RMSE</div><div className="value">{metrics.blockRmse} mm</div></div>
              <div className="stat"><div className="label">AI RMSE</div><div className="value">{metrics.aiRmse} mm</div></div>
            </div>
            <p className="source-note">
              Metrics calculated from the rows above. T−1 previous-day forecast vs historical archive. Not independent station verification.
            </p>
          </div>

          <div className="card">
            <h3>Detailed comparison</h3>
            <table className="cmp-table">
              <thead><tr><th>Panchayat</th><th>Block forecast</th><th>AI estimate</th><th>Actual</th><th>Block |err|</th><th>AI |err|</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num">{round(r.block)} mm</td>
                    <td className="num">{round(r.ai)} mm</td>
                    <td className="num">{round(r.actual)} mm</td>
                    <td className="num" style={{ color: 'var(--red)' }}>{round(Math.abs(r.actual - r.block))} mm</td>
                    <td className="num" style={{ color: 'var(--green)' }}>{round(Math.abs(r.actual - r.ai))} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Historical Similarity</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowSimilar(!showSimilar)}>
            {showSimilar ? 'Hide' : 'Find similar events'}
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Historical analogue only — similarity is descriptive and is not used as future ground truth.
        </p>
        {showSimilar && SIMILAR_EVENTS.map((e) => (
          <div key={e.date} className="rank-item">
            <div className="rank-num">{e.similarity}%</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 560 }}>{e.date}</div><div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{e.note}</div></div>
            <span style={{ fontSize: '0.85rem' }}>{e.rainfall} mm</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>How this avoids look-ahead bias</h3>
        <div className="flow">
          <div className="flow-step">1. Pick past date D</div>
          <div className="flow-step">2. Load T−1 previous-run forecast for block (issued D−1)</div>
          <div className="flow-step">3. Downscale with model trained only on data &lt; hold-out</div>
          <div className="flow-step">4. Compare to archive actuals at each GP on D</div>
        </div>
        <p className="source-note">
          hist_rain_7d uses only days before D. Time-ordered train/test split. No random shuffle of time series.
        </p>
      </div>
    </div>
  )
}
