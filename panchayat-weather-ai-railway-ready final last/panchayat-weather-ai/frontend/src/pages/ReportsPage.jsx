import { useState } from 'react'
import { useLive } from '../context/LiveDataContext'
import { getAdvisory } from '../data/demoData'

export default function ReportsPage() {
  const { panchayats, predictions, block, alerts, ranking, isLive, blockName, lastFetch } = useLive()
  const [pid, setPid] = useState(3)
  const [generated, setGenerated] = useState(false)

  const p = panchayats.find((x) => x.id === pid)
  const pr = predictions[pid]
  const advisory = pr ? getAdvisory('Rice', 'Flowering', pr.rainfall, pr.tmax) : null
  const localAlerts = alerts.filter((a) => a.panchayat_id === pid)

  const generate = () => setGenerated(true)

  const downloadTxt = () => {
    if (!p || !pr) return
    const lines = [
      'PANCHAYAT WEATHER REPORT',
      '========================',
      `Generated: ${new Date().toLocaleString()}`,
      `Data mode: ${isLive ? 'LIVE Open-Meteo + AI downscale' : 'DEMO'}`,
      `Last fetch: ${lastFetch || 'n/a'}`,
      '',
      `Panchayat: ${p.name}`,
      `Block: ${p.block} · District: ${p.district}`,
      `Elevation: ${p.elevation} m · Station: ${p.has_station ? 'Yes' : 'No (estimated)'}`,
      '',
      'FORECAST',
      `  Block rainfall: ${block.rainfall} mm`,
      `  AI rainfall: ${pr.rainfall} mm (range ${pr.low}–${pr.high})`,
      `  Tmin / Tmax: ${pr.tmin} / ${pr.tmax} °C`,
      `  Humidity: ${pr.humidity}%`,
      `  Confidence: ${pr.conf}%`,
      `  Risk: ${pr.risk}`,
      '',
      'ALERTS',
      ...(localAlerts.length ? localAlerts.map((a) => `  [${a.level}] ${a.title}: ${a.detail}`) : ['  None']),
      '',
      'AGRO ADVISORY (Rice / Flowering — example)',
      `  ${advisory?.summary}`,
      ...(advisory?.recommendations || []).map((r) => `  • ${r}`),
      '',
      'DATA SOURCES',
      '  Open-Meteo Forecast API (block + point)',
      '  Elevation / slope / aspect (static GIS)',
      '  AI spatial residual downscaling',
      '',
      'Disclaimer: Indicative decision support. Not an IMD official product.',
      'Follow local agricultural officer guidance.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `panchayat-report-${p.name.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="page-title">Reports</h1>
      <p className="page-sub">Generate panchayat-level weather + risk + advisory reports for officers.</p>

      <div className="card">
        <div className="form-row">
          <div>
            <label>Panchayat</label>
            <select value={pid} onChange={(e) => { setPid(Number(e.target.value)); setGenerated(false) }}>
              {panchayats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate}>GENERATE PANCHAYAT REPORT</button>
          {generated && (
            <button className="btn btn-secondary" onClick={downloadTxt}>⬇ Download .txt</button>
          )}
        </div>
      </div>

      {generated && p && pr && (
        <div className="card" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.88rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Panchayat Weather Report</div>
            <div style={{ color: 'var(--muted)' }}>{p.name} · {p.block} · {p.district}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
              {isLive ? 'LIVE' : 'DEMO'} · {new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-2">
            <div>
              <strong>FORECAST</strong>
              <div>Block ({blockName}): {block.rainfall} mm</div>
              <div>AI rainfall: <strong>{pr.rainfall} mm</strong> ({pr.low}–{pr.high})</div>
              <div>Tmin / Tmax: {pr.tmin}° / {pr.tmax}°</div>
              <div>Humidity: {pr.humidity}% · Confidence: {pr.conf}%</div>
              <div>Risk: <span className={`badge ${pr.risk === 'high' ? 'red' : pr.risk === 'moderate' ? 'orange' : 'green'}`}>{pr.risk}</span></div>
            </div>
            <div>
              <strong>PROFILE</strong>
              <div>Elevation: {p.elevation} m · Slope: {p.slope}°</div>
              <div>Area: {p.area_sqkm} km²</div>
              <div>Station: {p.has_station ? 'Direct' : 'Estimated (no station)'}</div>
              <div>Block rank concern: #{ranking.findIndex((r) => r.id === pid) + 1}</div>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <strong>ALERTS</strong>
            {localAlerts.length === 0 && <div style={{ color: 'var(--muted)' }}>None active</div>}
            {localAlerts.map((a, i) => (
              <div key={i}>[{a.level.toUpperCase()}] {a.title} — {a.detail}</div>
            ))}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <strong>AGRO ADVISORY (Rice · Flowering)</strong>
            <div>{advisory.summary}</div>
            <ul style={{ margin: '0.4rem 0', paddingLeft: '1.2rem' }}>
              {advisory.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            Sources: Open-Meteo Forecast · GIS elevation/slope · AI spatial residual downscaling.
            Not an IMD official product. Follow local agricultural guidance.
          </div>
        </div>
      )}

      <div className="card">
        <h3>Block / District summary</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {blockName}: {block.rainfall} mm · AI range across panchayats:{' '}
          {Math.min(...Object.values(predictions).map((x) => x.rainfall))}–
          {Math.max(...Object.values(predictions).map((x) => x.rainfall))} mm ·{' '}
          {alerts.filter((a) => a.level === 'red').length} red alerts ·{' '}
          {ranking.filter((r) => r.risk === 'high').length} high-risk panchayats
        </p>
      </div>
    </div>
  )
}
