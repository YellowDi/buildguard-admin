import type { SettingsState } from "@/components/settings/types"

export type SettingsSnapshot = Partial<SettingsState>

// Backend settings endpoints are not available yet. Keep the async API stable
// so the UI wiring does not need another refactor when the service is ready.
export async function loadSettingsSnapshot(): Promise<SettingsSnapshot> {
  return {}
}

export async function saveSettingsSnapshot(_state: SettingsState) {
  return
}
