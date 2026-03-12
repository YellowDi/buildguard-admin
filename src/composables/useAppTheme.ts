import { computed, watch } from "vue"
import { usePreferredDark, useStorage } from "@vueuse/core"

export type ThemeMode = "system" | "light" | "dark"

export const THEME_OPTIONS: Array<{ value: ThemeMode, label: string, icon: string }> = [
  { value: "system", label: "系统", icon: "ri-computer-line" },
  { value: "light", label: "浅色", icon: "ri-sun-line" },
  { value: "dark", label: "深色", icon: "ri-moon-line" },
]

const THEME_STORAGE_KEY = "app-theme"
const LEGACY_THEME_STORAGE_KEY = "app-dark-mode"

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

function applyThemeClass(dark: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", dark)
}

const preferredDark = usePreferredDark()
const themeMode = useStorage<ThemeMode>(THEME_STORAGE_KEY, resolveInitialTheme())
const isDark = computed(() =>
  themeMode.value === "system" ? preferredDark.value : themeMode.value === "dark",
)

watch(isDark, value => applyThemeClass(value), { immediate: true })

export function useAppTheme() {
  return {
    isDark,
    themeMode,
    themeOptions: THEME_OPTIONS,
  }
}
