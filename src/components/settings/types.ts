import type { ThemeMode } from "@/composables/useAppTheme"
import type { DefaultAvatarKey } from "@/lib/default-avatars"

export type SettingsCategoryGroupKey = "account" | "workspace" | "feature" | "admin"

export const SETTINGS_CATEGORY_KEYS = [
  "me",
  "preferences",
  "apps",
  "general",
  "members",
  "developer",
  "business-presets",
  "inspection-items",
  "notifications",
  "security",
] as const

export type SettingsCategoryKey = (typeof SETTINGS_CATEGORY_KEYS)[number]

export const DEFAULT_SETTINGS_CATEGORY_KEY: SettingsCategoryKey = "me"

export function isSettingsCategoryKey(value: string): value is SettingsCategoryKey {
  return (SETTINGS_CATEGORY_KEYS as readonly string[]).includes(value)
}

export type SettingsActionKey =
  | "save-profile"
  | "open-members-directory"
  | "review-member-invites"
  | "send-test-notification"
  | "review-active-sessions"
  | "revoke-other-sessions"
  | "delete-workspace"
  | "manage-email"
  | "change-password"
  | "add-2fa"
  | "add-passkey"
  | "delete-account"
  | "logout-all-devices"
  | "copy-user-id"

export type SettingsState = {
  accountName: string
  accountEmail: string
  displayName: string
  supportEmail: string
  startupView: string
  enterKeyStartsNewLine: boolean
  language: string
  numberFormat: string
  bidirectionalTextControl: boolean
  weekStartsOnMonday: boolean
  dateFormat: string
  autoTimezoneByLocation: boolean
  timezone: string
  themeMode: ThemeMode
  compactTables: boolean
  reducedMotion: boolean
  showCommandHints: boolean
  usageDiagnostics: boolean
  cookiePreference: string
  viewHistoryVisible: boolean
  profileDiscoverable: boolean
  memberDefaultRole: string
  inviteApprovalRequired: boolean
  allowExternalMembers: boolean
  criticalAlerts: boolean
  browserNotifications: boolean
  digestFrequency: string
  twoFactorEnabled: boolean
  sessionTimeout: string
  appRelease: AppReleaseDraft
  // Me page fields
  preferredName: string
  selectedAvatarKey: DefaultAvatarKey
  userId: string
  supportAccessEnabled: boolean
}

export type AppReleasePlatform = "android" | "ios"

export type AppReleasePackageType = "apk" | "app-store"

export type AppReleaseDraft = {
  hasUpdate: boolean
  versionName: string
  versionCode: number
  title: string
  description: string
  forceUpdate: boolean
  downloadUrl: string
  appStoreUrl: string
  packageType: AppReleasePackageType
  platform: AppReleasePlatform
}

export type BooleanSettingsKey = {
  [K in keyof SettingsState]: SettingsState[K] extends boolean ? K : never
}[keyof SettingsState]

export type StringSettingsKey = {
  [K in keyof SettingsState]: SettingsState[K] extends string ? K : never
}[keyof SettingsState]

type BaseSettingsItem = {
  key: string
  label: string
  description: string
}

export type SettingsToggleItem = BaseSettingsItem & {
  type: "toggle"
  modelKey: BooleanSettingsKey
}

export type SettingsInputItem = BaseSettingsItem & {
  type: "input"
  modelKey: StringSettingsKey
  placeholder?: string
}

export type SettingsSelectItem = BaseSettingsItem & {
  type: "select"
  modelKey: StringSettingsKey
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
  group: SettingsCategoryGroupKey
  label: string
  description: string
  pageTitle?: string
  pageDescription?: string
  icon: string
  avatarSrc?: string
  avatarFallback?: string
  sections: SettingsSection[]
}
