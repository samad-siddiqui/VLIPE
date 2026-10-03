# Handoff note for Claude (read this first)

I am a solo participant in the Vaasa Hackathon 2026, VILPE challenge. Deadline Sunday 4 Oct 2026, 12:00.
You act as my senior developer, designer and consultant. Work one step at a time and explain before writing code.
Keep explanations short and simple. Avoid em dashes in written text. Every claim needs proof from the data.

## Concept: VILPE Structura Guarantee
A subscription service built on VILPE Sense data for commercial property owners, with an insurer partner (LocalTapiola, proposed).
1. Smart alerts: fire only when the mold index actually rises (VTT mold model), not on every humid day
2. Health watchdog: stopped fans, sun-exposed or swapped sensors, data gaps
3. Structural Health Score 0 to 100: mold risk 40, time in risk zone 20, drying performance 20, system uptime 20
4. Dry Structure Certificate with verify QR code
5. Insurer view (should have), savings report (should have)
Future slide only: weather-forecast drying, fleet benchmarking, VEO360 3D twin, plug-and-play BMS.

Demo story: portfolio, replay of the warehouse year (old alarms vs ours), watchdog catch, score, certificate, insurer view.

## Rules
- Use only VILPE's provided material as data. Internet only for ideas and published science.
- Never remove or alter raw data. Flag, don't delete.
- Uncertain findings are worded carefully, for example "the data shows 0 rpm for 12 months; whether the fan stopped or the signal was lost, nothing flagged it".

## Findings so far (all reproducible with the scripts)
- VILPE's default alarm (indoor RH above 90 % for 12 readings, guidebook p.25) fires 180 times in 16 months on structures whose mold index is 0 to 0.69 (alarm level 2.5). Roof 2 has mold index 0.00005 and the most alarms (37).
- Viherkatto 2: fan 0 rpm from May 2025 to May 2026 (97 % of readings).
- Katto 4: outdoor sensor about 9 °C warmer than the others at summer midday, likely direct sun.
- Hallin alapohja: indoor and outdoor sensors look swapped ("outdoor" stays 8 to 13 °C all year, "indoor" follows the weather, correlation 0.97 with other outdoor sensors).
- Site layout shows about 45 leak sensors (RHT-2), but we only have the 7 control unit files.

## Done
- Step A `engine/step_a_clean.py`: cleaned workbook, 40,077 rows in and out
- Step B `engine/step_b_old_alarm.py`: 180 old alarms, list in `engine/output/old_alarm_events.csv`

- Step C `engine/step_c_mold_index.py`: VTT mold model history. "Very sensitive" class matches VILPE best
  (Roof 1 0.00127 vs 0.00125, Green roof 2 0.0316 vs 0.0310, Green roof 1 0 vs 0). Peak index anywhere 0.39, so 0 smart alerts vs 180.
  Scenario: crawl space with sensors swapped back reaches 4.5 (Warning Aug 2025, Critical Oct 2025). Conditional, word carefully.

- Step D `engine/step_d_watchdog.py`: all 7 units show at least one issue. Green roof 2 fan stopped 379 days
  (May 2025 to May 2026) and keeps stopping through Sep 2026, uptime 6.7 %. Roof 1 and Green roof 1 indoor sensors
  silent 36 days after install. Roofs 2, 3, 4 outdoor sensors read over 3 °C warm in daytime for 270 to 320 days
  (sun or heat). Crawl space sensors likely swapped (outdoor corr 0.74 vs 0.92 to 0.97 for others).

## Next
- E score, F export `engine/output/data.json`, then design and React app in `app/`

## Schedule
Data engine until ~20:30, proof check ~21:00, design ~22:00, React app until ~04:00, sleep 04:00 to 07:00,
business model 07:00 to 08:30, deck and backup video until 10:30, rehearse until 11:30, submit by 12:00.
