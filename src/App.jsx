import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SmowlProvider } from './context/SmowlContext'
import LoginPage  from './pages/LoginPage'
import ExamPage   from './pages/ExamPage'
import ReportPage from './pages/ReportPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <SmowlProvider>
        <Routes>
          <Route path="/"       element={<Navigate to="/login" replace />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/exam"   element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="*"       element={<Navigate to="/login" replace />} />
        </Routes>
      </SmowlProvider>
    </AuthProvider>
  )
}
