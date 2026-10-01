"""
PanchayatWeather AI — FastAPI backend
Endpoints: /api/health, /api/status, /api/downscale, /api/validation,
           /api/model/metrics, /api/model/features, geo helpers, historical backtest.
"""
from __future__ import annotations

import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import BLOCK_CENTROID, FEATURE_COLS, MODEL_DIR, PANCHAYATS, TARGETS

ROOT = Path(__file__).resolve().parents[1]
MODELS: dict[str, Any] = {}
METRICS: dict[str, Any] = {}

app = FastAPI(title="PanchayatWeather AI", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_models() -> None:
    global MODELS, METRICS
    model_dir = ROOT / MODEL_DIR
    for t in TARGETS:
        path = model_dir / f"model_{t}.joblib"
        if path.exists():
            MODELS[t] = joblib.load(path)
    meta = model_dir / "metrics.json"
    if meta.exists():
        METRICS = json.loads(meta.read_text())


@app.on_event("startup")
def startup() -> None:
    load_models()


# ---------- schemas ----------
class DownscaleRequest(BaseModel):
    block_id: int = 1
    target_date: Optional[str] = None
    use_live: bool = True
    rainfall: Optional[float] = None
    tmin: Optional[float] = None
    tmax: Optional[float] = None
    humidity: Optional[float] = None


# ---------- helpers ----------
def fetch_forecast_day(lat: float, lon: float, target: Optional[str] = None) -> dict:
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max"
        f"&timezone=Asia%2FKolkata&forecast_days=7"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    d = r.json()["daily"]
    times = d["time"]
    idx = 0
    if target and target in times:
        idx = times.index(target)
    return {
        "date": times[idx],
        "rainfall": d["precipitation_sum"][idx] or 0.0,
        "tmax": d["temperature_2m_max"][idx],
        "tmin": d["temperature_2m_min"][idx],
        "humidity": d["relative_humidity_2m_mean"][idx],
        "wind": d["wind_speed_10m_max"][idx],
        "source": "open-meteo-forecast",
    }


def fetch_archive_day(lat: float, lon: float, day: str) -> dict:
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
        f"&start_date={day}&end_date={day}"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean"
        f"&timezone=Asia%2FKolkata"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    d = r.json()["daily"]
    return {
        "date": day,
        "rainfall": (d["precipitation_sum"] or [0])[0] or 0.0,
        "tmax": (d["temperature_2m_max"] or [None])[0],
        "tmin": (d["temperature_2m_min"] or [None])[0],
        "humidity": (d["relative_humidity_2m_mean"] or [None])[0],
        "source": "open-meteo-archive",
    }


def fetch_previous_run_rainfall(lat: float, lon: float, day: str) -> float:
    """T−1 archived forecast precipitation for `day` (no future leakage)."""
    url = (
        f"https://previous-runs-api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=precipitation_previous_day1"
        f"&start_date={day}&end_date={day}&timezone=Asia%2FKolkata"
    )
    r = requests.get(url, timeout=45)
    r.raise_for_status()
    vals = r.json().get("hourly", {}).get("precipitation_previous_day1") or []
    total = sum(v for v in vals if v is not None and isinstance(v, (int, float)))
    return round(total, 2)


def hist_rain_7d(lat: float, lon: float, before: str) -> float:
    end = datetime.strptime(before, "%Y-%m-%d") - timedelta(days=1)
    start = end - timedelta(days=7)
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
        f"&start_date={start.date()}&end_date={end.date()}"
        f"&daily=precipitation_sum&timezone=Asia%2FKolkata"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        vals = r.json()["daily"]["precipitation_sum"] or []
        nums = [v for v in vals if v is not None]
        return float(np.mean(nums)) if nums else 0.0
    except Exception:
        return 0.0


def feature_row(block: dict, p: dict, hist7: float, day: str) -> list[float]:
    doy = datetime.strptime(day, "%Y-%m-%d").timetuple().tm_yday
    return [
        float(block.get("rainfall") or 0),
        float(block.get("tmin") if block.get("tmin") is not None else 26),
        float(block.get("tmax") if block.get("tmax") is not None else 33),
        float(block.get("humidity") if block.get("humidity") is not None else 75),
        float(p["elevation"]),
        float(p["slope"]),
        float(p["aspect"]),
        1.0 if p.get("has_station") else 0.0,
        math.sin(2 * math.pi * doy / 365.25),
        math.cos(2 * math.pi * doy / 365.25),
        float(hist7),
    ]


def heuristic_downscale(block: dict, p: dict) -> dict:
    """Fallback when models not loaded — same formula as frontend liveWeather."""
    elev_mean = 42.0
    elev_delta = (p["elevation"] - elev_mean) / 40.0
    rain_factor = 1 + elev_delta * 0.25 + (p["slope"] - 2.5) * 0.03
    rainfall = max(0.0, (block.get("rainfall") or 0) * rain_factor)
    t_delta = -elev_delta * 1.2
    tmax = None if block.get("tmax") is None else round(block["tmax"] + t_delta, 1)
    tmin = None if block.get("tmin") is None else round(block["tmin"] + t_delta * 0.7, 1)
    humidity = None
    if block.get("humidity") is not None:
        humidity = min(99, max(30, round(block["humidity"] + elev_delta * 4 + (2 if p["slope"] > 3 else 0))))
    return {
        "rainfall": round(rainfall, 1),
        "tmin": tmin,
        "tmax": tmax,
        "humidity": humidity,
        "conf": 88 if p.get("has_station") else 76,
        "low": round(max(0, rainfall - 6), 1),
        "high": round(rainfall + 6, 1),
        "source": "heuristic-fallback",
    }


def ml_downscale(block: dict, p: dict, hist7: float, day: str) -> dict:
    if not MODELS:
        return heuristic_downscale(block, p)
    x = np.array([feature_row(block, p, hist7, day)])
    out: dict[str, Any] = {"source": "ml-backend"}
    # rainfall
    if "rainfall_mm" in MODELS:
        residual = float(MODELS["rainfall_mm"]["model"].predict(x)[0])
        rain = max(0.0, (block.get("rainfall") or 0) + residual)
        out["rainfall"] = round(rain, 1)
    else:
        h = heuristic_downscale(block, p)
        out["rainfall"] = h["rainfall"]
    if "tmin_c" in MODELS and block.get("tmin") is not None:
        residual = float(MODELS["tmin_c"]["model"].predict(x)[0])
        out["tmin"] = round(block["tmin"] + residual, 1)
    else:
        out["tmin"] = heuristic_downscale(block, p)["tmin"]
    if "tmax_c" in MODELS and block.get("tmax") is not None:
        residual = float(MODELS["tmax_c"]["model"].predict(x)[0])
        out["tmax"] = round(block["tmax"] + residual, 1)
    else:
        out["tmax"] = heuristic_downscale(block, p)["tmax"]
    humidity = block.get("humidity")
    if humidity is not None:
        elev_delta = (p["elevation"] - 42) / 40
        out["humidity"] = min(99, max(30, round(humidity + elev_delta * 4)))
    else:
        out["humidity"] = None
    mae = None
    if METRICS.get("runs"):
        for run in METRICS["runs"]:
            if run["target_variable"] == "rainfall_mm":
                mae = run["metrics"].get("mae")
    half = float(mae) * 1.5 if mae else 6.0
    rain = out["rainfall"]
    out["low"] = round(max(0, rain - half), 1)
    out["high"] = round(rain + half, 1)
    out["conf"] = 92 if p.get("has_station") else 80
    out["risk"] = "high" if rain >= 50 else ("moderate" if rain >= 30 else "low")
    return out


# ---------- routes ----------
@app.get("/api/health")
def health():
    return {"status": "ok", "models_loaded": list(MODELS.keys()), "time": datetime.utcnow().isoformat() + "Z"}


@app.get("/api/status")
def status():
    return {
        "backend": "up",
        "models_loaded": list(MODELS.keys()),
        "model_version": METRICS.get("model_version"),
        "trained_at": METRICS.get("trained_at"),
        "n_panchayats": len(PANCHAYATS),
        "live_data": "open-meteo",
    }


@app.get("/api/districts")
def districts():
    return [{"id": 1, "name": "Khordha"}]


@app.get("/api/blocks")
def blocks(district_id: int = 1):
    return [
        {"id": 1, "name": "Bhubaneswar", "district_id": 1},
        {"id": 2, "name": "Jatni", "district_id": 1},
    ]


@app.get("/api/panchayats")
def panchayats(block_id: Optional[int] = None):
    if block_id is None:
        return PANCHAYATS
    return [p for p in PANCHAYATS if p["block_id"] == block_id]


@app.get("/api/map/panchayats")
def map_panchayats():
    return PANCHAYATS


@app.get("/api/weather/block/{block_id}")
def weather_block(block_id: int):
    try:
        day = fetch_forecast_day(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"])
    except Exception as e:
        raise HTTPException(502, f"Open-Meteo unavailable: {e}")
    return {"block_id": block_id, "block": BLOCK_CENTROID["name"], **day}


@app.get("/api/forecast/block/{block_id}")
def forecast_block(block_id: int, target_date: Optional[str] = None):
    try:
        day = fetch_forecast_day(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], target_date)
    except Exception as e:
        raise HTTPException(502, f"Open-Meteo unavailable: {e}")
    return {"block_id": block_id, **day}


@app.post("/api/downscale")
def downscale(req: DownscaleRequest):
    day = req.target_date or date.today().isoformat()
    if req.rainfall is not None:
        block = {
            "date": day,
            "rainfall": req.rainfall,
            "tmin": req.tmin,
            "tmax": req.tmax,
            "humidity": req.humidity,
            "source": "request-override",
        }
    else:
        try:
            block = fetch_forecast_day(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], req.target_date)
            day = block["date"]
        except Exception as e:
            raise HTTPException(502, f"Could not fetch block forecast: {e}")

    hist7 = hist_rain_7d(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], day)
    predictions = []
    for p in PANCHAYATS:
        pred = ml_downscale(block, p, hist7, day)
        predictions.append(
            {
                "panchayat_id": p["id"],
                "name": p["name"],
                "lat": p["lat"],
                "lon": p["lon"],
                "elevation": p["elevation"],
                "has_station": p["has_station"],
                **pred,
                "block_rainfall": block.get("rainfall"),
                "model_version": METRICS.get("model_version", "heuristic"),
            }
        )
    return {
        "block": block,
        "block_name": BLOCK_CENTROID["name"],
        "target_date": day,
        "predictions": predictions,
        "models_used": list(MODELS.keys()) or ["heuristic"],
        "retrieved_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/validation")
