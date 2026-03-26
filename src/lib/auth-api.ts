import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { buildApiHeadersWithoutAuth, buildApiUrl } from "@/lib/api"
import { isMd5Hash, md5 } from "@/lib/md5"

export type LoginPayload = {
  Account: string
  Password: string
}

type LoginResponse = {
  Token?: string
  token?: string
  access_token?: string
  accessToken?: string
  Authorization?: string
  authorization?: string
  data?: {
    Token?: string
    token?: string
    access_token?: string
    accessToken?: string
    Authorization?: string
    authorization?: string
  }
}

const LOGIN_API_URL = buildApiUrl("/bqi/public/login")
const LOGIN_ERROR_MESSAGE = "登录失败，请稍后重试。"

export async function login(payload: LoginPayload) {
  const normalizedPassword = payload.Password.trim()

  const response = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: buildApiHeadersWithoutAuth({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Account: payload.Account.trim(),
      Password: isMd5Hash(normalizedPassword) ? normalizedPassword.toLowerCase() : md5(normalizedPassword),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, LOGIN_ERROR_MESSAGE)
  }

  const token = extractToken(responseBody)

  if (!token) {
    throw new Error("登录响应缺少 Token 字段。")
  }

  return {
    token,
  }
}

function extractToken(payload: unknown) {
  const record = asRecord(payload)

  if (!record) {
    return ""
  }

  return findToken(record)
}

function readTokenField(value: Record<string, unknown> | null) {
  if (!value) {
    return ""
  }

  for (const key of ["Token", "token", "access_token", "accessToken", "Authorization", "authorization"]) {
    const resolvedToken = normalizeTokenValue(value[key])

    if (resolvedToken) {
      return resolvedToken
    }
  }

  return ""
}

function findToken(value: unknown, depth = 0): string {
  if (depth > 4) {
    return ""
  }

  const record = asRecord(value)

  if (!record) {
    return ""
  }

  const directToken = readTokenField(record)

  if (directToken) {
    return directToken
  }

  for (const key of ["data", "result", "payload"]) {
    const nestedToken = findToken(record[key], depth + 1)

    if (nestedToken) {
      return nestedToken
    }
  }

  return ""
}

function normalizeTokenValue(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  const normalized = value.trim()

  if (!normalized) {
    return ""
  }

  return normalized.startsWith("Bearer ")
    ? normalized.slice("Bearer ".length).trim()
    : normalized
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
