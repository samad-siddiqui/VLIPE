import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { WINDOW_DAYS } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import '../roles.css'

const shortDate = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// What VILPE service should do for each kind of finding
const ACTIONS = {
  'Fan stopped': 'Inspect the fan motor, power supply and control voltage. Check the MCU-2 settings.',
  'Indoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor reads too warm (sun or heat)': 'Move the outdoor sensor to a shaded spot, away from direct sun and warm exhaust air (guidebook placement rules).',
  'Sensors likely swapped': 'Swap the indoor and outdoor sensor roles in the Sense cloud, then confirm readings.',
}

// VILPE's own view: every open finding becomes a work order. This is the service revenue line.
export default function Service() {
  const { data, error } = useData()
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading</p></AppShell>

  const lastDay = data.building.period.to
  const since = new Date(new Date(lastDay).getTime() - (WINDOW_DAYS - 1) * 864e5).toISOString().slice(0, 10)

  const orders = []
  const resolved = []
  for (const s of data.structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    const groups = {}
    for (const w of s.watchdog) {
      const g = (groups[w.check] ??= { id: `${s.id}-${w.check}`, label, check: w.check, kind: w.kind, first: w.start, last: w.end, days: 0, count: 0, evidence: w.evidence, longest: 0 })
      g.last = w.end > g.last ? w.end : g.last
      g.days += w.days; g.count += 1
      if (w.days > g.longest) { g.longest = w.days; g.evidence = w.evidence }
    }
    for (const g of Object.values(groups)) (g.last.slice(0, 10) >= since ? orders : resolved).push(g)
  }
  orders.sort((a, b) => (a.kind === b.kind ? b.days - a.days : a.kind === 'Equipment' ? -1 : 1))
  const avgUptime = data.structures.reduce((n, s) => n + s.equipment_uptime_pct, 0) / data.structures.length

  return (
    <AppShell>
      <div className="r-head">
        <h1>Fleet watchdog</h1>
        <p className="muted">Faults the old alarms never showed, turned into work orders. Every fix moves a structure closer to certified dry.</p>
      </div>

      <div className="r-grid">
        <div className="r-stat"><strong className="num">{orders.length}</strong><span>Open work orders</span></div>
        <div className="r-stat"><strong className="num">{orders.filter(o => o.kind === 'Equipment').length}</strong><span>High priority, equipment</span></div>
        <div className="r-stat"><strong className="num">{resolved.length}</strong><span>Resolved findings</span></div>
        <div className="r-stat"><strong className="num">{avgUptime.toFixed(0)}%</strong><span>Average equipment uptime</span></div>
      </div>

      <section className="r-card">
        <h2>Open work orders</h2>
        <p className="faint">{data.building.name}, {data.building.city}. Seen in the last {WINDOW_DAYS} days.</p>
        <ul className="r-list">
          {orders.map(o => (
            <li key={o.id}>
              <div className="r-row">
                <strong>{o.label}: {o.check}</strong>
                <span className={`r-pill ${o.kind === 'Equipment' ? 'high' : 'med'}`}>{o.kind === 'Equipment' ? 'High' : 'Medium'}</span>
              </div>
              <p className="faint num">First seen {shortDate(o.first)}, {o.count === 1 ? 'once' : `${o.count} times`}, {Math.round(o.days)} days in total</p>
              <p className="muted">{o.evidence}</p>
              <p className="r-action"><strong>Action:</strong> {ACTIONS[o.check] ?? 'Inspect on site.'}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="r-card">
        <h2>Resolved</h2>
        <ul className="r-list">
          {resolved.map(o => (
            <li key={o.id} className="r-row">
              <span>{o.label}: {o.check}</span>
              <span className="faint num">{shortDate(o.first)} to {shortDate(o.last)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="r-card">
        <h2>Equipment uptime per unit</h2>
        <ul className="r-list">
          {data.structures.map(s => (
            <li key={s.id} className="r-row">
              <span>{FAN_POSITIONS[s.name]?.label ?? s.name} <span className="faint">{FAN_POSITIONS[s.name]?.serial}</span></span>
              <strong className="num" style={{ color: s.equipment_uptime_pct < 90 ? 'var(--brick)' : 'var(--ink)' }}>{s.equipment_uptime_pct}%</strong>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  )
}