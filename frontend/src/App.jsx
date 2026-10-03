import { Navigate, Route, Routes } from 'react-router-dom'
import { useData } from './data.jsx'
import Login from './pages/Login.jsx'
import OwnerHome from './pages/owner/OwnerHome.jsx'
import StructureDetail from './pages/owner/StructureDetail.jsx'
import Certificate from './pages/owner/Certificate.jsx'
import Sensors from './pages/owner/Sensors.jsx'
import Alerts from './pages/owner/Alerts.jsx'
import Reports from './pages/owner/Reports.jsx'
import Settings from './pages/owner/Settings.jsx'
import Passport from './pages/passport/Passport.jsx'
import Insurer from './pages/insurer/Insurer.jsx'
import Service from './pages/service/Service.jsx'
import Story from './pages/story/Story.jsx'

// Pages that need a signed-in role. The passport and story are public on purpose.
function RequireRole({ role, children }) {
  const { role: current } = useData()
  return current === role ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/owner" element={<RequireRole role="owner"><OwnerHome /></RequireRole>} />
      <Route path="/owner/structure/:structureId" element={<RequireRole role="owner"><StructureDetail /></RequireRole>} />
      <Route path="/owner/certificate" element={<RequireRole role="owner"><Certificate /></RequireRole>} />
      <Route path="/owner/sensors" element={<RequireRole role="owner"><Sensors /></RequireRole>} />
      <Route path="/owner/alerts" element={<RequireRole role="owner"><Alerts /></RequireRole>} />
      <Route path="/owner/reports" element={<RequireRole role="owner"><Reports /></RequireRole>} />
      <Route path="/owner/settings" element={<RequireRole role="owner"><Settings /></RequireRole>} />
      <Route path="/insurer" element={<RequireRole role="insurer"><Insurer /></RequireRole>} />
      <Route path="/service" element={<RequireRole role="service"><Service /></RequireRole>} />
      <Route path="/passport/:buildingId" element={<Passport />} />
      <Route path="/story" element={<Story />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
