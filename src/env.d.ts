/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_DEVICE?: string
  readonly VITE_ENABLE_LEGACY_TOKEN_HEADER?: string
  readonly VITE_MOCK_DATA_SCOPES?: string
  readonly VITE_REQUIRE_SECURE_API?: string
  readonly VITE_API_TOKEN?: string
  readonly VITE_API_TOKEN_HEADER?: string
  readonly VITE_API_TOKEN_PREFIX?: string
  readonly VITE_USE_MOCK_DATA?: string
  /** 高德地图 Web JS Key（需在控制台配置域名白名单；存储坐标需与 GCJ-02 一致） */
  readonly VITE_AMAP_KEY?: string
  /** 高德「安全密钥」，与 Key 配对时使用；勿提交到 Git */
  readonly VITE_AMAP_SECURITY_JS_CODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.vue" {
  import type { DefineComponent } from "vue"

  const component: DefineComponent<{}, {}, any>
  export default component
}
