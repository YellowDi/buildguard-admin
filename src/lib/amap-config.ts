/**
 * 从环境变量读取高德 Web 端 Key，需在控制台为当前部署域名配置安全域名（Referer）白名单。
 */
export function getAmapKey(): string {
  const key = import.meta.env.VITE_AMAP_KEY
  if (typeof key === "string" && key.trim()) {
    return key.trim()
  }
  return ""
}

/**
 * 控制台「Key + 安全密钥」模式下的安全密钥，需在加载 JS API 前注入 `window._AMapSecurityConfig`。
 * 仅用于本地/部署环境变量，勿提交到仓库。
 */
export function getAmapSecurityJsCode(): string {
  const code = import.meta.env.VITE_AMAP_SECURITY_JS_CODE
  if (typeof code === "string" && code.trim()) {
    return code.trim()
  }
  return ""
}

export function isAmapConfigured(): boolean {
  return Boolean(getAmapKey())
}
