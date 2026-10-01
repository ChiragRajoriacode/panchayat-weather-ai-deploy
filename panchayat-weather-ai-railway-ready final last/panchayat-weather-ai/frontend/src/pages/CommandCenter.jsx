import { Link } from 'react-router-dom'
import { useLive } from '../context/LiveDataContext'
import { useSelection } from '../context/SelectionContext'
import SystemStatusBar from '../components/SystemStatusBar'

export default function CommandCenter() {
  const {
    status, isLive, isDemo, dayIdx, setDayIdx, dayLabels,
    panchayats, predictions, block, alerts, ranking,
    error, lastFetch, refresh, blockName, fmt, backendStatus,
  } = useLive()
  const { openPanchayat } = useSelection()

  const vals = Object.values(predictions).filter((p) => p.rainfall != null)
  const minR = vals.length ? Math.min(...vals.map((p) => p.rainfall)) : null
  const maxR = vals.length ? Math.max(...vals.map((p) => p.rainfall)) : null
  const avgRain = vals.length
    ? Math.round(vals.reduce((s, p) => s + p.rainfall, 0) / vals.length * 10) / 10
    : null

  return (
    <div>
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7DD3FC', marginBottom: 8 }}>
              Weather Intelligence Command Center
            </div>
            <h2>Block → Panchayat AI Downscaling</h2>
            <p style={{ marginBottom: 16 }}>
              One block forecast becomes local conditions across Gram Panchayats —
              for agricultural and disaster decision support in Odisha.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link to="/downscale" className="btn btn-gold btn-lg">Run AI Downscaling</Link>
              <Link to="/map" className="btn btn-secondary btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>
                GIS Explorer
              </Link>
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '1rem 1.25rem',
            border: '1px solid rgba(255,255,255,0.12)', minWidth: 180,
          }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Block rainfall</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
              {fmt(block.rainfall)}
              {block.rainfall != null && <span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.7 }}> mm</span>}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
              T {fmt(block.tmin)}–{fmt(block.tmax)}° · RH {fmt(block.humidity, '%')}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', opacity: 0.7 }}>{blockName}</div>
          </div>
        </div>
      </div>

      <SystemStatusBar />

      {(isDemo || error) && (
        <div className="alert warn">
          <strong>DEMO MODE — SIMULATED DATA</strong>
          {error ? ` (${error})` : ''}. Start the FastAPI backend or check network for live Open-Meteo.
          <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 10 }} onClick={refresh}>Refresh</button>
        </div>
      )}

      <div className="time-slider">
        {dayLabels.map((d, i) => (
          <button key={i} type="button" className={`time-btn ${dayIdx === i ? 'active' : ''}`} onClick={() => setDayIdx(i)}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-icon">🌧</div>
          <div className="label">Rainfall</div>
          <div className="value">{fmt(block.rainfall)} <span className="unit">mm</span></div>
          <div className="meta">Source: {block.source || 'N/A'} · {block.date || 'N/A'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon">🌡</div>
          <div className="label">Temperature</div>
          <div className="value">{fmt(block.tmax)}<span className="unit">°</span></div>
          <div className="meta">Min {fmt(block.tmin)}° · Max {fmt(block.tmax)}°</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon green">💧</div>
          <div className="label">Humidity</div>
          <div className="value">{fmt(block.humidity)}<span className="unit">%</span></div>
          <div className="meta">Block mean</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon">🌬</div>
          <div className="label">Wind</div>
          <div className="value">{fmt(block.wind)}<span className="unit"> km/h</span></div>
          <div className="meta">Max speed</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon red">⚠</div>
          <div className="label">Active Alerts</div>
          <div className="value">{alerts.length}</div>
          <div className="meta">{ranking.filter((r) => r.risk === 'high').length} high-risk GP</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon gold">◎</div>
          <div className="label">AI spatial range</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>
            {minR != null ? `${minR}–${maxR}` : 'N/A'}
          </div>
          <div className="meta">Avg {fmt(avgRain)} mm · {panchayats.length} GPs</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Alerts</h3>
            <Link to="/extreme" className="btn btn-sm btn-secondary">View all</Link>
          </div>
          {alerts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No threshold breaches for this day.</p>}
          {alerts.slice(0, 5).map((a, i) => (
            <div key={i} className={`alert-item ${a.level}`}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  <span className={`badge ${a.level}`}>{a.level}</span> {a.name}
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: 3 }}>{a.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Priority ranking</h3>
            <Link to="/compare" className="btn btn-sm btn-secondary">Compare</Link>
          </div>
          {ranking.slice(0, 6).map((r, i) => (
            <div key={r.id} className="rank-item" onClick={() => openPanchayat(r.id)} role="button" tabIndex={0}>
              <div className={`rank-num ${i < 2 ? 'top' : ''}`}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 650 }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{r.rainfall} mm · {r.tmax}°C</div>
              </div>
              <span className={`badge ${r.risk === 'high' ? 'red' : r.risk === 'moderate' ? 'orange' : 'green'}`}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Panchayat board — {dayLabels[dayIdx]?.label}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Panchayat</th>
                <th>Rainfall</th>
                <th>Range</th>
                <th>Tmax</th>
                <th>Conf.</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {panchayats.map((p) => {
                const pr = predictions[p.id]
                if (!pr) return null
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPanchayat(p.id)}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="num">{pr.rainfall != null ? `${pr.rainfall} mm` : 'N/A'}</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {pr.low != null && pr.high != null ? `${pr.low}–${pr.high}` : 'N/A'}
                    </td>
                    <td className="num">{pr.tmax != null ? `${pr.tmax}°` : 'N/A'}</td>
                    <td className="num">{pr.conf != null ? `${pr.conf}%` : 'N/A'}</td>
                    <td>
                      <span className={`badge ${pr.risk === 'high' ? 'red' : pr.risk === 'moderate' ? 'orange' : 'green'}`}>
                        {pr.risk || 'N/A'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="source-note">
          {isDemo
            ? 'DEMO MODE — SIMULATED DATA. Values are illustrative until live feed or backend is available.'
            : `Data mode: ${status}. Block source: ${block.source || 'N/A'}. Updated: ${lastFetch ? new Date(lastFetch).toLocaleString() : 'N/A'}.`}
          {backendStatus && ` · API weather: ${backendStatus.weather_api || 'N/A'} · ML: ${backendStatus.ml_model || 'N/A'}`}
        </p>
      </div>
    </div>
  )
}
