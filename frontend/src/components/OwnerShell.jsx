import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data.jsx'
import { Grid, Sensor, AlertTri, FileText, BuildingIcon, Gear, Bell, Help, ChevronDown, User } from './Icons.jsx'

const NAV = [
  { icon: Grid, label: 'Dashboard', to: '/owner' },
  { icon: Sensor, label: 'Sensors', to: '/owner/sensors' },
  { icon: AlertTri, label: 'Alerts', to: '/owner/alerts' },
  { icon: FileText, label: 'Reports', to: '/owner/reports' },
  { icon: BuildingIcon, label: 'Buildings', to: '/owner/certificate' },
  { icon: Gear, label: 'Settings', to: '/owner/settings' },
]

// Shared left-sidebar + top-bar chrome for every page under the owner role, so Dashboard, Sensors, Alerts,
// Reports and Settings all look like one product instead of five one-off pages.
export default function OwnerShell({ active, title, children }) {
  const { data, setRole } = useData()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="sp-shell">
      <aside className="sp-sidebar">
        <p className="sp-brand">Sense Passport</p>
        <nav>
          {NAV.map(n => (
            <button key={n.label} className={n.label === active ? 'active' : ''} onClick={() => navigate(n.to)}>
              <n.icon /> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="sp-main">
        <header className="sp-topbar">
          <h1>{title}</h1>
          <div className="sp-top-actions">
            <button className="sp-icon-btn" aria-label="Help"><Help /></button>
            <button className="sp-icon-btn" aria-label="Notifications"><Bell /><i className="sp-badge">1</i></button>
            <div className="sp-user-wrap">
              <button className="sp-user" onClick={() => setMenuOpen(o => !o)}>
                <span className="sp-user-avatar"><User /></span> {data ? data.building.name.split(' ')[0] : 'Owner'} <ChevronDown />
              </button>
              {menuOpen && (
                <div className="sp-menu" role="menu">
                  <button onClick={() => navigate('/story')}>Watch the story</button>
                  <button onClick={() => { setRole(null); navigate('/login') }}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
