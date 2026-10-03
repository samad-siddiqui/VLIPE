import { Link } from 'react-router-dom'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS, MIN_SCORE, MAX_MOLD } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import QrCode from '../../components/QrCode.jsx'
import './certificate.css'

const longDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export default function Certificate() {
  const { data, error } = useData()
  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading building data</p></AppShell>

  const { building } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
  const certifiedCount = rows.filter(r => r.c.certified).length
  const issued = rows[0].c.to
  const certId = certificateId(building.id, issued)
  const url = passportUrl(building.id, certId)

  return (
    <AppShell>
      <div className="cert-actions no-print">
        <Link className="back" to="/owner">All structures</Link>
        <div className="cert-buttons">
          <a className="btn" href={url}>Open building passport</a>
          <button className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
      </div>

      <article className="cert">
        <header className="cert-head">
          <div>
            <p className="cert-kicker">VILPE Structura</p>
            <h1>Dry Structure Certificate</h1>
            <p className="muted">{building.name}, {building.city}</p>
          </div>
          <dl className="cert-meta num">
            <div><dt>Certificate</dt><dd>{certId}</dd></div>
            <div><dt>Issued</dt><dd>{longDate(issued)}</dd></div>
            <div><dt>Valid until</dt><dd>{longDate(addDays(issued, WINDOW_DAYS))}</dd></div>
          </dl>
        </header>

        <p className="cert-statement">
          Continuous VILPE Sense monitoring shows that <strong>{certifiedCount} of {rows.length} structures</strong> stayed
          dry over the last {WINDOW_DAYS} days, from {longDate(rows[0].c.from)} to {longDate(issued)}.
        </p>

        <table className="cert-table">
          <thead>
            <tr>
              <th scope="col">Structure</th>
              <th scope="col" className="r">Lowest score</th>
              <th scope="col" className="r">Highest mold index</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, label, c }) => (
              <tr key={s.id}>
                <th scope="row">{label}<small>{s.type}</small></th>
                <td className="r num">{c.minScore.toFixed(1)}</td>
                <td className="r num">{c.maxMold.toFixed(3)}</td>
                <td>
                  {c.certified
                    ? <span className="status ok">Certified dry</span>
                    : (
                      <>
                        <span className="status no">Not yet</span>
                        <span className="fix">{c.openFaults.length ? `Open fault: ${c.openFaults.join(', ')}. ` : ''}{c.gaps.slice(0, 2).map(g => g.hint).join(' ')}</span>
                      </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="cert-foot">
          <div className="cert-rules">
            <p className="cert-rules-title">How a structure is certified</p>
            <ul>
              <li>Health score {MIN_SCORE} or higher every day for {WINDOW_DAYS} days</li>
              <li>Mold index below {MAX_MOLD.toFixed(1)} the whole time (VTT mold growth model)</li>
              <li>No open equipment fault: fan running, sensors reporting</li>
            </ul>
            <p className="faint">Based on {building.readings.toLocaleString('en')} sensor readings. Demo certificate, not an insurance document.</p>
          </div>
          <div className="cert-qr">
            <QrCode url={url} />
            <p className="faint">Scan to verify this certificate and see the building passport</p>
          </div>
        </footer>
      </article>
    </AppShell>
  )
}