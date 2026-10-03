"""Step C: rebuild the mold index history and apply our smart alert levels.

Model: updated VTT mould growth model (Hukka & Viitanen 1999, Ojanen et al. 2010).
VILPE's brochure says their mold index is based on this Finnish model (scale 0 to 6, alarm at 2.5).
Material class: we tested all classes against VILPE's own latest mold index (see class_check.csv).
The "very sensitive" reference class (pine sapwood, the most cautious setting) matches VILPE best,
so the engine uses it. Concrete would normally be "medium resistant"; that result is kept in the check file.

Why this replaces VILPE's default alarm (RH above 90 % for 24 h, guidebook p.25):
that rule is one flat threshold with no memory. This model tracks a single running index (0 to 6) that rises
when conditions favour growth and falls back when they do not.
  - rh_crit(T) is the humidity mold actually needs at a given temperature, not a flat 90 %. Colder air needs
    much higher humidity before growth is even possible; below 0 C nothing grows regardless of humidity.
  - mold_history() accumulates risk over time at a rate set by how far RH sits above that curve, and decays
    it back down once conditions turn unfavourable, so a humid day that fully dries out does not linger as
    false risk.
  - smart_alerts() only raises an alert when the index crosses into Watch (0.1), Warning (1.0) or
    Critical (2.5, VILPE's own alarm level), not on every humid reading.
Result on the real 16-month dataset: the index never exceeds 0.39 on any of the 7 structures, so 0 alerts
fire, correctly, against the 180 VILPE's rule raises on that same data.
"""
import math
import pandas as pd
from step_b_old_alarm import load, SHEETS, SRC, ROOT

# ---- Material classes (Ojanen et al. 2010): k1 below 1, k1 above 1, A, B, C, RH_min, decline ----
CLASSES = {'very_sensitive':   (1.0,   2.0,   1,   7, 2,   80, 1.0),
           'sensitive':        (0.578, 0.386, 0.3, 6, 1,   80, 0.5),
           'medium_resistant': (0.072, 0.097, 0,   5, 1.5, 85, 0.25)}
ENGINE_CLASS = 'very_sensitive'


def use_class(name):
    """Load one material class into the model parameters."""
    global K1_BELOW_1, K1_ABOVE_1, A, B, C, RH_MIN, DECLINE
    K1_BELOW_1, K1_ABOVE_1, A, B, C, RH_MIN, DECLINE = CLASSES[name]


use_class(ENGINE_CLASS)

# ---- Our smart alert levels ----
WATCH_RISE = 0.1     # index rose this much within 7 days -> Watch (dashboard only)
WARNING = 1.0        # first microscopic growth -> facility manager
CRITICAL = 2.5       # VILPE's own mold alarm level -> manager + insurer


def rh_crit(T):
    """Humidity needed for mold to grow at temperature T (°C)."""
    if T <= 20:
        return max(-0.00267 * T**3 + 0.160 * T**2 - 3.13 * T + 100.0, RH_MIN)
    return RH_MIN


def mold_history(T_series, RH_series, times):
    """Step through the readings and return the mold index after each one."""
    M, out = 0.0, []
    dry_since = None  # when the current dry period started
    prev_t = times[0]
    for T, RH, t in zip(T_series, RH_series, times):
        dt_h = (t - prev_t).total_seconds() / 3600
        prev_t = t
        if pd.isna(T) or pd.isna(RH) or dt_h <= 0:
            out.append(M); continue
        RHc = rh_crit(T)
        if T > 0 and RH >= RHc:                        # favourable: mold can grow
            dry_since = None
            k1 = K1_BELOW_1 if M < 1 else K1_ABOVE_1
            x = (RHc - RH) / (RHc - 100)
            M_max = A + B * x - C * x**2
            k2 = max(1 - math.exp(2.3 * (M - M_max)), 0)
            rate_per_week = 1 / (7 * math.exp(-0.68 * math.log(T) - 13.9 * math.log(RH) + 66.02)) * k1 * k2
            M += rate_per_week * dt_h / 168
        else:                                           # unfavourable: mold slowly dies back
            if dry_since is None:
                dry_since = t
            hours_dry = (t - dry_since).total_seconds() / 3600
            per_hour = -0.00133 if hours_dry <= 6 else (0 if hours_dry <= 24 else -0.000667)
            M = max(M + DECLINE * per_hour * dt_h, 0)
        out.append(M)
    return out


