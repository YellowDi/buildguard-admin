import { watch } from "vue"

import { useAppTheme } from "@/composables/useAppTheme"

const THEME_COLOR_META_NAME = "theme-color"
const THEME_COLOR_LIGHT = "#ffffff"
const THEME_COLOR_DARK = "#191919"

function ensureThemeColorMetaTag() {
  if (typeof document === "undefined") {
    return null
  }

  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${THEME_COLOR_META_NAME}"]`)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", THEME_COLOR_META_NAME)
    document.head.appendChild(meta)
  }

  return meta
}

function applyThemeColor(dark: boolean) {
  const meta = ensureThemeColorMetaTag()

  if (!meta) {
    return
  }

  meta.setAttribute("content", dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT)
}

const { isDark } = useAppTheme()

watch(isDark, value => applyThemeColor(value), { immediate: true })
