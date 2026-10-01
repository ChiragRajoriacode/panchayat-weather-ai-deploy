import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useLive } from '../context/LiveDataContext'
import { LAYER_OPTIONS } from '../data/demoData'

function rainfallColor(mm) {
  if (mm == null) return '#64748b'
  if (mm < 5) return '#fef08a'
  if (mm < 15) return '#86efac'
  if (mm < 30) return '#38bdf8'
  if (mm < 50) return '#6366f1'
  return '#a855f7'
}
function tempColor(t) {
  if (t == null) return '#64748b'
  if (t < 30) return '#93c5fd'
  if (t < 33) return '#fde68a'
  if (t < 36) return '#fb923c'
  return '#f87171'
}
function humidityColor(h) {
  if (h == null) return '#64748b'
  if (h < 60) return '#fef08a'
  if (h < 75) return '#86efac'
  if (h < 88) return '#38bdf8'
  return '#6366f1'
}
function elevColor(e) {
  if (e < 35) return '#86efac'
  if (e < 45) return '#38bdf8'
  if (e < 55) return '#818cf8'
  return '#a78bfa'
}
function riskColor(r) {
  if (r === 'high') return '#f87171'
  if (r === 'moderate') return '#fb923c'
  return '#34d399'
}
function confColor(c) {
  if (c >= 90) return '#34d399'
  if (c >= 85) return '#38bdf8'
  if (c >= 80) return '#fbbf24'
  return '#f87171'
}

function getColor(layer, p, pred) {
  switch (layer) {
    case 'rainfall': return rainfallColor(pred?.rainfall)
    case 'tmax': return tempColor(pred?.tmax)
    case 'humidity': return humidityColor(pred?.humidity)
    case 'elevation': return elevColor(p.elevation)
    case 'risk': return riskColor(pred?.risk)
    case 'confidence': return confColor(pred?.conf)
    default: return '#64748b'
  }
}
function getLabel(layer, p, pred) {
  switch (layer) {
    case 'rainfall': return `${pred?.rainfall} mm`
    case 'tmax': return `${pred?.tmax}°C`
    case 'humidity': return `${pred?.humidity}%`
    case 'elevation': return `${p.elevation} m`
    case 'risk': return pred?.risk
    case 'confidence': return `${pred?.conf}%`
    default: return ''
  }
}

function buildGeoJSON(panchayats, preds, layer) {
  return {
    type: 'FeatureCollection',
    features: panchayats.map((p) => {
      const pred = preds[p.id]
      const d = 0.025
      const coords = [
        [p.lon - d, p.lat - d], [p.lon + d, p.lat - d],
        [p.lon + d, p.lat + d], [p.lon - d, p.lat + d],
        [p.lon - d, p.lat - d],
      ]
      return {
        type: 'Feature',
        properties: { ...p, pred, fillColor: getColor(layer, p, pred), label: getLabel(layer, p, pred) },
        geometry: { type: 'Polygon', coordinates: [coords] },
      }
    }),
  }
}

function FitBounds({ geo }) {
  const map = useMap()
  useEffect(() => {
    if (!geo?.features?.length) return
    const lats = geo.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[1]))
    const lons = geo.features.flatMap((f) => f.geometry.coordinates[0].map((c) => c[0]))
    map.fitBounds([
      [Math.min(...lats) - 0.02, Math.min(...lons) - 0.02],
      [Math.max(...lats) + 0.02, Math.max(...lons) + 0.02],
    ])
  }, [geo, map])
  return null
}

