import { useNavigate } from 'react-router-dom'
import { useData } from '../data.jsx'

// Temporary page so every route works while we build the real screens one by one.
export default function Placeholder({ title }) {
  const { data, setRole } = useData()
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="topbar">
        <h1>{title}</h1>
        <button className="btn" onClick={() => { setRole(null); navigate('/login') }}>Sign out</button>
      </div>
      <div className="card">
        <p>This screen is built in a later step.</p>
        {data && (
          <p className="muted num" style={{ marginTop: 8 }}>
            Data check: {data.building.name}, {data.structures.length} structures, {data.summary.old_alarms_total} old alarms,{' '}
            {data.summary.smart_alerts_total} Structura alerts.
          </p>
        )}
      </div>
    </div>
  )
}
