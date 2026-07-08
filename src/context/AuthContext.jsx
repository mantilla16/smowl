/**
 * AuthContext.jsx
 * Gestiona el estado del usuario (login/logout) en la app de prueba.
 * En producción esto lo reemplazarías con tu sistema de auth real
 * (JWT, OAuth, SSO, etc.)
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Intentar recuperar usuario de sessionStorage al recargar
    try {
      const stored = sessionStorage.getItem('smowl_demo_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback((userData) => {
    const userObj = {
      id:        userData.id    || `USR-${Date.now()}`,
      name:      userData.name,
      email:     userData.email,
      role:      userData.role  || 'student',
      loginTime: new Date().toISOString(),
    }
    setUser(userObj)
    sessionStorage.setItem('smowl_demo_user', JSON.stringify(userObj))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('smowl_demo_user')
    sessionStorage.removeItem('smowl_active_session')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
