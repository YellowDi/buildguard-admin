import type { SidebarColor, ThemeMode } from "@/composables/useAppTheme"
import type { DefaultAvatarKey } from "@/lib/default-avatars"

export type SettingsCategoryGroupKey = "account" | "workspace" | "feature" | "admin"

export const SETTINGS_CATEGORY_KEYS = [
  "me",
  "preferences",
  "apps",
  "members",
  "developer",
  "business-presets",
  "inspection-items",
  "report-template",
] as const

export type SettingsCategoryKey = (typeof SETTINGS_CATEGORY_KEYS)[number]

export const DEFAULT_SETTINGS_CATEGORY_KEY: SettingsCategoryKey = "preferences"

export function isSettingsCategoryKey(value: string): value is SettingsCategoryKey {
  return (SETTINGS_CATEGORY_KEYS as readonly string[]).includes(value)
}

export type SettingsActionKey =
  | "open-members-directory"
  | "review-member-invites"

export type SettingsState = {
  accountName: string
  accountEmail: string
  enterKeyStartsNewLine: boolean
  language: string
  numberFormat: string
  bidirectionalTextControl: boolean
  weekStartsOnMonday: boolean
  dateFormat: string
  autoTimezoneByLocation: boolean
  timezone: string
  themeMode: ThemeMode
  sidebarColor: SidebarColor
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
  appRelease: AppReleaseDraft
  appReleases: AppReleaseEntry[]
  // Me page fields
  preferredName: string
  selectedAvatarKey: DefaultAvatarKey
  userId: string
}

export type AppReleasePlatform = "android" | "ios"

export type AppReleaseDraft = {
  hasUpdate: boolean
  versionName: string
  title: string
  description: string
  forceUpdate: boolean
  downloadUrl: string
  appStoreUrl: string
  platform: AppReleasePlatform
}

export type AppReleaseEntry = AppReleaseDraft & {
  id: string
  uuid?: string
  versionCode?: number | null
  updatedAt: string
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
