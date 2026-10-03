import { Link, useNavigate } from 'react-router-dom'
import { useData, GRADE, monthYear } from '../../data.jsx'
import { useReplay } from '../../replay.js'
import ReplayBar from '../../components/ReplayBar.jsx'
import OwnerShell from '../../components/OwnerShell.jsx'
import { ROOF_VIEWBOX, ROOF_SHAPES, FAN_POSITIONS } from '../../roof.js'
import { AlertTri } from '../../components/Icons.jsx'
import './owner.css'

// Same bands step_e_health_score.py uses to grade a score, so the ring colour always matches the grade badge.
function scoreGrade(score) {
  if (score >= 85) return 'Certified dry'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Attention'
  return 'At risk'
}
// Mockup's 3-colour floor-plan vocabulary (Normal/Warning/Alert), mapped from our real 4-tier grade.
function floorStatus(grade) {
  if (grade === 'Certified dry' || grade === 'Good') return 'normal'
  if (grade === 'Attention') return 'warning'
  return 'alert'
}

function ScoreDonut({ score }) {
  const r = 38, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = GRADE[scoreGrade(score)]?.color ?? '#9c7a3c'
  return (
    <div className="sp-donut">
      <svg viewBox="0 0 100 100">
        <circle className="sp-donut-track" cx="50" cy="50" r={r} />
        <circle className="sp-donut-fill" cx="50" cy="50" r={r} stroke={color}
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
    </div>
  )
}

