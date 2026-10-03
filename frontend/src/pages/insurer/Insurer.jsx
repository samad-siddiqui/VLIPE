import { useState } from 'react'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import '../roles.css'
import './insurer.css'

const longDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const monthsBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24 * 30.44))

// Illustrative only, no real terms exist yet, see the disclaimer at the bottom of the page.
// A = certified dry, no open equipment fault. B = Good grade, no open equipment fault. C = everything else.
function riskGrade(s, c) {
  if (c.certified) return { grade: 'A', impact: -8 }
  if (s.latest.grade === 'Good' && c.openFaults.length === 0) return { grade: 'B', impact: -4 }
  if (c.openFaults.length > 0) return { grade: 'C', impact: 0 }
  return { grade: 'B', impact: -2 }
}

// What an insurer (LocalTapiola, proposed partner) sees: which structures are verified dry, and a certificate check.
export default function Insurer() {
  const { data, error } = useData()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading</p></AppShell>

  const { building } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
    .map(r => ({ ...r, risk: riskGrade(r.s, r.c) }))
  const certified = rows.filter(r => r.c.certified)
  const issued = rows[0].c.to
  const current = certificateId(building.id, issued)
  const openEquipment = rows.filter(r => r.c.openFaults.length > 0)
  const avgScore = rows.reduce((n, r) => n + r.s.latest.score, 0) / rows.length
  const portfolioRisk = Math.max(0, Math.min(10, (100 - avgScore) / 10))
  const monthsVerified = monthsBetween(building.period.from, building.period.to)

  const verify = e => {
    e.preventDefault()
    const v = code.trim().toUpperCase()
    if (!v) { setResult({ ok: false, text: 'Enter a certificate number first.' }); return }
    setResult(v === current
      ? { ok: true, text: `${v} is valid until ${longDate(addDays(issued, WINDOW_DAYS))}. ${certified.length} of ${rows.length} structures certified dry.` }
      : { ok: false, text: `${v} is not a valid current certificate for any insured building.` })
  }

  return (
    <AppShell>
      <div className="r-head">
        <h1>Insured buildings</h1>
        <p className="muted">Verified moisture data instead of self-reported answers. Certified structures are candidates for better terms, structures with open faults get a prevention task before a claim happens.</p>
      </div>

      <div className="r-grid ins-stat-grid">
        <div className="r-stat ins-headline">
          <strong className="num">{portfolioRisk.toFixed(1)}</strong>
          <span>Portfolio risk score, out of 10 ({portfolioRisk < 4 ? 'Low' : portfolioRisk < 7 ? 'Medium' : 'High'} risk)</span>
        </div>
        <div className="r-stat"><strong className="num">1 of 1</strong><span>Buildings with verified data (100%)</span></div>
        <div className="r-stat"><strong className="num">{certified.length} of {rows.length}</strong><span>Structures certified dry</span></div>
        <div className="r-stat"><strong className="num">{openEquipment.length}</strong><span>Open equipment faults, prevention task sent</span></div>
      </div>

      <section className="r-card">
        <div className="r-row">
          <h2>Structure Risk Table</h2>
          <a className="btn" href={passportUrl(building.id, current)}>Open passport</a>
        </div>
        <p className="faint num">{building.name}, {building.city}. Certificate {current}, issued {longDate(issued)}.</p>
        <div className="ins-table-wrap">
          <table className="ins-table">
            <thead>
              <tr>
                <th scope="col">Structure</th>
                <th scope="col">Verified period</th>
                <th scope="col">Status</th>
                <th scope="col">Risk grade</th>
                <th scope="col" className="r">Premium impact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, label, c, risk }) => (
                <tr key={s.id}>
                  <th scope="row">{label}<small>{s.type}</small></th>
                  <td className="num">{monthsVerified} months</td>
                  <td>
                    <span className={`r-pill ${c.certified ? 'ok' : 'no'}`}>{c.certified ? 'Certified dry' : `Score ${s.latest.score.toFixed(0)}`}</span>
                    {c.openFaults.length > 0 && <small className="ins-fault">Open: {c.openFaults.join(', ')}</small>}
                  </td>
                  <td><span className={`ins-grade grade-${risk.grade}`}>{risk.grade}</span></td>
                  <td className="r num" style={{ color: risk.impact < 0 ? 'var(--moss)' : 'var(--ink-2)' }}>
                    {risk.impact < 0 ? risk.impact : `+${risk.impact}`}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ marginTop: 10 }}>Premium impact is illustrative only, see the note below.</p>
      </section>

      <section className="r-card">
        <h2>Check a certificate</h2>
        <p className="muted">Paste the number from a certificate a customer sent you.</p>
        <form className="r-verify" onSubmit={verify}>
          <input value={code} onChange={e => { setCode(e.target.value); setResult(null) }} placeholder={current} aria-label="Certificate number" />
          <button className="btn btn-primary" type="submit">Check</button>
        </form>
        {result && <p className={`r-result ${result.ok ? 'ok' : 'bad'}`} role="status">{result.text}</p>}
      </section>

      <p className="faint">LocalTapiola is a proposed partner. Terms and discounts are to be agreed in a pilot.</p>
    </AppShell>
  )
}