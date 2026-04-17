import { ref } from "vue"
import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from "vue-router"

const settingsBackTarget = ref<RouteLocationRaw>({ name: "dashboard" })

function isSettingsRoute(route: Pick<RouteLocationNormalizedLoaded, "name">) {
  return route.name === "settings"
}

export function rememberSettingsBackTarget(route: Pick<RouteLocationNormalizedLoaded, "name" | "fullPath">) {
  if (isSettingsRoute(route) || route.name === "login" || route.name === "signup" || route.name === "otp") {
    return
  }

  settingsBackTarget.value = route.fullPath || { name: "dashboard" }
}

export function useSettingsNavigation() {
  return {
    settingsBackTarget,
  }
}
