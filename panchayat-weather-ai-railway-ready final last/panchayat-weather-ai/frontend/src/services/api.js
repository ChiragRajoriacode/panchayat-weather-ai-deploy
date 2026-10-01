import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
})

export const getHealth = () => api.get('/health')
export const getStatus = () => api.get('/status')
export const getDistricts = () => api.get('/districts')
export const getBlocks = (districtId) => api.get('/blocks', { params: { district_id: districtId } })
export const getPanchayats = (blockId) => api.get('/panchayats', { params: { block_id: blockId } })
export const getBlockWeather = (blockId) => api.get(`/weather/block/${blockId}`)
export const getBlockForecast = (blockId, targetDate) =>
  api.get(`/forecast/block/${blockId}`, { params: targetDate ? { target_date: targetDate } : {} })
export const downscale = (blockId, targetDate, useLive = true) =>
  api.post('/downscale', { block_id: blockId, target_date: targetDate, use_live: useLive })
export const getMapPanchayats = () => api.get('/map/panchayats')
export const getValidation = () => api.get('/validation')
export const getModelMetrics = () => api.get('/model/metrics')
export const getModelFeatures = () => api.get('/model/features')
export const getAdvisory = (panchayatId, params = {}) =>
  api.get(`/advisory/${panchayatId}`, { params })
export const getDataSources = () => api.get('/data-sources')
export const getPredictions = (panchayatId) => api.get(`/predictions/${panchayatId}`)

export default api
