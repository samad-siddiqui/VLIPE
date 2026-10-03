import { Link } from 'react-router-dom'
import { useData, GRADE } from '../../data.jsx'
import { ROOF_VIEWBOX, ROOF_SHAPES, FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS, MIN_SCORE, MAX_MOLD } from '../../certification.js'
import AppShell from '../../components/AppShell.jsx'
import QrCode from '../../components/QrCode.jsx'
import './certificate.css'

// Zone diagram for the passport: same roof plan as everywhere else, dots coloured by each structure's
// current grade instead of the plain blueprint look, so the diagram carries real status, not decoration.
function ZoneDiagram({ rows }) {
  const { lowRoof, flatRoof, greenRoof } = ROOF_SHAPES
  return (
    <svg className="zone-diagram" viewBox={ROOF_VIEWBOX} role="img" aria-label="Roof plan with certification status per structure">
      <rect className="zd-outline" x={lowRoof.x} y={lowRoof.y} width={lowRoof.w} height={lowRoof.h} />
      <rect className="zd-outline" x={flatRoof.x} y={flatRoof.y} width={flatRoof.w} height={flatRoof.h} />
      <polygon className="zd-outline zd-green" points={greenRoof.points} />
      {rows.map(({ s, label }) => {
        const f = FAN_POSITIONS[s.name]
        const color = GRADE[s.latest.grade]?.color ?? 'currentColor'
        return (
          <g key={s.id}>
            <circle cx={f.x} cy={f.y} r="5.5" fill={color} />
            <text className="zd-label" x={f.x + 10} y={f.y + 2}>{label}</text>
            <text className="zd-status" x={f.x + 10} y={f.y + 13}>{s.latest.grade}</text>
          </g>
        )
      })}
    </svg>
  )
}

const longDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const monthsBetween = (from, to) => {
  const a = new Date(from + 'T00:00:00'), b = new Date(to + 'T00:00:00')
  return Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.44))
}

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
            <p className="cert-kicker">Building Moisture Passport</p>
            <h1>Dry Structure Certificate</h1>
            <p className="muted">{building.name}, {building.city}</p>
          </div>
          <div className="cert-seal" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" />
              <circle cx="60" cy="60" r="46" />
              <path id="sealArcTop" d="M 60 14 A 46 46 0 0 1 106 60" fill="none" />
              <path id="sealArcBottom" d="M 14 60 A 46 46 0 0 1 60 106" fill="none" />
              <text><textPath href="#sealArcTop" startOffset="2">VILPE SENSE CERTIFIED</textPath></text>
              <text><textPath href="#sealArcBottom" startOffset="2">NORDIC INTEGRITY</textPath></text>
              <path className="seal-icon" d="M60 44 C68 54 74 61 74 69 A14 14 0 0 1 46 69 C46 61 52 54 60 44 Z" />
            </svg>
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

        <section className="cert-zones">
          <ZoneDiagram rows={rows} />
          <ul className="cert-zone-legend">
            {rows.map(({ s, label }) => (
              <li key={s.id}>
                <i style={{ background: GRADE[s.latest.grade]?.color }} />
                <span>{label}</span>
                <strong className="num">{s.latest.score.toFixed(0)}</strong>
              </li>
            ))}
          </ul>
        </section>

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
            <p className="faint">Verify authenticity</p>
          </div>
        </footer>

        <p className="cert-coverage num">
          Sensor coverage: <strong>{rows.length} structures</strong> &nbsp;|&nbsp;
          Monitoring period: <strong>{monthsBetween(building.period.from, building.period.to)} months</strong>
        </p>
      </article>
    </AppShell>
  )
}