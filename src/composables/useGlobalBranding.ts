import { computed, ref } from "vue"

import defaultLogo from "@/assets/baojing-yunwei-logo.png"

const DEFAULT_SITE_NAME = "宝京云维"

const siteName = ref(DEFAULT_SITE_NAME)
const logoSrc = computed(() => defaultLogo)
const faviconHref = computed(() => defaultLogo)

function applyToDocument() {
  if (typeof document === "undefined") {
    return
  }
  document.title = siteName.value

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }
  link.type = "image/png"
  link.href = faviconHref.value
}

applyToDocument()

export function useGlobalBranding() {
  return {
    siteName,
    logoSrc,
    faviconHref,
    applyToDocument,
  }
}
