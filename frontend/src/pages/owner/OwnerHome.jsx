import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, GRADE, monthYear } from '../../data.jsx'
import { useReplay } from '../../replay.js'
import AppShell from '../../components/AppShell.jsx'
import RoofMap from '../../components/RoofMap.jsx'
import ReplayBar from '../../components/ReplayBar.jsx'
import './owner.css'

const PARTS = [
  { key: 'mold', label: 'Mold risk', max: 40 },
  { key: 'risk_zone', label: 'Time in risk zone', max: 20 },
  { key: 'drying', label: 'Drying performance', max: 20 },
  { key: 'system', label: 'System health', max: 20 },
]

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

  return (
    <AppShell>
      <div className="owner-head">
        <h1>{building.name}</h1>
        <p className="muted">{building.city}. {summary.structures} Sense fans, {monthYear(building.period.from)} to {monthYear(building.period.to)}.</p>
      </div>

      <div className="metrics">
        <Metric value={oldAlarms} label="Old alarms fired, all on healthy structures" tone="var(--brick)" />
        <Metric value={summary.smart_alerts_total} label="Structura alerts, because there was no real risk" tone="var(--moss)" />
        <Metric value={`${withIssue} of ${summary.structures}`} label="Units with a silent equipment or sensor issue" />
        <Metric value={`${certified} of ${summary.structures}`} label={replay.isToday ? 'Certified dry today' : 'Certified dry on this date'} />
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
    </AppShell>
  )
}