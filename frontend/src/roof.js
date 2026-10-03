// Roof outline and fan positions, traced from VILPE's site layout drawing (docs/site_layout_53_y9hB2qv9TM.pdf).
// Fan positions come from where each control unit's serial number is printed on that drawing.
export const ROOF_VIEWBOX = '0 0 580 235'

export const ROOF_SHAPES = {
  lowRoof: { x: 8, y: 98, w: 151, h: 94, label: 'Low roof' },
  flatRoof: { x: 146, y: 11, w: 217, h: 181, label: 'Flat roof' },
  greenRoof: { points: '363,11 563,109 563,170 518,218 363,192', label: 'Green roof' },
}

export const FAN_POSITIONS = {
  'Hallin alapohja': { x: 328, y: 22, serial: 'N112711X79B', label: 'Crawl space' },
  'Katto 1': { x: 188, y: 36, serial: 'N112741ZDLY', label: 'Roof 1' },
  'Katto 2': { x: 328, y: 52, serial: 'N112562K4C8', label: 'Roof 2' },
  'Katto 3': { x: 174, y: 142, serial: 'N11251233JN', label: 'Roof 3' },
  'Katto 4': { x: 328, y: 161, serial: 'N1104957TCM', label: 'Roof 4' },
  'Viherkatto 1': { x: 439, y: 85, serial: 'N1109203B9X', label: 'Green roof 1' },
  'Viherkatto 2': { x: 401, y: 152, serial: 'N112560ZEBX', label: 'Green roof 2' },
}
