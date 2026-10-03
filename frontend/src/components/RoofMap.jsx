import { ROOF_VIEWBOX, ROOF_SHAPES, FAN_POSITIONS } from '../roof.js'
import { useEffect, useState } from 'react'
import { GRADE } from '../data.jsx'

// On phones we zoom into the part of the roof that has fans, so labels stay readable.
function useIsPhone() {
  const query = '(max-width: 600px)'
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

// Interactive roof map: each fan is coloured by its grade. Tap a fan to select it.
export default function RoofMap({ structures, selectedId, onSelect }) {
  const { lowRoof, flatRoof, greenRoof } = ROOF_SHAPES
  const phone = useIsPhone()
  return (
    <svg className={`roof-map${phone ? ' is-phone' : ''}`} viewBox={phone ? '132 4 472 220' : ROOF_VIEWBOX} role="img" aria-label="Roof map with each Sense fan coloured by its health score">
      <rect className="rm-outline" x={lowRoof.x} y={lowRoof.y} width={lowRoof.w} height={lowRoof.h} />
      <rect className="rm-outline rm-flat" x={flatRoof.x} y={flatRoof.y} width={flatRoof.w} height={flatRoof.h} />
      <polygon className="rm-outline rm-green" points={greenRoof.points} />
      <text className="rm-zone" x={lowRoof.x + 8} y={lowRoof.y + lowRoof.h - 8}>{lowRoof.label}</text>
      <text className="rm-zone" x={flatRoof.x + 8} y={flatRoof.y + flatRoof.h - 8}>{flatRoof.label}</text>
      <text className="rm-zone" x={470} y={204}>{greenRoof.label}</text>
      {structures.map(s => {
        const pos = FAN_POSITIONS[s.name]
        if (!pos) return null
        const color = GRADE[s.grade]?.color ?? 'var(--line)'
        const scoreText = s.score == null ? '' : s.score.toFixed(0)
        const selected = s.id === selectedId
        const labelLeft = pos.x > 300 && pos.x < 365
        return (
          <g key={s.id} className="rm-fan" onClick={() => onSelect(s.id)} role="button" tabIndex="0"
             aria-label={s.score == null ? `${pos.label}, no data yet` : `${pos.label}, score ${scoreText}, ${s.grade}`}
             onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(s.id)}>
            <circle cx={pos.x} cy={pos.y} r="16" fill="transparent" />
            {selected && <circle cx={pos.x} cy={pos.y} r="14" fill="none" stroke={color} strokeWidth="1.5" />}
            <circle cx={pos.x} cy={pos.y} r={phone ? 10 : 8.5} fill={color} style={{ transition: 'fill 120ms linear' }} />
            <text className="rm-label" x={labelLeft ? pos.x - 14 : pos.x + 14} y={pos.y + 4}
                  textAnchor={labelLeft ? 'end' : 'start'}>
              {pos.label} <tspan className="rm-score">{scoreText}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}