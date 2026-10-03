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
- VILPE's default alarm (indoor RH above 90 % for 12 readings, guidebook p.25) fires 180 times in 16 months on structures whose VILPE-reported mold index is 0 to 0.69 (alarm level 2.5). Katto 2 has the most alarms (37) despite a VILPE mold index of just 0.00005.
- Viherkatto 2's fan stopped 9 separate times, 453 days total, the longest stretch 379 days straight (13 May 2025 to 27 May 2026), and it is still recurring through September 2026. Equipment uptime 6.7 %.
- 4 of 7 structures have an outdoor sensor reading too warm in daytime at some point in the 16 months, 3.5 to 8.7 °C above the other outdoor sensors: Katto 2, Katto 3, Katto 4, Viherkatto 2. Guidebook says never place in direct sun.
- Hallin alapohja: indoor and outdoor sensors look swapped (outdoor sensor correlates 0.74 with the other outdoor sensors vs 0.92 to 0.97 for genuine outdoor sensors; "indoor" correlates 0.97).
- Site layout shows about 45 leak sensors (RHT-2), but we only have the 7 control unit files.

## Done
- Step A `engine/step_a_clean.py`: cleaned workbook, 40,077 rows in and out
- Step B `engine/step_b_old_alarm.py`: 180 old alarms, list in `engine/output/old_alarm_events.csv`

- Step C `engine/step_c_mold_index.py`: VTT mold model history. "Very sensitive" class matches VILPE best
  (Roof 1 0.00127 vs 0.00125, Green roof 2 0.0316 vs 0.0310, Green roof 1 0 vs 0). Peak index anywhere 0.39, so 0 smart alerts vs 180.
  Scenario: crawl space with sensors swapped back reaches 4.5 (Warning Aug 2025, Critical Oct 2025). Conditional, word carefully.

  How it replaces VILPE's alarm: their rule is one flat threshold, RH above 90 % for 24 h, no memory of
  temperature or how long conditions actually last. The VTT model tracks a running index (0 to 6) instead.
  `rh_crit(T)` is the humidity mold actually needs at a given temperature, not a flat 90 %, colder air needs
  much more humidity before growth is even possible, and nothing grows below 0 C. `mold_history()` accumulates
  risk while conditions are favourable and decays it back down once they are not, so a humid day that fully
  dries out does not linger as false risk the way a point-in-time threshold check does. Alerts fire only when
  the index crosses a real tier, Watch 0.1, Warning 1.0, Critical 2.5 (VILPE's own alarm level), not on every
  humid reading. On the real 16-month dataset the index never exceeds 0.39 anywhere, so 0 alerts fire,
  correctly, against the 180 VILPE's rule raises on that same data.

- Step D `engine/step_d_watchdog.py`: all 7 units show at least one issue. Green roof 2 fan stopped 379 days
  (May 2025 to May 2026) and keeps stopping through Sep 2026, uptime 6.7 %. Roof 1 and Green roof 1 indoor sensors
  silent 36 days after install. Roofs 2, 3, 4 outdoor sensors read over 3 °C warm in daytime for 270 to 320 days
  (sun or heat). Crawl space sensors likely swapped (outdoor corr 0.74 vs 0.92 to 0.97 for others).

  How it solves problems B and C: VILPE's system only ever looks at the humidity number, it has no way to
  know whether the fan that should react to that number is actually spinning, or whether the sensor supplying
  the number is even readable or correctly placed. A fine-looking RH reading from a dead fan or a sun-baked
  sensor is not fine, it is just unmonitored. The watchdog runs 4 checks against the system itself instead of
  mold risk: fan stopped and sensor silent (tagged Equipment, something is physically broken), sensor reads
  too warm and sensors likely swapped (tagged Data trust, the reading itself cannot be trusted). That tag is
  what the health score and certificate use to decide what blocks certification.

- Step E `engine/step_e_health_score.py`: daily 0-100 score per structure (mold 40, risk zone 20, drying 20,
  system 20). Green roof 2 lowest today at 55.6, Attention. 19 automated tests passing across all six steps.

- Step F `engine/step_f_export.py`: packs everything into `engine/output/data.json`, copied straight into
  `frontend/public/data.json` so the app has no separate build step to run.

- React app in `frontend/` (not `app/`, that path changed during the repo reorg). Three signed-in roles,
  each gated so one role cannot load another's routes:
  - Owner: roof map, 16-month replay, per-structure score/chart breakdown, certificate
  - Insurer: portfolio certification %, open equipment faults, certificate verify tool (LocalTapiola, proposed)
  - VILPE service: fleet-wide work-order queue, one recommended fix per finding type, equipment uptime per unit
  Plus a public, no-login passport page (the certificate's QR target) and a 6-chapter narrated Story mode for
  the pitch itself. Verified end to end against a fresh clone, zero console errors.

## Next
- Ask VILPE whether the stopped fan (Green roof 2) and the swapped crawl-space sensors were deliberate tests,
  wording in the pitch depends on the answer either way (see "After the hackathon" below)
- Business model (07:00-08:30 per schedule) and deck
- Optional, only if time allows: wire the crawl-space-swapped scenario into the UI so the demo can show what a
  triggered Structura alert actually looks like, right now the live data only proves the alert stays quiet
- Optional, lowest priority: deploy to a public URL (not required by the brief, nice-to-have backup)

## Schedule
Data engine until ~20:30, proof check ~21:00, design ~22:00, React app until ~04:00, sleep 04:00 to 07:00,
business model 07:00 to 08:30, deck and backup video until 10:30, rehearse until 11:30, submit by 12:00.

## After the hackathon: how VILPE could test and develop this

No new pilot needed to start. The data already exists: 16 months from the Vantaa warehouse, the exact dataset
this prototype runs on. Step 1 is free: hand the watchdog findings to a VILPE engineer and ask about the two
that matter most, was Green roof 2's fan really stopped for 379 days, and are the crawl space sensors really
swapped. Both are confirmable from VILPE's own install records in an afternoon, and both become stronger proof
points either way (a real fault caught, or a known test case the model correctly explains).

Step 2 is a live data connection, not a rebuild. The prototype already reads one static file
(`engine/output/data.json`) shaped like a REST response on purpose. VILPE's brochure states a REST API already
exists and that building owners can share data by link, so the swap is pointing the same frontend at that API
instead of a file, the scoring and watchdog logic do not change.

Step 3 is partner conversations, not new engineering. LocalTapiola is named here as the proposed insurer
because the certificate and passport pages are already built around what an insurer needs to see: verified
history, not a self-reported survey. The VILPE service view turns every watchdog finding into a work order
with a recommended fix, so VILPE's own service team is a near-term internal customer before any external
partner, it is a better queue than what they likely use today.

Step 4 is rollout, one site at a time. This warehouse becomes the reference case. The next 2 to 3 sites should
be a deliberate mix, at least one with a known fault (to test detection) and one considered healthy (to test
for false positives), before scoring the full Sense install base.
