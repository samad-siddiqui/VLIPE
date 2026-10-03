import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS } from '../../certification.js'
import { Grid, Briefcase, Paperplane, FileText, Gear, Search, User, Shield, BuildingIcon } from '../../components/Icons.jsx'
import './insurer.css'

const longDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 864e5)
const monthsBetween = (from, to) => Math.round(daysBetween(from, to) / 30.44)

// Illustrative only, no real terms exist yet, see the disclaimer at the bottom of the page.
// A = certified dry, no open equipment fault. B = Good grade, no open equipment fault. C = everything else.
function riskGrade(s, c) {
  if (c.certified) return { grade: 'A', impact: -8 }
  if (s.latest.grade === 'Good' && c.openFaults.length === 0) return { grade: 'B', impact: -4 }
  if (c.openFaults.length > 0) return { grade: 'C', impact: 0 }
  return { grade: 'B', impact: -2 }
}

const NAV = [
  { icon: Grid, label: 'Dashboard', active: true },
  { icon: Briefcase, label: 'Portfolio' },
  { icon: Paperplane, label: 'Claims' },
  { icon: FileText, label: 'Reports' },
  { icon: Gear, label: 'Settings' },
]

export default function Insurer() {
  const { data, error, setRole } = useData()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  if (error) return <p className="muted">{error}</p>
  if (!data) return <p className="muted">Loading</p>

  const { building } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
    .map(r => ({ ...r, risk: riskGrade(r.s, r.c) }))
  const certified = rows.filter(r => r.c.certified)
  const issued = rows[0].c.to
  const current = certificateId(building.id, issued)
  const avgScore = rows.reduce((n, r) => n + r.s.latest.score, 0) / rows.length
  const portfolioRisk = Math.max(0, Math.min(10, (100 - avgScore) / 10))
  const monthsVerified = monthsBetween(building.period.from, building.period.to)
  const totalDays = daysBetween(building.period.from, building.period.to)

  const verify = e => {
    e.preventDefault()
    const v = code.trim().toUpperCase()
    if (!v) { setResult({ ok: false, text: 'Enter a certificate number first.' }); return }
    setResult(v === current
      ? { ok: true, text: `${v} is valid until ${longDate(addDays(issued, WINDOW_DAYS))}. ${certified.length} of ${rows.length} structures certified dry.` }
      : { ok: false, text: `${v} is not a valid current certificate for any insured building.` })
  }

  return (
    <div className="sg-shell">
      <aside className="sg-sidebar">
        <p className="sg-brand"><Shield /> SENSEGUARD<br /><span>INSURE</span></p>
        <nav>
          {NAV.map(n => <button key={n.label} className={n.active ? 'active' : ''}><n.icon /> {n.label}</button>)}
        </nav>
      </aside>

      <main className="sg-main">
        <header className="sg-topbar">
          <div className="sg-search"><Search /><input placeholder="Search" readOnly /></div>
          <div className="sg-user-wrap">
            <button className="sg-user-btn" onClick={() => navigate('/story')} title="Watch the story"><User /></button>
          </div>
        </header>

        <h1>Portfolio View</h1>

        <div className="sg-stats">
          <div className="sg-stat">
            <div className="sg-stat-head"><span>Portfolio risk score</span><i className="sg-icon sg-icon-teal"><Shield /></i></div>
            <strong className="num sg-teal">{portfolioRisk.toFixed(1)}</strong>
            <span className="faint">Out of 10 ({portfolioRisk < 4 ? 'Low' : portfolioRisk < 7 ? 'Medium' : 'High'} risk)</span>
          </div>
          <div className="sg-stat">
            <div className="sg-stat-head"><span>Buildings with verified data</span><i className="sg-icon sg-icon-gold"><BuildingIcon /></i></div>
            <strong className="num sg-gold">1 of 1</strong>
            <span className="faint">100% of portfolio</span>
          </div>
          <div className="sg-stat">
            <div className="sg-stat-head"><span>Structures certified dry</span><i className="sg-icon sg-icon-teal"><FileText /></i></div>
            <strong className="num sg-teal">{certified.length} of {rows.length}</strong>
            <span className="faint">Verified this period</span>
          </div>
        </div>

        <section className="sg-card">
          <div className="sg-card-head">
            <h2>Building Sensor Risk Table</h2>
            <a className="btn" href={passportUrl(building.id, current)}>Open passport</a>
          </div>
          <div className="sg-table-wrap">
            <table className="sg-table">
              <thead>
                <tr>
                  <th scope="col">Structure</th>
                  <th scope="col">Verified monitoring period</th>
                  <th scope="col">Data coverage</th>
                  <th scope="col">Risk grade</th>
                  <th scope="col" className="r">Premium adjustment (%)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, label, c, risk }) => {
                  const coveragePct = Math.round((s.daily.length / totalDays) * 100)
                  return (
                    <tr key={s.id} className={risk.grade === 'A' ? 'sg-row-highlight' : ''}>
                      <th scope="row">{label}<small>{s.type}</small></th>
                      <td className="num">{monthsVerified} months verified</td>
                      <td className="num">{coveragePct >= 95 ? 'Full' : coveragePct >= 60 ? 'Partial' : 'Limited'} ({coveragePct}%)</td>
                      <td><span className={`sg-grade grade-${risk.grade}`}>{risk.grade}</span></td>
                      <td className="r num" style={{ color: risk.impact < 0 ? 'var(--moss)' : 'var(--ink-2)' }}>
                        {risk.impact < 0 ? risk.impact : `+${risk.impact}`}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ marginTop: 10 }}>Premium adjustment is illustrative only, see the note below.</p>
        </section>

        <section className="sg-card">
          <h2>Check a certificate</h2>
          <p className="muted">Paste the number from a certificate a customer sent you.</p>
          <form className="sg-verify" onSubmit={verify}>
            <input value={code} onChange={e => { setCode(e.target.value); setResult(null) }} placeholder={current} aria-label="Certificate number" />
            <button className="btn btn-primary" type="submit">Check</button>
          </form>
          {result && <p className={`sg-result ${result.ok ? 'ok' : 'bad'}`} role="status">{result.text}</p>}
        </section>

        <p className="faint">LocalTapiola is a proposed partner. Terms and discounts are to be agreed in a pilot. <button className="sg-signout" onClick={() => { setRole(null); navigate('/login') }}>Sign out</button></p>
      </main>
    </div>
  )
}
