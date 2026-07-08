/**
 * ExamPage.jsx
 * Flujo correcto según documentación SMOWL:
 *
 * FASE 1 — "setup":    Verifica cámara con isMonitoring=0 (previewUrl)
 *                      Botón "Iniciar" desactivado hasta monitoringstatusOK
 * FASE 2 — "active":   Examen + iframe isMonitoring=1 (monitoringUrl)
 *                      Si monitoringstatusNOTOK llega → alerta al alumno
 * FASE 3 — "done":     Va al reporte
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSmowl } from '../context/SmowlContext'
import SmowlMonitor from '../components/SmowlMonitor'
import styles from './ExamPage.module.css'

const DEMO_EXAM = {
  id: '32422',
  activityModule: '1216437',
  activityContainerId: '2612',
  courseId: '2612',
  type: 'quiz',
  title: 'Evaluacion de Prueba SMOWL',
  duration: 30,
  questions: [
    {
      id: 1,
      text: '¿Cómo se llama el endpoint base de monitorización de SMOWL?',
      options: [
        'https://api.smowltech.net/v1/',
        'https://app.smowltech.net/monitor/',
        'https://smowl.net/api/monitor/',
        'https://reports.smowltech.net/monitor/',
      ],
      correct: 1,
    },
    {
      id: 2,
      text: '¿Qué evento postMessage envía SMOWL cuando la cámara está lista?',
      options: ['cameraReady', 'smowlOK', 'monitoringstatusOK', 'monitorReady'],
      correct: 2,
    },
    {
      id: 3,
      text: '¿Qué valor tiene isMonitoring cuando NO se quieren capturar evidencias?',
      options: ['null', 'false', '1', '0'],
      correct: 3,
    },
  ],
}

export default function ExamPage() {
  const { user } = useAuth()
  const { monitoringUrl, previewUrl, registrationUrl, monitoringOK,
          setMonitoringOK, loading, error, prepareExam, reset } = useSmowl()
  const navigate = useNavigate()

  const [phase,    setPhase]    = useState('setup')   // setup | active | done
  const [answers,  setAnswers]  = useState({})
  const [timeLeft, setTimeLeft] = useState(DEMO_EXAM.duration * 60)
  const [expelled, setExpelled] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return }
    prepareExam(DEMO_EXAM, user)
  }, []) // eslint-disable-line

  // Timer
  useEffect(() => {
    if (phase !== 'active') return
    if (timeLeft <= 0) { handleSubmit(); return }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, timeLeft]) // eslint-disable-line

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // monitoringstatusNOTOK durante el examen → expulsar
  const handleMonitorNOTOK = useCallback(() => {
    if (phase === 'active') setExpelled(true)
  }, [phase])

  const handleSubmit = useCallback(() => {
    setPhase('done')
    setTimeout(() => navigate('/report'), 800)
  }, [navigate])

  if (!user) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.examTitle}>{DEMO_EXAM.title}</span>
          <span className={styles.userBadge}>👤 {user.name}</span>
        </div>
        {phase === 'active' && (
          <div className={`${styles.timer} ${timeLeft < 120 ? styles.timerWarn : ''}`}>
            ⏱ {fmt(timeLeft)}
          </div>
        )}
      </header>

      {/* Modal de expulsión */}
      {expelled && (
        <div className={styles.expelOverlay}>
          <div className={styles.expelCard}>
            <div className={styles.expelIcon}>⚠️</div>
            <h2>Supervisión interrumpida</h2>
            <p>La cámara o micrófono dejó de estar disponible. El examen ha sido pausado.</p>
            <p>Reactiva los permisos en tu navegador y recarga la página para continuar.</p>
            <button className={styles.expelBtn} onClick={() => window.location.reload()}>
              Recargar página
            </button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Columna principal ── */}
        <main className={styles.mainCol}>

          {/* FASE SETUP: verificación de cámara */}
          {phase === 'setup' && (
            <div className={styles.setupCard}>
              <h2 className={styles.setupTitle}>Verificación previa al examen</h2>
              <p className={styles.setupDesc}>
                SMOWL está verificando tu cámara y micrófono. El botón de inicio
                se activará cuando todo esté listo.
              </p>

              <div className={styles.setupChecklist}>
                {[
                  'Cámara accesible y con buena iluminación',
                  'Micrófono activo',
                  'Estás solo en el espacio de trabajo',
                  'Navegador sin pestañas adicionales abiertas',
                ].map(item => (
                  <div key={item} className={styles.checkItem}>
                    <span className={`${styles.checkDot} ${monitoringOK ? styles.checkDotOK : ''}`} />
                    {item}
                  </div>
                ))}
              </div>

              {error && (
                <div className={styles.errorBanner}>
                  <strong>Error al preparar SMOWL:</strong> {error}
                </div>
              )}

              {registrationUrl && (
                <p className={styles.registerHint}>
                  ¿Primera vez?{' '}
                  <a href={registrationUrl} target="_blank" rel="noreferrer">
                    Regístrate en SMOWL primero →
                  </a>
                </p>
              )}

              <button
                className={styles.startBtn}
                disabled={!monitoringOK || loading}
                onClick={() => setPhase('active')}
              >
                {loading
                  ? <><span className={styles.spinner} /> Preparando…</>
                  : monitoringOK
                    ? 'Iniciar examen →'
                    : 'Esperando verificación de cámara…'
                }
              </button>
            </div>
          )}

          {/* FASE ACTIVE: preguntas */}
          {phase === 'active' && (
            <div className={styles.questionsWrap}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.round((Object.keys(answers).length / DEMO_EXAM.questions.length) * 100)}%` }}
                />
              </div>
              <p className={styles.progressLabel}>
                {Object.keys(answers).length} de {DEMO_EXAM.questions.length} respondidas
              </p>

              {DEMO_EXAM.questions.map((q, i) => (
                <div key={q.id} className={styles.questionCard}>
                  <p className={styles.questionNum}>Pregunta {i + 1}</p>
                  <p className={styles.questionText}>{q.text}</p>
                  <div className={styles.options}>
                    {q.options.map((opt, j) => (
                      <label key={j} className={`${styles.option} ${answers[q.id] === j ? styles.optionSel : ''}`}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === j}
                          onChange={() => setAnswers(p => ({ ...p, [q.id]: j }))}
                          className={styles.srOnly}
                        />
                        <span className={styles.optLetter}>{String.fromCharCode(65+j)}</span>
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < DEMO_EXAM.questions.length}
              >
                {Object.keys(answers).length < DEMO_EXAM.questions.length
                  ? `Responde todas (${DEMO_EXAM.questions.length - Object.keys(answers).length} pendientes)`
                  : 'Finalizar y enviar →'}
              </button>
            </div>
          )}

          {phase === 'done' && (
            <div className={styles.doneCard}>
              <div className={styles.doneSpinner} />
              <p>Finalizando sesión de proctoring…</p>
            </div>
          )}
        </main>

        {/* ── Columna lateral: iframe SMOWL ── */}
        <aside className={styles.sideCol}>
          <div className={styles.widgetHeader}>
            {phase === 'setup' ? (
              <span className={styles.verifyTag}>🔍 Verificando cámara</span>
            ) : (
              <span className={styles.liveTag}>● EN VIVO</span>
            )}
            <span className={styles.widgetLabel}>Supervisión SMOWL</span>
          </div>

          {/* Fase setup → previewUrl (isMonitoring=0, sin captura) */}
          {phase === 'setup' && previewUrl && (
            <SmowlMonitor
              src={previewUrl}
              isPreview={true}
              onStatusOK={() => setMonitoringOK(true)}
              onStatusNOTOK={() => setMonitoringOK(false)}
            />
          )}

          {/* Fase active → monitoringUrl (isMonitoring=1, captura activa) */}
          {phase === 'active' && monitoringUrl && (
            <SmowlMonitor
              src={monitoringUrl}
              isPreview={false}
              onStatusOK={() => setMonitoringOK(true)}
              onStatusNOTOK={handleMonitorNOTOK}
            />
          )}

          {loading && !previewUrl && (
            <div className={styles.widgetLoading}>
              <div className={styles.spinner} />
              <span>Generando token JWT…</span>
            </div>
          )}

          <p className={styles.smowlNote}>
            220×300px — tamaño oficial SMOWL
          </p>
        </aside>
      </div>
    </div>
  )
}
