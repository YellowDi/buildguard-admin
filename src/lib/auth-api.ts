import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { buildApiHeaders, buildApiUrl } from "@/lib/api"

export type LoginPayload = {
  Account: string
  Password: string
}

type LoginResponse = {
  Token?: string
  token?: string
  data?: {
    Token?: string
    token?: string
  }
}

const LOGIN_API_URL = buildApiUrl("/bqi/public/login")
const LOGIN_ERROR_MESSAGE = "登录失败，请稍后重试。"

export async function login(payload: LoginPayload) {
  const response = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Account: payload.Account.trim(),
      Password: payload.Password,
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

  const topLevelToken = readTokenField(record)

  if (topLevelToken) {
    return topLevelToken
  }

  const nestedToken = readTokenField(asRecord(record.data))
  return nestedToken ?? ""
}

function readTokenField(value: Record<string, unknown> | null) {
  if (!value) {
    return ""
  }

  for (const key of ["Token", "token"]) {
    const token = value[key]

    if (typeof token === "string" && token.trim()) {
      return token.trim()
    }
  }

  return ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
