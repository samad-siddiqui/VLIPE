import { NavLink, useNavigate } from 'react-router-dom'
import { useData } from '../data.jsx'

const ROLE_NAMES = { owner: 'Property owner', insurer: 'Insurer', service: 'VILPE service' }

// Menu items per role
const NAV = {
  owner: [{ to: '/owner', label: 'Roof map', end: true }, { to: '/owner/certificate', label: 'Certificate' }],
  insurer: [{ to: '/insurer', label: 'Buildings', end: true }],
  service: [{ to: '/service', label: 'Fleet watchdog', end: true }],
}

// Top bar shared by all signed-in screens.
export default function AppShell({ children }) {
  const { data, role, setRole } = useData()
  const navigate = useNavigate()
  return (
    <div className="shell">
      <header className="shell-bar">
        <div className="shell-brand">
          <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
            <path d="M3 15 L14 5 L25 15" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M7 15 V24 H21 V15" fill="none" stroke="var(--slate)" strokeWidth="2.2" />
            <circle cx="14" cy="18.5" r="2.2" fill="var(--moss)" />
          </svg>
          <div>
            <strong>VILPE Structura</strong>
            <span>{ROLE_NAMES[role]}{data ? `, ${data.building.name}` : ''}</span>
          </div>
        </div>
        <div className="shell-actions">
          <button className="btn" onClick={() => navigate('/story')}>Story</button>
          <button className="btn" onClick={() => { setRole(null); navigate('/login') }}>Sign out</button>
        </div>
      </header>
      {NAV[role] && (
        <nav className="shell-nav" aria-label="Sections">
          {NAV[role].map(n => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
        </nav>
      )}
      <main className="page">{children}</main>
    </div>
  )
}