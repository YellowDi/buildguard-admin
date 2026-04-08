const AUTH_SESSION_STORAGE_KEY = "buildguard.auth.session"
const LEGACY_TOKEN_STORAGE_KEYS = ["token", "access_token", "auth_token", "Authorization", "authorization"] as const
const LEGACY_DEVICE_STORAGE_KEYS = ["X-Device", "x-device", "device", "device_id"] as const
const AUTH_EXPIRED_EVENT = "app:auth-expired"

export type AuthState = "missing" | "expired" | "authenticated"

type AuthSession = {
  device: string
  token: string
}

const EMPTY_AUTH_SESSION: AuthSession = {
  device: "",
  token: "",
}

let didAttemptLegacyMigration = false

export function getAuthToken() {
  return getAuthSession().token
}

export function getAuthDevice() {
  return getAuthSession().device
}

export function getAuthState(): AuthState {
  const token = getAuthToken()

  if (!token) {
    return "missing"
  }

  return isTokenExpired(token) ? "expired" : "authenticated"
}

export function setAuthToken(token: string) {
  updateAuthSession({
    token,
  })
}

export function setAuthDevice(device: string) {
  updateAuthSession({
    device,
  })
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)

  for (const storage of [window.localStorage, window.sessionStorage]) {
    clearLegacySessionKeys(storage)
  }
}

export function isAuthenticated() {
  return getAuthState() === "authenticated"
}

export function notifyAuthExpired() {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

export function onAuthExpired(handler: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const listener = () => {
    handler()
  }

  window.addEventListener(AUTH_EXPIRED_EVENT, listener)

  return () => {
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener)
  }
}

function getAuthSession(): AuthSession {
  if (typeof window === "undefined") {
    return EMPTY_AUTH_SESSION
  }

  const storedSession = readStoredAuthSession(window.localStorage)

  if (storedSession) {
    return storedSession
  }

  return migrateLegacyAuthSession()
}

function updateAuthSession(next: Partial<AuthSession>) {
  if (typeof window === "undefined") {
    return
  }

  const currentSession = getAuthSession()
  const token = normalizeSessionValue(next.token ?? currentSession.token)
  const device = normalizeSessionValue(next.device ?? currentSession.device)

  persistAuthSession({
    token,
    device,
  })
}

function persistAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return
  }

  const normalizedSession: AuthSession = {
    token: normalizeSessionValue(session.token),
    device: normalizeSessionValue(session.device),
  }

  if (!normalizedSession.token && !normalizedSession.device) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession))
}

function readStoredAuthSession(storage: Storage): AuthSession | null {
  const rawValue = storage.getItem(AUTH_SESSION_STORAGE_KEY)?.trim()

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthSession> | null

    if (!parsed || typeof parsed !== "object") {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }

    const session = {
      token: normalizeSessionValue(parsed.token),
      device: normalizeSessionValue(parsed.device),
    }

    if (!session.token && !session.device) {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }

    return session
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

function migrateLegacyAuthSession() {
  if (typeof window === "undefined") {
    return EMPTY_AUTH_SESSION
  }

  if (didAttemptLegacyMigration) {
    return EMPTY_AUTH_SESSION
  }

  didAttemptLegacyMigration = true

  const migratedSession = readLegacyAuthSession()

  if (!migratedSession.token && !migratedSession.device) {
    return EMPTY_AUTH_SESSION
  }

  persistAuthSession(migratedSession)

  for (const storage of [window.localStorage, window.sessionStorage]) {
    clearLegacySessionKeys(storage)
  }

  return migratedSession
}

function readLegacyAuthSession(): AuthSession {
  if (typeof window === "undefined") {
    return EMPTY_AUTH_SESSION
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const token = readStorageValue(storage, LEGACY_TOKEN_STORAGE_KEYS)
    const device = readStorageValue(storage, LEGACY_DEVICE_STORAGE_KEYS)

    if (token || device) {
      return {
        token,
        device,
      }
    }
  }

  return EMPTY_AUTH_SESSION
}

function readStorageValue(storage: Storage, keys: readonly string[]) {
  for (const key of keys) {
    const value = normalizeSessionValue(storage.getItem(key))

    if (value) {
      return value
    }
  }

  return ""
}

function clearLegacySessionKeys(storage: Storage) {
  for (const key of LEGACY_TOKEN_STORAGE_KEYS) {
    storage.removeItem(key)
  }

  for (const key of LEGACY_DEVICE_STORAGE_KEYS) {
    storage.removeItem(key)
  }
}

function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token)

  if (!payload || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return false
  }

  return Date.now() >= payload.exp * 1000
}

function decodeJwtPayload(token: string) {
  if (typeof window === "undefined") {
    return null
  }

  const segments = token.split(".")

  if (segments.length < 2) {
    return null
  }

  const payload = segments[1]?.trim()

  if (!payload) {
    return null
  }

  try {
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=")
    const decoded = window.atob(normalized)
    const utf8 = decodeURIComponent(
      Array.from(decoded, (char: string) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    )

    return JSON.parse(utf8) as { exp?: number }
  } catch {
    return null
  }
}

function normalizeSessionValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
