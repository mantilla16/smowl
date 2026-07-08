/**
 * SmowlMonitor.jsx
 * ──────────────────────────────────────────────────────────────
 * Componente que embebe el iframe de monitorización de SMOWL
 * y escucha los eventos postMessage:
 *   - monitoringstatusOK    → cámara y herramientas listas
 *   - monitoringstatusNOTOK → algo falló (cámara desactivada, etc.)
 *
 * Tamaño oficial: 220x300px (según documentación SMOWL)
 * ──────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react'
import styles from './SmowlMonitor.module.css'

/**
 * @param {object}   props
 * @param {string}   props.src          URL del iframe generada con buildMonitoringUrl()
 * @param {function} props.onStatusOK   Llamado cuando monitoringstatusOK llega
 * @param {function} props.onStatusNOTOK Llamado cuando monitoringstatusNOTOK llega
 * @param {boolean}  props.isPreview    Si true, muestra badge "Verificando cámara"
 */
export default function SmowlMonitor({ src, onStatusOK, onStatusNOTOK, isPreview = false }) {
  const [status,  setStatus]  = useState('loading')   // loading | ok | notok
  const [loaded,  setLoaded]  = useState(false)
  const iframeRef = useRef(null)

  // Escuchar postMessage de SMOWL (sección 6.2 de la doc)
  useEffect(() => {
    function handleMessage(e) {
      const msg = e.data || e.message
      if (msg === 'monitoringstatusOK') {
        setStatus('ok')
        onStatusOK?.()
      }
      if (msg === 'monitoringstatusNOTOK') {
        setStatus('notok')
        onStatusNOTOK?.()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onStatusOK, onStatusNOTOK])

  if (!src) return null

  return (
    <div className={styles.wrapper}>
      {/* Badge de estado */}
      <div className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
        <span className={styles.dot} />
        {status === 'loading' && 'Conectando…'}
        {status === 'ok'      && (isPreview ? 'Cámara lista ✓' : 'Supervisión activa ✓')}
        {status === 'notok'   && 'Cámara no disponible ⚠'}
      </div>

      {/* Skeleton mientras carga */}
      {!loaded && <div className={styles.skeleton} />}

      {/* iframe oficial SMOWL — atributos exactos de la documentación */}
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera; microphone; fullscreen"
        sandbox="allow-top-navigation allow-scripts allow-modals allow-same-origin allow-popups allow-downloads allow-popups-to-escape-sandbox"
        width="220"
        height="300"
        frameBorder="0"
        allowFullScreen
        scrolling="no"
        className={`${styles.iframe} ${loaded ? styles.iframeVisible : ''}`}
        onLoad={() => setLoaded(true)}
        title="SMOWL Supervisión"
      />

      {isPreview && status === 'notok' && (
        <p className={styles.warning}>
          Activa los permisos de cámara en tu navegador y recarga la página.
        </p>
      )}
    </div>
  )
}
