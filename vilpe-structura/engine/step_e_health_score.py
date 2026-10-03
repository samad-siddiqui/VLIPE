"""Step E: Structural Health Score (0 to 100), calculated for every day and every structure.

Needs Step D to have run first (reads engine/output/watchdog_events.csv).

Parts (each looks at the last 30 days):
  Mold risk          40  full points at mold index 0, zero at VILPE's alarm level 2.5
  Time in risk zone  20  share of readings where mold could grow (above critical humidity and above 0 °C)
  Drying performance 20  when outside air held less water than inside, share of readings where the fan was running
  System health      20  15 x equipment uptime (no stopped fan, no silent sensor) + 5 if no placement or swap issue
"""
import pandas as pd
from step_b_old_alarm import load, SHEETS, ROOT
from step_c_mold_index import mold_history, rh_crit

WINDOW = '30D'
GRADES = [(85, 'Certified dry'), (70, 'Good'), (50, 'Attention'), (0, 'At risk')]


def grade(score):
    return next(name for limit, name in GRADES if score >= limit)


def fault_flags(d, ev, s):
    """Mark every reading that falls inside a watchdog event for this structure."""
    equipment = pd.Series(False, index=d.index)
    trust = pd.Series(False, index=d.index)
    for _, e in ev[ev['structure'] == s].iterrows():
        inside = (d.index >= e['start']) & (d.index <= e['end'])
        if e['kind'] == 'Equipment': equipment |= inside
        else: trust |= inside
    return equipment, trust


if __name__ == '__main__':
    ev = pd.read_csv(ROOT / 'engine/output/watchdog_events.csv', parse_dates=['start', 'end'])
    rows = []
    for s in SHEETS:
        d = load(s).set_index('Timestamp')
        T, RH = d['Indoor temp (°C)'], d['Indoor RH (%)']
        d['mold_index'] = mold_history(T, RH, d.index)
        d['risk_zone'] = [(t > 0 and rh >= rh_crit(t)) if pd.notna(t) and pd.notna(rh) else False for t, rh in zip(T, RH)]
        can_dry = d['Outdoor abs. humidity (g/m³)'] < d['Indoor abs. humidity (g/m³)']
        d['dry_chance'] = can_dry
        d['fan_used'] = can_dry & (d['Fan speed (rpm)'] > 0)
        d['equip_fault'], d['trust_issue'] = fault_flags(d, ev, s)

        # rolling 30-day shares, then one value per day
        r = d[['risk_zone', 'dry_chance', 'fan_used', 'equip_fault', 'trust_issue']].astype(float).rolling(WINDOW)
        sums, means = r.sum(), r.mean()
        daily = pd.DataFrame({
            'mold_index': d['mold_index'],
            'risk_share': means['risk_zone'],
            'drying_share': (sums['fan_used'] / sums['dry_chance']).where(sums['dry_chance'] > 0, 1.0),
            'uptime_share': 1 - means['equip_fault'],
            'trust_ok': means['trust_issue'] == 0,
        }).resample('D').last().dropna(subset=['mold_index'])

        daily['pts_mold'] = (40 * (1 - daily['mold_index'] / 2.5)).clip(lower=0)
        daily['pts_risk_zone'] = 20 * (1 - daily['risk_share'])
        daily['pts_drying'] = 20 * daily['drying_share']
        daily['pts_system'] = 15 * daily['uptime_share'] + 5 * daily['trust_ok']
        daily['score'] = daily[['pts_mold', 'pts_risk_zone', 'pts_drying', 'pts_system']].sum(axis=1).round(1)
        daily['grade'] = daily['score'].map(grade)
        daily.insert(0, 'structure', s)
        rows.append(daily.round(3))

    out = pd.concat(rows).reset_index().rename(columns={'Timestamp': 'date'})
    out.to_csv(ROOT / 'engine/output/health_score_daily.csv', index=False)

    latest = out.groupby('structure').tail(1)[['structure', 'score', 'grade', 'pts_mold', 'pts_risk_zone', 'pts_drying', 'pts_system']]
    print('Latest score per structure:'); print(latest.round(1).to_string(index=False)); print()
    print('Lowest score per structure over 16 months:')
    low = out.loc[out.groupby('structure')['score'].idxmin(), ['structure', 'date', 'score', 'grade']]
    print(low.to_string(index=False))