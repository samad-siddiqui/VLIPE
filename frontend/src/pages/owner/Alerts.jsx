import { useState } from 'react'
import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import OwnerShell from '../../components/OwnerShell.jsx'
import './owner.css'

const when = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Alerts() {
  const { data, error } = useData()
  const [showAll, setShowAll] = useState(false)
  if (error) return <OwnerShell active="Alerts" title="Alerts"><p className="muted">{error}</p></OwnerShell>
  if (!data) return <OwnerShell active="Alerts" title="Alerts"><p className="muted">Loading</p></OwnerShell>

  const { summary } = data
  const oldAlarms = []
  for (const s of data.structures) {
    const label = FAN_POSITIONS[s.name]?.label ?? s.name
    for (const a of s.old_alarms) oldAlarms.push({ label, ...a })
  }
  oldAlarms.sort((a, b) => b.alarm_fired.localeCompare(a.alarm_fired))
  const shown = showAll ? oldAlarms : oldAlarms.slice(0, 15)

  return (
    <OwnerShell active="Alerts" title="Alerts">
      <div className="al-compare">
        <div className="al-col al-old">
          <span className="al-num num">{summary.old_alarms_total}</span>
          <p>Alarms from VILPE's default rule<br /><span className="faint">RH above 90% for 24h, guidebook p.25</span></p>
        </div>
        <div className="al-col al-smart">
          <span className="al-num num">{summary.smart_alerts_total}</span>
          <p>Structura smart alerts<br /><span className="faint">VTT mold model, peak index {summary.highest_mold_index_ours.toFixed(2)} of 2.5</span></p>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Same 16 months of data, same 7 structures. The old rule reacted to humidity alone and fired {summary.old_alarms_total} times
        on structures that were never actually at risk. The smart model tracks real mold growth and only alerts when the index
        crosses Watch (0.1 rise), Warning (1.0) or Critical (2.5), it stayed silent because there was never real risk to flag.
      </p>

      <section className="sp-card">
        <div className="sp-card-head">
          <h2>VILPE's old alarm log</h2>
          <span className="faint num">{showAll ? oldAlarms.length : `${shown.length} of ${oldAlarms.length}`} shown</span>
        </div>
        <table className="al-table">
          <thead>
            <tr><th>Structure</th><th>Streak start</th><th>Alarm fired</th><th>Streak end</th><th className="r">Days humid</th><th className="r">Peak RH</th></tr>
          </thead>
          <tbody>
            {shown.map((a, i) => (
              <tr key={i}>
                <td>{a.label}</td>
                <td className="num">{when(a.streak_start)}</td>
                <td className="num">{when(a.alarm_fired)}</td>
                <td className="num">{when(a.streak_end)}</td>
                <td className="r num">{a.days_humid.toFixed(1)}</td>
                <td className="r num">{a.max_RH.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showAll && oldAlarms.length > 15 && (
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setShowAll(true)}>Show all {oldAlarms.length}</button>
        )}
      </section>

      <section className="sp-card" style={{ marginTop: 16 }}>
        <h2>Structura smart alerts</h2>
        <p className="muted">
          No smart alerts have fired. Across all 7 structures and 16 months, the VTT mold index never exceeded{' '}
          {summary.highest_mold_index_ours.toFixed(2)}, well below where mold even starts to grow (1.0), let alone
          VILPE's own alarm threshold of 2.5. That is the point: when there is real risk, this is where it will show up.
        </p>
      </section>
    </OwnerShell>
  )
}
