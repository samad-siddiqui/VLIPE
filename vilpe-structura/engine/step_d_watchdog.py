"""Step D: health watchdog. Checks that the monitoring system itself is working and trustworthy.

Four checks per structure:
1. Fan stopped     0 rpm for more than 48 h while the building's outdoor air is above -7 °C
                   (guidebook p.23: with default settings the fan runs continuously above the -7 °C stop temperature)
2. Sensor silent   indoor or outdoor sensor sends no value for more than 24 h while the unit is online
3. Sensor in sun   outdoor sensor reads over 3 °C warmer in daytime (10-16) than the building's other outdoor
                   sensors, averaged per week (guidebook: never place it in direct sunlight)
4. Sensors swapped outdoor sensor does not follow the other outdoor sensors (correlation below 0.85)
                   while the indoor sensor does (above 0.90)

Why this exists: VILPE's system only ever looks at the humidity number, it never checks whether the fan
that is supposed to react to that number is actually running, or whether the sensor supplying the number
is readable and correctly placed. A healthy-looking RH reading from a broken fan or a sun-baked sensor is
not healthy, it is just unmonitored. These four checks look at the system itself instead of mold risk, so
a stopped fan or a mis-placed sensor gets caught even on a day the humidity number looks perfectly fine.
Each finding is tagged Equipment (checks 1 and 2, something physical is actually broken: fan, sensor link)
or Data trust (checks 3 and 4, the reading itself cannot be trusted even though the hardware is reporting),
the same split the health score and certificate use to decide what blocks certification.
"""
import pandas as pd
from step_b_old_alarm import load, SHEETS, ROOT

STOP_TEMP = -7          # °C, VILPE default stopping temperature
FAN_HOURS = 48
SILENT_HOURS = 24
SUN_DEGREES = 3
SWAP_OUT_CORR, SWAP_IN_CORR = 0.85, 0.90


def runs(mask):
    """Yield (start_index, end_index) of each continuous True stretch."""
    group = (mask != mask.shift()).cumsum()
    for _, g in mask[mask].groupby(group[mask]):
        yield g.index[0], g.index[-1]


def event(s, check, start, end, evidence, kind):
    return {'structure': s, 'check': check, 'start': start, 'end': end,
            'days': round((end - start).total_seconds() / 86400, 1), 'kind': kind, 'evidence': evidence}


if __name__ == '__main__':
    data = {s: load(s).set_index('Timestamp') for s in SHEETS}
    outdoor = pd.DataFrame({s: data[s]['Outdoor temp (°C)'].resample('2h').mean() for s in SHEETS})
    events, uptime = [], []

    for s in SHEETS:
        d = data[s]
        others = outdoor.drop(columns=s).median(axis=1)              # the building's outdoor air, without this unit
        others_at_d = others.reindex(d.index, method='nearest', tolerance=pd.Timedelta('2h'))

        # 4. Sensors swapped (checked first, it changes how we read the other checks)
        c_out = outdoor[s].corr(others)
        c_in = d['Indoor temp (°C)'].resample('2h').mean().corr(others)
        swapped = c_out < SWAP_OUT_CORR and c_in > SWAP_IN_CORR
        if swapped:
            events.append(event(s, 'Sensors likely swapped', d.index[0], d.index[-1],
                                f'outdoor sensor vs other outdoor sensors: {c_out:.2f}; indoor sensor vs other outdoor sensors: {c_in:.2f}',
                                'Data trust'))

        # 1. Fan stopped
        fault_hours = 0.0
        for a, b in runs(d['Fan speed (rpm)'] == 0):
            hours = (b - a).total_seconds() / 3600
            warm = (others_at_d.loc[a:b] > STOP_TEMP).mean()
            if hours > FAN_HOURS and warm >= 0.8:
                events.append(event(s, 'Fan stopped', a, b, f'0 rpm for {hours/24:.0f} days; outdoor above {STOP_TEMP} °C {warm:.0%} of that time', 'Equipment'))
                fault_hours += hours

        # 2. Sensor silent
        for col, name in [('Indoor RH (%)', 'Indoor sensor silent'), ('Outdoor RH (%)', 'Outdoor sensor silent')]:
            for a, b in runs(d[col].isna()):
                hours = (b - a).total_seconds() / 3600
                if hours > SILENT_HOURS:
                    events.append(event(s, name, a, b, f'no values for {hours/24:.0f} days while the unit kept reporting fan speed', 'Equipment'))
                    fault_hours += hours

        # 3. Outdoor sensor in sun (skipped if swapped: then the "outdoor" sensor is not outdoors)
        if not swapped:
            daytime = outdoor[s].index.hour.isin(range(10, 17))
            weekly = (outdoor[s] - others)[daytime].resample('W').mean()
            for a, b in runs(weekly > SUN_DEGREES):
                events.append(event(s, 'Outdoor sensor reads too warm (sun or heat)', a - pd.Timedelta('6D'), b,
                                    f'daytime average {weekly.loc[a:b].mean():.1f} °C above the other outdoor sensors', 'Data trust'))

        total_hours = (d.index[-1] - d.index[0]).total_seconds() / 3600
        uptime.append({'structure': s, 'equipment_uptime_pct': round(100 * (1 - fault_hours / total_hours), 1),
                       'sensors_swapped': swapped})

    ev = pd.DataFrame(events)
    ev.to_csv(ROOT / 'engine/output/watchdog_events.csv', index=False)
    up = pd.DataFrame(uptime)
    up.to_csv(ROOT / 'engine/output/watchdog_uptime.csv', index=False)

    summary = ev.groupby(['structure', 'check']).agg(events=('days', 'size'), total_days=('days', 'sum')).reset_index()
    print(summary.to_string(index=False)); print()
    print(up.to_string(index=False)); print()
    print(ev[ev['kind'] == 'Equipment'][['structure', 'check', 'start', 'end', 'days']].to_string(index=False))
