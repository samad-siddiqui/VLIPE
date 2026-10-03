import { useEffect, useState } from 'react'

// Small dependency-free line chart for daily data.
// values: array of numbers (null = no data). dates: matching 'YYYY-MM-DD' strings.
// refs: horizontal reference lines [{ value, label, color }]. marks: dates to highlight with dots.
const PAD = { l: 52, r: 12, t: 12, b: 26 }
const tick = v => (Math.abs(v) >= 10 ? Math.round(v).toLocaleString('en') : Number(v.toFixed(2)).toString())

// Phones get a narrower drawing so the text stays readable when it shrinks to the screen
function useIsPhone() {
  const query = '(max-width: 600px)'
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

export default function LineChart({ dates, values, min, max, refs = [], marks = [], color = 'var(--slate)', unit = '', label }) {
  const phone = useIsPhone()
  const W = phone ? 400 : 760
  const H = phone ? 230 : 210
  const every = phone ? 3 : 2
  const lo = min ?? Math.min(...values.filter(v => v != null))
  const hi = max ?? Math.max(...values.filter(v => v != null))
  const span = hi - lo || 1
  const x = i => PAD.l + (i / Math.max(dates.length - 1, 1)) * (W - PAD.l - PAD.r)
  const y = v => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b)

  // Line with gaps where values are missing
  let d = ''
  values.forEach((v, i) => {
    if (v == null) return
    d += (i === 0 || values[i - 1] == null ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(Math.min(Math.max(v, lo), hi)).toFixed(1) + ' '
  })

  // One tick per month, labelled every second (desktop) or third (phone) month
  const months = []
  dates.forEach((dt, i) => { if (dt.endsWith('-01')) months.push(i) })
  const fmt = dt => new Date(dt + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
  const markIdx = marks.map(m => dates.indexOf(m)).filter(i => i >= 0)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[lo, (lo + hi) / 2, hi].map(v => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="chart-axis">{tick(v)}{unit}</text>
        </g>
      ))}
      {months.map((i, k) => (
        <g key={i}>
          <line x1={x(i)} x2={x(i)} y1={H - PAD.b} y2={H - PAD.b + 4} className="chart-grid" />
          {k % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-axis">{fmt(dates[i])}</text>}
        </g>
      ))}
      {refs.map(r => (
        <g key={r.label}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(r.value)} y2={y(r.value)} stroke={r.color} strokeDasharray="5 4" strokeWidth="1.2" />
          <text x={W - PAD.r - 4} y={y(r.value) - 5} textAnchor="end" className="chart-ref" fill={r.color}>{r.label}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {markIdx.map(i => values[i] != null && (
        <circle key={i} cx={x(i)} cy={y(Math.min(values[i], hi))} r="3.2" fill="var(--brick)" />
      ))}
    </svg>
  )
}