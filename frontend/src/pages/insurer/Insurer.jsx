import { useState } from 'react'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import '../roles.css'

const longDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// What an insurer (LocalTapiola, proposed partner) sees: which structures are verified dry, and a certificate check.
export default function Insurer() {
  const { data, error } = useData()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading</p></AppShell>

  const { building } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
  const certified = rows.filter(r => r.c.certified)
  const issued = rows[0].c.to
  const current = certificateId(building.id, issued)
  const openEquipment = rows.filter(r => r.c.openFaults.length > 0)

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

      <div className="r-grid">
        <div className="r-stat"><strong className="num">1</strong><span>Building connected</span></div>
        <div className="r-stat"><strong className="num">{certified.length} of {rows.length}</strong><span>Structures certified dry</span></div>
        <div className="r-stat"><strong className="num">{openEquipment.length}</strong><span>Open equipment faults, prevention task sent</span></div>
        <div className="r-stat"><strong className="num">{data.summary.highest_mold_index_ours.toFixed(2)}</strong><span>Highest mold index in 16 months. Growth starts at 1.0</span></div>
      </div>

      <section className="r-card">
        <div className="r-row">
          <h2>{building.name}, {building.city}</h2>
          <a className="btn" href={passportUrl(building.id, current)}>Open passport</a>
        </div>
        <p className="faint num">Certificate {current}, issued {longDate(issued)}</p>
        <ul className="r-list">
          {rows.map(({ s, label, c }) => (
            <li key={s.id}>
              <div className="r-row">
                <strong>{label} <span className="faint">{s.type}</span></strong>
                <span className={`r-pill ${c.certified ? 'ok' : 'no'}`}>{c.certified ? 'Certified dry' : `Score ${s.latest.score.toFixed(0)}`}</span>
              </div>
              {c.openFaults.length > 0 && <p className="r-action">Open fault: {c.openFaults.join(', ')}. Owner and VILPE service notified.</p>}
            </li>
          ))}
        </ul>
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