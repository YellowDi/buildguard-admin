import { createApp } from "vue"

import App from "./App.vue"
import router from "./router"
import "./style.css"
import "./styles/detail-page.css"
import "remixicon/fonts/remixicon.css"
import "vue-sonner/style.css"

createApp(App).use(router).mount("#app")
