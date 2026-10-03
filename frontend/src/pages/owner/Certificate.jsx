import { Link } from 'react-router-dom'
import { useData, GRADE } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import { certify, certificateId, passportUrl, WINDOW_DAYS, MIN_SCORE, MAX_MOLD } from '../../certification.js'
import QrCode from '../../components/QrCode.jsx'
import './certificate.css'

// Same 3-word vocabulary the passport cover uses, mapped from our real 4-tier grade. Certified dry and Good
// both read as healthy to a non-technical viewer (Optimal/Stable); Attention and At risk both mean "look
// at this" (Monitor). The underlying score and grade are unchanged and still shown in the table below.
function passportStatus(grade) {
  if (grade === 'Certified dry') return 'optimal'
  if (grade === 'Good') return 'stable'
  return 'monitor'
}

// Isometric warehouse, one roof zone per real structure (7, not a rounder decorative number, every other
// screen in this app already says "7 structures" and this diagram shouldn't contradict that). Coordinates
// are a plain isometric projection (W=150 length, D=60 depth, H=42 height) computed once and hard-coded.
const IZ = {
  front: '60,215 189.9,140 189.9,98 60,173',
  side: '60,215 8,185 8,143 60,173',
  zones: [
    { a: [60, 173], b: [78.6, 162.3], c: [26.6, 132.3], d: [8, 143], center: [43.3, 152.6] },
    { a: [78.6, 162.3], b: [97.1, 151.6], c: [45.2, 121.6], d: [26.6, 132.3], center: [61.9, 141.9] },
    { a: [97.1, 151.6], b: [115.7, 140.9], c: [63.7, 110.9], d: [45.2, 121.6], center: [80.4, 131.2] },
    { a: [115.7, 140.9], b: [134.2, 130.1], c: [82.3, 100.1], d: [63.7, 110.9], center: [99, 120.5] },
    { a: [134.2, 130.1], b: [152.8, 119.4], c: [100.8, 89.4], d: [82.3, 100.1], center: [117.5, 109.8] },
    { a: [152.8, 119.4], b: [171.3, 108.7], c: [119.4, 78.7], d: [100.8, 89.4], center: [136.1, 99.1] },
    { a: [171.3, 108.7], b: [189.9, 98], c: [137.9, 68], d: [119.4, 78.7], center: [154.6, 88.4] },
  ],
}

function IsoBuilding({ rows }) {
  return (
    <svg className="iso-building" viewBox="-20 25 240 205" role="img" aria-label="Isometric warehouse with one roof zone per structure, coloured by certification status">
      <polygon points={IZ.front} className="iso-wall iso-wall-front" />
      <polygon points={IZ.side} className="iso-wall iso-wall-side" />
      {IZ.zones.map((z, i) => {
        const row = rows[i]
        if (!row) return null
        const color = GRADE[row.s.latest.grade]?.color ?? '#9c7a3c'
        const pts = `${z.a.join(',')} ${z.b.join(',')} ${z.c.join(',')} ${z.d.join(',')}`
        const [cx, cy] = z.center
        return (
          <g key={row.s.id}>
            <polygon points={pts} className="iso-zone" style={{ fill: color }} />
            <polygon points={pts} className="iso-zone-outline" />
          </g>
        )
      })}
      {IZ.zones.map((z, i) => {
        const row = rows[i]
        if (!row) return null
        const [cx, cy] = z.center
        return (
          <g key={`label-${row.s.id}`} className="iso-label-group">
            <circle cx={cx} cy={cy} r="7.5" className="iso-code-dot" />
            <text x={cx} y={cy + 2.3} className="iso-code">{i + 1}</text>
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
  if (error) return <p className="muted">{error}</p>
  if (!data) return <p className="muted">Loading building data</p>

  const { building } = data
  const rows = data.structures.map(s => ({ s, label: FAN_POSITIONS[s.name]?.label ?? s.name, c: certify(s) }))
  const certifiedCount = rows.filter(r => r.c.certified).length
  const issued = rows[0].c.to
  const certId = certificateId(building.id, issued)
  const url = passportUrl(building.id, certId)
  const months = monthsBetween(building.period.from, building.period.to)

  return (
    <div className="pp-page">
      <div className="cert-actions no-print">
        <Link className="back" to="/owner">All structures</Link>
        <div className="cert-buttons">
          <a className="btn" href={url}>Open shareable passport link</a>
          <button className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
      </div>

      <article className="pp-doc">
        <header className="pp-head">
          <div>
            <h1>Building Moisture<br />Passport</h1>
            <p className="pp-sub">Certificate of Verified Structure Health<br />{building.name}, {building.city}, Finland</p>
          </div>
          <div className="pp-seal" aria-hidden="true">
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
        </header>

        <IsoBuilding rows={rows} />
        <ul className="pp-legend">
          {rows.map((r, i) => (
            <li key={r.s.id}>
              <i style={{ background: GRADE[r.s.latest.grade]?.color }}>{i + 1}</i>
              <span>{r.label}</span>
              <small>{passportStatus(r.s.latest.grade)}</small>
            </li>
          ))}
        </ul>
        <p className="pp-zone-caption">Zone status: Optimal, Stable, Monitor</p>

        <div className="pp-stats">
          <div><span className="faint">Sensor coverage</span><strong className="num">{rows.length} structures</strong></div>
          <div><span className="faint">Monitoring period</span><strong className="num">{months} months</strong></div>
        </div>
        <p className="pp-verified">Verified data &mdash; VILPE Sense system</p>

        <div className="pp-qr-row">
          <div className="cert-qr">
            <QrCode url={url} />
            <p className="faint">Verify authenticity</p>
          </div>
        </div>

        <p className="pp-footer-id">ISSUED BY VILPE OY, FINLAND &mdash; TRUSTED BUILDING SOLUTIONS. DOCUMENT ID: {certId}</p>

        <hr className="pp-divider" />

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

        <div className="cert-rules">
          <p className="cert-rules-title">How a structure is certified</p>
          <ul>
            <li>Health score {MIN_SCORE} or higher every day for {WINDOW_DAYS} days</li>
            <li>Mold index below {MAX_MOLD.toFixed(1)} the whole time (VTT mold growth model)</li>
            <li>No open equipment fault: fan running, sensors reporting</li>
          </ul>
          <p className="faint">Based on {building.readings.toLocaleString('en')} sensor readings. Demo certificate, not an insurance document.</p>
        </div>
      </article>
    </div>
  )
}
