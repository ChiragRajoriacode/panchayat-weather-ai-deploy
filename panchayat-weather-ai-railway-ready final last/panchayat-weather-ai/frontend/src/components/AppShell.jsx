import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_LABELS } from '../context/AuthContext'
import { useLive } from '../context/LiveDataContext'
import PanchayatDrawer from './PanchayatDrawer'

const NAV_GROUPS = [
  {
    title: 'Operate',
    items: [
      { to: '/', icon: '◈', label: 'Command Center', end: true, roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
      { to: '/map', icon: '▣', label: 'GIS Explorer', roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
      { to: '/weather', icon: '☁', label: 'Weather', roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
      { to: '/downscale', icon: '◎', label: 'AI Downscaling', roles: ['panchayat_officer', 'block_officer', 'admin'] },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { to: '/compare', icon: '⇄', label: 'Compare & Explain', roles: ['panchayat_officer', 'block_officer', 'admin'] },
      { to: '/historical', icon: '◷', label: 'Historical Replay', roles: ['block_officer', 'admin'] },
      { to: '/validation', icon: '✓', label: 'Validation & Model', roles: ['block_officer', 'admin'] },
      { to: '/scenario', icon: '⚗', label: 'Scenario Lab', roles: ['block_officer', 'admin'] },
    ],
  },
  {
    title: 'Field',
    items: [
      { to: '/extreme', icon: '⚡', label: 'Alerts', roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
      { to: '/advisory', icon: '☘', label: 'Agro Advisory', roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
      { to: '/farmer', icon: '☰', label: 'Farmer delivery', roles: ['farmer', 'panchayat_officer', 'block_officer', 'admin'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/reports', icon: '▤', label: 'Reports', roles: ['panchayat_officer', 'block_officer', 'admin'] },
      { to: '/data', icon: '⚙', label: 'Data & Health', roles: ['block_officer', 'admin'] },
      { to: '/audit', icon: '⌂', label: 'Audit Trail', roles: ['block_officer', 'admin'] },
    ],
  },
]

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { isLive, isDemo, lastFetch, blockName } = useLive()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-mark">🌦</div>
          <h1>PanchayatWeather AI</h1>
          <div className="sub">Odisha Panchayat Weather Intelligence</div>
        </div>
        <nav onClick={() => setOpen(false)}>
          {NAV_GROUPS.map((g) => {
            const items = g.items.filter((n) => n.roles.includes(user.role))
            if (!items.length) return null
            return (
              <div key={g.title} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7DD3FC', padding: '0.35rem 0.75rem 0.2rem',
                }}>
                  {g.title}
                </div>
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end}>
                    <span className="icon">{n.icon}</span>
                    {n.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="status-row">
            <span className={`status-dot ${isLive ? 'online' : isDemo ? 'warn' : 'loaded'}`} />
            {isLive ? 'Live weather feed' : isDemo ? 'Demo mode' : 'Connecting…'}
          </div>
          <div style={{ marginBottom: 8 }}>{ROLE_LABELS[user.role]} · {user.name}</div>
          <button type="button" className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={() => { logout(); navigate('/') }}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="top-header">
          <button type="button" className="mobile-nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
          <div className="breadcrumb">
            <strong>Odisha</strong>
            <span className="sep">›</span>
            <span>Khordha</span>
            <span className="sep">›</span>
            <span>{blockName || 'Bhubaneswar / Jatni'}</span>
          </div>
          <div className="header-search">
            <input type="search" placeholder="Search Panchayat / Block / District…" />
          </div>
          <div className="header-actions">
            <span className={`live-badge ${isDemo ? 'demo' : 'live'}`}>
              <span className="dot" />
              {isDemo ? 'DEMO DATA' : 'LIVE DATA'}
            </span>
            {lastFetch && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                {new Date(lastFetch).toLocaleTimeString()}
              </span>
            )}
            <div className="user-chip" title={user.email}>
              <span className="avatar">{initials}</span>
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name?.split(' ')[0]}
              </span>
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
      <PanchayatDrawer />
    </div>
  )
}
