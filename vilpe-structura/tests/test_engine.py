"""Tests for the data engine. Run from the project folder:   python -m pytest -v

Part 1 uses small fake data where we KNOW the right answer (proves the rules work).
Part 2 checks the real results (proves the numbers we pitch are what the code produces).
If the outputs are missing, the whole pipeline (Steps A to F) runs first.
"""
import subprocess, sys
from pathlib import Path
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'engine'))
OUT = ROOT / 'engine/output'

from step_b_old_alarm import replay_alarm, SHEETS, SRC          # noqa: E402
from step_c_mold_index import mold_history, use_class           # noqa: E402
from step_d_watchdog import runs                                # noqa: E402
from step_e_health_score import grade                           # noqa: E402


@pytest.fixture(scope='session', autouse=True)
def pipeline():
    """Make sure Steps A to F have produced their files."""
    if not (OUT / 'data.json').exists():
        for step in ['a_clean', 'b_old_alarm', 'c_mold_index', 'd_watchdog', 'e_health_score', 'f_export']:
            subprocess.run([sys.executable, str(ROOT / f'engine/step_{step}.py')], check=True, capture_output=True)


def fake_series(rh_values, temp=20.0, hours=2):
    """Build fake readings every `hours` hours."""
    t = pd.date_range('2025-01-01', periods=len(rh_values), freq=f'{hours}h')
    return pd.DataFrame({'Timestamp': t, 'Indoor RH (%)': rh_values, 'Indoor temp (°C)': temp})


# ---------------- Part 1: rules on fake data ----------------

def test_old_alarm_needs_12_readings_in_a_row():
    assert len(replay_alarm(fake_series([95] * 11))) == 0          # 11 humid readings: no alarm
    assert len(replay_alarm(fake_series([95] * 12))) == 1          # 12 humid readings: alarm


def test_old_alarm_counts_separate_streaks_and_gaps_break_them():
    assert len(replay_alarm(fake_series([95] * 12 + [70] + [95] * 12))) == 2
    assert len(replay_alarm(fake_series([95] * 6 + [None] + [95] * 6))) == 0


def test_mold_never_grows_in_dry_air():
    d = fake_series([60] * 4380)                                   # one year at 60 % RH, 20 °C
    assert max(mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])) == 0


def test_mold_grows_in_warm_wet_air():
    # The model's own equation: 0.0963 per week at 20 °C and 97 % RH, so index 1 after about 10.4 weeks
    d = fake_series([97] * 1008)                                   # 12 weeks at 97 % RH, 20 °C
    m = mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])
    assert 0.5 < m[671] < 1                                        # after 8 weeks: growing, not yet 1
    assert m[-1] > 1                                               # after 12 weeks: past 1


def test_mold_never_grows_below_freezing():
    d = fake_series([99] * 2000, temp=-5)
    assert max(mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])) == 0


def test_mold_dies_back_when_it_dries():
    d = fake_series([97] * 672 + [60] * 2000)
    m = mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])
    assert m[-1] < m[671]


def test_concrete_setting_grows_slower_than_wood():
    d = fake_series([97] * 672)
    use_class('medium_resistant'); concrete = mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])[-1]
    use_class('very_sensitive');   wood = mold_history(d['Indoor temp (°C)'], d['Indoor RH (%)'], d['Timestamp'])[-1]
    assert concrete < wood


def test_runs_finds_each_stretch():
    s = pd.Series([False, True, True, False, True, False])
    assert list(runs(s)) == [(1, 2), (4, 4)]


def test_grade_boundaries():
    assert grade(100) == grade(85) == 'Certified dry'
    assert grade(84.9) == 'Good' and grade(70) == 'Good'
    assert grade(69.9) == 'Attention' and grade(49.9) == 'At risk'


# ---------------- Part 2: the real results we pitch ----------------

