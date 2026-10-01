import { useState, useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'
import { getFeatureInfluence } from '../data/demoData'

export default function ComparisonPage() {
  const { panchayats, predictions, block, isLive } = useLive()
  const [selected, setSelected] = useState([1, 3, 9])
  const [whyA, setWhyA] = useState(1)
  const [whyB, setWhyB] = useState(3)

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const rows = [
    { key: 'rainfall', label: 'Rainfall (mm)' },
    { key: 'tmin', label: 'Tmin (°C)' },
    { key: 'tmax', label: 'Tmax (°C)' },
    { key: 'humidity', label: 'Humidity (%)' },
    { key: 'conf', label: 'Confidence (%)' },
    { key: 'low', label: 'Range low' },
    { key: 'high', label: 'Range high' },
  ]

  const inflA = useMemo(() => getFeatureInfluence(whyA), [whyA])
  const inflB = useMemo(() => getFeatureInfluence(whyB), [whyB])
  const pA = panchayats.find((p) => p.id === whyA)
  const pB = panchayats.find((p) => p.id === whyB)
  const prA = predictions[whyA]
  const prB = predictions[whyB]

  return (
    <div>
      <h1 className="page-title">Compare & Explain</h1>
      <p className="page-sub">
        Side-by-side comparison and why local weather differs within the same block.
        {isLive ? ' Using live downscaled values.' : ''}
      </p>

      <div className="card">
        <h3>Panchayat Comparison</h3>
        <div className="layer-pills">
          {panchayats.map((p) => (
            <button key={p.id} className={`layer-pill ${selected.includes(p.id) ? 'active' : ''}`} onClick={() => toggle(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Block</th>
                  {selected.map((id) => (
                    <th key={id}>{panchayats.find((p) => p.id === id)?.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {r.key === 'rainfall' ? block.rainfall
                        : r.key === 'tmin' ? block.tmin
                          : r.key === 'tmax' ? block.tmax
                            : r.key === 'humidity' ? block.humidity : '—'}
                    </td>
                    {selected.map((id) => (
                      <td key={id} className="num">{predictions[id]?.[r.key]}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Elevation (m)</td>
                  <td>—</td>
                  {selected.map((id) => (
                    <td key={id} className="num">{panchayats.find((p) => p.id === id)?.elevation}</td>
                  ))}
                </tr>
                <tr>
                  <td>Station</td>
                  <td>—</td>
                  {selected.map((id) => {
                    const has = panchayats.find((p) => p.id === id)?.has_station
                    return <td key={id}>{has ? '✓' : 'est.'}</td>
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Why different?</h3>
        <div className="form-row">
          <div>
            <label>Panchayat A</label>
            <select value={whyA} onChange={(e) => setWhyA(Number(e.target.value))}>
              {panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>Panchayat B</label>
            <select value={whyB} onChange={(e) => setWhyB(Number(e.target.value))}>
              {panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-2">
          <div className="ba-panel" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontWeight: 650 }}>{pA?.name}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{prA?.rainfall} mm</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Elev {pA?.elevation} m · RH {prA?.humidity}% · Conf {prA?.conf}%</div>
            <div style={{ marginTop: 12 }}>
              {inflA.map((f) => (
                <div key={f.name} className="feat-bar-row">
                  <div className="feat-bar-label" style={{ width: 110 }}>{f.name}</div>
                  <div className="feat-bar-track"><div className="feat-bar-fill" style={{ width: `${Math.min(100, f.value * 2.5)}%` }} /></div>
                  <div className="feat-bar-val">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ba-panel" style={{ borderLeft: '3px solid var(--purple)' }}>
            <div style={{ fontWeight: 650 }}>{pB?.name}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{prB?.rainfall} mm</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Elev {pB?.elevation} m · RH {prB?.humidity}% · Conf {prB?.conf}%</div>
            <div style={{ marginTop: 12 }}>
              {inflB.map((f) => (
                <div key={f.name} className="feat-bar-row">
                  <div className="feat-bar-label" style={{ width: 110 }}>{f.name}</div>
                  <div className="feat-bar-track"><div className="feat-bar-fill" style={{ width: `${Math.min(100, f.value * 2.5)}%`, background: 'linear-gradient(90deg, #818cf8, #a78bfa)' }} /></div>
                  <div className="feat-bar-val">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="alert info" style={{ marginTop: '1rem', marginBottom: 0 }}>
          Same block forecast ({block.rainfall} mm), different local outcomes — the reason SIH26074 needs panchayat-level downscaling.
        </div>
      </div>
    </div>
  )
}
