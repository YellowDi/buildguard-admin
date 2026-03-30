import { load as loadAmapScript } from "@amap/amap-jsapi-loader"

import { getAmapKey, getAmapSecurityJsCode } from "@/lib/amap-config"

let loadPromise: Promise<any> | null = null

function applyAmapSecurityConfig() {
  const securityJsCode = getAmapSecurityJsCode()
  if (!securityJsCode) {
    return
  }

  const w = window as Window & { _AMapSecurityConfig?: { securityJsCode: string } }
  w._AMapSecurityConfig = {
    securityJsCode,
  }
}

/**
 * 单例加载高德 JS API 2.0（含 Marker 插件）。
 * resolve 值为全局 `AMap` 命名空间。
 */
export function loadAmap(): Promise<any> {
  const key = getAmapKey()
  if (!key) {
    return Promise.reject(new Error("VITE_AMAP_KEY 未配置。"))
  }

  if (!loadPromise) {
    applyAmapSecurityConfig()
    loadPromise = loadAmapScript({
      key,
      version: "2.0",
      plugins: ["AMap.Marker", "AMap.Geocoder"],
    })
  }

  return loadPromise
}
