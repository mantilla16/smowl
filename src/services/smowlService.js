// ── Constantes de SMOWL (documentación oficial) ──────────────
export const MONITORING_ENDPOINT   = 'https://app.smowltech.net/monitor/'
export const REGISTRATION_ENDPOINT = 'https://app.smowltech.net/register/'
export const ISSUER                = 'smowl_custom_integration'
export const AUDIENCE              = 'https://swl.smowltech.net'

// ── Credenciales de COCORUNIAMERICANA ────────────────────────
export const ENTITY_NAME = 'COCORUNIAMERICANA'
export const LICENSE_KEY = '145af9ce639e7c3dcf93d6fbdabc5a249313778d'
export const API_KEY     = '3ca32db2e6286ecbbc8a4ba6f4fb28c85d1c0f47'
export const JWT_SECRET  = 'e011ef5bbb32387742c4c1b1189011231c72d7d4'

// ── JWT helpers ───────────────────────────────────────────────

function b64url(str) {
  return btoa(
    Array.from(new TextEncoder().encode(str))
      .map(b => String.fromCharCode(b))
      .join('')
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlBytes(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function signJWT(payload) {
  const header  = { alg: 'HS256', typ: 'JWT' }
  const hEnc    = b64url(JSON.stringify(header))
  const pEnc    = b64url(JSON.stringify(payload))
  const message = `${hEnc}.${pEnc}`

  // crypto.subtle solo funciona en HTTPS — en desarrollo usamos hmacSHA256 manual
  if (window.crypto && window.crypto.subtle) {
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
    return `${message}.${b64urlBytes(new Uint8Array(sig))}`
  }

  // Fallback para HTTP/localhost — HMAC-SHA256 manual
  const sig = await hmacSHA256(JWT_SECRET, message)
  return `${message}.${sig}`
}

async function hmacSHA256(secret, message) {
  // Implementación HMAC-SHA256 sin SubtleCrypto
  const key = Array.from(new TextEncoder().encode(secret))
  const msg = Array.from(new TextEncoder().encode(message))
  
  const BLOCK = 64
  let k = key.length > BLOCK
    ? Array.from(await sha256bytes(key))
    : key
  while (k.length < BLOCK) k.push(0)

  const opad = k.map(b => b ^ 0x5c)
  const ipad = k.map(b => b ^ 0x36)

  const inner = await sha256bytes([...ipad, ...msg])
  const outer = await sha256bytes([...opad, ...Array.from(inner)])
  return b64urlBytes(new Uint8Array(outer))
}

async function sha256bytes(data) {
  const buf = await window.crypto.subtle.digest('SHA-256', new Uint8Array(data))
  return new Uint8Array(buf)
}

// ── Tokens JWT ────────────────────────────────────────────────

export async function buildMonitoringToken (p) {
  const now = Math.floor(Date.now() / 1000)
  return signJWT({
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + 1800,
    entityName:          ENTITY_NAME,
    entityKey:           LICENSE_KEY,
    swlAPIKey:           API_KEY,
    isMonitoring:        1,
    userId:              String(p.userId),
    activityContainerId: String(p.activityContainerId),
    activityType:        String(p.activityType),
    activityId:          String(p.activityId),
    activityUrl:         String(p.activityUrl),
    userName:            String(p.userName),
    userEmail:           String(p.userEmail),
    lang:                'es',
  })
}

export async function buildPreviewToken(p) {
  const now = Math.floor(Date.now() / 1000)
  return signJWT({
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + 1800,
    entityName:          ENTITY_NAME,
    entityKey:           LICENSE_KEY,
    swlAPIKey:           API_KEY,
    isMonitoring:        0,
    userId:              String(p.userId),
    activityContainerId: String(p.activityContainerId),
    activityType:        String(p.activityType),
    activityId:          String(p.activityId),
    activityUrl:         String(p.activityUrl),
    userName:            String(p.userName),
    userEmail:           String(p.userEmail),
    lang:                'es',
  })
}

export async function buildRegistrationToken(p) {
  const now = Math.floor(Date.now() / 1000)
  return signJWT({
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + 3600,
    entity_Name:   ENTITY_NAME,
    swlLicenseKey: LICENSE_KEY,
    swlAPIKey:     API_KEY,
    user_idUser:   String(p.userId),
    activityUrl:   String(p.activityUrl),
    userName:      String(p.userName),
    userEmail:     String(p.userEmail),
    lang:          'es',
  })
}

// ── URLs de iframes ───────────────────────────────────────────
// IMPORTANTE: userName, userEmail y activityUrl van con encodeURIComponent
// pero NO dentro de searchParams.set (que ya hace encoding propio).
// Se construye la URL manualmente para evitar doble encoding.

function buildSmowlUrl(base, token, params) {
  const userName    = encodeURIComponent(params.userName)
  const userEmail   = encodeURIComponent(params.userEmail)
  const activityUrl = encodeURIComponent(params.activityUrl)
  return `${base}?entityName=${ENTITY_NAME}` +
    `&swlLicenseKey=${LICENSE_KEY}` +
    `&swlAPIKey=${API_KEY}` +
    `&token=${token}` +
    `&userName=${userName}` +
    `&userEmail=${userEmail}` +
    `&userId=${encodeURIComponent(params.userId)}` +
    `&activityContainerId=${encodeURIComponent(params.activityContainerId)}` +
    `&activityType=${encodeURIComponent(params.activityType)}` +
    `&activityId=${encodeURIComponent(params.activityId)}` +
    `&lang=es&type=0` +
    `&activityUrl=${activityUrl}`
}

export async function buildMonitoringUrl(params) {
  const token = await buildMonitoringToken(params)
  return buildSmowlUrl(MONITORING_ENDPOINT, token, params)
}

export async function buildPreviewUrl(params) {
  const token = await buildPreviewToken(params)
  return buildSmowlUrl(MONITORING_ENDPOINT, token, params)
}

export async function buildRegistrationUrl(params) {
  const token = await buildRegistrationToken(params)
  return buildSmowlUrl(REGISTRATION_ENDPOINT, token, params)
}

// ── Helpers de reportes ───────────────────────────────────────

export function buildANamesJson(users) {
  const obj = {}
  users.forEach(u => { obj[u.id] = u.name })
  return JSON.stringify(obj)
}

export function buildActivitiesJson(activities) {
  return JSON.stringify(activities)
}