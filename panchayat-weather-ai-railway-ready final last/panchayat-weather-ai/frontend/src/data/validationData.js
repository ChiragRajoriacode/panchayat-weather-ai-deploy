/**
 * Validation metadata only — NO fabricated skill numbers.
 * Metrics must come from GET /api/validation or /api/model/metrics.
 */

export const VALIDATION_META = {
  title: 'Validation (reference: ERA5 / Open-Meteo Archive)',
  reference: 'Open-Meteo Archive (ERA5-based) — NOT independent of reanalysis-trained baselines',
  note: 'This is not CHIRPS/IMERG/IMD station verification. Do not claim independent ground truth until those datasets are used.',
  period: 'As reported by backend evaluation scripts when available',
  region: 'Khordha pilot · Gram Panchayats configured in database',
  independent_claim: false,
}

/** Empty — do not fill with made-up MAE/R² */
export const PANCHAYAT_SKILL = []
export const CATEGORY_SKILL = null
export const SAMPLE_SERIES = []
