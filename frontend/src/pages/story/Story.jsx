import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data.jsx'
import RoofSketch from '../../components/RoofSketch.jsx'
import '../roles.css'

// Pitch mode: six chapters, each with one sentence and a button that opens the live screen.
export default function Story() {
  const { data, setRole } = useData()
  const navigate = useNavigate()
  const [i, setI] = useState(0)

  const live = (role, path) => { setRole(role); navigate(path) }

  const s = data?.summary
  const chapters = !data ? [] : [
    {
      step: 'The building',
      title: 'VILPE\u2019s own warehouse in Vantaa.',
      big: data.building.readings.toLocaleString('en'), unit: 'sensor readings from 7 Sense fans in 16 months',
      text: 'Real VILPE data. No value altered, and every number in this demo is checked by 19 automated tests.',
      extra: <RoofSketch />,
    },
    {
      step: 'The problem',
      title: 'Today\u2019s alarm cries wolf.',
      big: s.old_alarms_total, unit: 'alarms from VILPE\u2019s recommended setting',
      text: `Every one of them on a healthy structure. The highest mold index in 16 months was ${s.highest_mold_index_ours.toFixed(2)}, far below the alarm level of 2.5. Structura alerts in the same period: ${s.smart_alerts_total}.`,
      action: ['Watch the replay', () => live('owner', '/owner')],
    },
    {
      step: 'What nobody noticed',
      title: 'Every unit had a silent fault.',
      big: `${s.structures_with_watchdog_issue} of ${s.structures}`, unit: 'units with an equipment or sensor issue',
      text: 'Green roof 2\u2019s fan showed 0 rpm for 379 days. Three outdoor sensors read too warm in daytime. The crawl space sensors look swapped. None of it raised an alarm.',
      action: ['Open Green roof 2', () => live('owner', '/owner/structure/viherkatto-2')],
    },
    {
      step: 'One number',
      title: 'A health score anyone understands.',
      big: '0 to 100', unit: 'mold risk, time in risk zone, drying, system health',
      text: 'Calculated every day with the VTT mold growth model, the same model behind VILPE\u2019s own mold index. Our engine matches VILPE\u2019s index on three structures without tuning.',
      action: ['See the scores', () => live('owner', '/owner')],
    },
    {
      step: 'Proof that pays',
      title: 'A certificate and a passport, one scan away.',
      big: `${s.certified_dry_now.length} of ${s.structures}`, unit: 'structures certified dry today',
      text: 'Owners show it to buyers and insurers. Every "not yet" comes with what to fix, so the certificate creates demand for VILPE service.',
      action: ['Open the certificate', () => live('owner', '/owner/certificate')],
    },
    {
      step: 'The business',
      title: 'Three customers, one platform.',
      big: '3', unit: 'revenue lines for VILPE',
      text: 'Owners subscribe to Structura. Insurers get verified data and fewer water damage claims (LocalTapiola as proposed partner). VILPE service turns every watchdog finding into a work order.',
      action: ['Open VILPE service view', () => live('service', '/service')],
    },
  ]

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, chapters.length - 1))
      if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapters.length])

  if (!data) return <div className="story"><p style={{ padding: 20 }}>Loading</p></div>
  const c = chapters[i]

  return (
    <div className="story">
      <div className="story-top">
        <strong>VILPE Structura</strong>
        <button className="btn" onClick={() => navigate('/login')}>Exit story</button>
      </div>
      <main className="story-body" aria-live="polite">
        <p className="story-step">{i + 1} of {chapters.length}. {c.step}</p>
        <h1>{c.title}</h1>
        <p className="story-big num">{c.big}<small>{c.unit}</small></p>
        <p className="story-text">{c.text}</p>
        {c.extra}
        {c.action && <button className="btn story-live" onClick={c.action[1]}>{c.action[0]}</button>}
      </main>
      <nav className="story-nav" aria-label="Chapters">
        <button className="btn" onClick={() => setI(n => Math.max(n - 1, 0))} disabled={i === 0}>Back</button>
        <div className="story-dots">{chapters.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button className="btn" onClick={() => setI(n => Math.min(n + 1, chapters.length - 1))} disabled={i === chapters.length - 1}>Next</button>
      </nav>
    </div>
  )
}