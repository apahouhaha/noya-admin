import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireAdmin from './components/admin/RequireAdmin'
import AdminPage from './pages/admin/AdminPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