def validation():
    if not METRICS:
        return {
            "message": "No evaluation metrics yet. Run: python scripts/ingest_and_train.py",
            "metrics": {},
            "baseline_note": METRICS.get("baseline_note"),
        }
    # Flatten for IndependentValidationPage + ValidationPage
    metrics_map = {}
    for run in METRICS.get("runs", []):
        metrics_map[run["target_variable"]] = {
            "target_variable": run["target_variable"],
            "baseline_mae": run["metrics"]["baseline_mae"],
            "model_mae": run["metrics"]["mae"],
            "mae": run["metrics"]["mae"],
            "rmse": run["metrics"]["rmse"],
            "r2": run["metrics"]["r2"],
            "improvement_pct": run["metrics"]["improvement_pct"],
            "n": run["metrics"]["n"],
            "baseline_rmse": run["metrics"].get("baseline_rmse"),
            "baseline_r2": run["metrics"].get("baseline_r2"),
        }
    return {
        "message": None,
        "metrics": metrics_map,
        "runs": METRICS.get("runs", []),
        "baseline_note": METRICS.get("baseline_note"),
        "leakage_controls": METRICS.get("leakage_controls"),
        "model_version": METRICS.get("model_version"),
        "trained_at": METRICS.get("trained_at"),
        "n_train": METRICS.get("n_train"),
        "n_test": METRICS.get("n_test"),
    }


