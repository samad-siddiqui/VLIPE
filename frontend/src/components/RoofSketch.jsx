import { ROOF_VIEWBOX, ROOF_SHAPES, FAN_POSITIONS } from '../roof.js'

// Simple blueprint-style roof drawing. Fans are plain dots here; the roof map screen colours them by score.
export default function RoofSketch({ showLabels = true }) {
  const { lowRoof, flatRoof, greenRoof } = ROOF_SHAPES
  return (
    <svg className="roof-sketch" viewBox={ROOF_VIEWBOX} role="img" aria-label="Roof plan of the VILPE Express Store with seven Sense fans">
      <rect className="outline" x={lowRoof.x} y={lowRoof.y} width={lowRoof.w} height={lowRoof.h} />
      <rect className="outline" x={flatRoof.x} y={flatRoof.y} width={flatRoof.w} height={flatRoof.h} />
      <polygon className="outline green" points={greenRoof.points} />
      {Object.entries(FAN_POSITIONS).map(([key, f]) => (
        <g key={key}>
          <circle className="fan" cx={f.x} cy={f.y} r="4" />
          {showLabels && <text className="label" x={f.x + 9} y={f.y + 4}>{f.label}</text>}
        </g>
      ))}
    </svg>
  )
}
