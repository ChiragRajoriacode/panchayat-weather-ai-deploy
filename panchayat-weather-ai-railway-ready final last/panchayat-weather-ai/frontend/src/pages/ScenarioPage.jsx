import { useState, useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'

export default function ScenarioPage() {
  const { panchayats, predictions, block, isLive } = useLive()
  const [rainAdj, setRainAdj] = useState(0)
  const [tempAdj, setTempAdj] = useState(0)
  const [ran, setRan] = useState(false)

  const results = useMemo(() => {
    if (!ran) return null
    const out = {}
    for (const [id, p] of Object.entries(predictions)) {
      const rf = Math.round(Math.max(0, p.rainfall * (1 + rainAdj / 100)) * 10) / 10
      out[id] = {
        ...p,
        rainfall: rf,
        tmin: p.tmin != null ? Math.round((p.tmin + tempAdj) * 10) / 10 : null,
        tmax: p.tmax != null ? Math.round((p.tmax + tempAdj) * 10) / 10 : null,
        low: Math.round(rf * 0.85 * 10) / 10,
        high: Math.round(rf * 1.15 * 10) / 10,
        risk: rf >= 50 ? 'high' : rf >= 30 ? 'moderate' : 'low',
      }
    }
    return out
  }, [ran, rainAdj, tempAdj, predictions])

  return (
    <div>
      <h1 className="page-title">Scenario Lab</h1>
      <p className="page-sub">
        Sensitivity on {isLive ? 'live' : 'current'} AI baseline.
        <strong style={{ color: 'var(--yellow)' }}> Simulation only — not an operational forecast.</strong>
      </p>

      <div className="alert warn">
        ⚠️ SCENARIO SIMULATION. Adjustments multiply the current downscaled field. Do not use as a real forecast.
      </div>

      <div className="card">
        <h3>Drivers</h3>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Rainfall adjustment</span>
            <strong style={{ color: 'var(--accent)' }}>{rainAdj > 0 ? '+' : ''}{rainAdj}%</strong>
          </div>
          <input type="range" className="scenario-slider" min={-30} max={80} step={5} value={rainAdj}
            onChange={(e) => { setRainAdj(Number(e.target.value)); setRan(false) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)' }}>
            <span>−30%</span><span>+80%</span>
          </div>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Temperature adjustment</span>
            <strong style={{ color: 'var(--orange)' }}>{tempAdj > 0 ? '+' : ''}{tempAdj}°C</strong>
          </div>
          <input type="range" className="scenario-slider" min={-3} max={5} step={0.5} value={tempAdj}
            onChange={(e) => { setTempAdj(Number(e.target.value)); setRan(false) }} />
        </div>
        <button className="btn btn-primary" onClick={() => setRan(true)}>▶ RUN SCENARIO</button>
      </div>

      {results && (
        <div className="card">
          <h3>Results</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Baseline block {block.rainfall} mm · rain {rainAdj > 0 ? '+' : ''}{rainAdj}% · temp {tempAdj > 0 ? '+' : ''}{tempAdj}°C
          </p>
          <table className="cmp-table">
            <thead>
              <tr><th>Panchayat</th><th>Rainfall</th><th>Range</th><th>Tmax</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {panchayats.map((p) => {
                const r = results[p.id]
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">{r.rainfall} mm</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>{r.low}–{r.high}</td>
                    <td className="num">{r.tmax}°</td>
                    <td><span className={`badge ${r.risk === 'high' ? 'red' : r.risk === 'moderate' ? 'orange' : 'green'}`}>{r.risk}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
