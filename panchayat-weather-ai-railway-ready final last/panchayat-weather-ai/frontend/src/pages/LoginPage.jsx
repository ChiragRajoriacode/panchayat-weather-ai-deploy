import { useState } from 'react'
import { useAuth, ROLE_LABELS } from '../context/AuthContext'

export default function LoginPage() {
  const { loginEmail, requestOtp, verifyOtp, resetPassword, otpSent, demoUsers } = useAuth()
  const [tab, setTab] = useState('email')
  const [email, setEmail] = useState('block@demo.in')
  const [password, setPassword] = useState('demo123')
  const [showPw, setShowPw] = useState(false)
  const [mobile, setMobile] = useState('9876543212')
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const onEmailLogin = (e) => {
    e.preventDefault(); setErr(null)
    const r = loginEmail(email, password)
    if (!r.ok) setErr(r.error)
  }
  const onRequestOtp = (e) => {
    e.preventDefault(); setErr(null); setMsg(null)
    const r = requestOtp(mobile)
    if (!r.ok) setErr(r.error); else setMsg(r.message)
  }
  const onVerifyOtp = (e) => {
    e.preventDefault(); setErr(null)
    const r = verifyOtp(otp)
    if (!r.ok) setErr(r.error)
  }
  const onForgot = (e) => {
    e.preventDefault(); setErr(null); setMsg(null)
    const r = resetPassword(email)
    if (!r.ok) setErr(r.error); else setMsg(r.message)
  }

  return (
    <div className="login-split">
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, marginBottom: 16,
            background: 'linear-gradient(135deg, #38BDF8, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>🌦</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            One Block Forecast.<br />Many Local Weather Conditions.
          </h2>
          <p style={{ margin: 0, color: '#BAE6FD', fontSize: '0.95rem', lineHeight: 1.55 }}>
            AI-powered weather downscaling for Panchayat-level agricultural decision support across Odisha.
          </p>
          <div style={{ marginTop: 28, display: 'grid', gap: 10, fontSize: '0.85rem', color: '#E0F2FE' }}>
            <div>📍 Odisha · Gram Panchayat intelligence</div>
            <div>🗺 GIS boundaries · elevation · terrain</div>
            <div>🤖 Block → Panchayat ML downscaling</div>
            <div>🌱 Agro advisory for field decisions</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ocean)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              PanchayatWeather AI
            </div>
            <h1 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.45rem', fontWeight: 800, color: 'var(--navy)' }}>
              Welcome back
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
              Weather intelligence for every Panchayat
            </p>
          </div>

          <div className="tabs">
            <button type="button" className={`tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>Login</button>
            <button type="button" className={`tab ${tab === 'otp' ? 'active' : ''}`} onClick={() => setTab('otp')}>OTP</button>
            <button type="button" className={`tab ${tab === 'forgot' ? 'active' : ''}`} onClick={() => setTab('forgot')}>Forgot</button>
          </div>

          {err && <div className="alert warn">{err}</div>}
          {msg && <div className="alert success">{msg}</div>}

          {tab === 'email' && (
            <form onSubmit={onEmailLogin}>
              <div style={{ marginBottom: 12 }}>
                <label>Email or Mobile Number</label>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} autoComplete="username" />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: 72 }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--ocean)', fontSize: '0.78rem',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginBottom: 14 }}>
                <button type="button" className="tab" style={{ padding: 0, border: 'none' }} onClick={() => setTab('forgot')}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Login</button>
              <div style={{ textAlign: 'center', margin: '1rem 0', fontSize: '0.78rem', color: 'var(--muted)' }}>OR</div>
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setTab('otp')}>
                Continue with OTP
              </button>
            </form>
          )}

          {tab === 'otp' && (
            <form onSubmit={otpSent ? onVerifyOtp : onRequestOtp}>
              <div style={{ marginBottom: 12 }}>
                <label>Mobile Number</label>
                <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ width: '100%' }} />
              </div>
              {otpSent && (
                <div style={{ marginBottom: 12 }}>
                  <label>OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" style={{ width: '100%' }} />
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {otpSent ? 'Verify OTP' : 'Send OTP'}
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={onForgot}>
              <div style={{ marginBottom: 14 }}>
                <label>Registered email</label>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send reset link</button>
            </form>
          )}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 8 }}>
              Demo access · password <strong>demo123</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setEmail(u.email); setPassword('demo123'); setTab('email') }}
                >
                  {ROLE_LABELS[u.role]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
