import { Link } from 'react-router-dom'
import { useData, monthYear } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import AppShell from '../../components/AppShell.jsx'
import '../owner/owner.css'
import './service.css'

const longDate = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function Metric({ value, label, tone }) {
  return (
    <div className="metric">
      <span className="metric-value num" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  )
}

// Every watchdog finding across every structure, newest end date first. Open = still flagged on the latest reading.
function buildQueue(structures, lastDate) {
  const rows = []
  for (const s of structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    for (const w of s.watchdog) {
      rows.push({ ...w, structureId: s.id, label, open: w.end.slice(0, 10) >= lastDate })
    }
  }
  return rows.sort((a, b) => (b.open - a.open) || b.end.localeCompare(a.end))
}

export default function ServiceQueue() {
  const { data, error } = useData()
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading building data</p></AppShell>

  const { building, structures } = data
  const lastDate = structures[0].daily[structures[0].daily.length - 1].date
  const queue = buildQueue(structures, lastDate)
  const open = queue.filter(q => q.open)
  const affected = new Set(open.map(q => q.structureId)).size

  return (
    <AppShell>
      <div className="owner-head">
        <h1>{building.name}</h1>
        <p className="muted">{building.city}. Fleet watchdog, one site, {structures.length} control units. Updated {monthYear(lastDate)}.</p>
      </div>

      <div className="metrics">
        <Metric value={open.length} label="Open findings across the fleet" tone={open.length ? 'var(--brick)' : 'var(--moss)'} />
        <Metric value={affected} label="Structures with an open finding" />
        <Metric value={open.length ? Math.round(open[0].days) : 0} label="Longest open finding, in days" />
        <Metric value={queue.length - open.length} label="Resolved findings on record" tone="var(--moss)" />
      </div>

      <section className="list-card">
        <h2>Maintenance queue <span className="faint num">longest-open first</span></h2>
        {queue.length === 0 ? <p className="muted">No watchdog findings on this site.</p> : (
          <ul className="slist">
            {queue.map((q, i) => (
              <li key={i}>
                <Link className="svc-row" to={`/owner/structure/${q.structureId}`}>
                  <span className={`badge svc-kind ${q.open ? 'open' : 'done'}`}>{q.open ? 'Open' : 'Resolved'}</span>
                  <span className="svc-name">{q.label}: {q.check}<small>{q.evidence}</small></span>
                  <span className="svc-dates muted num">{longDate(q.start)} to {q.open ? 'today' : longDate(q.end)}</span>
                  <span className="svc-days num">{Math.round(q.days)}d</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}
