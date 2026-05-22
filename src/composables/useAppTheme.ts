import { computed, watch } from "vue"
import { usePreferredDark, useStorage } from "@vueuse/core"

export type ThemeMode = "system" | "light" | "dark"
export type SidebarColor = "default" | "mauve" | "olive" | "mist" | "taupe"

export const THEME_OPTIONS: Array<{ value: ThemeMode, label: string, icon: string }> = [
  { value: "system", label: "系统", icon: "ri-computer-line" },
  { value: "light", label: "浅色", icon: "ri-sun-line" },
  { value: "dark", label: "深色", icon: "ri-moon-line" },
]

export const SIDEBAR_COLOR_OPTIONS: Array<{ value: SidebarColor, label: string }> = [
  { value: "default", label: "默认" },
  { value: "mauve", label: "Mauve" },
  { value: "olive", label: "Olive" },
  { value: "mist", label: "Mist" },
  { value: "taupe", label: "Taupe" },
]

const THEME_STORAGE_KEY = "app-theme"
const LEGACY_THEME_STORAGE_KEY = "app-dark-mode"
const SIDEBAR_COLOR_STORAGE_KEY = "app-sidebar-color"
const SIDEBAR_COLOR_STORAGE_VERSION_KEY = "app-sidebar-color-version"
const SIDEBAR_COLOR_STORAGE_VERSION = "2"
const DEFAULT_SIDEBAR_COLOR: SidebarColor = "default"

function isSidebarColor(value: string | null): value is SidebarColor {
  return value === "default"
    || value === "mauve"
    || value === "olive"
    || value === "mist"
    || value === "taupe"
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === "system" || stored === "light" || stored === "dark") {
    return stored
  }

  const legacy = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
  if (legacy === "true") {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    return "dark"
  }

  if (legacy === "false") {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light")
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    return "light"
  }

  return "system"
}

function resolveInitialSidebarColor(): SidebarColor {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_COLOR

  const stored = window.localStorage.getItem(SIDEBAR_COLOR_STORAGE_KEY)
  const storageVersion = window.localStorage.getItem(SIDEBAR_COLOR_STORAGE_VERSION_KEY)

  if (storageVersion !== SIDEBAR_COLOR_STORAGE_VERSION) {
    const migratedColor = stored === "mauve" || stored === "olive" || stored === "mist"
      ? stored
      : DEFAULT_SIDEBAR_COLOR

    window.localStorage.setItem(SIDEBAR_COLOR_STORAGE_KEY, migratedColor)
    window.localStorage.setItem(SIDEBAR_COLOR_STORAGE_VERSION_KEY, SIDEBAR_COLOR_STORAGE_VERSION)

    return migratedColor
  }

  return isSidebarColor(stored) ? stored : DEFAULT_SIDEBAR_COLOR
}

function applyThemeClass(dark: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", dark)
}

function applySidebarColor(color: SidebarColor) {
  if (typeof document === "undefined") return

  document.documentElement.dataset.sidebarColor = color
}

const preferredDark = usePreferredDark()
const themeMode = useStorage<ThemeMode>(THEME_STORAGE_KEY, resolveInitialTheme())
const sidebarColor = useStorage<SidebarColor>(SIDEBAR_COLOR_STORAGE_KEY, resolveInitialSidebarColor())
const isDark = computed(() =>
  themeMode.value === "system" ? preferredDark.value : themeMode.value === "dark",
)

watch(isDark, value => applyThemeClass(value), { immediate: true })
watch(sidebarColor, (value) => {
  if (!isSidebarColor(value)) {
    sidebarColor.value = DEFAULT_SIDEBAR_COLOR
    return
  }

  applySidebarColor(value)
}, { immediate: true })

export function useAppTheme() {
  return {
    isDark,
    sidebarColor,
    sidebarColorOptions: SIDEBAR_COLOR_OPTIONS,
    themeMode,
    themeOptions: THEME_OPTIONS,
  }
}
