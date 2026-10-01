import { useLive } from '../context/LiveDataContext'

export default function SystemStatusBar() {
  const { status, isDemo, isLive, backendStatus, lastFetch, error, refresh, modelMetrics } = useLive()

  const weather = backendStatus?.weather_api || (isLive ? 'LIVE (Open-Meteo)' : isDemo ? 'DEMO' : '…')
  const ml = backendStatus?.ml_model || (modelMetrics ? 'METRICS_OK' : 'NOT_LOADED / N/A')
  const db = backendStatus?.database || 'N/A'

  return (
    <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', fontSize: '0.8rem' }}>
        <strong style={{ color: 'var(--navy)' }}>System status</strong>
        <span><span className={`status-dot ${isLive ? 'online' : isDemo ? 'warn' : 'loaded'}`} />Weather: {weather}</span>
        <span><span className={`status-dot ${ml.includes('NOT') ? 'warn' : 'online'}`} />ML: {ml}</span>
        <span><span className={`status-dot ${db === 'N/A' ? 'warn' : 'online'}`} />DB: {db}</span>
        <span style={{ color: 'var(--muted)' }}>Mode: {status}</span>
        {lastFetch && <span style={{ color: 'var(--muted)' }}>Freshness: {new Date(lastFetch).toLocaleString()}</span>}
        {error && <span style={{ color: 'var(--terracotta)' }}>Err: {error}</span>}
        <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={refresh}>Refresh</button>
      </div>
    </div>
  )
}
