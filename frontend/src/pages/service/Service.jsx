import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { WINDOW_DAYS } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import '../roles.css'
import './service.css'

const shortDate = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// Stable, display-only order number from the structure + check, not a separate tracked ID.
function orderNumber(key) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `WO-2026-${String(h % 1000).padStart(3, '0')}`
}

// Real indoor RH average over a date range, from the structure's own daily history. null if no readings.
function avgIndoorRh(daily, from, to) {
  const rows = daily.filter(d => d.date >= from && d.date <= to && d.indoor_rh != null)
  if (!rows.length) return null
  return rows.reduce((n, r) => n + r.indoor_rh, 0) / rows.length
}

// What VILPE service should do for each kind of finding
const ACTIONS = {
  'Fan stopped': 'Inspect the fan motor, power supply and control voltage. Check the MCU-2 settings.',
  'Indoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor reads too warm (sun or heat)': 'Move the outdoor sensor to a shaded spot, away from direct sun and warm exhaust air (guidebook placement rules).',
  'Sensors likely swapped': 'Swap the indoor and outdoor sensor roles in the Sense cloud, then confirm readings.',
}

// Open findings move through the same 4 stages every work order does: detected, triaged, worked, closed.
// "Assigned" and "In progress" are read off the same open/resolved state the rest of the app uses, not a
// separately tracked status, there is no real dispatch system behind this demo.
function Stepper({ resolved }) {
  const steps = ['Alert', 'Assigned', 'In progress', 'Resolved']
  const doneCount = resolved ? 4 : 3
  return (
    <div className="wo-steps">
      {steps.map((label, i) => (
        <div key={label} className={`wo-step ${i < doneCount ? 'done' : i === doneCount ? 'active' : ''}`}>
          <i>{i < doneCount ? '✓' : i === doneCount ? '•' : ''}</i>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
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
      const g = (groups[w.check] ??= {
        id: `${s.id}-${w.check}`, order: orderNumber(`${s.id}-${w.check}`), label, check: w.check, kind: w.kind,
        first: w.start, last: w.end, lastStart: w.start, days: 0, count: 0, evidence: w.evidence, longest: 0,
      })
      if (w.end > g.last) { g.last = w.end; g.lastStart = w.start }
      g.days += w.days; g.count += 1
      if (w.days > g.longest) { g.longest = w.days; g.evidence = w.evidence }
    }
    // Before/during RH is anchored to the most recent occurrence, not the earliest, the oldest findings on
    // this site started on day 1 of monitoring, so there is no "before" baseline to compare against.
    for (const g of Object.values(groups)) {
      g.beforeRh = avgIndoorRh(s.daily, addDays(g.lastStart, -7), addDays(g.lastStart, -1))
      g.duringRh = avgIndoorRh(s.daily, g.lastStart.slice(0, 10), g.last.slice(0, 10))
      ;(g.last.slice(0, 10) >= since ? orders : resolved).push(g)
    }
  }
  orders.sort((a, b) => (a.kind === b.kind ? b.days - a.days : a.kind === 'Equipment' ? -1 : 1))
  const avgUptime = data.structures.reduce((n, s) => n + s.equipment_uptime_pct, 0) / data.structures.length

  return (
    <AppShell>
      <div className="r-head">
        <h1>Work Orders &mdash; Moisture Alerts</h1>
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
        <ul className="wo-list">
          {orders.map(o => (
            <li key={o.id} className="wo-card">
              <div className="wo-top">
                <div>
                  <span className="wo-order num">{o.order}</span>
                  <strong className="wo-title"> &mdash; {o.label}, {o.check}</strong>
                </div>
                <span className={`r-pill ${o.kind === 'Equipment' ? 'high' : 'med'}`}>{o.kind === 'Equipment' ? 'High' : 'Medium'}</span>
              </div>
              <Stepper resolved={false} />
              <div className="wo-bottom">
                <div className="wo-evidence">
                  <p className="faint num">First seen {shortDate(o.first)}, {o.count === 1 ? 'once' : `${o.count} times`}, {Math.round(o.days)} days in total</p>
                  <p className="muted">{o.evidence}</p>
                  <p className="r-action"><strong>Action:</strong> {ACTIONS[o.check] ?? 'Inspect on site.'}</p>
                </div>
                {(o.beforeRh != null && o.duringRh != null) && (
                  <div className="wo-rh">
                    <span className="faint">Indoor RH</span>
                    <div className="wo-rh-vals">
                      <span><strong className="num">{o.beforeRh.toFixed(0)}%</strong><small>before</small></span>
                      <span className="wo-rh-arrow">&rarr;</span>
                      <span><strong className="num" style={{ color: o.duringRh > o.beforeRh ? 'var(--brick)' : 'inherit' }}>{o.duringRh.toFixed(0)}%</strong><small>during</small></span>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="r-card">
        <h2>Resolved</h2>
        <ul className="wo-list">
          {resolved.map(o => (
            <li key={o.id} className="wo-card wo-card-compact">
              <div className="wo-top">
                <div>
                  <span className="wo-order num">{o.order}</span>
                  <strong className="wo-title"> &mdash; {o.label}, {o.check}</strong>
                </div>
                <span className="faint num">{shortDate(o.first)} to {shortDate(o.last)}</span>
              </div>
              <Stepper resolved={true} />
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
