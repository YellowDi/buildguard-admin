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

export type AppHomeMockState = {
  modules: AppHomeModule[]
}

const APP_HOME_MOCK_STATE: AppHomeMockState = {
  modules: [
    {
      id: "home-module-safety-tech",
      type: "video",
      title: "安全技术",
      enabled: true,
      sortOrder: 10,
      categories: [
        {
          id: "home-category-engineer",
          title: "工程师解读",
          sortOrder: 10,
          sources: [
            {
              id: "source-engineer-onboarding",
              kind: "category",
              categoryId: "video-safety-onboarding",
            },
            {
              id: "source-engineer-alarm-filtering",
              kind: "video",
              videoId: "video-alarm-filtering",
            },
          ],
        },
        {
          id: "home-category-test",
          title: "安全测试",
          sortOrder: 20,
          sources: [
            {
              id: "source-test-diagnosis",
              kind: "category",
              categoryId: "video-safety-diagnosis",
            },
          ],
        },
        {
          id: "home-category-science",
          title: "安全科普",
          sortOrder: 30,
          sources: [
            {
              id: "source-science-priority",
              kind: "video",
              videoId: "video-home-priority",
            },
            {
              id: "source-science-recycle",
              kind: "video",
              videoId: "video-home-recycle",
            },
          ],
        },
      ],
    },
    {
      id: "home-module-service-article",
      type: "article",
      title: "了解我们如何真诚的为客户服务",
      enabled: true,
      sortOrder: 20,
      articleId: "article-home-campaign",
    },
    {
      id: "home-module-brand-story",
      type: "video",
      title: "品牌故事",
      enabled: true,
      sortOrder: 30,
      categories: [
        {
          id: "home-category-brand-main",
          title: "分类标题",
          sortOrder: 10,
          sources: [
            {
              id: "source-brand-home",
              kind: "category",
              categoryId: "video-ops-home",
            },
          ],
        },
        {
          id: "home-category-brand-service",
          title: "分类标题",
          sortOrder: 20,
          sources: [
            {
              id: "source-brand-distribution",
              kind: "category",
              categoryId: "video-ops-distribution",
            },
          ],
        },
        {
          id: "home-category-brand-values",
          title: "分类标题",
          sortOrder: 30,
          sources: [
            {
              id: "source-brand-service-plan",
              kind: "video",
              videoId: "video-service-plan-flow",
            },
          ],
        },
      ],
    },
  ],
}

export function createAppHomeMockState(): AppHomeMockState {
  return structuredClone(APP_HOME_MOCK_STATE)
}
