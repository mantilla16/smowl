# SMOWL Proctoring · Integración React + Vite

Integración del sistema de proctoring (supervisión de exámenes) **SMOWL** en una aplicación propia **React + Vite**, ejecutándose **fuera de Moodle** para la entidad `COCORUNIAMERICANA` (Corporación Universitaria Americana).

La aplicación replica el flujo de autenticación que Moodle usa internamente, permitiendo mostrar el widget de cámara durante los exámenes y los informes de supervisión para docentes, sin depender de la plataforma Moodle.

---

## Tabla de contenidos

- [Arquitectura general](#arquitectura-general)
- [Requisitos](#requisitos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Despliegue en producción](#despliegue-en-producción)
- [Cómo funciona SMOWL](#cómo-funciona-smowl)
- [Los dos JWT (diferencia crítica)](#los-dos-jwt-diferencia-crítica)
- [Integración del widget de cámara](#integración-del-widget-de-cámara)
- [Integración de reportes docentes](#integración-de-reportes-docentes)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Variables de integración](#variables-de-integración)
- [Errores comunes](#errores-comunes)
- [Pendientes y notas de seguridad](#pendientes-y-notas-de-seguridad)

---

## Arquitectura general

```
[App React + Vite]  ──►  sirve bajo la subruta /smowl/  (Nginx, build estático)
        │
        ├──► Widget de cámara  ── iframe swl.smowltech.net/monitor/  (autenticación JWT)
        │
        └──► Reportes docentes ── iframe reports.smowltech.net/auth/  (autenticación por API Key + postMessage)
```

- **Frontend:** React + Vite, React Router.
- **Servidor:** Nginx sirviendo el build estático (`dist/`).
- **Proctoring:** SMOWL (widget de cámara + informes), servicios externos de Smowltech.

---

## Requisitos

- Node.js 18+ y npm
- Nginx (para producción)
- Credenciales de SMOWL para la entidad (ver [Variables de integración](#variables-de-integración))

> **Compatibilidad de dependencias:** Vite y `@vitejs/plugin-react` deben tener versiones compatibles entre sí. Este proyecto usa versiones fijadas para evitar fallos de `npm install`:
>
> ```bash
> npm install -D vite@7.3.6 @vitejs/plugin-react@4.7.0
> ```

---

## Instalación y ejecución local

```bash
# Clonar
git clone https://github.com/mantilla16/smowl.git
cd smowl

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

> El dev server de Vite **no** es adecuado para producción. Para producción se sirve siempre el build estático (ver abajo).

---

## Despliegue en producción

La aplicación se sirve bajo la subruta `/smowl/`, no en la raíz. Esto requiere tres piezas coherentes entre sí:

### 1. Base de Vite

En `vite.config.js`:

```js
export default defineConfig({
  base: '/smowl/',
  // ...
})
```

### 2. Basename de React Router

En `src/main.jsx`:

```jsx
<BrowserRouter basename="/smowl">
  <App />
</BrowserRouter>
```

Las rutas internas (`/login`, `/exam`, `/report`) se mantienen igual; React Router sabe que la app vive dentro de `/smowl`.

### 3. Configuración de Nginx

Servir el build estático (no hacer proxy al dev server de Vite):

```nginx
location /smowl/ {
    alias /var/www/html/smowl/dist/;
    index index.html;
    try_files $uri $uri/ /smowl/index.html;
}
```

### 4. Compilar y recargar

```bash
cd /var/www/html/smowl
git pull origin master     # traer los últimos cambios
npm run build              # genera dist/
nginx -t                  # validar configuración
systemctl reload nginx
```

> **Importante:** crear o editar un archivo en el servidor **no** basta. Los cambios solo se reflejan tras `npm run build`, porque Nginx sirve el contenido compilado de `dist/`.

**Flujo de trabajo recomendado:** editar en un solo lugar (idealmente el PC local) → `commit` / `push` → en el servidor solo `git pull` + `npm run build`. Evita editar en ambos lados para no generar conflictos.

---

## Cómo funciona SMOWL

SMOWL usa **dos mecanismos distintos** según lo que se quiera mostrar:

| Función | Endpoint | Autenticación | Mecanismo |
|---|---|---|---|
| Widget de cámara | `swl.smowltech.net/monitor/` | JWT (en query `token=`) | iframe con token firmado |
| Reportes docentes | `reports.smowltech.net/auth/` | API Key (`swlAPIKey`) | iframe + `postMessage` |

El widget visual de la cámara es una SPA (Vue/Quasar) alojada por SMOWL que accede a la cámara, ejecuta modelos de detección en el navegador y escribe las evidencias directamente a la infraestructura de Smowltech. **La aplicación propia no necesita replicar nada de ese backend**: basta con cargar el iframe con el token correcto.

### Flujo de autenticación del widget

1. La app genera un JWT firmado (HS256) con los datos del usuario y la actividad.
2. Ese JWT se envía a `auth.smowltech.net/v1/credentials`.
3. SMOWL responde con credenciales temporales y un identificador de usuario.
4. El iframe `/monitor/` monta la SPA que gestiona cámara y evidencias.

---

## Los dos JWT (diferencia crítica)

SMOWL usa **dos JWT con estructuras diferentes**. Confundirlos causa el error `C-PC-1002` (`swlLicenseKey is empty`) y fue el problema más difícil de diagnosticar.

En ambos casos, **los campos van anidados bajo la clave `data`** (no en la raíz del payload). Ese fue el origen del error original.

### JWT A — para `/credentials`

```json
{
  "data": {
    "userId": "17898",
    "activityId": "32422",
    "activityType": "quiz",
    "entityId": 3300,
    "swlLicenseKey": "<clave_de_licencia>",
    "entityName": "COCORUNIAMERICANA",
    "idModality": 8844
  },
  "iat": 1783541016
}
```

### JWT B — para el iframe `/monitor/`

```json
{
  "iss": "smowl_moodle_plugin",
  "aud": "<dominio>",
  "iat": 1783544842,
  "exp": 1783588042,
  "data": {
    "entityKey": "<clave_de_licencia>",
    "activityType": "quiz",
    "activityModule": "<id>",
    "activityContainerId": "<id>",
    "userId": "17898",
    "activityId": "32422",
    "isMonitoring": "0"
  }
}
```

### Comparación

| Aspecto | JWT A (`/credentials`) | JWT B (`/monitor/`) |
|---|---|---|
| Clave de licencia | `swlLicenseKey` | `entityKey` |
| `iss` / `aud` / `exp` | No | Sí |
| `entityId` / `entityName` | Sí | No |
| `idModality` | Sí | No |
| `activityModule` | No | Sí |
| `activityContainerId` | No | Sí |
| `isMonitoring` | No | `"0"` (previo) / `"1"` (activo) |

> **`isMonitoring`** distingue la fase previa del examen (`"0"`, solo comprobación de cámara, sin capturar evidencias) del monitoreo activo (`"1"`, grabando durante el examen). Se generan URLs distintas según la fase.

---

## Integración del widget de cámara

El iframe de monitorización se inserta en la página del examen. URL de referencia:

```
https://swl.smowltech.net/monitor/
    ?token=<JWT_B>
    &entityName=COCORUNIAMERICANA
    &lang=es
    &type=3
    &userName=<nombre>
    &userEmail=<email>
    &activityUrl=<url_encoded_del_examen>
```

### Control de acceso a la actividad

El bloque de monitorización emite eventos vía `window.postMessage` que la plataforma puede escuchar para habilitar o bloquear el acceso al examen:

- `monitoringstatusOK`: todas las herramientas verificadas correctamente.
- `monitoringstatusNOTOK`: alguna herramienta dejó de estar habilitada (por ejemplo, se revocaron permisos de cámara).

```js
window.addEventListener("message", function (e) {
  if (e.data === "monitoringstatusOK") {
    // habilitar botón de continuar al examen
  }
  if (e.data === "monitoringstatusNOTOK") {
    // alertar / expulsar de la actividad
  }
});
```

---

## Integración de reportes docentes

Los reportes **no usan JWT**. Se integran con un iframe fijo a `reports.smowltech.net/auth/` al que se le envían los datos por `postMessage` unos 500 ms después de cargar. La autenticación es por `swlAPIKey`.

Existen dos vistas, iguales salvo el campo `path` (y un parámetro extra en la de resultados):

| Vista | `path` | Contenido |
|---|---|---|
| Gestión de usuarios | `/registers` | Usuarios registrados / no registrados e incidencias de registro |
| Informe de actividades | `/results` | Evidencias de los exámenes monitoreados (requiere `activities`) |

### Componente `SmowlReports.jsx`

```jsx
import React, { useEffect, useRef } from 'react'

const REPORTS_ENDPOINT = 'https://reports.smowltech.net/auth/'
const ENTITY_NAME = 'COCORUNIAMERICANA'
const SWL_API_KEY  = '<swlAPIKey>'   // ver nota de seguridad

/**
 * mode: 'results'   -> informe de actividades (evidencias)  -> path /results
 *       'registers' -> gestión de usuarios registrados       -> path /registers
 * users: [{ id, name }]  -> se convierte a aNames_json (VAR10)
 * activities: [{ displayName, activityId, activityType }] (VAR13, solo 'results')
 */
export default function SmowlReports({ mode = 'results', users = [], activities = [] }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const sendData = () => {
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
```

### Detalle importante: concatenación `activityType + activityId`

SMOWL concatena internamente el tipo y el ID de la actividad. Para `activityType: 'quiz'` y `activityId: '32422'`, la petición busca la actividad `quiz32422`. Si se usa un ID que no corresponde a un examen realmente monitoreado, SMOWL responde `404` (código `NFE_003`). El `activityId` debe ser el de una actividad que sí generó evidencias.

El `userId` se pasa **sin prefijo de entidad** (por ejemplo `17898`, no `COCORUNIAMERICANA_17898`).

---

## Estructura del proyecto

```
smowl/
├── vite.config.js              # base: '/smowl/'
├── src/
│   ├── main.jsx                # BrowserRouter basename="/smowl"
│   ├── App.jsx                 # rutas: /login, /exam, /report
│   ├── context/
│   │   ├── AuthContext.jsx     # sesión de usuario
│   │   └── SmowlContext.jsx    # estado SMOWL, credenciales y URLs
│   ├── components/
│   │   ├── SmowlMonitor.jsx    # widget de cámara (iframe /monitor/)
│   │   └── SmowlReports.jsx    # reportes docentes (iframe + postMessage)
│   └── pages/
│       ├── LoginPage.jsx
│       ├── ExamPage.jsx        # examen con widget de cámara
│       └── ReportPage.jsx      # reportes: informe de actividades + gestión de usuarios
└── dist/                       # build de producción (servido por Nginx)
```

---

## Variables de integración

| Variable | VAR | Descripción |
|---|---|---|
| `entityName` | VAR1 | Nombre de la entidad (`COCORUNIAMERICANA`) |
| `entityKey` | VAR2 | Clave de licencia (JWT del monitor) |
| `swlAPIKey` | VAR3 | Clave de API (reportes) |
| `lang` | VAR4 | Idioma (`es`) |
| `userId` | VAR5 | ID del alumno (sin prefijo de entidad) |
| `activityContainerId` | VAR6 | ID del curso |
| `activityType` | VAR7 | Tipo de actividad (`quiz`, `test`, `survey`...) |
| `activityId` | VAR8 | ID de la actividad/examen |
| `activityUrl` | VAR9 | URL de la página con el iframe (URL-encoded) |
| `aNames_json` / `courseUsers` | VAR10 | JSON `{ "userId": "Nombre Apellido" }` |
| `userName` | VAR11 | Nombre completo (URL-encoded) |
| `userEmail` | VAR12 | Correo (URL-encoded) |
| `activities` | VAR13 | Lista `[{ displayName, activityId, activityType }]` (informe de actividades) |

> Los valores configurables deben ser alfanuméricos, sin caracteres especiales. `activityUrl`, `userName` y `userEmail` deben ir URL-encoded.

---

## Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `C-PC-1002` (`swlLicenseKey is empty`) | Campos del JWT en la raíz en vez de bajo `data` | Anidar todo bajo la clave `data` |
| `404` / `NFE_003` en reportes | `activityId` que no corresponde a un examen monitoreado | Usar un `activityId` con evidencias reales |
| Informe vacío (sin error) | `courseUsers` mal formado o vacío | Verificar formato `{ "userId": "Nombre" }` |
| Assets no cargan (404 en `/assets/...`) | Falta `base: '/smowl/'` en Vite | Configurar `base` y recompilar |
| Rutas internas rotas | Falta `basename` en React Router | Configurar `basename="/smowl"` |
| `502` en Nginx | Proxy al dev server de Vite | Servir el build estático (`dist/`) |
| Fallo en `npm install` | Versiones incompatibles Vite / plugin-react | Fijar versiones compatibles |

> **Sincronización de servidores:** para el protocolo seguro, el servidor debe estar sincronizado por NTP (`time.aws.com`, `time.google.com`).

---

## Pendientes y notas de seguridad

- [ ] **Datos dinámicos:** el `activityId` y la lista de usuarios deben provenir de la base de datos / Moodle por cada examen, no estar fijos en el código. Cada estudiante necesita que su JWT se arme con sus propios datos.
- [ ] **Control de acceso por rol en `/report`:** actualmente la ruta solo exige estar autenticado; no distingue estudiante de docente. Debe validarse el rol en el servidor/backend — ocultarlo en el frontend no es suficiente, y la `swlAPIKey` no debería llegar al navegador de un estudiante.
- [ ] **Rotar credenciales de SMOWL** (licencia, API key, secreto JWT) tras las pruebas de integración.

> ⚠️ **No se deben commitear credenciales reales** (`entityKey`, `swlAPIKey`, `JWT_SECRET`) en el repositorio. Se recomienda moverlas a variables de entorno (`.env`, no versionado) antes de exponer el repo.

---

## Referencias

| Recurso | URL |
|---|---|
| App desplegada | `https://n8n.americana.edu.co/smowl/` |
| Auth SMOWL | `https://auth.smowltech.net/v1/credentials` |
| Monitor SMOWL | `https://swl.smowltech.net/monitor/` |
| Reportes SMOWL | `https://reports.smowltech.net/auth/` |
| Documentación oficial de integración | Centro de ayuda de Smowltech |

---

_Corporación Universitaria Americana · Entidad COCORUNIAMERICANA · Analítica Americana_
