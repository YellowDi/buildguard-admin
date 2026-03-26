const AUTH_TOKEN_STORAGE_KEY = "token"
const TOKEN_STORAGE_KEYS = ["token", "access_token", "auth_token", "Authorization", "authorization"] as const
const AUTH_EXPIRED_EVENT = "app:auth-expired"

export function getAuthToken() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() ?? ""
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  const normalized = token.trim()

  if (!normalized) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalized)
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of TOKEN_STORAGE_KEYS) {
      storage.removeItem(key)
    }
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
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
