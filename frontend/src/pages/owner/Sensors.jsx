import { useData } from '../../data.jsx'
import { FAN_POSITIONS } from '../../roof.js'
import OwnerShell from '../../components/OwnerShell.jsx'
import { Sensor, AlertTri } from '../../components/Icons.jsx'
import './owner.css'

export default function Sensors() {
  const { data, error } = useData()
  if (error) return <OwnerShell active="Sensors" title="Sensors"><p className="muted">{error}</p></OwnerShell>
  if (!data) return <OwnerShell active="Sensors" title="Sensors"><p className="muted">Loading</p></OwnerShell>

  return (
    <OwnerShell active="Sensors" title="Sensors">
      <p className="muted" style={{ marginBottom: 16 }}>
        One VILPE Sense control unit per structure, {data.building.readings.toLocaleString('en')} readings total. Live snapshot is the most recent reading on file.
      </p>
      <div className="sen-grid">
        {data.structures.map(s => {
          const pos = FAN_POSITIONS[s.name]
          const last = s.daily[s.daily.length - 1]
          const trust = s.watchdog.filter(w => w.kind === 'Data trust' && w.end.slice(0, 10) >= s.daily[s.daily.length - 1].date)
          return (
            <article key={s.id} className="sen-card">
              <div className="sen-head">
                <span className="sen-icon"><Sensor /></span>
                <div>
                  <strong>{pos?.label ?? s.name}</strong>
                  <p className="faint">{s.type} &middot; {s.material}</p>
                </div>
              </div>
              <p className="faint num sen-serial">Control unit {pos?.serial ?? s.serial}</p>

              <div className="sen-live">
                <div><span className="faint">Indoor</span><strong className="num">{last.indoor_temp != null ? `${last.indoor_temp.toFixed(1)}°C` : '—'}</strong><small className="num">{last.indoor_rh != null ? `${last.indoor_rh.toFixed(0)}% RH` : ''}</small></div>
                <div><span className="faint">Outdoor</span><strong className="num">{last.outdoor_temp != null ? `${last.outdoor_temp.toFixed(1)}°C` : '—'}</strong><small className="num">{last.outdoor_rh != null ? `${last.outdoor_rh.toFixed(0)}% RH` : ''}</small></div>
                <div><span className="faint">Fan</span><strong className="num">{last.fan_rpm != null ? last.fan_rpm.toFixed(0) : '0'}</strong><small>rpm</small></div>
              </div>

              <div className="sen-status">
                <div className="sen-status-row">
                  <span className="faint">Equipment uptime</span>
                  <strong className="num" style={{ color: s.equipment_uptime_pct < 90 ? 'var(--brick)' : 'var(--ink)' }}>{s.equipment_uptime_pct}%</strong>
                </div>
                {trust.map((w, i) => (
                  <p key={i} className="sen-flag"><AlertTri /> {w.check}</p>
                ))}
                {trust.length === 0 && <p className="faint">Placement and readings look trustworthy</p>}
              </div>
            </article>
          )
        })}
      </div>
    </OwnerShell>
  )
}