def smart_alerts(h):
    """Turn the mold index history into alert events (only when a level is newly reached)."""
    daily = h.set_index('Timestamp')['mold_index'].resample('D').max().ffill()
    rise_7d = daily - daily.shift(7)
    events, level_prev = [], 'Green'
    for day, M in daily.items():
        if M >= CRITICAL: level = 'Critical'
        elif M >= WARNING: level = 'Warning'
        elif rise_7d.get(day, 0) >= WATCH_RISE: level = 'Watch'
        else: level = 'Green'
        order = ['Green', 'Watch', 'Warning', 'Critical']
        if order.index(level) > order.index(level_prev):
            events.append({'date': day.date(), 'level': level, 'mold_index': round(M, 4)})
        level_prev = level
    return pd.DataFrame(events, columns=['date', 'level', 'mold_index'])


if __name__ == '__main__':
    meta = pd.read_excel(SRC, sheet_name='Structures').set_index('Sheet name (original)')
    data = {s: load(s) for s in SHEETS}

    # 1) Proof check: which material class reproduces VILPE's own latest mold index?
    check = []
    for cls in CLASSES:
        use_class(cls)
        for s in SHEETS:
            d = data[s]
            check.append({'class': cls, 'structure': s, 'vilpe_latest': meta.loc[s, 'Latest mold index'],
                          'ours_latest': round(mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])[-1], 5)})
    check = pd.DataFrame(check)
    check.to_csv(ROOT / 'engine/output/class_check.csv', index=False)
    print(check.pivot(index='structure', columns='class', values='ours_latest')
          .join(check.drop_duplicates('structure').set_index('structure')['vilpe_latest']).to_string(), '\n')
    use_class(ENGINE_CLASS)

    # 2) Full history and smart alerts with the chosen class
    histories, all_alerts, rows = [], [], []
    for s in SHEETS:
        d = data[s]
        d['mold_index'] = mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])
        histories.append(d[['Timestamp', 'mold_index']].assign(structure=s))
        al = smart_alerts(d); al.insert(0, 'structure', s); all_alerts.append(al)
        row = {'structure': s, 'vilpe_latest': meta.loc[s, 'Latest mold index'],
               'ours_latest': round(d['mold_index'].iloc[-1], 4), 'ours_peak': round(d['mold_index'].max(), 4),
               'smart_alerts': len(al), 'alerts_to_people': int((al['level'] != 'Watch').sum()) if len(al) else 0}
        if s == 'Hallin alapohja':   # test the swapped-sensor theory: use the "outdoor" sensor as the crawl space
            sw = mold_history(d['Outdoor temp (°C)'], d['Outdoor RH (%)'], d['Timestamp'])
            row['ours_if_sensors_swapped'] = round(sw[-1], 4)
            sw_alerts = smart_alerts(d.assign(mold_index=sw))
            sw_alerts.to_csv(ROOT / 'engine/output/scenario_crawlspace_swapped_alerts.csv', index=False)
            print('Scenario, crawl space with sensors swapped back:'); print(sw_alerts.to_string(index=False), '\n')
        rows.append(row)

    pd.concat(histories).to_csv(ROOT / 'engine/output/mold_history.csv', index=False)
    alerts = pd.concat(all_alerts, ignore_index=True)
    alerts.to_csv(ROOT / 'engine/output/smart_alert_events.csv', index=False)
    cmp = pd.DataFrame(rows)
    cmp.to_csv(ROOT / 'engine/output/mold_index_comparison.csv', index=False)
    print(cmp.to_string(index=False))
    print('\nSmart alert events:'); print(alerts.to_string(index=False))
