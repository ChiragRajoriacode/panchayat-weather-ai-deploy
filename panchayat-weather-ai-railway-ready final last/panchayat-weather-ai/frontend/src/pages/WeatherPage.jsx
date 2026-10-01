import { useMemo, useState } from 'react'
import { useLive } from '../context/LiveDataContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'

const tipStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }

export default function WeatherPage() {
  const { live, isDemo, block, panchayats, predictions, status, refresh, fmt } = useLive()
  const [pid, setPid] = useState(panchayats[0]?.id || 1)
  const [range, setRange] = useState('7D')

  const series = useMemo(() => {
    if (!live?.days?.length) return []
    const days = live.days
    return days.map((d) => {
      const pr = d.predictions?.[pid]
      return {
        date: d.date,
        blockRain: d.block?.rainfall ?? null,
        rain: pr?.rainfall ?? null,
        tmax: pr?.tmax ?? d.block?.tmax ?? null,
        tmin: pr?.tmin ?? d.block?.tmin ?? null,
        humidity: pr?.humidity ?? d.block?.humidity ?? null,
        wind: d.block?.wind ?? null,
      }
    })
  }, [live, pid])

  const filtered = range === '3D' ? series.slice(0, 3) : series

  return (
    <div>
      <h1 className="page-title">Weather analytics</h1>
      <p className="page-sub">
        Multi-day block and panchayat series from the live feed (Open-Meteo) or backend — not fixed multipliers only.
      </p>

      {isDemo && (
        <div className="alert warn"><strong>DEMO MODE — SIMULATED DATA</strong></div>
      )}
      {!isDemo && (
        <div className="alert success">Data mode: {status}. Values follow the current forecast series.</div>
      )}

      <div className="form-row">
        <div>
          <label>Panchayat</label>
          <select value={pid} onChange={(e) => setPid(Number(e.target.value))}>
            {panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>Horizon</label>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="3D">3 days</option>
            <option value="7D">7 days</option>
          </select>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh}>Refresh</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-icon">🌧</div>
          <div className="label">Today block rain</div>
          <div className="value">{fmt(block.rainfall)} <span className="unit">mm</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-icon green">📍</div>
          <div className="label">Today local rain</div>
          <div className="value">{fmt(predictions[pid]?.rainfall)} <span className="unit">mm</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-icon">🌡</div>
          <div className="label">Tmax</div>
          <div className="value">{fmt(predictions[pid]?.tmax ?? block.tmax)}°</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon">💧</div>
          <div className="label">Humidity</div>
          <div className="value">{fmt(predictions[pid]?.humidity ?? block.humidity)}%</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No time series available. Refresh when the weather feed is online.</p></div>
      ) : (
        <>
          <div className="card">
            <h3>Rainfall — block vs panchayat</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} unit=" mm" />
                <Tooltip contentStyle={tipStyle} />
                <Legend />
                <Bar dataKey="blockRain" name="Block" fill="#94A3B8" />
                <Bar dataKey="rain" name="Panchayat" fill="#0284C7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-2">
            <div className="card">
              <h3>Temperature</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={tipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="tmax" name="Tmax" stroke="#C2410C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tmin" name="Tmin" stroke="#0284C7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3>Humidity & wind</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={tipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#16803C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wind" name="Wind" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      <p className="source-note">
        1H/6H require hourly API fields — daily series shown from forecast_days. Wind from block daily max when available.
      </p>
    </div>
  )
}
