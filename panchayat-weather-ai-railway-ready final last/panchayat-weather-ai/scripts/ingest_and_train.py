#!/usr/bin/env python3
"""
Ingest Open-Meteo archive for block + 10 panchayats, train residual downscalers,
evaluate with time-aware hold-out, save models + metrics.

No future-data leakage: features use only same-day block values + static GIS +
rolling historical mean from the past (shifted).
"""
from __future__ import annotations

import json
import math
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.config import (  # noqa: E402
    BLOCK_CENTROID,
    FEATURE_COLS,
    HOLD_OUT_DAYS,
    MODEL_DIR,
    DATA_DIR,
    PANCHAYATS,
    TARGETS,
    TRAIN_END,
    TRAIN_START,
)

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean"


def fetch_archive(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    url = (
        f"{ARCHIVE}?latitude={lat}&longitude={lon}"
        f"&start_date={start}&end_date={end}&daily={DAILY}&timezone=Asia%2FKolkata"
    )
    for attempt in range(4):
        r = requests.get(url, timeout=90)
        if r.status_code == 200:
            break
        if r.status_code == 429:
            time.sleep(2 ** attempt)
            continue
        r.raise_for_status()
    data = r.json()
    d = data["daily"]
    df = pd.DataFrame(
        {
            "date": pd.to_datetime(d["time"]),
            "rainfall": d["precipitation_sum"],
            "tmax": d["temperature_2m_max"],
            "tmin": d["temperature_2m_min"],
            "humidity": d["relative_humidity_2m_mean"],
        }
    )
    return df


def build_dataset() -> pd.DataFrame:
    print(f"Fetching block archive {TRAIN_START} → {TRAIN_END} …")
    block = fetch_archive(BLOCK_CENTROID["lat"], BLOCK_CENTROID["lon"], TRAIN_START, TRAIN_END)
    block = block.rename(
        columns={
            "rainfall": "block_rainfall",
            "tmax": "block_tmax",
            "tmin": "block_tmin",
            "humidity": "block_humidity",
        }
    )
    # Rolling 7-day mean of block rainfall, shifted by 1 so no same-day leakage
    block = block.sort_values("date")
    block["hist_rain_7d"] = (
        block["block_rainfall"].rolling(7, min_periods=3).mean().shift(1)
    )

    rows = []
    for p in PANCHAYATS:
        print(f"  Panchayat {p['id']} {p['name']} …")
        local = fetch_archive(p["lat"], p["lon"], TRAIN_START, TRAIN_END)
        local = local.rename(
            columns={
                "rainfall": "rainfall_mm",
                "tmax": "tmax_c",
                "tmin": "tmin_c",
            }
        )
        merged = local.merge(block, on="date", how="inner")
        merged["panchayat_id"] = p["id"]
        merged["panchayat_name"] = p["name"]
        merged["elevation_m"] = p["elevation"]
        merged["slope_deg"] = p["slope"]
        merged["aspect_deg"] = p["aspect"]
        merged["has_station"] = 1.0 if p["has_station"] else 0.0
        doy = merged["date"].dt.dayofyear
        merged["doy_sin"] = np.sin(2 * math.pi * doy / 365.25)
        merged["doy_cos"] = np.cos(2 * math.pi * doy / 365.25)
        rows.append(merged)
        time.sleep(0.35)  # be polite to Open-Meteo

    df = pd.concat(rows, ignore_index=True)
    df = df.dropna(subset=FEATURE_COLS + TARGETS)
    out = ROOT / DATA_DIR / "training_dataset.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    print(f"Dataset rows={len(df)} saved → {out}")
    return df


def train_and_evaluate(df: pd.DataFrame) -> dict:
    df = df.sort_values("date")
    max_date = df["date"].max()
    cut = max_date - pd.Timedelta(days=HOLD_OUT_DAYS)
    train = df[df["date"] < cut]
    test = df[df["date"] >= cut]
    print(f"Train {train['date'].min().date()}–{train['date'].max().date()} n={len(train)}")
    print(f"Test  {test['date'].min().date()}–{test['date'].max().date()} n={len(test)}")

    model_dir = ROOT / MODEL_DIR
    model_dir.mkdir(parents=True, exist_ok=True)

    runs = []
    feature_importance = {}

    for target in TARGETS:
        # Residual learning: predict local - block for rainfall/temps
        if target == "rainfall_mm":
            y_train = train[target] - train["block_rainfall"]
            y_test = test[target] - test["block_rainfall"]
            baseline_pred = test["block_rainfall"].values
        elif target == "tmin_c":
            y_train = train[target] - train["block_tmin"]
            y_test = test[target] - test["block_tmin"]
            baseline_pred = test["block_tmin"].values
        else:
            y_train = train[target] - train["block_tmax"]
            y_test = test[target] - test["block_tmax"]
            baseline_pred = test["block_tmax"].values

        X_train = train[FEATURE_COLS].values
        X_test = test[FEATURE_COLS].values

        model = HistGradientBoostingRegressor(
            max_iter=200,
            max_depth=6,
            learning_rate=0.08,
            min_samples_leaf=10,
            random_state=42,
        )
        model.fit(X_train, y_train)
        residual_hat = model.predict(X_test)
        model_pred = baseline_pred + residual_hat

        # Clip rainfall
        if target == "rainfall_mm":
            model_pred = np.maximum(0, model_pred)

        y_true = test[target].values
        mae = float(mean_absolute_error(y_true, model_pred))
        rmse = float(math.sqrt(mean_squared_error(y_true, model_pred)))
        r2 = float(r2_score(y_true, model_pred))
        base_mae = float(mean_absolute_error(y_true, baseline_pred))
        base_rmse = float(math.sqrt(mean_squared_error(y_true, baseline_pred)))
        base_r2 = float(r2_score(y_true, baseline_pred))
        improvement = ((base_mae - mae) / base_mae * 100) if base_mae > 0 else 0.0

        path = model_dir / f"model_{target}.joblib"
        joblib.dump({"model": model, "feature_cols": FEATURE_COLS, "target": target}, path)
        print(f"  {target}: base MAE={base_mae:.3f} → AI MAE={mae:.3f} ({improvement:+.1f}%) R²={r2:.3f}")

        runs.append(
            {
                "target_variable": target,
                "metrics": {
                    "n": int(len(y_true)),
                    "baseline_mae": round(base_mae, 3),
                    "mae": round(mae, 3),
                    "baseline_rmse": round(base_rmse, 3),
                    "rmse": round(rmse, 3),
                    "baseline_r2": round(base_r2, 3),
                    "r2": round(r2, 3),
                    "improvement_pct": round(improvement, 1),
                },
                "train_start": str(train["date"].min().date()),
                "train_end": str(train["date"].max().date()),
                "test_start": str(test["date"].min().date()),
                "test_end": str(test["date"].max().date()),
            }
        )

        # Permutation-style importance proxy via sklearn if available
        try:
            from sklearn.inspection import permutation_importance

            imp = permutation_importance(model, X_test, y_test, n_repeats=5, random_state=42)
            feature_importance[target] = {
                FEATURE_COLS[i]: round(float(imp.importances_mean[i]), 4)
                for i in range(len(FEATURE_COLS))
            }
        except Exception:
            feature_importance[target] = {}

    meta = {
        "model_version": "spatial-residual-v1.2",
        "algorithm": "HistGradientBoostingRegressor",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "feature_cols": FEATURE_COLS,
        "targets": TARGETS,
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "hold_out_days": HOLD_OUT_DAYS,
        "runs": runs,
        "feature_importance": feature_importance,
        "baseline_note": (
            "Baseline = block-level reanalysis value copied to every panchayat. "
            "Ground truth = Open-Meteo archive at panchayat coordinate (ERA5-based). "
            "Time-aware hold-out; no random shuffle."
        ),
        "leakage_controls": [
            "Time-ordered split (last 90 days held out)",
            "hist_rain_7d uses only past days (shift 1)",
            "No target leakage into features",
            "Residual learning on top of block baseline",
        ],
    }
    meta_path = model_dir / "metrics.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"Metrics → {meta_path}")
    return meta


def main():
    data_path = ROOT / DATA_DIR / "training_dataset.csv"
    if data_path.exists():
        print(f"Loading existing dataset {data_path}")
        df = pd.read_csv(data_path, parse_dates=["date"])
    else:
        df = build_dataset()
    train_and_evaluate(df)


if __name__ == "__main__":
    main()
