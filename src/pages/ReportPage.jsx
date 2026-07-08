/**
 * ReportPage.jsx
 * Muestra el informe de actividades de SMOWL vía iframe con postMessage.
 * También permite ver el registro de usuarios.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSmowl } from '../context/SmowlContext'
import SmowlReports from '../components/SmowlReports'
import styles from './ReportPage.module.css'

// Actividades de demo para VAR13
const DEMO_ACTIVITIES = [
  { displayName: 'Evaluación de Prueba SMOWL', activityId: 'EXAM-DEMO-001', activityType: 'quiz' },
]

export default function ReportPage() {
  const { user, logout } = useAuth()
  const { reset } = useSmowl()
  const navigate   = useNavigate()
  const [tab, setTab] = useState('results')  // 'results' | 'registers'

  const handleNewExam = () => { reset(); navigate('/exam') }
  const handleLogout  = () => { reset(); logout(); navigate('/login') }

  const demoUsers = user
    ? [{ id: user.id, name: user.name }]
    : []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>SMOWL · COCORUNIAMERICANA</span>
          {user && <span className={styles.userChip}>👤 {user.name}</span>}
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
      </header>

      <div className={styles.content}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.pageTitle}>Reportes de supervisión</h1>
            <p className={styles.pageDesc}>
              Los informes se cargan directamente desde SMOWL vía iframe autenticado.
            </p>
          </div>
          <button className={styles.newExamBtn} onClick={handleNewExam}>
            ← Nuevo examen
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'results'   ? styles.tabActive : ''}`}
            onClick={() => setTab('results')}
          >
            📊 Informe de actividades
          </button>
          <button
            className={`${styles.tab} ${tab === 'registers' ? styles.tabActive : ''}`}
            onClick={() => setTab('registers')}
          >
            👥 Gestión de usuarios
          </button>
        </div>

        {/* Iframe de reportes SMOWL */}
        <div className={styles.iframeWrapper}>
          <SmowlReports
            key={tab}                     // re-monta al cambiar de tab
            mode={tab}
            users={demoUsers}
            activities={DEMO_ACTIVITIES}
          />
        </div>

        <p className={styles.note}>
          Los reportes se cargan desde <code>https://reports.smowltech.net</code> usando
          tu API Key de COCORUNIAMERICANA. Si ves una pantalla vacía, confirma que el
          usuario realizó el examen con SMOWL activo y que el <code>userId</code> coincide.
        </p>
      </div>
    </div>
  )
}
