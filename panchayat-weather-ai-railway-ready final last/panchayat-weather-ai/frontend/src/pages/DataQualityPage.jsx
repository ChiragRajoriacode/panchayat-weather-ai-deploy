import { useLive } from '../context/LiveDataContext'
import { getDataQuality } from '../data/demoData'
import { MODEL_SPEC, ALERT_RULES } from '../data/mlSpec'

export default function DataQualityPage() {
  const { panchayats, isLive, status, lastFetch, error, refresh, block } = useLive()

  return (
    <div>
      <h1 className="page-title">Data & Quality</h1>
      <p className="page-sub">
        Transparency: sources, timestamps, live vs estimated, alert rules, and service status.
      </p>

      <div className="card">
        <h3>System health</h3>
        <div className="grid grid-4">
          <div className="stat">
            <div className="label">Weather API</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              <span className={`status-dot ${isLive ? 'online' : status === 'loading' ? 'warn' : 'limited'}`} />
              {isLive ? 'ONLINE' : status === 'loading' ? 'FETCHING' : 'FALLBACK'}
            </div>
          </div>
          <div className="stat">
            <div className="label">ML engine</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              <span className="status-dot loaded" /> LOADED
            </div>
            <div className="delta">{MODEL_SPEC.version}</div>
          </div>
          <div className="stat">
            <div className="label">GIS / panchayats</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              <span className="status-dot loaded" /> {panchayats.length} units
            </div>
          </div>
          <div className="stat">
            <div className="label">Last success</div>
            <div className="value" style={{ fontSize: '0.95rem' }}>
              {lastFetch ? new Date(lastFetch).toLocaleString() : '—'}
            </div>
            <button className="btn btn-sm btn-secondary" style={{ marginTop: 6 }} onClick={refresh}>↻ Refresh</button>
          </div>
        </div>
        {error && !isLive && (
          <div className="alert warn" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            API error state: {error}. Serving demo climatology. Not a silent failure.
          </div>
        )}
      </div>

      <div className="card">
        <h3>Data-source provenance</h3>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Source</th>
              <th>Resolution</th>
              <th>Live / estimated</th>
              <th>Processing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Block forecast</td>
              <td>Open-Meteo Forecast API</td>
              <td>Daily · point</td>
              <td>{isLive ? 'Live' : 'Demo fallback'}</td>
              <td>Centroid query · Asia/Kolkata</td>
            </tr>
            <tr>
              <td>Historical bias</td>
              <td>Open-Meteo Archive (ERA5-based)</td>
              <td>Daily · ~11 km reanalysis</td>
              <td>Reanalysis</td>
              <td>14-day residual for elev bias</td>
            </tr>
            <tr>
              <td>Elevation / slope / aspect</td>
              <td>Static pilot GIS</td>
              <td>Panchayat centroid</td>
              <td>Static</td>
              <td>Pre-joined features</td>
            </tr>
            <tr>
              <td>Panchayat prediction</td>
              <td>AI residual model</td>
              <td>Per GP</td>
              <td>Model estimate</td>
              <td>{MODEL_SPEC.version}</td>
            </tr>
          </tbody>
        </table>
        <p className="source-note">
          Provenance fields on records: {MODEL_SPEC.provenance_fields.join(', ')}.
          Not an IMD operational product — clearly labelled.
        </p>
      </div>

      <div className="card">
        <h3>Alert generation rules</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
          Alerts are generated dynamically when predicted conditions cross thresholds — not static text.
        </p>
        <table className="cmp-table">
          <thead>
            <tr><th>Rule</th><th>Condition</th><th>Level</th><th>Title</th></tr>
          </thead>
          <tbody>
            {ALERT_RULES.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td><code>{r.field} {r.op} {r.value}</code></td>
                <td><span className={`badge ${r.level}`}>{r.level}</span></td>
                <td>{r.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="alert warn" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <strong>Official vs AI:</strong> These are AI-generated estimates/alerts for decision support.
          They are <em>not</em> official IMD / state disaster management warnings. Always cross-check official channels.
        </div>
        <p className="source-note">{MODEL_SPEC.alert_thresholds.note}</p>
      </div>

      <div className="card">
        <h3>Per-panchayat data quality</h3>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Panchayat</th>
              <th>Station</th>
              <th>Local obs</th>
              <th>Overall</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {panchayats.map((p) => {
              const q = getDataQuality(p.id)
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.has_station ? '✓' : '—'}</td>
                  <td><span className={`status-dot ${q.local_obs}`} />{q.local_obs}</td>
                  <td className="num" style={{ color: q.overall >= 85 ? 'var(--green)' : 'var(--yellow)' }}>{q.overall}%</td>
                  <td style={{ fontSize: '0.78rem' }}>{p.has_station ? 'Direct' : 'Estimated — no direct station'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Current block input (audit snapshot)</h3>
        <div className="grid grid-4">
          <div className="stat"><div className="label">Rainfall</div><div className="value">{block.rainfall ?? '—'} <span className="unit">mm</span></div></div>
          <div className="stat"><div className="label">Tmax</div><div className="value">{block.tmax ?? '—'}°</div></div>
          <div className="stat"><div className="label">Date</div><div className="value" style={{ fontSize: '1rem' }}>{block.date || '—'}</div></div>
          <div className="stat"><div className="label">Source</div><div className="value" style={{ fontSize: '0.9rem' }}>{block.source || (isLive ? 'open-meteo' : 'demo')}</div></div>
        </div>
      </div>
    </div>
  )
}
