/**
 * ML methodology card. Metrics are null until loaded from GET /api/model/metrics.
 * Never present placeholder MAE/R² as if measured.
 */

export const MODEL_SPEC = {
  name: 'Panchayat Spatial Residual Downscaler',
  version: 'spatial-residual-v1.2',
  family: 'HistGradientBoostingRegressor (sklearn) when backend models loaded; browser residual only for live map fallback',
  targets: ['rainfall_mm', 'tmin_c', 'tmax_c'],
  baseline: 'Copy block forecast to every panchayat (zero spatial skill)',
  features: [
    { name: 'block_rainfall', desc: 'Coarse block precipitation from forecast API' },
    { name: 'block_tmin / block_tmax', desc: 'Block temperature extremes' },
    { name: 'hist_rain_7d', desc: 'Historical mean residual bias window' },
    { name: 'elevation_m', desc: 'Panchayat centroid elevation' },
    { name: 'slope_deg', desc: 'Mean slope' },
    { name: 'aspect_deg', desc: 'Dominant aspect' },
    { name: 'humidity', desc: 'Relative humidity' },
    { name: 'doy_sin / doy_cos', desc: 'Seasonal encoding' },
    { name: 'has_station', desc: 'Direct station available' },
  ],
  training: {
    method: 'Time-aware hold-out when training scripts are run (see scripts/train_model.py)',
    algorithm_candidates: ['Baseline (Block copy)', 'Random Forest', 'XGBoost', 'HistGradientBoosting'],
    selected: 'HistGradientBoostingRegressor',
    why_selected: 'Selected after pilot comparison when training artifacts exist',
    hyperparameters: {
      max_iter: 200,
      max_depth: 6,
      learning_rate: 0.08,
      min_samples_leaf: 10,
      random_state: 42,
    },
  },
  // Populated only from API — do not invent numbers
  validation_metrics: null,
  uncertainty: {
    method: 'Prefer backend lower/upper bounds; else operational ±6 mm half-width until MAE from training is loaded',
    confidence: 'Deterministic heuristic from station availability (not calibrated probability)',
  },
  data_pipeline: [
    'Ingest forecast + archive',
    'Missing-value check',
    'Outlier gate',
    'Join GIS static features',
    'Feature engineering',
    'Model inference + interval',
    'Audit log write',
  ],
  alert_thresholds: {
    extreme_rainfall_mm: 50,
    heavy_rainfall_mm: 30,
    high_tmax_c: 36,
    very_low_rain_mm: 5,
    note: 'Pilot defaults for coastal Odisha; production should use IMD/district SOPs',
  },
  provenance_fields: [
    'source', 'latitude', 'longitude', 'timestamp', 'dataset', 'retrieved_at',
    'model_version', 'prediction_id', 'live_or_estimated',
  ],
}

export const ALERT_RULES = [
  { id: 'R1', field: 'rainfall', op: '>=', value: 50, level: 'red', title: 'Heavy / extreme rainfall' },
  { id: 'R2', field: 'tmax', op: '>=', value: 36, level: 'orange', title: 'High temperature' },
  { id: 'R3', field: 'rainfall', op: '<', value: 5, level: 'yellow', title: 'Very low rainfall', requireBlockLow: true },
]
