/**
 * Extreme rain + cyclone-oriented alert logic (Odisha context).
 * IMD-style colour bands are mapped for communication — not official IMD products.
 */

// Probabilistic rain categories (heuristic from point forecast + uncertainty)
export function rainCategories(pred) {
  const r = pred.rainfall ?? 0
  const low = pred.low ?? r * 0.7
  const high = pred.high ?? r * 1.3
  // crude probabilities from where threshold sits in [low, high]
  const probAbove = (thr) => {
    if (high <= thr) return 0.05
    if (low >= thr) return 0.9
    const span = high - low || 1
    return Math.min(0.95, Math.max(0.05, (high - thr) / span))
  }
  return {
    light: { label: '<15 mm', p: Math.round((1 - probAbove(15)) * 100) },
    moderate: { label: '15–35 mm', p: Math.round((probAbove(15) - probAbove(35)) * 100) },
    heavy: { label: '35–65 mm', p: Math.round((probAbove(35) - probAbove(65)) * 100) },
    veryHeavy: { label: '>65 mm', p: Math.round(probAbove(65) * 100) },
  }
}

/** IMD-inspired colour for communication (NOT official warning) */
export function imdStyleColour(pred) {
  const r = pred.rainfall ?? 0
  const p65 = rainCategories(pred).veryHeavy.p
  if (r >= 65 || p65 >= 50) return { code: 'red', label: 'Red — extreme rain risk', action: 'Avoid travel in low areas; clear drains; follow district control room.' }
  if (r >= 35 || p65 >= 25) return { code: 'orange', label: 'Orange — heavy rain likely', action: 'Secure farm inputs; delay spraying; watch waterlogging.' }
  if (r >= 15) return { code: 'yellow', label: 'Yellow — moderate rain', action: 'Plan fieldwork in breaks; useful for standing crops.' }
  return { code: 'green', label: 'Green — no heavy rain signal', action: 'Normal operations; monitor updates.' }
}

export function cycloneContextBanner(month) {
  // Bay of Bengal: peak May–Nov for Odisha awareness
  const m = month ?? new Date().getMonth() + 1
  if (m >= 5 && m <= 11) {
    return {
      active: true,
      title: 'Cyclone / heavy-rain season awareness (Bay of Bengal)',
      text: 'During depression/cyclone bulletins, prioritize official IMD / OSDMA alerts over this AI estimate.',
    }
  }
  return { active: false }
}

export const EXTREME_THRESHOLDS = [
  { name: 'Heavy rain day', value: '≥ 35 mm/day', source: 'Pilot communication band' },
  { name: 'Very heavy', value: '≥ 65 mm/day', source: 'Aligned with common heavy-rain messaging' },
  { name: 'Extreme watch', value: '≥ 100 mm/day', source: 'Emergency planning threshold (pilot)' },
]
