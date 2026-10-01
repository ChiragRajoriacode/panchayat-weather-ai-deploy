# PanchayatWeather AI — SIH26074

**Downscaling of weather forecast from Block level to Panchayat level**  
Pilot: **Odisha · Khordha · 10 Gram Panchayats**

## What’s fixed (path to 9/10+)

1. **Real ML backend connected**
   - `POST /api/downscale` — HistGradientBoosting residual models (rainfall, tmin, tmax)
   - `GET /api/validation` + `GET /api/model/metrics` — time-aware hold-out metrics
   - `GET /api/historical/replay` — single-date T−1 replay
   - `GET /api/historical/backtest` — multi-date × 10 Panchayats T−1 backtest

2. **Genuine historical backtest**
   - Many dates (configurable range)
   - All 10 Panchayats
   - **T−1 only** via Open-Meteo Previous Runs (`precipitation_previous_day1`)
   - No future-data leakage (`hist_rain_7d` shifted; time-ordered train/test)

3. **Evidence shown in UI**
   - Block MAE vs AI MAE, RMSE, R², improvement %
   - Daily MAE time series + Actual vs AI scatter
   - Per-Panchayat comparison tables

## Quick start (full stack)

```bash
# 1) Python deps + train (once)
cd panchayat-weather-ai
pip install -r requirements.txt
python scripts/ingest_and_train.py   # fetches Open-Meteo archive, trains, writes models/

# 2) API
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# 3) Frontend (proxies /api → :8000)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 → **Historical Replay** → **RUN MULTI-DATE BACKTEST**.

API docs: http://127.0.0.1:8000/docs

## Frontend-only (no backend)

```bash
cd frontend && npm install && npm run dev
```

Live Open-Meteo + browser residual downscaler; Validation pages show N/A until backend is up.

## Model notes (honest)

| Target | Hold-out finding |
|--------|------------------|
| **tmin / tmax** | Clear MAE improvement (~45–50%) over block copy on ERA5 archive |
| **rainfall** | At ~10 km pilot spacing, ERA5 points are nearly collinear → block baseline MAE is already tiny; residual can look worse on pure reanalysis. **T−1 previous-run backtest** is the operationally relevant skill test |

Ground truth in training/eval = Open-Meteo archive (ERA5-based), **not** IMD stations. Labelled as such in UI.

## Leakage controls

- Time-ordered split (last 60–90 days held out)
- `hist_rain_7d` = rolling mean **shifted by 1 day**
- Backtest forecast = Previous Runs API issued **day before** target
- No random shuffle of time series

## Feature map

| Route | Capability |
|-------|------------|
| Command Center | Live KPIs, alerts, risk ranking |
| AI Downscaling | Pipeline + backend `/api/downscale` when available |
| Historical Replay | Single-date + **multi-date T−1 backtest with evidence charts** |
| Model Validation | MAE/RMSE/R² from `/api/validation` |
| Map / Compare / Advisory / Reports | As before |

---
SIH26074 · PanchayatWeather AI · Odisha Pilot
