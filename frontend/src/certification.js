// Rules for the Dry Structure Certificate. Shared by the owner, insurer and passport screens.
//
// A structure is certified dry when, over the last 30 days:
//   1. its health score never dropped below 85
//   2. its mold index stayed below 1.0 (no growth started)
//   3. it has no open equipment fault (stopped fan, silent sensor)
export const WINDOW_DAYS = 30
export const MIN_SCORE = 85
export const MAX_MOLD = 1.0

const PART_INFO = {
  mold: { label: 'Mold risk', max: 40, hint: 'Mold index is rising. Inspect the structure.' },
  risk_zone: { label: 'Time in risk zone', max: 20, hint: 'Long humid spells. Check that drying keeps up after the wet season.' },
  drying: { label: 'Drying performance', max: 20, hint: 'The fan did not run when outside air could dry the structure. Check the fan.' },
  system: { label: 'System health', max: 20, hint: 'Equipment or sensor issue found by the watchdog. Book a VILPE service visit.' },
}

export function certify(s) {
  const recent = s.daily.slice(-WINDOW_DAYS)
  const from = recent[0].date
  const minScore = Math.min(...recent.map(r => r.score))
  const maxMold = Math.max(...recent.map(r => r.mold_index))
  const openFaults = [...new Set(s.watchdog.filter(w => w.kind === 'Equipment' && w.end.slice(0, 10) >= from).map(w => w.check))]
  const certified = minScore >= MIN_SCORE && maxMold < MAX_MOLD && openFaults.length === 0

  // Where the points were lost, biggest first, so the owner knows what to fix
  const parts = s.latest.parts
  const gaps = Object.entries(PART_INFO)
    .map(([key, p]) => ({ key, label: p.label, lost: p.max - parts[key], hint: p.hint }))
    .filter(g => g.lost >= 1)
    .sort((a, b) => b.lost - a.lost)

  return { certified, minScore, maxMold, openFaults, gaps, from, to: recent[recent.length - 1].date }
}

// Short, stable certificate number from the building and date, e.g. VS-2026-09-11-4F2A
export function certificateId(buildingId, date) {
  let h = 0
  for (const c of buildingId + date) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `VS-${date}-${h.toString(16).toUpperCase().slice(-4).padStart(4, '0')}`
}

// Link that a QR code points to: the public passport page of the building
export function passportUrl(buildingId, certId) {
  const base = window.location.href.split('#')[0]
  return `${base}#/passport/${buildingId}?cert=${certId}`
}