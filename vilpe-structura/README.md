# VILPE Structura Guarantee

Vaasa Hackathon 2026, VILPE challenge "Unlocking the Value of Building Data".
Deadline: Sunday 4 October 2026, 12:00.

## Folder layout

| Folder | What is in it |
|---|---|
| `data/raw/` | The 7 original Excel exports from VILPE (never edited) |
| `data/clean/` | `VILPE_Vantaa_cleaned.xlsx`, made by Step A |
| `docs/` | Everything VILPE gave us: brief, slides, guidebook, brochure, site layout |
| `engine/` | Python scripts, one per step |
| `engine/output/` | Results the scripts produce (CSV, later `data.json` for the app) |
| `app/` | The React demo (Step 5) |
| `pitch/` | Findings document, later the deck and demo script |

## How to run

```
pip install -r engine/requirements.txt
python engine/step_a_clean.py        # raw Excel -> data/clean/VILPE_Vantaa_cleaned.xlsx
python engine/step_b_old_alarm.py    # replays VILPE's default alarm -> engine/output/old_alarm_events.csv
python engine/step_c_mold_index.py   # mold index history + smart alerts -> engine/output/mold_*.csv
python engine/step_d_watchdog.py     # health checks of the system itself -> engine/output/watchdog_*.csv
```

Run them in this order. Each step reads the cleaned workbook, so Step A must run first (only once).

## What each output file is

| File | Made by | What it shows |
|---|---|---|
| `data/clean/VILPE_Vantaa_cleaned.xlsx` | Step A | All data in English, nothing removed, with a cleaning log |
| `engine/output/old_alarm_events.csv` | Step B | Every alarm VILPE's default rule would fire (180) |
| `engine/output/class_check.csv` | Step C | Our mold index vs VILPE's for 3 material settings (proof) |
| `engine/output/mold_history.csv` | Step C | Our mold index every 2 hours for all 7 structures |
| `engine/output/mold_index_comparison.csv` | Step C | Summary: VILPE value, ours, peak, alert counts |
| `engine/output/smart_alert_events.csv` | Step C | Our alerts (0 on the real data) |
| `engine/output/scenario_crawlspace_swapped_alerts.csv` | Step C | Alerts if the crawl space sensors are swapped back |
| `engine/output/watchdog_events.csv` | Step D | Every system problem found: what, where, from when to when, evidence |
| `engine/output/watchdog_uptime.csv` | Step D | Equipment uptime % per structure (used by the score) |

Scripts find their files relative to the project folder, so they work from any directory.

## Progress

| Step | Status | Key result |
|---|---|---|
| A. Clean data | Done | 40,077 rows in, 40,077 rows out, nothing removed |
| B. Old alarm replay | Done | 180 alarms in 16 months on healthy structures |
| C. Mold index history + smart alerts | Done | 0 alerts vs 180; matches VILPE's index almost exactly on 3 structures |
| D. Health watchdog | Done | All 7 units had at least one silent issue (fan, sensor, placement) |
| E. Structural Health Score | Next | |
| F. Export `data.json` for the app | | |
