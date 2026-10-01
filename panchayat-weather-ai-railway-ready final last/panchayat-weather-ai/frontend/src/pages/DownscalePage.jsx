import { useState, useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'
import { getFeatureInfluence, getDataQuality } from '../data/demoData'
import { createPredictionBatch } from '../services/auditTrail'
import { MODEL_SPEC } from '../data/mlSpec'

const PROGRESS = [
  'Collecting data',
  'Validating data',
  'Processing GIS',
  'Engineering features',
  'Running model',
  'Generating predictions',
]

export default function DownscalePage() {
  const {
    isLive, isDemo, block, predictions, panchayats, blockName, status, refresh,
    runBackendDownscale, downscaleResult, selectedBlock, fmt,
  } = useLive()
  const [step, setStep] = useState('idle')
  const [prog, setProg] = useState(-1)
  const [running, setRunning] = useState(false)
  const [selectedId, setSelectedId] = useState(panchayats[0]?.id || 3)
  const [apiError, setApiError] = useState(null)

  const influence = useMemo(() => getFeatureInfluence(selectedId), [selectedId])
  const quality = useMemo(() => getDataQuality(selectedId), [selectedId])
  const selected = panchayats.find((p) => p.id === selectedId)
  const selPred = predictions[selectedId]

  const rainValues = Object.values(predictions).map((p) => p.rainfall).filter((v) => v != null)
  const minR = rainValues.length ? Math.min(...rainValues) : null
  const maxR = rainValues.length ? Math.max(...rainValues) : null

  const runAnimation = async () => {
    setRunning(true)
    setApiError(null)
    setStep('block')
    for (let i = 0; i < PROGRESS.length; i++) {
      setProg(i)
      await wait(450)
    }
    // Try backend if block id available
    try {
      if (selectedBlock?.id || 1) {
        await runBackendDownscale(selectedBlock?.id || 1, block.date || new Date().toISOString().slice(0, 10))
      }
    } catch (e) {
      setApiError(String(e.response?.data?.detail || e.message || e))
    }
    setStep('done')
    createPredictionBatch({
      block,
      predictions,
      panchayats,
      source: isDemo ? 'demo' : status,
      modelVersion: downscaleResult?.model_version || MODEL_SPEC.version,
    })
    setRunning(false)
    setProg(-1)
  }

  return (
    <div>
      <h1 className="page-title">AI Downscaling</h1>
      <p className="page-sub">
        Hero pipeline: Block forecast → weather + history + GIS → feature engineering → ML → Panchayat forecasts.
        Values come from backend when available; otherwise live Open-Meteo residual or labelled demo.
      </p>

      {isDemo && (
        <div className="alert warn"><strong>DEMO MODE — SIMULATED DATA</strong> may be shown if APIs are offline.</div>
      )}
      {apiError && (
        <div className="alert info">Backend downscale: {apiError}. Showing available live/demo field.</div>
      )}

      <div className="card" style={{ textAlign: 'center', padding: '1.75rem' }}>
        <button type="button" className="btn btn-primary btn-lg" onClick={runAnimation} disabled={running} style={{ minWidth: 260 }}>
          {running ? <><span className="spinner" /> Running…</> : '▶ RUN AI DOWNSCALING'}
        </button>
        <p className="source-note" style={{ marginBottom: 0 }}>
          {blockName} · block rainfall {fmt(block.rainfall, ' mm')} · {block.date || 'N/A'}
        </p>
        {prog >= 0 && (
          <div style={{ marginTop: 16, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            {PROGRESS.map((p, i) => (
              <div key={p} style={{
                display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem',
                padding: '0.3rem 0', color: i <= prog ? 'var(--primary)' : 'var(--muted)',
                fontWeight: i === prog ? 700 : 500,
              }}>
                <span>{p}</span>
                <span>{i < prog ? '✓' : i === prog ? '…' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Pipeline</h3>
        <div className="flow">
          {[
            { key: 'block', title: 'BLOCK FORECAST', val: fmt(block.rainfall, ' mm'), sub: `T ${fmt(block.tmin)}–${fmt(block.tmax)}°` },
            { key: 'wx', title: 'REAL WEATHER', val: 'Feed', sub: block.source || 'N/A' },
            { key: 'hist', title: 'HISTORICAL', val: 'Bias', sub: 'Archive residual' },
            { key: 'gis', title: 'GIS FEATURES', val: 'Elev · Slope', sub: 'Terrain' },
            { key: 'fe', title: 'FEATURES', val: 'Engineered', sub: 'Season · RH' },
            { key: 'ai', title: 'AI / ML', val: 'Model', sub: downscaleResult?.model_version || MODEL_SPEC.version },
            { key: 'out', title: 'PANCHAYATS', val: minR != null ? `${minR}–${maxR}` : 'N/A', sub: `${panchayats.length} forecasts` },
          ].map((b, i, arr) => (
            <div key={b.key} style={{ display: 'contents' }}>
              <div className={`flow-box ${(step !== 'idle' && i < 6) || step === 'done' ? 'highlight' : ''} ${running && i === Math.min(prog, 5) ? 'pulse' : ''}`}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>{b.title}</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)' }}>{b.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{b.sub}</div>
              </div>
              {i < arr.length - 1 && <div className="flow-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>

      {step === 'done' && (
        <>
          <div className="card">
            <h3>Before → After</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 0 }}>
              <strong style={{ color: 'var(--navy)' }}>One Block. Many Local Weather Conditions.</strong>
            </p>
            <div className="before-after">
              <div className="ba-panel before">
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>BEFORE — Block</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)' }}>{fmt(block.rainfall, ' mm')}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Same value applied to every panchayat</div>
              </div>
              <div className="ba-arrow"><div>→</div><div style={{ fontSize: '0.7rem' }}>AI</div></div>
              <div className="ba-panel after">
                <div style={{ fontSize: '0.75rem', color: 'var(--ocean)', fontWeight: 700 }}>AFTER — Panchayat level</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', fontSize: '0.88rem', marginTop: 8 }}>
                  {panchayats.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: 'var(--muted)' }}>{p.name}</span>
                      <span className="num" style={{ fontWeight: 700 }}>{predictions[p.id]?.rainfall != null ? `${predictions[p.id].rainfall} mm` : 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>Prediction detail</h3>
              <label>Panchayat</label>
              <select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))} style={{ marginBottom: 12, display: 'block' }}>
                {panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {selPred && (
                <div className="kpi-grid" style={{ marginBottom: 0 }}>
                  <div className="kpi">
                    <div className="label">Predicted rainfall</div>
                    <div className="value">{fmt(selPred.rainfall)} <span className="unit">mm</span></div>
                  </div>
                  <div className="kpi">
                    <div className="label">Expected range</div>
                    <div className="value" style={{ fontSize: '1.15rem' }}>
                      {selPred.low != null && selPred.high != null ? `${selPred.low}–${selPred.high}` : 'N/A'}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="label">Confidence</div>
                    <div className="value">{fmt(selPred.conf, '%')}</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Data quality</div>
                    <div className="value" style={{ fontSize: '1.15rem' }}>{quality.overall}%</div>
                  </div>
                </div>
              )}
              <p className="source-note">
                Model: {selPred?.model_version || downscaleResult?.model_version || MODEL_SPEC.version}.
                Missing fields show N/A — never fabricated.
              </p>
            </div>
            <div className="card">
              <h3>Why this prediction?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 0 }}>Feature influence (relative)</p>
              {influence.map((f) => (
                <div key={f.name} className="feat-bar-row">
                  <div className="feat-bar-label">{f.name}</div>
                  <div className="feat-bar-track">
                    <div className="feat-bar-fill" style={{ width: `${Math.min(100, f.value * 2.5)}%` }} />
                  </div>
                  <div className="feat-bar-val">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 'idle' && (
        <div className="alert info">
          Click <strong>RUN AI DOWNSCALING</strong> to animate the pipeline and reveal spatial variation.
        </div>
      )}
    </div>
  )
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
