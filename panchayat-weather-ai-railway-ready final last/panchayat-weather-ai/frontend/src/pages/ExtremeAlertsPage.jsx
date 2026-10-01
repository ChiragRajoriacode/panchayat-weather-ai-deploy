import { useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'
import { rainCategories, imdStyleColour, cycloneContextBanner, EXTREME_THRESHOLDS } from '../data/extremeAlerts'

export default function ExtremeAlertsPage() {
  const { panchayats, predictions, block, isLive } = useLive()
  const cyclone = cycloneContextBanner()

  const rows = useMemo(() => {
    return panchayats.map((p) => {
      const pr = predictions[p.id] || { rainfall: 0, low: 0, high: 0, conf: 80 }
      const cats = rainCategories(pr)
      const colour = imdStyleColour(pr)
      return { p, pr, cats, colour }
    }).sort((a, b) => b.pr.rainfall - a.pr.rainfall)
  }, [panchayats, predictions])

  const worst = rows[0]

  return (
    <div>
      <h1 className="page-title">Alerts</h1>
      <p className="page-sub">
        Odisha-focused heavy-rain categories, probabilistic bands, and IMD-style colour messaging —
        clearly separated from official warnings.
      </p>

      {cyclone.active && (
        <div className="alert danger">
          <strong>{cyclone.title}</strong>
          <div style={{ marginTop: 4 }}>{cyclone.text}</div>
        </div>
      )}

      <div className="alert warn">
        <strong>Official vs AI:</strong> Colour bands below are for communication of <em>model estimates</em>.
        They are <strong>not</strong> IMD / OSDMA official colour-coded warnings. Always follow district control room and IMD.
      </div>

      {worst && (
        <div className="hero-banner" style={{
          borderColor: worst.colour.code === 'red' ? 'rgba(248,113,113,0.5)'
            : worst.colour.code === 'orange' ? 'rgba(251,146,60,0.5)'
              : 'rgba(56,189,248,0.25)',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Highest rain signal today · {isLive ? 'Live' : 'Demo'}
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0.35rem 0' }}>
              {worst.p.name}: {worst.pr.rainfall} mm
            </h2>
            <span className={`badge ${worst.colour.code === 'green' ? 'green' : worst.colour.code}`}>
              {worst.colour.label}
            </span>
            <p style={{ margin: '0.75rem 0 0', color: '#cbd5e1', fontSize: '0.9rem', maxWidth: 520 }}>
              {worst.colour.action}
            </p>
            <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--muted)' }}>
              P(&gt;65 mm) ≈ {worst.cats.veryHeavy.p}% · range {worst.pr.low}–{worst.pr.high} mm · block {block.rainfall} mm
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Probabilistic rain categories by panchayat</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Panchayat</th>
                <th>Forecast</th>
                <th>&lt;15</th>
                <th>15–35</th>
                <th>35–65</th>
                <th>&gt;65 mm</th>
                <th>Colour</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, pr, cats, colour }) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 560 }}>{p.name}</td>
                  <td className="num">{pr.rainfall} mm</td>
                  <td className="num">{cats.light.p}%</td>
                  <td className="num">{cats.moderate.p}%</td>
                  <td className="num">{cats.heavy.p}%</td>
                  <td className="num" style={{ color: cats.veryHeavy.p >= 30 ? 'var(--red)' : undefined }}>{cats.veryHeavy.p}%</td>
                  <td><span className={`badge ${colour.code === 'green' ? 'green' : colour.code}`}>{colour.code}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="source-note">
          SIMULATED / HEURISTIC probabilities from forecast ± range — not calibrated ensemble or classifier POD — not calibrated ensemble output.
          Production: quantile regression or ensemble members.
        </p>
      </div>

      <div className="card">
        <h3>Thresholds used</h3>
        <table className="cmp-table">
          <thead><tr><th>Name</th><th>Value</th><th>Note</th></tr></thead>
          <tbody>
            {EXTREME_THRESHOLDS.map((t) => (
              <tr key={t.name}><td>{t.name}</td><td className="num">{t.value}</td><td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{t.source}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
