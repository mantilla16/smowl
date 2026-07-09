import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'

// Usuarios de demo para facilitar pruebas
const DEMO_USERS = [
  { id: '17898', name: 'Alberto Mantilla',    email: 'mantillaalberto@americana.edu.co' },
  { id: 'STU002', name: 'CarlosMejiaTorres', email: 'carlos.mejia@americana.edu.co' },
  { id: 'STU003', name: 'ValentinaRuizMora', email: 'val.ruiz@americana.edu.co' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]     = useState({ name: '', email: '', id: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'El nombre es obligatorio'
    if (!form.email.trim()) e.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo inválido'
    if (!form.id.trim())    e.id    = 'El ID de estudiante es obligatorio'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    // Simular pequeño delay de autenticación
    await new Promise(r => setTimeout(r, 600))
    login({ id: form.id, name: form.name, email: form.email })
    navigate('/exam')
  }

  const fillDemo = (user) => {
    setForm({ id: user.id, name: user.name, email: user.email })
    setErrors({})
  }

  return (
    <div className={styles.page}>
      {/* Panel izquierdo — identidad visual */}
      <aside className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>DEMO</div>
          <h1 className={styles.heroTitle}>
            Evaluación<br />con Proctoring
          </h1>
          <p className={styles.heroSub}>
            Integración SMOWL · React + Vite
          </p>
          <div className={styles.features}>
            {['Autenticación facial', 'Monitoreo de cámara', 'Control de aplicaciones', 'Reporte automático'].map(f => (
              <div key={f} className={styles.featureItem}>
                <span className={styles.featureDot} />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.heroPattern} aria-hidden="true" />
      </aside>

      {/* Panel derecho — formulario */}
      <main className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Acceder al examen</h2>
            <p className={styles.formDesc}>Ingresa tus datos para continuar</p>
          </div>

          {/* Acceso rápido con usuarios demo */}
          <div className={styles.demoSection}>
            <span className={styles.demoLabel}>Acceso rápido (demo)</span>
            <div className={styles.demoButtons}>
              {DEMO_USERS.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className={styles.demoBtn}
                  onClick={() => fillDemo(u)}
                >
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="student-id" className={styles.label}>ID de estudiante</label>
              <input
                id="student-id"
                type="text"
                className={`${styles.input} ${errors.id ? styles.inputError : ''}`}
                placeholder="Ej: STU-001"
                value={form.id}
                onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
              />
              {errors.id && <span className={styles.errorMsg}>{errors.id}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="full-name" className={styles.label}>Nombre completo</label>
              <input
                id="full-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                placeholder="Ej: Ana García López"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
              {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Correo institucional</label>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="Ej: ana.garcia@universidad.edu"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading
                ? <><span className={styles.spinner} /> Verificando...</>
                : 'Ingresar al examen →'
              }
            </button>
          </form>

          <p className={styles.footer}>
            Al continuar aceptas que SMOWL activará la supervisión de cámara y actividad durante el examen.
          </p>
        </div>
      </main>
    </div>
  )
}