export default function MapExplorer() {
  const { dayIdx, setDayIdx, dayLabels, panchayats, predictions, block, isLive, refresh } = useLive()
  const [layer, setLayer] = useState('rainfall')
  const [tile, setTile] = useState('standard')
  const [selected, setSelected] = useState(null)

  const geo = useMemo(() => buildGeoJSON(panchayats, predictions, layer), [panchayats, predictions, layer])

  const tileUrl =
    tile === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : tile === 'terrain'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const onEach = (feature, leafletLayer) => {
    const p = feature.properties
    leafletLayer.setStyle({ fillColor: p.fillColor, fillOpacity: 0.65, color: '#172033', weight: 1.5 })
    leafletLayer.bindPopup(
      `<b>${p.name}</b><br/>${p.block} · ${p.district}<br/>Elev ${p.elevation} m<br/><b>${p.label}</b><br/>` +
      (p.pred ? `Range ${p.pred.low}–${p.pred.high} · Conf ${p.pred.conf}%` : '')
    )
    leafletLayer.on('click', () => setSelected(p))
  }

  return (
    <div>
      <h1 className="page-title">GIS Explorer</h1>
      <p className="page-sub">
        Layers · multi-day slider · satellite/terrain. {isLive ? 'Live Open-Meteo + AI downscale.' : 'Demo data.'}
      </p>

      <div className="status-bar">
        <span><span className={`status-dot ${isLive ? 'online' : 'limited'}`} />{isLive ? 'LIVE' : 'DEMO'}</span>
        <span>Block rain: {block.rainfall} mm</span>
        <button className="btn btn-sm btn-secondary" onClick={refresh}>↻ Refresh</button>
      </div>

      <div className="time-slider">
        {dayLabels.map((d, i) => (
          <button key={i} className={`time-btn ${dayIdx === i ? 'active' : ''}`} onClick={() => setDayIdx(i)}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="layer-pills">
        {LAYER_OPTIONS.map((l) => (
          <button key={l.id} className={`layer-pill ${layer === l.id ? 'active' : ''}`} onClick={() => setLayer(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="layer-pills">
        {['standard', 'satellite', 'terrain'].map((t) => (
          <button key={t} className={`layer-pill ${tile === t ? 'active' : ''}`} onClick={() => setTile(t)}>
            {t === 'standard' ? '☐ Standard' : t === 'satellite' ? '☐ Satellite' : '☐ Terrain'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer center={[20.3, 85.78]} zoom={10} style={{ height: 480 }} key={tile}>
          <TileLayer attribution={tile} url={tileUrl} />
          <GeoJSON key={`${layer}-${dayIdx}-${isLive}`} data={geo} onEachFeature={onEach} />
          <FitBounds geo={geo} />
        </MapContainer>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Legend — {LAYER_OPTIONS.find((l) => l.id === layer)?.label}</h3>
          {layer === 'rainfall' && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              {[['#fef08a', '<5'], ['#86efac', '5–15'], ['#38bdf8', '15–30'], ['#6366f1', '30–50'], ['#a855f7', '>50']].map(([c, l]) => (
                <span key={l}><span style={{ display: 'inline-block', width: 14, height: 14, background: c, borderRadius: 3, marginRight: 4, verticalAlign: 'middle' }} />{l} mm</span>
              ))}
            </div>
          )}
          <p className="source-note">Block baseline {block.rainfall} mm. Colour = AI downscaled field.</p>
        </div>
        <div className="card">
          <h3>Selected</h3>
          {!selected && <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Click a polygon.</p>}
          {selected && (
            <>
              <div style={{ fontSize: '1.15rem', fontWeight: 650 }}>{selected.name}</div>
              <div className="grid grid-3" style={{ marginTop: 8 }}>
                <div className="stat"><div className="label">Rain</div><div className="value" style={{ fontSize: '1.1rem' }}>{selected.pred?.rainfall} mm</div></div>
                <div className="stat"><div className="label">Tmax</div><div className="value" style={{ fontSize: '1.1rem' }}>{selected.pred?.tmax}°</div></div>
                <div className="stat"><div className="label">Conf</div><div className="value" style={{ fontSize: '1.1rem' }}>{selected.pred?.conf}%</div></div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 8 }}>
                Elev {selected.elevation} m · {selected.has_station ? '✓ Station' : '⚠ Estimated'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
