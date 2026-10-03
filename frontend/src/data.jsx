import { createContext, useContext, useEffect, useState } from 'react'

// One place that loads data.json (made by engine/step_f_export.py) and remembers who is signed in.
const DataContext = createContext(null)

const ROLE_KEY = 'structura-role'

function readRole() {
  try { return sessionStorage.getItem(ROLE_KEY) } catch { return null }
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [role, setRoleState] = useState(readRole)

  useEffect(() => {
    fetch('data.json')
      .then(r => { if (!r.ok) throw new Error(`data.json not found (${r.status})`); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  const setRole = (r) => {
    setRoleState(r)
    try { r ? sessionStorage.setItem(ROLE_KEY, r) : sessionStorage.removeItem(ROLE_KEY) } catch { /* ignore */ }
  }

  return <DataContext.Provider value={{ data, error, role, setRole }}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}

// Grade colours, shared by every screen
export const GRADE = {
  'Certified dry': { color: 'var(--moss)', soft: 'var(--moss-soft)' },
  'Good': { color: 'var(--slate)', soft: 'var(--slate-soft)' },
  'Attention': { color: 'var(--amber)', soft: 'var(--amber-soft)' },
  'At risk': { color: 'var(--brick)', soft: 'var(--brick-soft)' },
}

// '2025-05-13' -> 'May 2025'
export function monthYear(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}
