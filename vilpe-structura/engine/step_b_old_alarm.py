"""Step B: replay VILPE's recommended RH alarm on the cleaned Vantaa data.
Rule (VILPE Sense guidebook, p.25): indoor RH above 90 % for 12 measurements in a row (about 24 h).
"""
import pandas as pd
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

SRC = ROOT / 'data/clean/VILPE_Vantaa_cleaned.xlsx'
RH_LIMIT = 90      # % (guidebook default, indoor sensor upper limit)
DELAY = 12         # measurements (guidebook default alarm delay)
SHEETS = ['Katto 1', 'Katto 2', 'Katto 3', 'Katto 4', 'Viherkatto 1', 'Viherkatto 2', 'Hallin alapohja']

def load(sheet):
    d = pd.read_excel(SRC, sheet_name=sheet)
    d = d[d['Duplicate of previous row'] != 'YES']          # skip repeated rows
    return d.sort_values('Timestamp').reset_index(drop=True)

def replay_alarm(d):
    """Return one row per alarm: when the humid streak started, when the alarm fired, when it ended."""
    above = d['Indoor RH (%)'] > RH_LIMIT                    # missing value counts as not above
    streak_id = (above != above.shift()).cumsum()
    events = []
    for _, g in d[above].groupby(streak_id[above]):
        if len(g) >= DELAY:
            events.append({'streak_start': g['Timestamp'].iloc[0],
                           'alarm_fired': g['Timestamp'].iloc[DELAY - 1],
                           'streak_end': g['Timestamp'].iloc[-1],
                           'days_humid': round((g['Timestamp'].iloc[-1] - g['Timestamp'].iloc[0]).total_seconds() / 86400, 1),
                           'max_RH': g['Indoor RH (%)'].max()})
    return pd.DataFrame(events)

if __name__ == '__main__':
    meta = pd.read_excel(SRC, sheet_name='Structures').set_index('Sheet name (original)')
    all_events, summary = [], []
    for s in SHEETS:
        ev = replay_alarm(load(s)); ev.insert(0, 'structure', s); all_events.append(ev)
        summary.append({'structure': s, 'old_alarms': len(ev),
                        'days_in_alarm_state': round(ev['days_humid'].sum()),
                        'latest_mold_index': meta.loc[s, 'Latest mold index']})
    events = pd.concat(all_events, ignore_index=True)
    summary = pd.DataFrame(summary)
    events.to_csv(ROOT / 'engine/output/old_alarm_events.csv', index=False)
    print(summary.to_string(index=False))
    print('TOTAL old alarms:', summary['old_alarms'].sum())
    print(events.groupby(events['alarm_fired'].dt.to_period('M')).size().to_string())
