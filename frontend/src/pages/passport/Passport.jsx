import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useData, GRADE, monthYear } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, WINDOW_DAYS } from '../../certification.js'
import LineChart from '../../components/LineChart.jsx'
import './passport.css'

const longDate = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// Building-wide history: average score and highest mold index across all structures, per day
function buildingHistory(structures) {
  const byDate = {}
  for (const s of structures) for (const r of s.daily) {
    const d = (byDate[r.date] ??= { scores: [], mold: 0 })
    d.scores.push(r.score)
    d.mold = Math.max(d.mold, r.mold_index)
  }
  const dates = Object.keys(byDate).sort()
  return {
    dates,
    avgScore: dates.map(d => byDate[d].scores.reduce((a, b) => a + b, 0) / byDate[d].scores.length),
    maxMold: dates.map(d => byDate[d].mold),
  }
}

function Brand() {
  return (
    <div className="pp-brand">
      <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M3 15 L14 5 L25 15" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M7 15 V24 H21 V15" fill="none" stroke="var(--slate)" strokeWidth="2.2" />
        <circle cx="14" cy="18.5" r="2.2" fill="var(--moss)" />
      </svg>
      <span>VILPE Structura</span>
    </div>
  )
}

export default function Passport() {
  const { buildingId } = useParams()
  const [params] = useSearchParams()
  const scannedCert = params.get('cert')
  const { data, error } = useData()

  const history = useMemo(() => (data ? buildingHistory(data.structures) : null), [data])

  if (error) return <div className="pp"><p className="muted">{error}</p></div>
  if (!data) return <div className="pp"><p className="muted">Loading building passport</p></div>

  const { building } = data
  if (building.id !== buildingId) {
    return (
      <div className="pp">
        <Brand />
        <h1>Passport not found</h1>
        <p className="muted">There is no building passport for this link. Check the QR code or ask the building owner for a new one.</p>
      </div>
    )
  }

  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
  const certified = rows.filter(r => r.c.certified).length
  const issued = rows[0].c.to
  const currentCert = certificateId(building.id, issued)
  const validUntil = addDays(issued, WINDOW_DAYS)
  const certStatus = !scannedCert ? 'none' : scannedCert === currentCert ? 'valid' : 'invalid'
  const avgNow = rows.reduce((n, r) => n + r.s.latest.score, 0) / rows.length
  const peakMold = Math.max(...history.maxMold)

  // Maintenance log: every watchdog finding, newest first, grouped per structure and check
  const log = []
  for (const { s, label } of rows) {
    const groups = {}
    for (const w of s.watchdog) {
      const g = (groups[w.check] ??= { label, check: w.check, kind: w.kind, start: w.start, end: w.end, days: 0 })
      g.start = w.start < g.start ? w.start : g.start
      g.end = w.end > g.end ? w.end : g.end
      g.days += w.days
    }
    log.push(...Object.values(groups))
  }
  log.sort((a, b) => b.end.localeCompare(a.end))
  const lastDay = history.dates[history.dates.length - 1]
  const openSince = rows[0].c.from // seen in the last 30 days = still open, same rule as the certificate

  return (
    <div className="pp">
      <Brand />

      {certStatus === 'valid' && (
        <div className="pp-verify ok" role="status">
          <strong>Certificate {scannedCert} is valid</strong>
          <span>Valid until {longDate(validUntil)}. {certified} of {rows.length} structures certified dry.</span>
        </div>
      )}
      {certStatus === 'invalid' && (
        <div className="pp-verify bad" role="alert">
          <strong>Certificate {scannedCert} is not valid</strong>
          <span>It is outdated or was never issued. The current certificate is {currentCert}.</span>
        </div>
      )}

      <header className="pp-head">
        <p className="faint">Building passport</p>
        <h1>{building.name}</h1>
        <p className="muted">{building.city}. {building.description}</p>
      </header>

      <div className="pp-facts">
        <div><span className="num">{avgNow.toFixed(0)}</span><small>Average health score today, out of 100</small></div>
        <div><span className="num">{certified} of {rows.length}</span><small>Structures certified dry</small></div>
        <div><span className="num">{peakMold.toFixed(2)}</span><small>Highest mold index ever recorded. Growth starts at 1.0</small></div>
        <div><span className="num">{building.readings.toLocaleString('en')}</span><small>Sensor readings since {monthYear(building.period.from)}</small></div>
      </div>

      <section className="pp-card">
        <h2>Moisture history</h2>
        <p className="muted pp-note">
          The highest mold index of any structure in the building, every day since monitoring began.
          {peakMold < 1 ? ' No mold growth has been recorded.' : ''}
        </p>
        <LineChart label="Highest mold index in the building per day" dates={history.dates} values={history.maxMold} min={0} max={3}
          color="var(--moss)"
          refs={[{ value: 2.5, label: 'Alarm level 2.5', color: 'var(--brick)' }, { value: 1, label: 'Growth starts 1.0', color: 'var(--amber)' }]} />
      </section>

      <section className="pp-card">
        <h2>Health score history</h2>
        <p className="muted pp-note">Average of all {rows.length} structures. Drops in autumn are the wet season.</p>
        <LineChart label="Average building health score per day" dates={history.dates} values={history.avgScore} min={0} max={100}
          refs={[{ value: 85, label: 'Certified dry 85', color: 'var(--moss)' }]} />
      </section>

      <section className="pp-card">
        <h2>Structures</h2>
        <ul className="pp-structs">
          {rows.map(({ s, label, c }) => {
            const g = GRADE[s.latest.grade]
            return (
              <li key={s.id}>
                <i style={{ background: g?.color }} />
                <span className="pp-sname">{label}<small>{s.type}</small></span>
                <span className="pp-sstatus">{c.certified ? 'Certified dry' : s.latest.grade}</span>
                <span className="num pp-sscore">{s.latest.score.toFixed(0)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="pp-card">
        <h2>Maintenance log</h2>
        <p className="muted pp-note">Everything the monitoring system found, open or resolved. Shown in full so buyers and insurers can trust the record.</p>
        <ul className="pp-log">
          {log.map((e, i) => {
            const open = e.end.slice(0, 10) >= openSince
            const toToday = e.end.slice(0, 10) >= lastDay
            return (
              <li key={i}>
                <span className={`pp-tag ${open ? 'open' : 'done'}`}>{open ? 'Open' : 'Resolved'}</span>
                <div>
                  <strong>{e.label}: {e.check}</strong>
                  <p className="faint num">{longDate(e.start)} to {toToday ? 'today' : longDate(e.end)}, {Math.round(e.days)} days</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <footer className="pp-foot">
        <p className="faint">
          Shared by the building owner. Data from VILPE Sense monitoring, mold index from the VTT mold growth model.
          Updated {longDate(lastDay)}.
        </p>
        <Link to="/login" className="faint">Owner sign in</Link>
      </footer>
    </div>
  )
}