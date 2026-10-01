import { useState, useMemo } from 'react'
import { useLive } from '../context/LiveDataContext'
import { useAuth } from '../context/AuthContext'
import { t, LANGS } from '../data/i18n'
import { imdStyleColour, rainCategories } from '../data/extremeAlerts'
import { getAdvisory } from '../data/demoData'

export default function FarmerDeliveryPage() {
  const { panchayats, predictions, block, isLive, refresh } = useLive()
  const { user } = useAuth()
  const [lang, setLang] = useState('or')
  const [pid, setPid] = useState(user?.panchayat_id || 3)
  const [simple, setSimple] = useState(true)
  const [mobile, setMobile] = useState('9876543210')
  const [sent, setSent] = useState(null)
  const [reportMm, setReportMm] = useState('')
  const [reports, setReports] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pw_ground_truth') || '[]') } catch { return [] }
  })

  const p = panchayats.find((x) => x.id === pid)
  const pr = predictions[pid] || { rainfall: 0, low: 0, high: 0, conf: 80, tmax: 32, risk: 'low' }
  const colour = imdStyleColour(pr)
  const cats = rainCategories(pr)
  const advisory = useMemo(() => getAdvisory('Rice', 'Flowering', pr.rainfall, pr.tmax), [pr.rainfall, pr.tmax])

  const tr = (key) => t(lang, key)

  const smsBody = `${tr('appName')}: ${p?.name} — ${tr('todayRain')} ${pr.rainfall} ${tr('mm')} (${pr.low}-${pr.high}). ${colour.label}. ${tr('officialNote')}`

  const sendSms = () => {
    setSent({ type: 'sms', to: mobile, body: smsBody, at: new Date().toISOString() })
  }
  const sendWa = () => {
    const url = `https://wa.me/91${mobile.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(smsBody)}`
    window.open(url, '_blank')
    setSent({ type: 'whatsapp', to: mobile, body: smsBody, at: new Date().toISOString() })
  }

  const submitReport = () => {
    const mm = parseFloat(reportMm)
    if (Number.isNaN(mm)) return
    const rec = { panchayat_id: pid, name: p?.name, mm, at: new Date().toISOString(), user: user?.name }
    const next = [rec, ...reports].slice(0, 50)
    setReports(next)
    localStorage.setItem('pw_ground_truth', JSON.stringify(next))
    setReportMm('')
  }

  // Ultra-simple low-bandwidth layout
  if (simple) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {LANGS.map((l) => (
            <button key={l.id} type="button" className={`time-btn ${lang === l.id ? 'active' : ''}`} onClick={() => setLang(l.id)}>
              {l.label}
            </button>
          ))}
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSimple(false)}>Full UI</button>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{tr('localForecast')}</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.35rem 0' }}>{p?.name}</div>
          <div style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {pr.rainfall}
            <span style={{ fontSize: '1rem', color: 'var(--muted)' }}> {tr('mm')}</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {tr('range')}: {pr.low}–{pr.high} · {tr('confidence')} {pr.conf}%
          </div>
          <div style={{ marginTop: 12 }}>
            <span className={`badge ${colour.code === 'green' ? 'green' : colour.code}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
              {colour.label}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: 12, color: '#cbd5e1' }}>{colour.action}</p>
        </div>

        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 8 }}>🌱 {tr('advisory')}</div>
          <div style={{ fontSize: '0.9rem' }}>{advisory.summary}</div>
          <ul style={{ fontSize: '0.85rem', margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
            {advisory.recommendations.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 8 }}>{tr('sendSms')} / {tr('sendWa')}</div>
          <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ width: '100%', marginBottom: 8 }} placeholder="Mobile" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={sendSms}>{tr('sendSms')}</button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={sendWa}>{tr('sendWa')}</button>
          </div>
          {sent && (
            <div className="alert success" style={{ marginTop: 10, marginBottom: 0, fontSize: '0.8rem' }}>
              Demo {sent.type} queued to {sent.to}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 8 }}>{tr('reportRain')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={reportMm} onChange={(e) => setReportMm(e.target.value)} placeholder="mm" style={{ flex: 1 }} />
            <button type="button" className="btn btn-primary" onClick={submitReport}>OK</button>
          </div>
          <p className="source-note">{tr('officialNote')}</p>
        </div>

        <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={refresh}>{tr('refresh')}</button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Farmer delivery</h1>
      <p className="page-sub">
        Odia / Hindi / English · SMS & WhatsApp alert templates · ground-truth rain report · low-bandwidth mode.
      </p>

      <div className="form-row">
        <div>
          <label>{tr('language')}</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label>Panchayat</label>
          <select value={pid} onChange={(e) => setPid(Number(e.target.value))}>
            {panchayats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setSimple(true)}>{tr('lowBandwidth')}</button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
        <div className="stat">
          <div className="label">{tr('blockForecast')}</div>
          <div className="value">{block.rainfall}<span className="unit"> {tr('mm')}</span></div>
        </div>
        <div className="stat">
          <div className="label">{tr('localForecast')}</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{pr.rainfall}<span className="unit"> {tr('mm')}</span></div>
          <div className="delta">{tr('range')} {pr.low}–{pr.high}</div>
        </div>
        <div className="stat">
          <div className="label">{tr('heavyRain')}</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>{cats.veryHeavy.p}%</div>
          <div className="delta">P(&gt;65 mm)</div>
        </div>
      </div>

      <div className="card">
        <h3>{tr('alerts')}</h3>
        <span className={`badge ${colour.code === 'green' ? 'green' : colour.code}`}>{colour.label}</span>
        <p style={{ marginTop: 8 }}>{colour.action}</p>
        <p className="source-note">{tr('officialNote')}</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>{tr('sendSms')} / WhatsApp</h3>
          <label>Mobile</label>
          <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          <div style={{
            background: 'var(--panel2)', borderRadius: 10, padding: 12, fontSize: '0.85rem',
            marginBottom: 10, border: '1px solid var(--border)',
          }}>
            {smsBody}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={sendSms}>{tr('sendSms')}</button>
            <button type="button" className="btn btn-secondary" onClick={sendWa}>{tr('sendWa')}</button>
          </div>
          {sent && <div className="alert success" style={{ marginTop: 10, marginBottom: 0 }}>Demo {sent.type} logged at {new Date(sent.at).toLocaleTimeString()}</div>}
          <p className="source-note">SMS is simulated in demo. WhatsApp opens wa.me with pre-filled text. Production: MSG91 / Twilio / WhatsApp Business API.</p>
        </div>

        <div className="card">
          <h3>{tr('reportRain')} (ground truth)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Officer/farmer reports actual gauge or estimate — used later to correct local bias.
          </p>
          <div className="form-row">
            <div>
              <label>mm today</label>
              <input type="number" value={reportMm} onChange={(e) => setReportMm(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary" onClick={submitReport}>Submit</button>
          </div>
          {reports.filter((r) => r.panchayat_id === pid).slice(0, 5).map((r, i) => (
            <div key={i} style={{ fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
              {r.mm} mm · {new Date(r.at).toLocaleString()} · {r.user || 'anon'}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>🌱 {tr('advisory')}</h3>
        <p style={{ fontWeight: 560 }}>{advisory.summary}</p>
        <ul>{advisory.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <p className="source-note">{tr('farmerTip')}</p>
      </div>
    </div>
  )
}
