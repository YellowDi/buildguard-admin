const TRUE_VALUES = new Set(["1", "true", "yes", "on"])

function parseScopeSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean),
  )
}

export function shouldUseMockData(scope?: string) {
  const globalFlag = import.meta.env.VITE_USE_MOCK_DATA?.trim().toLowerCase()

  if (globalFlag && TRUE_VALUES.has(globalFlag)) {
    return true
  }

  if (!scope) {
    return false
  }

  return parseScopeSet(import.meta.env.VITE_MOCK_DATA_SCOPES).has(scope)
}