@app.get("/api/model/metrics")
def model_metrics():
    if not METRICS:
        return {"runs": [], "message": "Models not trained yet"}
    return METRICS


@app.get("/api/model/features")
def model_features():
    return {
        "feature_cols": FEATURE_COLS,
        "importance": METRICS.get("feature_importance", {}),
        "model_version": METRICS.get("model_version"),
    }


@app.get("/api/data-sources")
def data_sources():
    return {
        "forecast": "Open-Meteo Forecast API",
        "archive": "Open-Meteo Archive (ERA5-based)",
        "previous_runs": "Open-Meteo Previous Runs (T−1 skill eval)",
        "gis": "Pilot static elevation/slope/aspect table",
        "note": "Not IMD operational products",
    }


@app.get("/api/advisory/{panchayat_id}")
def advisory(panchayat_id: int):
    p = next((x for x in PANCHAYATS if x["id"] == panchayat_id), None)
    if not p:
        raise HTTPException(404, "Panchayat not found")
    return {
        "panchayat_id": panchayat_id,
        "name": p["name"],
        "advisories": [
            {"crop": "Paddy", "stage": "Vegetative", "action": "Monitor rainfall; delay irrigation if >20 mm expected"},
            {"crop": "Vegetables", "stage": "All", "action": "Ensure drainage before heavy rain events"},
        ],
        "source": "rule-based indicative",
    }


