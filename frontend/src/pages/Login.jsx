import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, monthYear } from '../data.jsx'
import RoofSketch from '../components/RoofSketch.jsx'

const ROLES = [
  { id: 'owner', title: 'Property owner', sub: 'See your buildings, reports and certificates', email: 'owner@demo.structura', color: 'var(--moss)' },
  { id: 'insurer', title: 'Insurer', sub: 'Check which buildings qualify for better terms', email: 'insurer@demo.structura', color: 'var(--slate)' },
  { id: 'service', title: 'VILPE service', sub: 'Find and fix faults across all sites', email: 'service@demo.structura', color: 'var(--amber)' },
]

export default function Login() {
  const { data, error, setRole } = useData()
  const [picked, setPicked] = useState('owner')
  const navigate = useNavigate()
  const role = ROLES.find(r => r.id === picked)

  const signIn = (e) => {
    e.preventDefault()
    setRole(picked)
    navigate(`/${picked}`)
  }

  return (
    <div className="login">
      <aside className="login-art">
        <div>
          <p className="faint" style={{ color: '#9fb0ad' }}>VILPE Express Store, Vantaa</p>
          <h1>Every roof proves it is dry, every day.</h1>
        </div>
        <RoofSketch />
        <p style={{ color: '#9fb0ad', maxWidth: '46ch' }}>
          {data
            ? `${data.building.readings.toLocaleString('en')} unique readings from ${data.summary.structures} Sense fans, ${monthYear(data.building.period.from)} to ${monthYear(data.building.period.to)}.`
            : 'Loading building data'}
        </p>
      </aside>

      <main className="login-form">
        <form className="login-card" onSubmit={signIn}>
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
              <path d="M3 15 L14 5 L25 15" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M7 15 V24 H21 V15" fill="none" stroke="var(--slate)" strokeWidth="2.2" />
              <circle cx="14" cy="18.5" r="2.2" fill="var(--moss)" />
            </svg>
            <h2>VILPE Structura</h2>
          </div>
          <p className="muted">Sign in to see how your structures are doing.</p>

          <div className="roles" role="group" aria-label="Choose a demo account">
            {ROLES.map(r => (
              <button type="button" key={r.id} className="role" aria-pressed={picked === r.id} onClick={() => setPicked(r.id)}>
                <span className="role-dot" style={{ background: r.color }} />
                <span><strong>{r.title}</strong><span>{r.sub}</span></span>
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={role.email} readOnly />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value="demo-password" readOnly />
          </div>

          <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} type="submit">Sign in</button>
          <button className="btn btn-block" style={{ marginTop: 8 }} type="button" onClick={() => navigate('/story')}>Watch the story</button>

          {error && <p style={{ color: 'var(--brick)', marginTop: 12 }}>{error}. Run python engine\step_f_export.py first.</p>}
          <p className="faint" style={{ marginTop: 16, textAlign: 'center' }}>Demo accounts. In production this uses VILPE Sense cloud accounts.</p>
        </form>
      </main>
    </div>
  )
}
