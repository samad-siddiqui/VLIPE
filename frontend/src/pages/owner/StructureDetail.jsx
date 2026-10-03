import { Link, useParams } from 'react-router-dom'
import { useData, GRADE } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import AppShell from '../../components/AppShell.jsx'
import LineChart from '../../components/LineChart.jsx'
import './detail.css'

const when = iso => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function ChartCard({ title, note, children }) {
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      {note && <p className="muted chart-note">{note}</p>}
      {children}
    </section>
  )
}

export default function StructureDetail() {
  const { structureId } = useParams()
  const { data, error } = useData()

  if (error) return <AppShell><p className="muted">{error}</p></AppShell>
  if (!data) return <AppShell><p className="muted">Loading building data</p></AppShell>

  const s = data.structures.find(x => x.id === structureId)
  if (!s) {
    return (
      <AppShell>
        <p>This structure doesn't exist.</p>
        <Link className="btn" to="/owner" style={{ marginTop: 12 }}>Back to all structures</Link>
      </AppShell>
    )
  }

  const label = FAN_POSITIONS[s.name]?.label ?? s.name
  const g = GRADE[s.latest.grade]
  const dates = s.daily.map(r => r.date)
  const alarmDays = s.old_alarms.map(a => a.alarm_fired.slice(0, 10))
  const peakMold = Math.max(...s.daily.map(r => r.mold_index))
  // Building outdoor temperature per day = median of all 7 outdoor sensors (one sensor alone can be wrong)
  const temps = {}
  for (const x of data.structures) for (const r of x.daily) if (r.outdoor_temp != null) (temps[r.date] ??= []).push(r.outdoor_temp)
  const median = a => { const b = [...a].sort((p, q) => p - q); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }
  const fanStoppedWarm = s.daily.filter(r => r.fan_rpm === 0 && temps[r.date] && median(temps[r.date]) > 0).length

  // Group watchdog events by check, so 9 short fan stops read as one finding
  const groups = Object.values(s.watchdog.reduce((acc, w) => {
    const g = acc[w.check] ?? { check: w.check, kind: w.kind, events: [], days: 0 }
    g.events.push(w); g.days += w.days
    acc[w.check] = g
    return acc
  }, {}))

  return (
    <AppShell>
      <Link className="back" to="/owner">All structures</Link>

      <header className="detail-head">
        <div>
          <p className="faint">{s.type}. Control unit {FAN_POSITIONS[s.name]?.serial ?? s.serial}. {s.material}.</p>
          <h1>{label}</h1>
        </div>
        <div className="detail-score">
          <span className="badge" style={{ background: g?.soft, color: g?.color }}>{s.latest.grade}</span>
          <span className="num big">{s.latest.score.toFixed(1)}<small> / 100</small></span>
        </div>
      </header>

      <div className="detail-facts">
        <div><span className="faint">Old alarms in 16 months</span><strong className="num">{s.old_alarms.length}</strong></div>
        <div><span className="faint">Highest mold index</span><strong className="num">{peakMold.toFixed(2)}</strong></div>
        <div><span className="faint">Equipment uptime</span><strong className="num">{s.equipment_uptime_pct}%</strong></div>
        <div><span className="faint">Days fan stopped above 0 °C outside</span><strong className="num">{fanStoppedWarm}</strong></div>
      </div>

      <div className="charts">
        <ChartCard title="Health score" note="Daily score. Above the green line counts as certified dry.">
          <LineChart label="Health score over time" dates={dates} values={s.daily.map(r => r.score)} min={0} max={100}
            refs={[{ value: 85, label: 'Certified dry 85', color: 'var(--moss)' }, { value: 50, label: 'At risk below 50', color: 'var(--brick)' }]} />
        </ChartCard>

        <ChartCard title="Mold index" note="Our engine, using the VTT mold growth model. VILPE's alarm level is 2.5.">
          <LineChart label="Mold index over time" dates={dates} values={s.daily.map(r => r.mold_index)} min={0} max={3}
            color="var(--moss)"
            refs={[{ value: 2.5, label: 'VILPE alarm 2.5', color: 'var(--brick)' }, { value: 1, label: 'First growth 1.0', color: 'var(--amber)' }]} />
        </ChartCard>

        <ChartCard title="Humidity inside the structure" note={`Daily average. Red dots are the ${s.old_alarms.length} days the old alarm fired (above 90% for 24 hours).`}>
          <LineChart label="Indoor humidity over time" dates={dates} values={s.daily.map(r => r.indoor_rh)} min={40} max={100} unit="%"
            marks={alarmDays}
            refs={[{ value: 90, label: 'Old alarm 90%', color: 'var(--brick)' }]} />
        </ChartCard>

        <ChartCard title="Fan speed" note="Daily average. With default settings the fan runs whenever it is warmer than -7 °C outside.">
          <LineChart label="Fan speed over time" dates={dates} values={s.daily.map(r => r.fan_rpm)} min={0} color="var(--ink-2)" unit="" />
        </ChartCard>
      </div>

      <section className="chart-card">
        <h2>What the watchdog found</h2>
        {groups.length === 0 ? <p className="muted">No issues.</p> : (
          <ul className="events">
            {groups.map(g => (
              <li key={g.check}>
                <details className="event-group">
                  <summary>
                    <div className="event-head">
                      <strong>{g.check}</strong>
                      <span className={`kind kind-${g.kind === 'Equipment' ? 'eq' : 'trust'}`}>{g.kind}</span>
                    </div>
                    <p className="muted">{g.events.reduce((a, b) => (b.days > a.days ? b : a)).evidence}</p>
                    <p className="faint num">
                      {g.events.length === 1 ? 'Once' : `${g.events.length} times`}, {Math.round(g.days)} days in total,{' '}
                      {when(g.events[0].start)} to {when(g.events[g.events.length - 1].end)}.
                    </p>
                  </summary>
                  <ul className="event-sub">
                    {g.events.map((w, i) => (
                      <li key={i} className="num">{when(w.start)} to {when(w.end)}, {Math.round(w.days)} days. {w.evidence}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}