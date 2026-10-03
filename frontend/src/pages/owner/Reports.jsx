import { useData, monthYear } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { WINDOW_DAYS } from '../../certification.js'
import OwnerShell from '../../components/OwnerShell.jsx'
import './owner.css'

export default function Reports() {
  const { data, error } = useData()
  if (error) return <OwnerShell active="Reports" title="Reports"><p className="muted">{error}</p></OwnerShell>
  if (!data) return <OwnerShell active="Reports" title="Reports"><p className="muted">Loading</p></OwnerShell>

  const { building, summary } = data
  const since = new Date(new Date(building.period.to).getTime() - (WINDOW_DAYS - 1) * 864e5).toISOString().slice(0, 10)
  const rows = data.structures.map(s => {
    const recent = s.daily.slice(-30)
    const avg30 = recent.reduce((n, r) => n + r.score, 0) / recent.length
    // "Open" means seen within the last 30 days, same window the certificate and service queue use, not
    // literally still happening on the single most recent reading, a finding that closed a day before the
    // data cutoff is still a real recent problem, not a clean bill of health.
    const openIssues = s.watchdog.filter(w => w.end.slice(0, 10) >= since).length
    return { s, label: FAN_POSITIONS[s.name]?.label ?? s.name, avg30, openIssues }
  })

  return (
    <OwnerShell active="Reports" title="Reports">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      <article className="rpt">
        <header className="rpt-head">
          <div>
            <p className="faint">Monitoring Report</p>
            <h1>{building.name}</h1>
            <p className="muted">{building.city}. {monthYear(building.period.from)} to {monthYear(building.period.to)}.</p>
          </div>
          <p className="faint num">Generated {new Date(data.generated_at.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </header>

        <div className="rpt-stats">
          <div><strong className="num">{summary.old_alarms_total}</strong><span>Old alarms (VILPE default rule)</span></div>
          <div><strong className="num">{summary.smart_alerts_total}</strong><span>Structura smart alerts</span></div>
          <div><strong className="num">{summary.structures_with_watchdog_issue} of {summary.structures}</strong><span>Structures with a watchdog finding</span></div>
          <div><strong className="num">{summary.certified_dry_now.length} of {summary.structures}</strong><span>Certified dry today</span></div>
        </div>

        <h2>Per-structure summary</h2>
        <table className="rpt-table">
          <thead>
            <tr><th>Structure</th><th className="r">Score today</th><th className="r">30-day average</th><th className="r">Equipment uptime</th><th className="r">Old alarms</th><th className="r">Open findings</th></tr>
          </thead>
          <tbody>
            {rows.map(({ s, label, avg30, openIssues }) => (
              <tr key={s.id}>
                <th scope="row">{label}<small>{s.type}</small></th>
                <td className="r num">{s.latest.score.toFixed(1)}</td>
                <td className="r num">{avg30.toFixed(1)}</td>
                <td className="r num" style={{ color: s.equipment_uptime_pct < 90 ? 'var(--brick)' : 'inherit' }}>{s.equipment_uptime_pct}%</td>
                <td className="r num">{s.old_alarms.length}</td>
                <td className="r num" style={{ color: openIssues ? 'var(--amber)' : 'inherit' }}>{openIssues}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="faint" style={{ marginTop: 16 }}>
          Based on {building.readings.toLocaleString('en')} sensor readings. Scoring model: mold risk 40, time in risk zone
          20, drying performance 20, system health 20. Demo report, not an official compliance document.
        </p>
      </article>
    </OwnerShell>
  )
}