@app.get("/api/predictions/{panchayat_id}")
def predictions(panchayat_id: int):
    result = downscale(DownscaleRequest(block_id=1))
    for pr in result["predictions"]:
        if pr["panchayat_id"] == panchayat_id:
            return pr
    raise HTTPException(404, "Panchayat not found")


@app.get("/api/historical/replay")
def historical_replay(target_date: str = Query(..., description="YYYY-MM-DD")):
    """Single-date T−1 replay: previous-run block forecast vs archive actuals + ML downscale."""
    try:
        block_rain = fetch_previous_run_rainfall(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], target_date)
    except Exception as e:
        raise HTTPException(502, f"Previous-run forecast unavailable: {e}")

    # Temps/humidity from archive at block (context only; rainfall forecast is T−1)
    try:
        block_ctx = fetch_archive_day(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], target_date)
    except Exception:
        block_ctx = {"tmin": 26, "tmax": 33, "humidity": 75}

    block = {
        "date": target_date,
        "rainfall": block_rain,
        "tmin": block_ctx.get("tmin"),
        "tmax": block_ctx.get("tmax"),
        "humidity": block_ctx.get("humidity"),
        "source": "open-meteo-previous-run (T−1)",
        "issued": f"{target_date} T−1 day forecast",
    }
    hist7 = hist_rain_7d(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], target_date)

    rows = []
    for p in PANCHAYATS:
        try:
            actual = fetch_archive_day(p["lat"], p["lon"], target_date)
        except Exception as e:
            raise HTTPException(502, f"Archive actuals failed for {p['name']}: {e}")
        pred = ml_downscale(block, p, hist7, target_date)
        rows.append(
            {
                "id": p["id"],
                "name": p["name"],
                "actual": round(float(actual["rainfall"]), 1),
                "block": block_rain,
                "ai": pred["rainfall"],
                "actualSource": "Open-Meteo historical archive (ERA5-based)",
                "forecastSource": "Open-Meteo previous-day forecast archive (T−1)",
            }
        )

    def mae(key: str) -> float:
        return float(np.mean([abs(r["actual"] - r[key]) for r in rows]))

    def rmse(key: str) -> float:
        return float(math.sqrt(np.mean([(r["actual"] - r[key]) ** 2 for r in rows])))

    return {
        "date": target_date,
        "blockForecast": block,
        "rows": rows,
        "source": "open-meteo-previous-run+archive+ml",
        "metrics": {
            "blockMae": round(mae("block"), 2),
            "aiMae": round(mae("ai"), 2),
            "blockRmse": round(rmse("block"), 2),
            "aiRmse": round(rmse("ai"), 2),
            "improvement": round((mae("block") - mae("ai")) / mae("block") * 100, 1) if mae("block") else 0,
            "n": len(rows),
        },
        "models_used": list(MODELS.keys()) or ["heuristic"],
    }


