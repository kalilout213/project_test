import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BanksPage from './pages/BanksPage'
import StatementsPage from './pages/StatementsPage'
import AccountingPage from './pages/AccountingPage'
import ReconciliationPage from './pages/ReconciliationPage'
import ReconciliationDetailPage from './pages/ReconciliationDetailPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMINISTRATEUR') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute><Layout /></ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="banks" element={<BanksPage />} />
            <Route path="statements" element={<StatementsPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="reconciliation/:id" element={<ReconciliationDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={
              <AdminRoute><UsersPage /></AdminRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
