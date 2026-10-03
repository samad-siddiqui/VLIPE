"""Step F: pack all results into one data.json for the app.

Shaped like a real API response (building -> structures -> daily, alerts, watchdog), so the app could later
read a live Structura API instead of this file without being rebuilt.
Needs Steps A to E to have run first.
Writes: engine/output/data.json and app/public/data.json
"""
import json, math
from datetime import datetime
import pandas as pd
from step_b_old_alarm import load, SHEETS, SRC, ROOT, RH_LIMIT, DELAY
from step_c_mold_index import ENGINE_CLASS, WARNING, CRITICAL
from step_d_watchdog import STOP_TEMP, FAN_HOURS, SILENT_HOURS, SUN_DEGREES

OUT = ROOT / 'engine/output'
TYPES = {'Katto': 'Flat roof', 'Viherkatto': 'Green roof', 'Hallin alapohja': 'Crawl space'}


def slug(name):
    return name.lower().replace(' ', '-')


def kind_of(name):
    return next(v for k, v in TYPES.items() if name.startswith(k))


def clean(obj):
    """Make values JSON-safe: NaN -> null, timestamps -> ISO text, numpy numbers -> plain numbers."""
    if isinstance(obj, dict): return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, list): return [clean(v) for v in obj]
    if isinstance(obj, (pd.Timestamp, datetime)): return obj.isoformat()
    if hasattr(obj, 'item'): obj = obj.item()
    if isinstance(obj, float) and math.isnan(obj): return None
    return obj


def records(df, cols, date_cols=()):
    df = df[cols].copy()
    for c in date_cols: df[c] = pd.to_datetime(df[c]).dt.strftime('%Y-%m-%d %H:%M')
    return df.to_dict('records')


