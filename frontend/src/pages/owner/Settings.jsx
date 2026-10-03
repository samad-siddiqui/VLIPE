import { useData } from '../../data.jsx'
import { MIN_SCORE, MAX_MOLD, WINDOW_DAYS } from '../../certification.js'
import OwnerShell from '../../components/OwnerShell.jsx'
import './owner.css'

export default function Settings() {
  const { data, error } = useData()
  if (error) return <OwnerShell active="Settings" title="Settings"><p className="muted">{error}</p></OwnerShell>
  if (!data) return <OwnerShell active="Settings" title="Settings"><p className="muted">Loading</p></OwnerShell>

  const { rules } = data

  return (
    <OwnerShell active="Settings" title="Settings">
      <p className="muted" style={{ marginBottom: 20 }}>
        These are the real thresholds the engine runs on, read directly from the data export, not a separate
        settings store. In a production build these would be editable per building; here they are shown for
        transparency.
      </p>

      <section className="sp-card" style={{ marginBottom: 16 }}>
        <h2>Account</h2>
        <dl className="set-dl">
          <div><dt>Role</dt><dd>Property owner</dd></div>
          <div><dt>Building</dt><dd>{data.building.name}, {data.building.city}</dd></div>
          <div><dt>Sign-in</dt><dd>Demo account, in production this uses VILPE Sense cloud accounts</dd></div>
        </dl>
      </section>

      <section className="sp-card" style={{ marginBottom: 16 }}>
        <h2>Smart alert levels</h2>
        <dl className="set-dl">
          <div><dt>Watch</dt><dd>{rules.smart_alert_levels.Watch}</dd></div>
          <div><dt>Warning</dt><dd>{rules.smart_alert_levels.Warning}</dd></div>
          <div><dt>Critical</dt><dd>{rules.smart_alert_levels.Critical}</dd></div>
        </dl>
        <p className="faint" style={{ marginTop: 10 }}>Mold model: {rules.mold_model}</p>
      </section>

      <section className="sp-card" style={{ marginBottom: 16 }}>
        <h2>Watchdog checks</h2>
        <dl className="set-dl">
          {Object.entries(rules.watchdog).map(([check, desc]) => (
            <div key={check}><dt>{check}</dt><dd>{desc}</dd></div>
          ))}
        </dl>
      </section>

      <section className="sp-card">
        <h2>Certification rules</h2>
        <dl className="set-dl">
          <div><dt>Minimum score</dt><dd>{MIN_SCORE} or higher, every day for {WINDOW_DAYS} days</dd></div>
          <div><dt>Maximum mold index</dt><dd>below {MAX_MOLD.toFixed(1)} the whole window</dd></div>
          <div><dt>Equipment</dt><dd>no open equipment fault</dd></div>
          <div><dt>Score weights</dt><dd>mold risk {rules.score.mold}, time in risk zone {rules.score.risk_zone}, drying {rules.score.drying}, system {rules.score.system}</dd></div>
        </dl>
      </section>
    </OwnerShell>
  )
}
