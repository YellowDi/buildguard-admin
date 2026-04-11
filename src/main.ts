import { createApp } from "vue"

import App from "./App.vue"
import router from "./router"
import "@/composables/useGlobalBranding"
import { clearAuthToken, onAuthExpired } from "./lib/auth"
import { ApiConfigurationError, ensureApiEnvironmentSecurity } from "./lib/api"
import { clearCurrentUser } from "./composables/useCurrentUser"
import "./styles/global.css"
import "./styles/detail-layout.css"
import "remixicon/fonts/remixicon.css"
import "vue-sonner/style.css"

const startupError = getStartupErrorMessage()

if (startupError) {
  renderStartupError(startupError)
} else {
  const app = createApp(App)

  app.use(router)
  app.mount("#app")

  let handlingAuthExpired = false

  onAuthExpired(() => {
    if (handlingAuthExpired) {
      return
    }

    handlingAuthExpired = true
    clearAuthToken()
    clearCurrentUser()

    const { fullPath, name } = router.currentRoute.value

    void router.replace({
      name: "login",
      query: name === "login" ? undefined : { redirect: fullPath },
    }).finally(() => {
      handlingAuthExpired = false
    })
  })

  requestAnimationFrame(() => {
    document.body.classList.add("app-ready")
  })
}

function getStartupErrorMessage() {
  try {
    ensureApiEnvironmentSecurity()
    return ""
  } catch (error) {
    if (error instanceof ApiConfigurationError) {
      return error.message
    }

    return error instanceof Error ? error.message : "应用初始化失败，请检查环境配置。"
  }
}

function renderStartupError(message: string) {
  document.body.classList.add("app-ready")
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-warm);color:var(--foreground);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="width:min(520px,100%);border:1px solid var(--border-whisper);border-radius:16px;background:var(--card);padding:24px;box-shadow:var(--shadow-deep);">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:var(--destructive);">启动失败</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;">登录服务配置不安全或不完整</h1>
        <p style="margin:0;font-size:14px;line-height:1.6;color:var(--muted-foreground);">${escapeHtml(message)}</p>
      </div>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
