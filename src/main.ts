import { createApp } from "vue"

import App from "./App.vue"
import router from "./router"
import "./styles/global.css"
import "./styles/detail-layout.css"
import "remixicon/fonts/remixicon.css"
import "vue-sonner/style.css"

createApp(App).use(router).mount("#app")
