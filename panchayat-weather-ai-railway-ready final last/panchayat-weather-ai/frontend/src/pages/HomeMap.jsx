import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet'
import { getMapPanchayats, getStatus, getDistricts } from '../services/api'

function rainfallColor(mm) {
  if (mm == null) return '#64748b'
  if (mm < 5) return '#fef08a'
  if (mm < 20) return '#86efac'
  if (mm < 50) return '#38bdf8'
  if (mm < 100) return '#6366f1'
  return '#7c3aed'
}

export default function HomeMap() {
  const [geo, setGeo] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getMapPanchayats()
      .then((r) => setGeo(r.data))
      .catch((e) => setError(e.message))
    getStatus()
      .then((r) => setStatus(r.data))
      .catch(() => {})
  }, [])

  const onEach = (feature, layer) => {
    const p = feature.properties
    layer.setStyle({
      fillColor: rainfallColor(p.predicted_rainfall),
      weight: 1,
      color: '#94a3b8',
      fillOpacity: 0.65,
    })
    layer.on('click', () => setSelected(p))
    layer.bindPopup(
      `<b>${p.name}</b><br/>Block: ${p.block}<br/>District: ${p.district}<br/>` +
        (p.predicted_rainfall != null
          ? `Rainfall: ${p.predicted_rainfall} mm<br/>Tmin: ${p.predicted_tmin}°C<br/>Tmax: ${p.predicted_tmax}°C`
          : 'No prediction yet — run Downscale')
    )
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Odisha Pilot Map</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        Panchayat boundaries (simplified polygons around real centroids). Color = predicted rainfall after downscaling.
      </p>

      {status && (
        <div className="status-bar">
          <span>
            <span className={`status-dot ${status.weather_api.toLowerCase()}`} />
            Weather API: {status.weather_api}
          </span>
          <span>
            <span className={`status-dot ${status.database === 'ONLINE' ? 'online' : 'failed'}`} />
            Database: {status.database}
          </span>
          <span>
            <span className={`status-dot ${status.ml_model === 'LOADED' ? 'loaded' : 'missing'}`} />
            ML Model: {status.ml_model}
          </span>
          <span>
            <span className={`status-dot ${status.gis === 'LOADED' ? 'loaded' : 'missing'}`} />
            GIS: {status.gis}
          </span>
          {status.last_updated && (
            <span>Last weather success: {new Date(status.last_updated).toLocaleString()}</span>
          )}
        </div>
      )}

      {error && <div className="alert warn">Map data error: {error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer center={[20.3, 85.8]} zoom={9} style={{ height: 480 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geo && <GeoJSON data={geo} onEachFeature={onEach} />}
        </MapContainer>
      </div>

      <div className="card">
        <h2>Legend — Predicted Rainfall</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          {[
            ['#fef08a', '< 5 mm'],
            ['#86efac', '5–20 mm'],
            ['#38bdf8', '20–50 mm'],
            ['#6366f1', '50–100 mm'],
            ['#7c3aed', '> 100 mm'],
            ['#64748b', 'No prediction'],
          ].map(([c, l]) => (
            <span key={l}>
              <span style={{ display: 'inline-block', width: 14, height: 14, background: c, borderRadius: 3, marginRight: 6, verticalAlign: 'middle' }} />
              {l}
            </span>
          ))}
        </div>
        <p className="source-note">
          Weather source: Open-Meteo (not IMD). GIS: pilot simplified polygons for Khordha & Cuttack panchayats.
          Run <strong>Downscale Forecast</strong> to populate rainfall colors.
        </p>
      </div>

      {selected && (
        <div className="card">
          <h2>{selected.name}</h2>
          <div className="grid grid-3">
            <div className="stat">
              <div className="label">Block / District</div>
              <div className="value" style={{ fontSize: '1rem' }}>{selected.block} / {selected.district}</div>
            </div>
            <div className="stat">
              <div className="label">Predicted Rainfall</div>
              <div className="value">{selected.predicted_rainfall ?? '—'} <span className="unit">mm</span></div>
            </div>
            <div className="stat">
              <div className="label">Tmin / Tmax</div>
              <div className="value" style={{ fontSize: '1.1rem' }}>
                {selected.predicted_tmin ?? '—'}° / {selected.predicted_tmax ?? '—'}°
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
