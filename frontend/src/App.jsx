import { Navigate, Route, Routes } from 'react-router-dom'
import { useData } from './data.jsx'
import Login from './pages/Login.jsx'
import OwnerHome from './pages/owner/OwnerHome.jsx'
import StructureDetail from './pages/owner/StructureDetail.jsx'
import Certificate from './pages/owner/Certificate.jsx'
import InsurerHome from './pages/insurer/InsurerHome.jsx'
import ServiceQueue from './pages/service/ServiceQueue.jsx'
import Passport from './pages/passport/Passport.jsx'

// Pages that need a signed-in role. The passport and story are public on purpose.
function RequireRole({ roles, children }) {
  const { role: current } = useData()
  return roles.includes(current) ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/owner" element={<RequireRole roles={['owner']}><OwnerHome /></RequireRole>} />
      <Route path="/owner/structure/:structureId" element={<RequireRole roles={['owner', 'service']}><StructureDetail /></RequireRole>} />
      <Route path="/owner/certificate" element={<RequireRole roles={['owner']}><Certificate /></RequireRole>} />
      <Route path="/insurer" element={<RequireRole roles={['insurer']}><InsurerHome /></RequireRole>} />
      <Route path="/service" element={<RequireRole roles={['service']}><ServiceQueue /></RequireRole>} />
      <Route path="/passport/:buildingId" element={<Passport />} />
      <Route path="/story" element={<OwnerHome />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}