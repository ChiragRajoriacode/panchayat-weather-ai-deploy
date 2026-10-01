"""Pilot configuration — Khordha, Odisha."""

BLOCK_CENTROID = {"lat": 20.30, "lon": 85.80, "name": "Bhubaneswar Block", "id": 1}

PANCHAYATS = [
    {"id": 1, "name": "Chandaka", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.325, "lon": 85.755, "elevation": 45, "slope": 2.5, "aspect": 180, "area_sqkm": 28.5, "has_station": True},
    {"id": 2, "name": "Daruthenga", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.310, "lon": 85.780, "elevation": 38, "slope": 1.8, "aspect": 120, "area_sqkm": 22.1, "has_station": False},
    {"id": 3, "name": "Andharua", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.340, "lon": 85.740, "elevation": 42, "slope": 3.0, "aspect": 90, "area_sqkm": 18.7, "has_station": True},
    {"id": 4, "name": "Patia", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.355, "lon": 85.820, "elevation": 35, "slope": 1.2, "aspect": 200, "area_sqkm": 15.4, "has_station": True},
    {"id": 5, "name": "Mancheswar", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.295, "lon": 85.850, "elevation": 40, "slope": 2.0, "aspect": 150, "area_sqkm": 19.8, "has_station": False},
    {"id": 6, "name": "Tamando", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.280, "lon": 85.790, "elevation": 52, "slope": 4.1, "aspect": 270, "area_sqkm": 24.3, "has_station": False},
    {"id": 7, "name": "Jatni Rural", "block_id": 2, "block": "Jatni", "district": "Khordha",
     "lat": 20.160, "lon": 85.710, "elevation": 48, "slope": 2.8, "aspect": 110, "area_sqkm": 31.2, "has_station": True},
    {"id": 8, "name": "Begunia", "block_id": 2, "block": "Jatni", "district": "Khordha",
     "lat": 20.140, "lon": 85.680, "elevation": 55, "slope": 3.5, "aspect": 80, "area_sqkm": 27.6, "has_station": False},
    {"id": 9, "name": "Balianta", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.220, "lon": 85.900, "elevation": 30, "slope": 1.0, "aspect": 160, "area_sqkm": 33.1, "has_station": True},
    {"id": 10, "name": "Kantabada", "block_id": 1, "block": "Bhubaneswar", "district": "Khordha",
     "lat": 20.380, "lon": 85.700, "elevation": 60, "slope": 5.2, "aspect": 220, "area_sqkm": 16.9, "has_station": False},
]

# Training window (ERA5 archive availability)
TRAIN_START = "2024-01-01"
TRAIN_END = "2025-08-31"
# Hold-out last N days for evaluation (time-aware, no shuffle)
HOLD_OUT_DAYS = 60

FEATURE_COLS = [
    "block_rainfall", "block_tmin", "block_tmax", "block_humidity",
    "elevation_m", "slope_deg", "aspect_deg", "has_station",
    "doy_sin", "doy_cos", "hist_rain_7d",
]

TARGETS = ["rainfall_mm", "tmin_c", "tmax_c"]

MODEL_DIR = "models"
DATA_DIR = "data"
