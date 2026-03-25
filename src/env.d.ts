/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_DEVICE?: string
  readonly VITE_API_TOKEN?: string
  readonly VITE_API_TOKEN_HEADER?: string
  readonly VITE_API_TOKEN_PREFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
