/**
 * SmowlReports.jsx
 * ──────────────────────────────────────────────────────────────
 * Componente para los iframes de reportes de SMOWL.
 * Usa postMessage para autenticar (secciones 7 y 8 de la doc).
 *
 * Dos modos:
 *   mode="registers" → Gestión de usuarios registrados (VAR10)
 *   mode="results"   → Informe de actividades (VAR10 + VAR13)
 * ──────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  ENTITY_NAME, API_KEY,
  buildANamesJson, buildActivitiesJson,
} from '../services/smowlService'
import styles from './SmowlReports.module.css'

const REPORTS_URL = 'https://reports.smowltech.net/auth/'

/**
 * @param {object}  props
 * @param {'registers'|'results'} props.mode
 * @param {Array}   props.users       [{ id, name }]
 * @param {Array}   [props.activities] [{ displayName, activityId, activityType }]
 */
export default function SmowlReports({ mode = 'registers', users = [], activities = [] }) {
  const iframeRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  // Enviar postMessage cuando el iframe cargue (doc sección 7 y 8)
  useEffect(() => {
    if (!loaded || !iframeRef.current) return

    const message = {
      type:        'postAuthData',
      entityName:  ENTITY_NAME,
      apiKey:      API_KEY,
      origin:      'lti',
      courseUsers: buildANamesJson(users),
      lang:        'es',
      path:        mode === 'registers' ? '/registers' : '/results',
    }

    // Solo en modo "results" se envía la lista de actividades
    if (mode === 'results') {
      message.activities = buildActivitiesJson(activities)
    }

    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(message, REPORTS_URL)
    }, 500)
  }, [loaded, mode, users, activities])

  return (
    <div className={styles.wrapper}>
      {!loaded && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando reporte SMOWL…</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={REPORTS_URL}
        style={{ width: '100%', height: '100%', border: 'none', opacity: loaded ? 1 : 0 }}
        title={mode === 'registers' ? 'SMOWL Gestión de usuarios' : 'SMOWL Informe de actividades'}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
