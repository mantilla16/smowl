import React, { createContext, useContext, useState, useCallback } from 'react'
import { getCredentials, buildMonitorUrl } from '../services/smowlService'

const SmowlContext = createContext(null)

export function SmowlProvider({ children }) {
  const [credentials,  setCredentials]  = useState(null)
  const [monitorUrl,   setMonitorUrl]   = useState(null)
  const [hexUserId,    setHexUserId]    = useState(null)
  const [monitoringOK, setMonitoringOK] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  const prepareExam = useCallback(async (exam, user) => {
    setLoading(true)
    setError(null)
    setMonitoringOK(false)
    try {
      const params = {
        userId:       user.id,
        activityId:   exam.id,
        activityType: exam.type || 'quiz',
        idModality:   exam.idModality,
      }
      const creds = await getCredentials(params)
      setCredentials(creds.credentials)
      setHexUserId(creds.hexUserId)
      const url = await buildMonitorUrl(params)
      setMonitorUrl(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setCredentials(null)
    setMonitorUrl(null)
    setHexUserId(null)
    setMonitoringOK(false)
    setError(null)
  }, [])

  return (
    <SmowlContext.Provider value={{
      credentials, monitorUrl, hexUserId,
      monitoringOK, setMonitoringOK,
      loading, error, prepareExam, reset,
    }}>
      {children}
    </SmowlContext.Provider>
  )
}

export function useSmowl() {
  const ctx = useContext(SmowlContext)
  if (!ctx) throw new Error('useSmowl debe usarse dentro de <SmowlProvider>')
  return ctx
}