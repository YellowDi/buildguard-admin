import { computed, ref, watch } from "vue"

import defaultLogo from "@/assets/logo.svg"

const STORAGE_KEY = "buildguard-global-branding"

const siteName = ref("Workspace")
/** 非空时使用自定义图；null 表示使用内置 logo.svg */
const logoDataUrl = ref<string | null>(null)
const faviconDataUrl = ref<string | null>(null)

const logoSrc = computed(() => logoDataUrl.value ?? defaultLogo)
const faviconHref = computed(() => faviconDataUrl.value ?? defaultLogo)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("无法读取文件"))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error("读取失败"))
    reader.readAsDataURL(file)
  })
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }
    const data = JSON.parse(raw) as {
      siteName?: string
      logoDataUrl?: string | null
      faviconDataUrl?: string | null
    }
    if (typeof data.siteName === "string" && data.siteName.trim()) {
      siteName.value = data.siteName.trim()
    }
    if (typeof data.logoDataUrl === "string" && data.logoDataUrl.startsWith("data:")) {
      logoDataUrl.value = data.logoDataUrl
    } else {
      logoDataUrl.value = null
    }
    if (typeof data.faviconDataUrl === "string" && data.faviconDataUrl.startsWith("data:")) {
      faviconDataUrl.value = data.faviconDataUrl
    } else {
      faviconDataUrl.value = null
    }
  } catch {
    // ignore
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        siteName: siteName.value,
        logoDataUrl: logoDataUrl.value,
        faviconDataUrl: faviconDataUrl.value,
      }),
    )
  } catch {
    // quota / private mode
  }
}

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
  link.href = faviconHref.value
}

loadFromStorage()
applyToDocument()

watch([siteName, logoDataUrl, faviconDataUrl], () => {
  persist()
  applyToDocument()
})

export function useGlobalBranding() {
  async function setLogoFromFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      return
    }
    logoDataUrl.value = await readFileAsDataUrl(file)
  }

  async function setFaviconFromFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      return
    }
    faviconDataUrl.value = await readFileAsDataUrl(file)
  }

  function clearCustomLogo() {
    logoDataUrl.value = null
  }

  function clearCustomFavicon() {
    faviconDataUrl.value = null
  }

  return {
    siteName,
    logoDataUrl,
    faviconDataUrl,
    logoSrc,
    faviconHref,
    defaultLogo,
    setLogoFromFile,
    setFaviconFromFile,
    clearCustomLogo,
    clearCustomFavicon,
    persist,
    applyToDocument,
  }
}
