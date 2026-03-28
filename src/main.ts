import { createApp } from "vue"

import App from "./App.vue"
import router from "./router"
import "@/composables/useGlobalBranding"
import { clearAuthToken, onAuthExpired } from "./lib/auth"
import { clearCurrentUser } from "./composables/useCurrentUser"
import "./styles/global.css"
import "./styles/detail-layout.css"
import "remixicon/fonts/remixicon.css"
import "vue-sonner/style.css"

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
