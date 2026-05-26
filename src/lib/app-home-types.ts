export type AppHomeModuleType = "video" | "article"

export type AppHomeVideoSource =
  | {
      id: string
      kind: "category"
      categoryId: string
    }
  | {
      id: string
      kind: "video"
      videoId: string
    }

export type AppHomeVideoCategory = {
  id: string
  title: string
  sortOrder: number
  sources: AppHomeVideoSource[]
}

export type AppHomeBaseModule = {
  id: string
  type: AppHomeModuleType
  title: string
  enabled: boolean
  sortOrder: number
}

export type AppHomeVideoModule = AppHomeBaseModule & {
  type: "video"
  categories: AppHomeVideoCategory[]
}

export type AppHomeArticleModule = AppHomeBaseModule & {
  type: "article"
  articleId: string
}

export type AppHomeModule = AppHomeVideoModule | AppHomeArticleModule