// One real dot per real structure (7), not a dense synthetic sensor grid, we only have one control unit
// per structure and every other screen in this app already says "7 structures". The visual language
// (floor outline + coloured status dots + legend) matches the mockup; the dot count stays honest.
function SenseFloorPlan({ structures, onPick }) {
  const { lowRoof, flatRoof, greenRoof } = ROOF_SHAPES
  return (
    <svg className="sp-floor" viewBox={ROOF_VIEWBOX} role="img" aria-label="Warehouse floor plan with one status dot per structure">
      <rect className="sp-room" x={lowRoof.x} y={lowRoof.y} width={lowRoof.w} height={lowRoof.h} />
      <rect className="sp-room" x={flatRoof.x} y={flatRoof.y} width={flatRoof.w} height={flatRoof.h} />
      <polygon className="sp-room" points={greenRoof.points} />
      <text className="sp-room-label" x={lowRoof.x + 8} y={lowRoof.y + lowRoof.h - 8}>{lowRoof.label}</text>
      <text className="sp-room-label" x={flatRoof.x + 8} y={flatRoof.y + flatRoof.h - 8}>{flatRoof.label}</text>
      <text className="sp-room-label" x={470} y={204}>{greenRoof.label}</text>
      {structures.map(s => {
        const pos = FAN_POSITIONS[s.name]
        if (!pos || s.grade == null) return null
        const status = floorStatus(s.grade)
        const labelLeft = pos.x > 300 && pos.x < 365
        return (
          <g key={s.id} className="sp-dot-wrap" onClick={() => onPick(s.id)} role="button" tabIndex="0"
             onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPick(s.id)}>
            {status === 'alert' && <circle cx={pos.x} cy={pos.y} r="15" className="sp-dot-halo" />}
            <circle cx={pos.x} cy={pos.y} r="16" fill="transparent" />
            <circle cx={pos.x} cy={pos.y} r="8" className={`sp-dot sp-dot-${status}`} />
            <text className="sp-dot-label" x={labelLeft ? pos.x - 13 : pos.x + 13} y={pos.y + 4} textAnchor={labelLeft ? 'end' : 'start'}>
              {pos.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Real cross-structure range per day (lowest/highest reading among the 7 structures that day), not a
// synthetic intraday curve, our data is daily, not hourly, so the Min/Max pair is honestly "across the
// portfolio" rather than "across one day."
function dailyRange(structures, field, days) {
  const byDate = {}
  for (const s of structures) {
    for (const r of s.daily.slice(-days)) {
      if (r[field] == null) continue
      const d = (byDate[r.date] ??= { min: Infinity, max: -Infinity })
      d.min = Math.min(d.min, r[field]); d.max = Math.max(d.max, r[field])
    }
  }
  const dates = Object.keys(byDate).sort()
  return { dates, min: dates.map(d => byDate[d].min), max: dates.map(d => byDate[d].max) }
}

function MiniChart({ dates, min, max, unit }) {
  const W = 230, H = 86, padL = 24, padB = 16
  const all = [...min, ...max]
  const lo = Math.min(...all), hi = Math.max(...all)
  const span = (hi - lo) || 1
  const x = i => padL + (i / Math.max(dates.length - 1, 1)) * (W - padL - 6)
  const y = v => 6 + (1 - (v - lo) / span) * (H - padB - 6)
  const path = vals => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg className="sp-chart" viewBox={`0 0 ${W} ${H}`}>
      <text x="2" y="12" className="sp-chart-axis">{hi.toFixed(0)}{unit}</text>
      <text x="2" y={H - padB} className="sp-chart-axis">{lo.toFixed(0)}{unit}</text>
      <line x1={padL} x2={W - 6} y1={H - padB} y2={H - padB} className="sp-chart-grid" />
      <path d={path(max)} className="sp-chart-line sp-chart-max" fill="none" />
      <path d={path(min)} className="sp-chart-line sp-chart-min" fill="none" />
      <text x={padL} y={H - 2} className="sp-chart-axis">{new Date(dates[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>
      <text x={W - 6} y={H - 2} textAnchor="end" className="sp-chart-axis">{new Date(dates[dates.length - 1] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>
    </svg>
  )
}

function recentActivity(structures) {
  const rows = []
  for (const s of structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    for (const w of s.watchdog) rows.push({ label, ...w })
  }
  return rows.sort((a, b) => b.start.localeCompare(a.start)).slice(0, 4)
}

export default function OwnerHome() {
  const { data, error } = useData()
  const replay = useReplay(data)
  const navigate = useNavigate()

  if (error) return <p className="muted">{error}</p>
  if (!data || !replay.date) return <p className="muted">Loading building data</p>

  const { structures } = replay
  const { building } = data
  const scored = structures.filter(s => s.score != null)
  const avgScore = scored.length ? scored.reduce((n, s) => n + s.score, 0) / scored.length : 0
  const sorted = [...structures].sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
  const alerting = sorted.find(s => floorStatus(s.grade) === 'alert') ?? sorted.find(s => floorStatus(s.grade) === 'warning')
  const activity = recentActivity(data.structures)
  const temp = dailyRange(data.structures, 'indoor_temp', 14)
  const rh = dailyRange(data.structures, 'indoor_rh', 14)

  return (
    <OwnerShell active="Dashboard" title="Dashboard">
        <div className="sp-grid">
          <section className="sp-card sp-floor-card">
            <div className="sp-card-head">
              <h2>Warehouse moisture plan</h2>
            </div>
            <SenseFloorPlan structures={structures} onPick={id => navigate(`/owner/structure/${id}`)} />
            <div className="sp-legend">
              <span><i className="sp-dot-normal" />Normal</span>
              <span><i className="sp-dot-warning" />Warning</span>
              <span><i className="sp-dot-alert" />Alert</span>
            </div>
            <ReplayBar replay={replay} />
          </section>

          <aside className="sp-right">
            {alerting && (
              <div className="sp-alert-banner">
                <AlertTri /> Moisture event detected &mdash; {alerting.label}
              </div>
            )}

            <div className="sp-card">
              <p className="sp-card-title">Building Health Score</p>
              <div className="sp-score-row">
                <ScoreDonut score={avgScore} />
                <p className="sp-score-num num">{avgScore.toFixed(0)}<span>/ 100</span></p>
              </div>
            </div>

            <div className="sp-card">
              <p className="sp-card-title">Temperature (&deg;C)<span className="sp-chart-legend"><i className="sp-min" />Min <i className="sp-max" />Max</span></p>
              <MiniChart dates={temp.dates} min={temp.min} max={temp.max} unit="°" />
            </div>

            <div className="sp-card">
              <p className="sp-card-title">Relative Humidity (%)<span className="sp-chart-legend"><i className="sp-min" />Min <i className="sp-max" />Max</span></p>
              <MiniChart dates={rh.dates} min={rh.min} max={rh.max} unit="%" />
            </div>

            <div className="sp-card">
              <p className="sp-card-title">Recent Activity</p>
              <ul className="sp-activity">
                {activity.map((a, i) => (
                  <li key={i} className={i === 0 ? 'sp-activity-top' : ''}>
                    <strong>{i === 0 ? 'Critical Alert: ' : ''}{a.label} &mdash; {a.check}</strong>
                    <span className="faint num">{new Date(a.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <section className="sp-card" style={{ marginTop: 16 }}>
          <div className="sp-card-head">
            <h2>All structures</h2>
            <span className="faint num">{building.name}, {monthYear(building.period.from)} to {monthYear(building.period.to)}</span>
          </div>
          <ul className="slist">
            {sorted.map(s => (
              <li key={s.id}>
                <Link className="srow" to={`/owner/structure/${s.id}`}>
                  <i style={{ background: GRADE[s.grade]?.color ?? 'var(--line)' }} />
                  <span className="srow-name">{s.label}<small>{s.type}</small></span>
                  <span className="srow-issues">{s.issues.length ? s.issues.map(i => i.check).join(', ') : 'No issues so far'}</span>
                  <span className="srow-score num">{s.score == null ? '' : s.score.toFixed(0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
    </OwnerShell>
  )
}
