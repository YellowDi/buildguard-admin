import type { ThemeMode } from "@/composables/useAppTheme"

export type SettingsCategoryKey = "general" | "notifications" | "security"

export type SettingsActionKey =
  | "save-profile"
  | "send-test-notification"
  | "review-active-sessions"
  | "revoke-other-sessions"
  | "delete-workspace"

export type SettingsState = {
  displayName: string
  supportEmail: string
  startupView: string
  timezone: string
  themeMode: ThemeMode
  compactTables: boolean
  reducedMotion: boolean
  showCommandHints: boolean
  criticalAlerts: boolean
  browserNotifications: boolean
  digestFrequency: string
  twoFactorEnabled: boolean
  sessionTimeout: string
}

type BaseSettingsItem = {
  key: string
  label: string
  description: string
}

export type SettingsToggleItem = BaseSettingsItem & {
  type: "toggle"
  modelKey: keyof SettingsState
}

export type SettingsInputItem = BaseSettingsItem & {
  type: "input"
  modelKey: keyof SettingsState
  placeholder?: string
}

export type SettingsSelectItem = BaseSettingsItem & {
  type: "select"
  modelKey: keyof SettingsState
  options: Array<{ label: string, value: string }>
}

export type SettingsButtonItem = BaseSettingsItem & {
  type: "button"
  actionKey: SettingsActionKey
  buttonLabel: string
  variant?: "default" | "outline" | "secondary" | "destructive"
}

export type SettingsItem =
  | SettingsToggleItem
  | SettingsInputItem
  | SettingsSelectItem
  | SettingsButtonItem

export type SettingsSection = {
  key: string
  title: string
  description: string
  tone?: "default" | "danger"
  items: SettingsItem[]
}

export type SettingsCategory = {
  key: SettingsCategoryKey
  label: string
  description: string
  icon: string
  sections: SettingsSection[]
}
