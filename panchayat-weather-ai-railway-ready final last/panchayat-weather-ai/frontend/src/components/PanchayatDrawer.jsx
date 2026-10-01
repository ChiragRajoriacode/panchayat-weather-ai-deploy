import { Link } from 'react-router-dom'
import { useSelection } from '../context/SelectionContext'
import { useLive } from '../context/LiveDataContext'

export default function PanchayatDrawer() {
  const { selectedPanchayatId, drawerOpen, closeDrawer } = useSelection()
  const { panchayats, predictions, block, fmt, status, isDemo } = useLive()
  if (!drawerOpen || selectedPanchayatId == null) return null

  const p = panchayats.find((x) => x.id === selectedPanchayatId)
  const pr = predictions[selectedPanchayatId]
  if (!p) return null

  return (
    <>
      <div
        onClick={closeDrawer}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(7, 59, 92, 0.35)', zIndex: 80,
        }}
      />
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(400px, 100vw)',
          background: '#fff', zIndex: 90, boxShadow: '-8px 0 32px rgba(7,59,92,0.15)',
          display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)',
        }}
      >
        <div style={{ padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gram Panchayat
            </div>
            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', color: 'var(--navy)' }}>{p.name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {p.district || 'Odisha'} · {p.block || '—'}
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={closeDrawer}>✕</button>
        </div>

        <div style={{ padding: '1rem 1.2rem', overflowY: 'auto', flex: 1 }}>
          {isDemo && <div className="alert warn" style={{ fontSize: '0.8rem' }}>DEMO / SIMULATED values may apply</div>}

          <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="kpi">
              <div className="label">Rainfall</div>
              <div className="value">{fmt(pr?.rainfall)} <span className="unit">mm</span></div>
            </div>
            <div className="kpi">
              <div className="label">Range</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {pr?.low != null && pr?.high != null ? `${pr.low}–${pr.high}` : 'N/A'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Tmax</div>
              <div className="value">{fmt(pr?.tmax)}°</div>
            </div>
            <div className="kpi">
              <div className="label">Confidence</div>
              <div className="value">{fmt(pr?.conf, '%')}</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 8 }}>
            <h3>Context</h3>
            <table className="cmp-table">
              <tbody>
                <tr><td>Block rainfall</td><td className="num">{fmt(block.rainfall, ' mm')}</td></tr>
                <tr><td>Elevation</td><td className="num">{p.elevation != null ? `${p.elevation} m` : 'N/A'}</td></tr>
                <tr><td>Station</td><td>{p.has_station ? 'Yes' : 'No / estimated'}</td></tr>
                <tr><td>Risk</td><td><span className={`badge ${pr?.risk === 'high' ? 'red' : pr?.risk === 'moderate' ? 'orange' : 'green'}`}>{pr?.risk || 'N/A'}</span></td></tr>
                <tr><td>Model</td><td>{pr?.model_version || 'N/A'}</td></tr>
                <tr><td>Data mode</td><td>{status}</td></tr>
                <tr><td>Lat / Lon</td><td className="num">{p.lat ?? 'N/A'}, {p.lon ?? 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <Link to="/compare" className="btn btn-primary" onClick={closeDrawer}>Compare & explain</Link>
            <Link to="/advisory" className="btn btn-secondary" onClick={closeDrawer}>Agro advisory</Link>
            <Link to="/reports" className="btn btn-secondary" onClick={closeDrawer}>Generate report</Link>
            <Link to="/downscale" className="btn btn-secondary" onClick={closeDrawer}>AI downscaling</Link>
          </div>
        </div>
      </aside>
    </>
  )
}
