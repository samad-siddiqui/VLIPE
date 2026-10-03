import { useEffect, useMemo, useRef, useState } from 'react'
import { FAN_POSITIONS } from './roof.js'

const DAYS_PER_SECOND = 25

// All dates in the data, plus fast lookup of each structure's daily row by date.
function buildIndex(data) {
  const all = new Set()
  const byStructure = {}
  for (const s of data.structures) {
    const m = new Map()
    for (const row of s.daily) { m.set(row.date, row); all.add(row.date) }
    byStructure[s.id] = m
  }
  return { dates: [...all].sort(), byStructure }
}

// What one structure looked like on a given date.
export function structureOn(s, row, date) {
  const found = s.watchdog.filter(w => w.start.slice(0, 10) <= date)
  const issues = {}
  for (const w of found) {
    const start = new Date(w.start.slice(0, 10))
    const end = new Date(Math.min(new Date(w.end.slice(0, 10)), new Date(date)))
    const days = Math.max(0, (end - start) / 86400000)
    const ongoing = w.end.slice(0, 10) >= date
    const i = issues[w.check] ?? { check: w.check, kind: w.kind, days: 0, ongoing: false }
    i.days += days
    i.ongoing = i.ongoing || ongoing
    issues[w.check] = i
  }
  return {
    id: s.id, name: s.name, label: FAN_POSITIONS[s.name]?.label ?? s.name, type: s.type,
    score: row ? row.score : null,
    grade: row ? row.grade : null,
    parts: row ? { mold: row.pts_mold, risk_zone: row.pts_risk_zone, drying: row.pts_drying, system: row.pts_system } : null,
    moldOurs: row ? row.mold_index : null,
    moldVilpe: s.latest.mold_index_vilpe,
    oldAlarms: row ? row.old_alarms_to_date : 0,
    issues: Object.values(issues).map(i => ({ ...i, days: Math.round(i.days) })),
  }
}

// Replay state: which day we are on, and play / pause.
export function useReplay(data) {
  const index = useMemo(() => (data ? buildIndex(data) : { dates: [], byStructure: {} }), [data])
  const last = index.dates.length - 1
  const [day, setDay] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)

  useEffect(() => { if (last >= 0 && day === -1) setDay(last) }, [last, day])

  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      setDay(d => {
        if (d >= last) { setPlaying(false); return last }
        return d + 1
      })
    }, 1000 / DAYS_PER_SECOND)
    return () => clearInterval(timer.current)
  }, [playing, last])

  const toggle = () => {
    if (!playing && day >= last) setDay(0)
    setPlaying(p => !p)
  }

  const date = index.dates[Math.max(day, 0)] ?? null
  const structures = useMemo(() => {
    if (!data || !date) return []
    return data.structures.map(s => structureOn(s, index.byStructure[s.id].get(date), date))
  }, [data, date, index])

  return {
    date, day: Math.max(day, 0), last, playing, toggle, structures,
    isToday: day >= last,
    setDay: d => { setPlaying(false); setDay(d) },
  }
}