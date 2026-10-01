import { useEffect, useState } from 'react'
import { getDataSources, getStatus } from '../services/api'

export default function DataSourcesPage() {
  const [sources, setSources] = useState([])
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getDataSources().then((r) => setSources(r.data)).catch(() => {})
    getStatus().then((r) => setStatus(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Data Sources & Attribution</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        All weather values in this MVP come from Open-Meteo public APIs.
        They are <strong>not</strong> IMD station observations. Source is always labeled.
      </p>

      {status && (
        <div className="card">
          <h2>System Status</h2>
          <div className="grid grid-4">
            <div className="stat">
              <div className="label">Weather API</div>
              <div className="value" style={{ fontSize: '1rem' }}>{status.weather_api}</div>
            </div>
            <div className="stat">
              <div className="label">Database</div>
              <div className="value" style={{ fontSize: '1rem' }}>{status.database}</div>
            </div>
            <div className="stat">
              <div className="label">ML Model</div>
              <div className="value" style={{ fontSize: '1rem' }}>{status.ml_model}</div>
            </div>
            <div className="stat">
              <div className="label">GIS</div>
              <div className="value" style={{ fontSize: '1rem' }}>{status.gis}</div>
            </div>
          </div>
        </div>
      )}

      {sources.map((s) => (
        <div key={s.name} className="card">
          <h2 style={{ fontSize: '1rem' }}>{s.name}</h2>
          <p style={{ fontSize: '0.9rem' }}>{s.description}</p>
          <div className="source-note">
            Type: {s.type} · License: {s.license || '—'} · Status: {s.status}
            {s.url && (
              <> · <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a></>
            )}
          </div>
        </div>
      ))}

      <div className="card">
        <h2>What is live vs cached</h2>
        <ul style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          <li><strong>Live:</strong> Open-Meteo forecast & historical API calls when ONLINE.</li>
          <li><strong>Cached:</strong> Last successful forecast response if API fails (labeled as cached).</li>
          <li><strong>Pilot GIS:</strong> Bundled simplified panchayat polygons (not full official boundaries).</li>
          <li><strong>Models:</strong> Trained offline on reanalysis; loaded from disk at runtime.</li>
        </ul>
      </div>
    </div>
  )
}