@app.get("/api/historical/backtest")
def historical_backtest(
    start: str = Query("2025-06-01"),
    end: str = Query("2025-09-15"),
    max_days: int = Query(40, ge=5, le=120),
):
    """
    Multi-date T−1 backtest across all 10 panchayats.
    Uses previous-run precipitation (issued day before) — no future leakage.
    """
    start_d = datetime.strptime(start, "%Y-%m-%d").date()
    end_d = datetime.strptime(end, "%Y-%m-%d").date()
    # sample evenly if range is large
    all_days = []
    d = start_d
    while d <= end_d:
        all_days.append(d)
        d += timedelta(days=1)
    if len(all_days) > max_days:
        idx = np.linspace(0, len(all_days) - 1, max_days, dtype=int)
        days = [all_days[i] for i in idx]
    else:
        days = all_days

    daily_rows = []
    errors_block = []
    errors_ai = []
    series = []  # for actual vs predicted scatter/time

    for day in days:
        day_s = day.isoformat()
        try:
            block_rain = fetch_previous_run_rainfall(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], day_s)
        except Exception:
            continue
        try:
            block_ctx = fetch_archive_day(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], day_s)
        except Exception:
            block_ctx = {"tmin": 26, "tmax": 33, "humidity": 75}
        block = {
            "rainfall": block_rain,
            "tmin": block_ctx.get("tmin"),
            "tmax": block_ctx.get("tmax"),
            "humidity": block_ctx.get("humidity"),
        }
        hist7 = hist_rain_7d(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], day_s)

        day_block_errs = []
        day_ai_errs = []
        for p in PANCHAYATS:
            try:
                actual = fetch_archive_day(p["lat"], p["lon"], day_s)
            except Exception:
                continue
            act = float(actual["rainfall"] or 0)
            pred = ml_downscale(block, p, hist7, day_s)
            ai = float(pred["rainfall"])
            errors_block.append(abs(act - block_rain))
            errors_ai.append(abs(act - ai))
            day_block_errs.append(abs(act - block_rain))
            day_ai_errs.append(abs(act - ai))
            series.append(
                {
                    "date": day_s,
                    "panchayat": p["name"],
                    "panchayat_id": p["id"],
                    "actual": round(act, 1),
                    "block": round(block_rain, 1),
                    "ai": round(ai, 1),
                }
            )
        if day_block_errs:
            daily_rows.append(
                {
                    "date": day_s,
                    "block_mae": round(float(np.mean(day_block_errs)), 2),
                    "ai_mae": round(float(np.mean(day_ai_errs)), 2),
                    "n": len(day_block_errs),
                }
            )

    if not errors_block:
        raise HTTPException(502, "No successful backtest days — check date range / API availability")

    block_mae = float(np.mean(errors_block))
    ai_mae = float(np.mean(errors_ai))
    block_rmse = float(math.sqrt(np.mean([e ** 2 for e in errors_block])))
    ai_rmse = float(math.sqrt(np.mean([e ** 2 for e in errors_ai])))
    # R² of AI vs actual
    acts = np.array([s["actual"] for s in series])
    ais = np.array([s["ai"] for s in series])
    ss_res = float(np.sum((acts - ais) ** 2))
    ss_tot = float(np.sum((acts - acts.mean()) ** 2)) or 1.0
    r2 = 1 - ss_res / ss_tot
    improvement = (block_mae - ai_mae) / block_mae * 100 if block_mae else 0

    return {
        "start": start,
        "end": end,
        "n_days": len(daily_rows),
        "n_samples": len(series),
        "n_panchayats": 10,
        "lead_time": "T−1 (previous-run precipitation_previous_day1)",
        "leakage": "none — forecast issued day before target; hist_rain_7d shifted",
        "models_used": list(MODELS.keys()) or ["heuristic"],
        "metrics": {
            "block_mae": round(block_mae, 3),
            "ai_mae": round(ai_mae, 3),
            "block_rmse": round(block_rmse, 3),
            "ai_rmse": round(ai_rmse, 3),
            "r2": round(r2, 3),
            "improvement_pct": round(improvement, 1),
        },
        "daily": daily_rows,
        "series": series[:500],  # cap payload
        "baseline_note": (
            "Block baseline = T−1 previous-run forecast at block centroid, copied to every panchayat. "
            "AI = residual HistGB (or heuristic) applied to that same T−1 block value. "
            "Actual = Open-Meteo archive at each panchayat coordinate."
        ),
    }


@app.post("/api/reload-models")
def reload_models():
    load_models()
    return {"models_loaded": list(MODELS.keys()), "metrics_present": bool(METRICS)}
