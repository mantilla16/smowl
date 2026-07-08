/**
 * SmowlContext.jsx
 * Gestiona el estado de la sesión de proctoring.
 * Con el enfoque iframe de SMOWL no hay "sesión API" —
 * el estado se maneja localmente y las URLs se generan con JWT.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import {
  buildMonitoringUrl,
  buildPreviewUrl,
  buildRegistrationUrl,
} from '../services/smowlService'

const SmowlContext = createContext(null)

export function SmowlProvider({ children }) {
  const [monitoringUrl,  setMonitoringUrl]  = useState(null)
  const [previewUrl,     setPreviewUrl]     = useState(null)
  const [registrationUrl, setRegistrationUrl] = useState(null)
  const [monitoringOK,   setMonitoringOK]   = useState(false)  // postMessage status
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)

  /**
   * Prepara todas las URLs necesarias para un examen.
   * Se llama desde ExamPage al entrar al flujo.
   */
  const prepareExam = useCallback(async (exam, user) => {
    setLoading(true)
    setError(null)
    setMonitoringOK(false)
    try {
      const params = {
        userId:               user.id,
        userName:             user.name.replace(/[^a-zA-Z0-9]/g, ''),
        userEmail:            user.email,
        activityContainerId:  exam.courseId || 'CURSODEMO001',
        activityType:         exam.type     || 'quiz',
        activityId:           exam.id,
        activityUrl:          'https://localhost:5173/exam',
      }

      const [mUrl, pUrl, rUrl] = await Promise.all([
        buildMonitoringUrl(params),
        buildPreviewUrl(params),
        buildRegistrationUrl(params),
      ])

      setMonitoringUrl(mUrl)
      setPreviewUrl(pUrl)
      setRegistrationUrl(rUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setMonitoringUrl(null)
    setPreviewUrl(null)
    setRegistrationUrl(null)
    setMonitoringOK(false)
    setError(null)
  }, [])

  return (
    <SmowlContext.Provider value={{
      monitoringUrl, previewUrl, registrationUrl,
      monitoringOK,  setMonitoringOK,
      loading, error,
      prepareExam, reset,
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
