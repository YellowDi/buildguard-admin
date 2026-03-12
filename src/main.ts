import { createApp } from "vue"

import App from "./App.vue"
import router from "./router"
import "./styles/global.css"
import "./styles/detail-layout.css"
import "remixicon/fonts/remixicon.css"
import "vue-sonner/style.css"

const app = createApp(App)

app.use(router)
app.mount("#app")

requestAnimationFrame(() => {
  document.body.classList.add("app-ready")
})
