import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { WINDOW_DAYS } from '../../certification.js'
import { Check, Wrench, Droplet, User, Sensor } from '../../components/Icons.jsx'
import './service.css'

const shortDate = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

function orderNumber(key) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `WO-2026-${String(h % 1000).padStart(3, '0')}`
}

function avgIndoorRh(daily, from, to) {
  const rows = daily.filter(d => d.date >= from && d.date <= to && d.indoor_rh != null)
  if (!rows.length) return null
  return rows.reduce((n, r) => n + r.indoor_rh, 0) / rows.length
}

const ACTIONS = {
  'Fan stopped': 'Inspect the fan motor, power supply and control voltage. Check the MCU-2 settings.',
  'Indoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor silent': 'Check the sensor battery and radio range to the control unit.',
  'Outdoor sensor reads too warm (sun or heat)': 'Move the outdoor sensor to a shaded spot, away from direct sun and warm exhaust air (guidebook placement rules).',
  'Sensors likely swapped': 'Swap the indoor and outdoor sensor roles in the Sense cloud, then confirm readings.',
}

const STEPS = ['Alert', 'Assigned', 'In progress', 'Resolved']

function Stepper({ doneCount }) {
  return (
    <div className="wo-steps">
      {STEPS.map((label, i) => {
        const state = i < doneCount ? 'done' : i === doneCount ? 'active' : 'todo'
        return (
          <div key={label} className="wo-step-wrap">
            <div className={`wo-step ${state}`}>
              {state === 'done' ? <Check /> : state === 'active' ? <Wrench /> : null}
            </div>
            <span className={state === 'todo' ? 'faint' : ''}>{label}</span>
            {i < STEPS.length - 1 && <i className={`wo-connector ${i < doneCount ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

// A tiny line+area chart: flat-ish "before" segment, a vertical marker, then the "during"/"after" segment
// shaded under the curve. Shape is illustrative (we don't keep hourly points here), the two labelled
// numbers it anchors are real indoor RH averages from the structure's own daily history.
function RhChart({ before, after }) {
  const bY = 58 - (before / 100) * 48
  const aY = 58 - (after / 100) * 48
  const path = `M2,56 C14,${bY + 6} 24,${bY} 34,${bY} L34,${bY} C44,${(bY + aY) / 2} 50,${aY} 62,${aY} L74,${aY - 4} L86,${aY}`
  const areaPath = `${path} L86,58 L34,58 Z`
  return (
    <svg className="rh-chart" viewBox="0 0 88 60" preserveAspectRatio="none">
      {[0, 1, 2, 3].map(i => <line key={i} x1="2" x2="86" y1={10 + i * 14} y2={10 + i * 14} className="rh-grid" />)}
      <path d={areaPath} className="rh-area" />
      <path d={path} className="rh-line" />
      <line x1="34" x2="34" y1="4" y2="58" className="rh-marker" />
      <circle cx="34" cy={bY} r="2.4" className="rh-dot" />
    </svg>
  )
}

export default function Service() {
  const { data, error, setRole } = useData()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  if (error) return <div className="wo-page"><p className="muted">{error}</p></div>
  if (!data) return <div className="wo-page"><p className="muted">Loading</p></div>

  const lastDay = data.building.period.to
  const since = new Date(new Date(lastDay).getTime() - (WINDOW_DAYS - 1) * 864e5).toISOString().slice(0, 10)

  const orders = []
  const resolved = []
  for (const s of data.structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    const groups = {}
    for (const w of s.watchdog) {
      const g = (groups[w.check] ??= {
        id: `${s.id}-${w.check}`, order: orderNumber(`${s.id}-${w.check}`), structure: label, type: s.type, check: w.check, kind: w.kind,
        first: w.start, last: w.end, lastStart: w.start, days: 0, count: 0, evidence: w.evidence,
      })
      if (w.end > g.last) { g.last = w.end; g.lastStart = w.start }
      g.days += w.days; g.count += 1
    }
    for (const g of Object.values(groups)) {
      const isResolved = g.last.slice(0, 10) < since
      g.beforeRh = avgIndoorRh(s.daily, addDays(g.lastStart, -7), addDays(g.lastStart, -1))
      g.afterRh = isResolved
        ? avgIndoorRh(s.daily, g.last.slice(0, 10), addDays(g.last, 7))
        : avgIndoorRh(s.daily, g.lastStart.slice(0, 10), g.last.slice(0, 10))
      ;(isResolved ? resolved : orders).push(g)
    }
  }
  orders.sort((a, b) => (a.kind === b.kind ? b.days - a.days : a.kind === 'Equipment' ? -1 : 1))
  resolved.sort((a, b) => b.last.localeCompare(a.last))

  return (
    <div className="wo-page">
      <header className="wo-header">
        <div>
          <h1>Work Orders &mdash; Moisture Alerts</h1>
          <i className="wo-underline" />
        </div>
        <div className="wo-avatar-wrap">
          <button className="wo-avatar" onClick={() => setMenuOpen(o => !o)} aria-label="Account menu">
            <User />
            <i className="wo-avatar-dot" />
          </button>
          {menuOpen && (
            <div className="wo-menu" role="menu">
              <button onClick={() => navigate('/story')}>Watch the story</button>
              <button onClick={() => { setRole(null); navigate('/login') }}>Sign out</button>
            </div>
          )}
        </div>
      </header>

      <div className="wo-list">
        {orders.map((o, i) => (
          <article key={o.id} className={`wo-card ${i === 0 ? 'featured' : ''}`}>
            {i !== 0 && <span className="wo-ribbon">new</span>}
            <div className="wo-col wo-col-main">
              <div className="wo-title-row">
                <strong className="wo-id num">{o.order}</strong>
                <span className="wo-dash">&mdash;</span>
                <span className="wo-loc">{o.structure}, {o.type}</span>
                <span className={`wo-pill ${o.kind === 'Equipment' ? 'pill-red' : 'pill-amber'}`}>
                  {o.kind === 'Equipment' ? <Droplet /> : <Sensor />}
                  {o.check}
                </span>
              </div>
              <Stepper doneCount={2} />
              <p className="faint num wo-meta">First seen {shortDate(o.first)}, {o.count === 1 ? 'once' : `${o.count} times`}, {Math.round(o.days)} days in total</p>
              {i === 0 && <>
                <p className="muted wo-evidence">{o.evidence}</p>
                <p className="wo-action"><strong>Action:</strong> {ACTIONS[o.check] ?? 'Inspect on site.'}</p>
              </>}
            </div>

            <div className="wo-col wo-col-assigned">
              {i === 0 && <p className="faint wo-col-label">Assigned</p>}
              <div className="wo-assignee">
                <User />
              </div>
              {i === 0 && <p className="wo-assignee-name">VILPE Service</p>}
            </div>

            <div className="wo-col wo-col-chart">
              {i === 0 && <p className="faint wo-col-label">Relative humidity</p>}
              {(o.beforeRh != null && o.afterRh != null) ? (
                <>
                  <RhChart before={o.beforeRh} after={o.afterRh} />
                  {i === 0 && (
                    <div className="rh-labels">
                      <span><strong className="num">{o.beforeRh.toFixed(0)}%</strong> RH<br /><small>Before</small></span>
                      <span><strong className="num">{o.afterRh.toFixed(0)}%</strong> RH<br /><small>During</small></span>
                    </div>
                  )}
                </>
              ) : <p className="faint">No prior reading</p>}
            </div>
          </article>
        ))}
      </div>

      <section className="wo-resolved">
        <h2>Resolved</h2>
        <ul className="wo-resolved-list">
          {resolved.map(o => (
            <li key={o.id}>
              <div className="wo-resolved-row">
                <strong className="num">{o.order}</strong>
                <span>&mdash; {o.structure}, {o.check}</span>
                <span className="wo-pill pill-gray">Resolved</span>
              </div>
              <Stepper doneCount={4} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
