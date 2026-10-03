import { useData, GRADE, monthYear } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import '../owner/owner.css'
import './insurer.css'

function Metric({ value, label, tone }) {
  return (
    <div className="metric">
      <span className="metric-value num" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  )
}

export default function InsurerHome() {
  const { data, error } = useData()
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading building data</p></AppShell>

  const { building, summary } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
  const certified = rows.filter(r => r.c.certified).length
  const openFaultCount = rows.reduce((n, r) => n + r.c.openFaults.length, 0)
  const avgScore = rows.reduce((n, r) => n + r.s.latest.score, 0) / rows.length
  const issued = rows[0].c.to
  const url = passportUrl(building.id, certificateId(building.id, issued))

  return (
    <AppShell>
      <div className="owner-head">
        <h1>{building.name}</h1>
        <p className="muted">{building.city}. Insured since {monthYear(building.period.from)}. {summary.structures} monitored structures.</p>
      </div>

      <div className="metrics">
        <Metric value={avgScore.toFixed(0)} label="Average health score across the portfolio" />
        <Metric value={`${certified} of ${rows.length}`} label="Structures certified dry today" tone="var(--moss)" />
        <Metric value={openFaultCount} label="Open equipment faults, portfolio-wide risk exposure" tone={openFaultCount ? 'var(--brick)' : 'var(--moss)'} />
        <Metric value={summary.old_alarms_total} label="False alarms VILPE's default rule would have raised, none of them real risk" />
      </div>

      <section className="card ins-note">
        <p>
          Continuous monitoring data, not a one-time survey: {building.readings.toLocaleString('en')} sensor readings
          since {monthYear(building.period.from)}. A structure with no open equipment fault and a mold index that never
          crossed 1.0 is the basis for preferential terms, below.
        </p>
        <a className="btn" href={url}>Open the building passport</a>
      </section>

      <section className="list-card">
        <h2>Structures <span className="faint num">on {issued}</span></h2>
        <ul className="slist ins-list">
          {rows.map(({ s, label, c }) => (
            <li key={s.id}>
              <div className="ins-row">
                <i style={{ background: GRADE[s.latest.grade]?.color }} />
                <span className="ins-name">{label}<small>{s.type}</small></span>
                <span className="ins-issues">
                  {c.openFaults.length ? `Open: ${c.openFaults.join(', ')}` : 'No open equipment faults'}
                </span>
                <span className="ins-status">{c.certified ? <span className="badge" style={{ background: GRADE['Certified dry'].soft, color: GRADE['Certified dry'].color }}>Certified dry</span> : <span className="muted">Not yet</span>}</span>
                <span className="ins-score num">{s.latest.score.toFixed(0)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  )
}
