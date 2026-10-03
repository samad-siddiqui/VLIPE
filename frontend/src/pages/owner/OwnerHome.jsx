import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, GRADE, monthYear } from '../../data.jsx'
import { useReplay } from '../../replay.js'
import AppShell from '../../components/AppShell.jsx'
import RoofMap from '../../components/RoofMap.jsx'
import ReplayBar from '../../components/ReplayBar.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import './owner.css'

const PARTS = [
  { key: 'mold', label: 'Mold risk', max: 40 },
  { key: 'risk_zone', label: 'Time in risk zone', max: 20 },
  { key: 'drying', label: 'Drying performance', max: 20 },
  { key: 'system', label: 'System health', max: 20 },
]

// Same bands step_e_health_score.py uses to grade a score, so the ring colour always matches the grade badge.
function scoreGrade(score) {
  if (score >= 85) return 'Certified dry'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Attention'
  return 'At risk'
}

function ScoreDonut({ score }) {
  const r = 42, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = GRADE[scoreGrade(score)]?.color ?? 'var(--ink-2)'
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100">
        <circle className="donut-track" cx="50" cy="50" r={r} />
        <circle className="donut-fill" cx="50" cy="50" r={r} stroke={color}
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="donut-label">
        <strong className="num">{score.toFixed(0)}</strong>
        <span>/ 100</span>
      </div>
    </div>
  )
}

// Every watchdog finding across the portfolio, newest first, the owner's plain-language version of the
// service team's work-order queue, real events only, nothing synthesised.
function recentActivity(structures) {
  const rows = []
  for (const s of structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    for (const w of s.watchdog) rows.push({ label, ...w })
  }
  return rows.sort((a, b) => b.start.localeCompare(a.start)).slice(0, 6)
}

function Metric({ value, label, tone }) {
  return (
    <div className="metric">
      <span className="metric-value num" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  )
}

function GradeBadge({ grade }) {
  const g = GRADE[grade]
  return <span className="badge" style={{ background: g?.soft, color: g?.color }}>{grade}</span>
}

function StructurePanel({ s }) {
  if (s.score == null) {
    return (
      <section className="panel" aria-live="polite">
        <p className="faint">{s.type}</p>
        <h2>{s.label}</h2>
        <p className="muted" style={{ marginTop: 12 }}>No readings yet on this date.</p>
      </section>
    )
  }
  return (
    <section className="panel" aria-live="polite">
      <div className="panel-head">
        <div>
          <p className="faint">{s.type}</p>
          <h2>{s.label}</h2>
        </div>
        <GradeBadge grade={s.grade} />
      </div>
      <p className="panel-score num">{s.score.toFixed(1)}<span> / 100</span></p>

      <div className="parts">
        {PARTS.map(p => {
          const v = s.parts[p.key]
          return (
            <div key={p.key} className="part">
              <div className="part-row"><span>{p.label}</span><span className="num">{v.toFixed(1)} / {p.max}</span></div>
              <div className="bar"><div style={{ width: `${(v / p.max) * 100}%` }} /></div>
            </div>
          )
        })}
      </div>

      <div className="panel-block">
        <p className="panel-title">What the watchdog found</p>
        {s.issues.length === 0
          ? <p className="muted">No issues so far.</p>
          : (
            <ul className="issues">
              {s.issues.map(i => (
                <li key={i.check}>
                  <span>{i.check}{i.ongoing && <em className="ongoing">ongoing</em>}</span>
                  <span className="num">{i.days} days</span>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="panel-block compare">
        <div><span className="faint">Old alarms so far</span><strong className="num">{s.oldAlarms}</strong></div>
        <div><span className="faint">Mold index, ours</span><strong className="num">{s.moldOurs.toFixed(4)}</strong></div>
        <div><span className="faint">Mold index, VILPE today</span><strong className="num">{s.moldVilpe.toFixed(4)}</strong></div>
      </div>

      <Link className="btn btn-block" to={`/owner/structure/${s.id}`}>Open details</Link>
    </section>
  )
}

export default function OwnerHome() {
  const { data, error } = useData()
  const replay = useReplay(data)
  const [selectedId, setSelectedId] = useState('viherkatto-2')

  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data || !replay.date) return <AppShell><p className="muted">Loading building data</p></AppShell>

  const { structures, date } = replay
  const selected = structures.find(s => s.id === selectedId) ?? structures[0]
  const sorted = [...structures].sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
  const { summary, building } = data

  // Headline numbers for the date being shown
  const oldAlarms = structures.reduce((n, s) => n + s.oldAlarms, 0)
  const withIssue = structures.filter(s => s.issues.length > 0).length
  const certified = structures.filter(s => s.grade === 'Certified dry').length
  const scored = structures.filter(s => s.score != null)
  const avgScore = scored.length ? scored.reduce((n, s) => n + s.score, 0) / scored.length : 0
  const activity = recentActivity(data.structures)

  return (
    <AppShell>
      <div className="owner-head">
        <h1>{building.name}</h1>
        <p className="muted">{building.city}. {summary.structures} Sense fans, {monthYear(building.period.from)} to {monthYear(building.period.to)}.</p>
      </div>

      <div className="owner-top">
        <div className="metrics">
          <Metric value={oldAlarms} label="Old alarms fired, all on healthy structures" tone="var(--brick)" />
          <Metric value={summary.smart_alerts_total} label="Structura alerts, because there was no real risk" tone="var(--moss)" />
          <Metric value={`${withIssue} of ${summary.structures}`} label="Units with a silent equipment or sensor issue" />
          <Metric value={`${certified} of ${summary.structures}`} label={replay.isToday ? 'Certified dry today' : 'Certified dry on this date'} />
        </div>
        <div className="score-card">
          <ScoreDonut score={avgScore} />
          <div>
            <p className="faint">Building health score</p>
            <p className="muted" style={{ fontSize: '0.82rem' }}>Average across {summary.structures} structures, {date}</p>
          </div>
        </div>
      </div>

      <div className="owner-grid">
        <section className="map-card">
          <RoofMap structures={structures} selectedId={selected.id} onSelect={setSelectedId} />
          <div className="legend">
            {Object.entries(GRADE).map(([name, g]) => (
              <span key={name}><i style={{ background: g.color }} />{name}</span>
            ))}
          </div>
          <ReplayBar replay={replay} />
        </section>
        <StructurePanel s={selected} />
      </div>

      <div className="owner-grid">
        <section className="list-card">
          <h2>All structures <span className="faint num">on {date}</span></h2>
          <ul className="slist">
            {sorted.map(s => (
              <li key={s.id}>
                <button className="srow" aria-pressed={s.id === selected.id} onClick={() => setSelectedId(s.id)}>
                  <i style={{ background: GRADE[s.grade]?.color ?? 'var(--line)' }} />
                  <span className="srow-name">{s.label}<small>{s.type}</small></span>
                  <span className="srow-issues">{s.issues.length ? s.issues.map(i => i.check).join(', ') : 'No issues so far'}</span>
                  <span className="srow-score num">{s.score == null ? '' : s.score.toFixed(0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="list-card activity-card">
          <h2>Recent activity</h2>
          <ul className="activity-list">
            {activity.map((a, i) => (
              <li key={i}>
                <i className={a.kind === 'Equipment' ? 'high' : 'med'} />
                <div>
                  <strong>{a.label}: {a.check}</strong>
                  <p className="faint num">{new Date(a.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}