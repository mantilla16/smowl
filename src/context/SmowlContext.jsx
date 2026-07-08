import React, { createContext, useContext, useState, useCallback } from 'react'
import { buildMonitorUrl } from '../services/smowlService'

const SmowlContext = createContext(null)

export function SmowlProvider({ children }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [monitoringUrl, setMonitoringUrl] = useState(null)
  const [registrationUrl, setRegistrationUrl] = useState(null)

  const [monitoringOK, setMonitoringOK] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const prepareExam = useCallback(async (exam, user) => {
    setLoading(true)
    setError(null)
    setMonitoringOK(false)
    setPreviewUrl(null)
    setMonitoringUrl(null)
    setRegistrationUrl(null)

    try {
      const activityUrl = window.location.href

      const commonParams = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,

        activityType: exam.type || 'quiz',
        activityId: exam.id,

        activityModule: exam.activityModule || exam.id,
        activityContainerId: exam.activityContainerId || exam.courseId || exam.id,

        activityUrl,
        lang: 'es',
        type: '3',
      }

      const preview = await buildMonitorUrl({
        ...commonParams,
        isMonitoring: '0',
      })

      const active = await buildMonitorUrl({
        ...commonParams,
        isMonitoring: '1',
      })

      setPreviewUrl(preview)
      setMonitoringUrl(active)
    } catch (err) {
      console.error('Error preparando SMOWL:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setPreviewUrl(null)
    setMonitoringUrl(null)
    setRegistrationUrl(null)
    setMonitoringOK(false)
    setError(null)
  }, [])

  return (
    <SmowlContext.Provider
      value={{
        previewUrl,
        monitoringUrl,
        registrationUrl,
        monitoringOK,
        setMonitoringOK,
        loading,
        error,
        prepareExam,
        reset,
      }}
    >
      {children}
    </SmowlContext.Provider>
  )
}

export function useSmowl() {
  const ctx = useContext(SmowlContext)
  if (!ctx) throw new Error('useSmowl debe usarse dentro de <SmowlProvider>')
  return ctx
}