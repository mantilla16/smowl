// src/services/smowlService.js

export const MONITOR_ENDPOINT = 'https://swl.smowltech.net/monitor/'

export const ENTITY_NAME = import.meta.env.VITE_SMOWL_ENTITY_NAME || 'COCORUNIAMERICANA'
export const ENTITY_KEY = import.meta.env.VITE_SMOWL_LICENSE_KEY
export const JWT_SECRET = import.meta.env.VITE_SMOWL_JWT_SECRET

export const SMOWL_ISS = import.meta.env.VITE_SMOWL_ISS || 'smowl_moodle_plugin'
export const SMOWL_AUD = import.meta.env.VITE_SMOWL_AUD || 'evapresencial.americana.edu.co'
export const TOKEN_TTL_SECONDS = Number(import.meta.env.VITE_SMOWL_TOKEN_TTL_SECONDS || 43200)

export const API_KEY = import.meta.env.VITE_SMOWL_API_KEY

function required(value, name) {
  if (!value) {
    throw new Error(`Falta configurar ${name} en el archivo .env`)
  }

  return value
}

function b64url(str) {
  return btoa(
    Array.from(new TextEncoder().encode(str))
      .map((b) => String.fromCharCode(b))
      .join('')
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function b64urlBytes(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function signJWT(payload) {
  const secret = required(JWT_SECRET, 'VITE_SMOWL_JWT_SECRET')

  const header = {
    typ: 'JWT',
    alg: 'HS256',
  }

  const message = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  )

  return `${message}.${b64urlBytes(new Uint8Array(signature))}`
}

export async function buildMonitorToken({
  activityType = 'quiz',
  activityModule,
  activityContainerId,
  userId,
  activityId,
  isMonitoring = '0',
}) {
  const entityKey = required(ENTITY_KEY, 'VITE_SMOWL_LICENSE_KEY')

  const now = Math.floor(Date.now() / 1000)

  return signJWT({
    iss: SMOWL_ISS,
    aud: SMOWL_AUD,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    data: {
      entityKey,
      activityType: String(activityType),
      activityModule: String(activityModule),
      activityContainerId: String(activityContainerId),
      userId: String(userId),
      activityId: String(activityId),
      isMonitoring: String(isMonitoring),
    },
  })
}

export async function buildMonitorUrl({
  userName,
  userEmail,
  activityUrl,
  lang = 'es',
  type = '3',

  activityType = 'quiz',
  activityModule,
  activityContainerId,
  userId,
  activityId,
  isMonitoring = '0',
}) {
  const token = await buildMonitorToken({
    activityType,
    activityModule,
    activityContainerId,
    userId,
    activityId,
    isMonitoring,
  })

  const params = new URLSearchParams({
    token,
    entityName: ENTITY_NAME,
    lang,
    type: String(type),
    userName: String(userName),
    userEmail: String(userEmail),
    activityUrl: String(activityUrl),
  })

  return `${MONITOR_ENDPOINT}?${params.toString()}`
}

// Estas dos funciones son necesarias porque SmowlReports.jsx las importa.
export function buildANamesJson(users = []) {
  return users.map((user) => ({
    id: String(user.id),
    name: String(user.name),
  }))
}

export function buildActivitiesJson(activities = []) {
  return activities.map((activity) => ({
    displayName: String(activity.displayName),
    activityId: String(activity.activityId),
    activityType: String(activity.activityType || 'quiz'),
  }))
}