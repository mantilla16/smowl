// smowlService.js — Integración SMOWL COCORUNIAMERICANA
// Flujo real: JWT { data:{...}, iat } → auth.smowltech.net → credenciales AWS

export const AUTH_ENDPOINT    = 'https://auth.smowltech.net/v1/credentials'
export const MONITOR_ENDPOINT = 'https://swl.smowltech.net/monitor/'

export const ENTITY_NAME = 'COCORUNIAMERICANA'
export const ENTITY_ID   = 3300
export const LICENSE_KEY = '145af9ce639e7c3dcf93d6fbdabc5a249313778d'
export const API_KEY     = '3ca32db2e6286ecbbc8a4ba6f4fb28c85d1c0f47'
export const JWT_SECRET  = 'e011ef5bbb32387742c4c1b1189011231c72d7d4'
export const DEFAULT_MODALITY_ID = 8844

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
  const header  = { typ: 'JWT', alg: 'HS256' }
  const message = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return `${message}.${b64urlBytes(new Uint8Array(sig))}`
}

export async function buildAuthToken({ userId, activityId, activityType, idModality }) {
  return signJWT({
    data: {
      userId:        String(userId),
      activityId:    String(activityId),
      activityType:  String(activityType),
      entityId:      ENTITY_ID,
      swlLicenseKey: LICENSE_KEY,
      entityName:    ENTITY_NAME,
      idModality:    idModality || DEFAULT_MODALITY_ID,
    },
    iat: Math.floor(Date.now() / 1000),
  })
}

export async function getCredentials(params) {
  const token = await buildAuthToken(params)
  const url = `${AUTH_ENDPOINT}?entityName=${encodeURIComponent(ENTITY_NAME)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': '*/*' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(`Auth SMOWL (${res.status}): ${err.message || 'error'}`)
  }
  return res.json()
}

export async function buildMonitorUrl(params) {
  const token = await buildAuthToken(params)
  return `${MONITOR_ENDPOINT}?token=${token}&entityName=${encodeURIComponent(ENTITY_NAME)}`
}