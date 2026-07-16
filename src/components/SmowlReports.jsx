/**
 * SmowlReports.jsx
 * Carga los informes de SMOWL (reports.smowltech.net) vía iframe + postMessage.
 * Autenticación por swlAPIKey (NO usa JWT, a diferencia del widget de cámara).
 *
 * Props:
 *   mode: 'results'   -> informe de actividades (evidencias)   -> path /results
 *         'registers' -> gestión de usuarios registrados        -> path /registers
 *   users: [{ id, name }]  -> se convierte a aNames_json (VAR10)
 *   activities: [{ displayName, activityId, activityType }] (VAR13, solo 'results')
 */

import React, { useEffect, useRef } from 'react'

const REPORTS_ENDPOINT = 'https://reports.smowltech.net/auth/'
const ENTITY_NAME = 'COCORUNIAMERICANA'
const SWL_API_KEY  = '3ca32db2e6286ecbbc8a4ba6f4fb28c85d1c0f47'

export default function SmowlReports({ mode = 'results', users = [], activities = [] }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const sendData = () => {
      // users [{id,name}] -> { "id": "name", ... }  (aNames_json / VAR10)
      const courseUsers = {}
      users.forEach(u => { courseUsers[u.id] = u.name })

      const payload = {
        type: 'postAuthData',
        entityName: ENTITY_NAME,
        apiKey: SWL_API_KEY,
        origin: 'lti',
        courseUsers: JSON.stringify(courseUsers),
        lang: 'es',
        path: mode === 'registers' ? '/registers' : '/results',
      }

      if (mode === 'results') {
        payload.activities = JSON.stringify(activities)
      }

      iframe.contentWindow.postMessage(payload, REPORTS_ENDPOINT)
    }

    const onLoad = () => setTimeout(sendData, 500)
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [mode, users, activities])

  return (
    <iframe
      ref={iframeRef}
      src={REPORTS_ENDPOINT}
      title="SMOWL Reports"
      style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none' }}
    />
  )
}