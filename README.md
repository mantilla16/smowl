# SMOWL Proctoring — Integración React + Vite
## Entidad: COCORUNIAMERICANA

---

## Arrancar el proyecto

```bash
npm install
npm run dev
# → http://localhost:5173
```

El `.env` ya tiene tus credenciales configuradas.

---

## Cómo funciona (según documentación oficial SMOWL)

### NO es una API REST — es iframe + JWT

```
1. Tu app genera un JWT firmado con tu JWT Secret
2. Ese token va como query param en la URL del iframe
3. El iframe de SMOWL (https://app.smowltech.net/monitor/) hace la supervisión
4. SMOWL envía eventos postMessage a tu página:
     monitoringstatusOK    → cámara lista, puedes dejar entrar al examen
     monitoringstatusNOTOK → cámara perdida, bloquea o expulsa al alumno
5. Los reportes se cargan con otro iframe (reports.smowltech.net)
   autenticado vía postMessage con tu apiKey
```

---

## Flujo implementado

```
/login
  └── Formulario con usuarios demo

/exam
  ├── FASE 1 — Setup:
  │     iframe con isMonitoring=0 (solo verifica cámara, sin capturar)
  │     Botón "Iniciar" bloqueado hasta recibir monitoringstatusOK
  │
  └── FASE 2 — Examen activo:
        iframe con isMonitoring=1 (captura evidencias)
        Si monitoringstatusNOTOK → modal de expulsión

/report
  ├── Tab "Informe de actividades" → iframe /results con postMessage
  └── Tab "Gestión de usuarios"   → iframe /registers con postMessage
```

---

## Variables del JWT (por documentación SMOWL)

| VAR | Nombre               | Valor configurado          |
|-----|----------------------|----------------------------|
| VAR1 | entityName          | COCORUNIAMERICANA          |
| VAR2 | entityKey (licencia)| 145af9ce…                  |
| VAR3 | swlAPIKey           | 3ca32db2…                  |
| VAR4 | lang                | es                         |
| VAR5 | userId              | ID del usuario en tu app   |
| VAR6 | activityContainerId | ID del curso               |
| VAR7 | activityType        | quiz                       |
| VAR8 | activityId          | ID del examen              |
| VAR9 | activityUrl         | URL actual de la página    |
| VAR11| userName            | Nombre del alumno          |
| VAR12| userEmail           | Email del alumno           |

---

## Archivos clave

```
src/
├── services/smowlService.js    ← Generación JWT + URLs de iframes
├── components/
│   ├── SmowlMonitor.jsx        ← iframe de monitorización + postMessage listener
│   └── SmowlReports.jsx        ← iframe de reportes con postMessage auth
├── context/SmowlContext.jsx    ← Estado y URLs del examen activo
└── pages/
    ├── LoginPage.jsx
    ├── ExamPage.jsx            ← Flujo setup → examen con iframe SMOWL
    └── ReportPage.jsx          ← Reportes vía iframe SMOWL
```
