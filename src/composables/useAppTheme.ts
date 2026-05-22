import { computed, watch } from "vue"
import { usePreferredDark, useStorage } from "@vueuse/core"

export type ThemeMode = "system" | "light" | "dark"
export type SidebarColor = "default" | "mauve" | "olive" | "mist" | "taupe"

export const THEME_OPTIONS: Array<{ value: ThemeMode, label: string, icon: string }> = [
  { value: "system", label: "系统", icon: "ri-computer-line" },
  { value: "light", label: "浅色", icon: "ri-sun-line" },
  { value: "dark", label: "深色", icon: "ri-moon-line" },
]

export const SIDEBAR_COLOR_OPTIONS: Array<{ value: SidebarColor, label: string, swatchClass: string }> = [
  { value: "default", label: "默认", swatchClass: "bg-[#fbfaf9] dark:bg-[#202020]" },
  { value: "mauve", label: "Mauve", swatchClass: "bg-mauve-50 dark:bg-mauve-950" },
  { value: "olive", label: "Olive", swatchClass: "bg-olive-50 dark:bg-olive-950" },
  { value: "mist", label: "Mist", swatchClass: "bg-mist-50 dark:bg-mist-950" },
  { value: "taupe", label: "Taupe", swatchClass: "bg-taupe-50 dark:bg-taupe-950" },
]

const THEME_STORAGE_KEY = "app-theme"
const LEGACY_THEME_STORAGE_KEY = "app-dark-mode"
const SIDEBAR_COLOR_STORAGE_KEY = "app-sidebar-color"

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
  if (typeof window === "undefined") return "default"

  const stored = window.localStorage.getItem(SIDEBAR_COLOR_STORAGE_KEY)
  return isSidebarColor(stored) ? stored : "default"
}

function applyThemeClass(dark: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", dark)
}

function applySidebarColor(color: SidebarColor) {
  if (typeof document === "undefined") return

  if (color === "default") {
    delete document.documentElement.dataset.sidebarColor
    return
  }

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
    sidebarColor.value = "default"
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