if __name__ == '__main__':
    meta = pd.read_excel(SRC, sheet_name='Structures').set_index('Sheet name (original)')
    scores = pd.read_csv(OUT / 'health_score_daily.csv', parse_dates=['date'])
    old = pd.read_csv(OUT / 'old_alarm_events.csv', parse_dates=['streak_start', 'alarm_fired', 'streak_end'])
    smart = pd.read_csv(OUT / 'smart_alert_events.csv')
    wd = pd.read_csv(OUT / 'watchdog_events.csv', parse_dates=['start', 'end'])
    uptime = pd.read_csv(OUT / 'watchdog_uptime.csv').set_index('structure')
    cmp = pd.read_csv(OUT / 'mold_index_comparison.csv').set_index('structure')
    scenario = pd.read_csv(OUT / 'scenario_crawlspace_swapped_alerts.csv')

    structures = []
    for s in SHEETS:
        # daily sensor averages for charts
        d = load(s).set_index('Timestamp')
        sensors = d[['Fan speed (rpm)', 'Indoor temp (°C)', 'Indoor RH (%)', 'Outdoor temp (°C)', 'Outdoor RH (%)']] \
            .resample('D').mean().round(1)
        sensors.columns = ['fan_rpm', 'indoor_temp', 'indoor_rh', 'outdoor_temp', 'outdoor_rh']
        sc = scores[scores['structure'] == s].set_index('date')
        daily = sc[['score', 'grade', 'mold_index', 'pts_mold', 'pts_risk_zone', 'pts_drying', 'pts_system']] \
            .join(sensors, how='left')
        o = old[old['structure'] == s]
        fired = o['alarm_fired'].dt.normalize().value_counts()
        daily['old_alarms_to_date'] = fired.reindex(daily.index, fill_value=0).cumsum()
        daily = daily.reset_index()
        daily['date'] = daily['date'].dt.strftime('%Y-%m-%d')
        latest = daily.iloc[-1]
        w = wd[wd['structure'] == s]

        structures.append({
            'id': slug(s), 'name': s, 'type': kind_of(s),
            'serial': meta.loc[s, 'Serial number'], 'material': meta.loc[s, 'Material'], 'purpose': meta.loc[s, 'Purpose'],
            'latest': {'date': latest['date'], 'score': latest['score'], 'grade': latest['grade'],
                       'parts': {'mold': latest['pts_mold'], 'risk_zone': latest['pts_risk_zone'],
                                 'drying': latest['pts_drying'], 'system': latest['pts_system']},
                       'mold_index_ours': cmp.loc[s, 'ours_latest'], 'mold_index_vilpe': cmp.loc[s, 'vilpe_latest']},
            'equipment_uptime_pct': uptime.loc[s, 'equipment_uptime_pct'],
            'sensors_swapped': bool(uptime.loc[s, 'sensors_swapped']),
            'old_alarms': records(o, ['streak_start', 'alarm_fired', 'streak_end', 'days_humid', 'max_RH'],
                                  ['streak_start', 'alarm_fired', 'streak_end']),
            'smart_alerts': smart[smart['structure'] == s].drop(columns='structure').to_dict('records'),
            'watchdog': records(w, ['check', 'kind', 'start', 'end', 'days', 'evidence'], ['start', 'end']),
            'daily': daily.to_dict('records'),
        })

    data = {
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'building': {
            'id': 'vilpe-express-store-vantaa', 'name': 'VILPE Express Store', 'city': 'Vantaa',
            'description': 'Warehouse. Flat roof and green roof plus crawl space, built winter 2025. '
                           '6 Sense roof fans on the roof, 1 in the crawl space.',
            'period': {'from': scores['date'].min().strftime('%Y-%m-%d'), 'to': scores['date'].max().strftime('%Y-%m-%d')},
            'readings': int(sum(len(load(s)) for s in SHEETS)),
        },
        'summary': {
            'old_alarms_total': len(old),
            'smart_alerts_total': len(smart),
            'structures': len(SHEETS),
            'structures_with_watchdog_issue': int(wd['structure'].nunique()),
            'highest_mold_index_ours': round(float(scores['mold_index'].max()), 3),
            'certified_dry_now': [x['name'] for x in structures if x['latest']['grade'] == 'Certified dry'],
        },
        'rules': {
            'old_alarm': f'Indoor RH above {RH_LIMIT} % for {DELAY} readings in a row (about 24 h). VILPE Sense guidebook p.25 default.',
            'mold_model': f'VTT mould growth model (Hukka & Viitanen 1999, Ojanen et al. 2010), class "{ENGINE_CLASS}". Best match to VILPE\'s own index.',
            'smart_alert_levels': {'Watch': 'index rose 0.1 or more within 7 days (dashboard only)',
                                   'Warning': f'index {WARNING} or more (first microscopic growth)',
                                   'Critical': f'index {CRITICAL} or more (VILPE alarm level)'},
            'watchdog': {'Fan stopped': f'0 rpm over {FAN_HOURS} h while outdoor air above {STOP_TEMP} °C',
                         'Sensor silent': f'no values over {SILENT_HOURS} h while the unit is online',
                         'Outdoor sensor reads too warm': f'daytime average over {SUN_DEGREES} °C above the other outdoor sensors, per week',
                         'Sensors likely swapped': 'outdoor sensor does not follow the other outdoor sensors, indoor sensor does'},
            'score': {'mold': 40, 'risk_zone': 20, 'drying': 20, 'system': 20,
                      'grades': {'Certified dry': '85+', 'Good': '70-84', 'Attention': '50-69', 'At risk': 'below 50'}},
        },
        'scenarios': {'crawl_space_sensors_swapped_back': {
            'note': 'Only if the crawl space sensors are really swapped. Not confirmed by VILPE.',
            'mold_index_end': cmp.loc['Hallin alapohja', 'ours_if_sensors_swapped'],
            'alerts': scenario.to_dict('records')}},
        'structures': structures,
    }

    data = clean(data)
    for path in [OUT / 'data.json', ROOT.parent / 'frontend/public/data.json']:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    size_kb = (OUT / 'data.json').stat().st_size / 1024
    print(f'data.json written ({size_kb:.0f} KB): {len(structures)} structures, '
          f'{sum(len(x["daily"]) for x in structures)} daily rows, {len(old)} old alarms, '
          f'{len(smart)} smart alerts, {len(wd)} watchdog events')
    print('Copied to ../frontend/public/data.json')