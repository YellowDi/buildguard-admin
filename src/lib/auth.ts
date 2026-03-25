const AUTH_TOKEN_STORAGE_KEY = "token"

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

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}
