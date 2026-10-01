import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import CommandCenter from './pages/CommandCenter'
import DownscalePage from './pages/DownscalePage'
import MapExplorer from './pages/MapExplorer'
import ComparisonPage from './pages/ComparisonPage'
import HistoricalPage from './pages/HistoricalPage'
import AdvisoryPage from './pages/AdvisoryPage'
import ScenarioPage from './pages/ScenarioPage'
import ModelPage from './pages/ModelPage'
import DataQualityPage from './pages/DataQualityPage'
import ReportsPage from './pages/ReportsPage'
import AuditPage from './pages/AuditPage'
import IndependentValidationPage from './pages/IndependentValidationPage'
import ExtremeAlertsPage from './pages/ExtremeAlertsPage'
import FarmerDeliveryPage from './pages/FarmerDeliveryPage'
import WeatherPage from './pages/WeatherPage'

export default function App() {
  const { user } = useAuth()
  if (!user) return <LoginPage />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/map" element={<MapExplorer />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/downscale" element={<DownscalePage />} />
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="/historical" element={<HistoricalPage />} />
        <Route path="/extreme" element={<ExtremeAlertsPage />} />
        <Route path="/advisory" element={<AdvisoryPage />} />
        <Route path="/farmer" element={<FarmerDeliveryPage />} />
        <Route path="/validation" element={<IndependentValidationPage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/data" element={<DataQualityPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/model" element={<IndependentValidationPage />} />
      </Routes>
    </AppShell>
  )
}