def test_cleaning_removed_nothing_and_changed_no_values():
    for f in sorted((ROOT / 'data/raw').glob('VILPE Vantaa*.xlsx')):
        raw = pd.read_excel(f, header=None)
        start = raw.index[raw.iloc[:, 0] == 'Aikaleima'][0] + 1
        raw_vals = raw.iloc[start:, 1:8].apply(pd.to_numeric, errors='coerce').reset_index(drop=True)
        sheet = raw.iloc[0, 1].replace('VILPE Vantaa, ', '')
        clean = pd.read_excel(SRC, sheet_name=sheet).iloc[:, 1:8]
        raw_vals.columns = clean.columns
        assert len(clean) == len(raw_vals), sheet
        pd.testing.assert_frame_equal(clean.reset_index(drop=True), raw_vals, check_names=False, check_dtype=False)


def test_old_alarm_total_is_180():
    assert len(pd.read_csv(OUT / 'old_alarm_events.csv')) == 180


def test_no_smart_alert_on_healthy_structures():
    assert len(pd.read_csv(OUT / 'smart_alert_events.csv')) == 0


def test_engine_matches_vilpe_mold_index_on_roof_1_and_green_roofs():
    c = pd.read_csv(OUT / 'class_check.csv')
    c = c[c['class'] == 'very_sensitive'].set_index('structure')
    for s in ['Katto 1', 'Viherkatto 2']:
        assert abs(c.loc[s, 'ours_latest'] - c.loc[s, 'vilpe_latest']) / c.loc[s, 'vilpe_latest'] < 0.05, s
    assert c.loc['Viherkatto 1', 'ours_latest'] == c.loc['Viherkatto 1', 'vilpe_latest'] == 0


def test_watchdog_catches_green_roof_2_fan_and_no_other_fan():
    ev = pd.read_csv(OUT / 'watchdog_events.csv')
    fans = ev[ev['check'] == 'Fan stopped']
    assert set(fans['structure']) == {'Viherkatto 2'}
    assert fans['days'].max() > 365


def test_watchdog_flags_swap_only_in_crawl_space():
    up = pd.read_csv(OUT / 'watchdog_uptime.csv').set_index('structure')
    assert up['sensors_swapped'].sum() == 1 and up.loc['Hallin alapohja', 'sensors_swapped']


def test_scores_are_valid_and_add_up():
    d = pd.read_csv(OUT / 'health_score_daily.csv')
    assert d['score'].between(0, 100).all()
    parts = d[['pts_mold', 'pts_risk_zone', 'pts_drying', 'pts_system']].sum(axis=1)
    assert (parts - d['score']).abs().max() < 0.1


def test_green_roof_2_has_the_lowest_score_today():
    d = pd.read_csv(OUT / 'health_score_daily.csv')
    latest = d.groupby('structure').tail(1).set_index('structure')['score']
    assert latest.idxmin() == 'Viherkatto 2'


def test_data_json_is_complete():
    import json
    d = json.loads((OUT / 'data.json').read_text(encoding='utf-8'))
    for key in ['building', 'summary', 'rules', 'scenarios', 'structures']:
        assert key in d, key
    assert len(d['structures']) == 7
    for st in d['structures']:
        assert st['daily'], st['name']
        assert {'score', 'grade', 'mold_index', 'fan_rpm', 'indoor_rh', 'old_alarms_to_date'} <= set(st['daily'][0])


def test_data_json_matches_the_engine_results():
    import json
    d = json.loads((OUT / 'data.json').read_text(encoding='utf-8'))
    assert d['summary']['old_alarms_total'] == 180 == sum(len(s['old_alarms']) for s in d['structures'])
    assert d['summary']['smart_alerts_total'] == 0
    assert d['summary']['structures_with_watchdog_issue'] == 7
    scores = pd.read_csv(OUT / 'health_score_daily.csv').groupby('structure').tail(1).set_index('structure')['score']
    for st in d['structures']:
        assert st['latest']['score'] == scores[st['name']], st['name']
        assert st['daily'][-1]['old_alarms_to_date'] == len(st['old_alarms']), st['name']
