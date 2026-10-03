// Small line-icon set shared by the Service, Owner and Insurer screens, kept in one place since the same
// marks (check, wrench, bell, grid...) repeat across all three mockup-matched layouts.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Check = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M5 13l4 4L19 7" /></svg>
export const Wrench = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z" /></svg>
export const Droplet = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 3C9 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-7-6-11z" /></svg>
export const User = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1.2-4 4-5.6 7-5.6S17.8 16 19 20" /></svg>
export const Bell = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
export const Help = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1.1-1.3 2" /><circle cx="12" cy="17" r="0.3" fill="currentColor" /></svg>
export const Grid = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></svg>
export const Sensor = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none" /><path d="M8.5 14a5 5 0 0 1 7 0M5.5 11a9 9 0 0 1 13 0" /></svg>
export const AlertTri = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 4 21 19H3L12 4z" /><path d="M12 10v4" /><circle cx="12" cy="16.6" r="0.3" fill="currentColor" /></svg>
export const FileText = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 13h5M9.5 16.5h5" /></svg>
export const BuildingIcon = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" /></svg>
export const Gear = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.3M12 18.7V21M21 12h-2.3M5.3 12H3M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></svg>
export const Search = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.3-4.3" /></svg>
export const Shield = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>
export const Briefcase = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="8" width="18" height="11" rx="1.5" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
export const Paperplane = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M21 3 3 10.5l7 2.5 2.5 7z" /></svg>
export const ChevronDown = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
export const Battery = (p) => <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="8" width="15" height="8" rx="1.5" /><path d="M20 10.5v3" /><path d="M6 11v2" /></svg>
