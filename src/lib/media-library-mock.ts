export type MediaModuleKey = "videos" | "articles"
export type MediaStatus = "draft" | "published" | "scheduled"
export type VideoMediaViewKey = "grid" | "list"
export type ArticleMediaViewKey = "grid" | "list"
export type MediaViewKey = VideoMediaViewKey | ArticleMediaViewKey

export type MediaCategoryNode = {
  id: string
  name: string
  slug: string
  count: number
  module: MediaModuleKey
  children?: MediaCategoryNode[]
}

export type VideoCollection = {
  id: string
  title: string
  categoryId: string
  cover: string
  summary: string
  status: MediaStatus
  featured: boolean
  sortOrder: number
  chapterCount: number
  videoCount: number
  updatedAt: string
}

export type VideoChapter = {
  id: string
  collectionId: string
  title: string
  sortOrder: number
  summary: string
}

export type VideoItem = {
  id: string
  chapterId: string
  categoryId: string
  title: string
  cover: string
  duration: string
  summary: string
  status: MediaStatus
  featured: boolean
  sortOrder: number
  updatedAt: string
}

export type ArticleItem = {
  id: string
  categoryId: string
  title: string
  cover: string
  summary: string
  markdown: string
  tags: string[]
  status: MediaStatus
  featured: boolean
  sortOrder: number
  updatedAt: string
}

export type MediaPreviewTarget =
  | { kind: "collection"; id: string }
  | { kind: "chapter"; id: string }
  | { kind: "video"; id: string }
  | { kind: "article"; id: string }

export type MediaLibraryMockState = {
  videoCategories: MediaCategoryNode[]
  articleCategories: MediaCategoryNode[]
  videoCollections: VideoCollection[]
  videoChapters: VideoChapter[]
  videoItems: VideoItem[]
  articleItems: ArticleItem[]
}

export const MEDIA_STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: "published", label: "已发布" },
  { value: "scheduled", label: "待上线" },
  { value: "draft", label: "草稿" },
]

const MEDIA_LIBRARY_MOCK: MediaLibraryMockState = {
  videoCategories: [
    {
      id: "video-safety",
      name: "安防巡检",
      slug: "security-inspection",
      count: 7,
      module: "videos",
      children: [
        {
          id: "video-safety-onboarding",
          name: "新手入门",
          slug: "getting-started",
          count: 3,
          module: "videos",
        },
        {
          id: "video-safety-diagnosis",
          name: "问题排查",
          slug: "issue-diagnosis",
          count: 4,
          module: "videos",
        },
      ],
    },
    {
      id: "video-ops",
      name: "运营编排",
      slug: "operation-campaigns",
      count: 5,
      module: "videos",
      children: [
        {
          id: "video-ops-home",
          name: "首页编排",
          slug: "home-curation",
          count: 3,
          module: "videos",
        },
        {
          id: "video-ops-distribution",
          name: "分发策略",
          slug: "distribution",
          count: 2,
          module: "videos",
        },
      ],
    },
  ],
  articleCategories: [
    {
      id: "article-home",
      name: "首页内容",
      slug: "home-content",
      count: 4,
      module: "articles",
      children: [
        {
          id: "article-home-featured",
          name: "专题推荐",
          slug: "featured-stories",
          count: 2,
          module: "articles",
        },
        {
          id: "article-home-guide",
          name: "功能导览",
          slug: "feature-guides",
          count: 2,
          module: "articles",
        },
      ],
    },
    {
      id: "article-help",
      name: "帮助文档",
      slug: "help-center",
      count: 3,
      module: "articles",
      children: [
        {
          id: "article-help-faq",
          name: "常见问题",
          slug: "faq",
          count: 2,
          module: "articles",
        },
        {
          id: "article-help-release",
          name: "版本更新",
          slug: "release-notes",
          count: 1,
          module: "articles",
        },
      ],
    },
  ],
  videoCollections: [
    {
      id: "collection-safety-bootcamp",
      title: "7 天上手巡检后台",
      categoryId: "video-safety-onboarding",
      cover: "巡检后台 Bootcamp",
      summary: "从角色权限、任务配置到结果回流，帮助新成员在一周内搭好标准巡检流程。",
      status: "published",
      featured: true,
      sortOrder: 10,
      chapterCount: 2,
      videoCount: 4,
      updatedAt: "2026-04-18 10:30",
    },
    {
      id: "collection-alarm-closure",
      title: "告警研判与问题闭环",
      categoryId: "video-safety-diagnosis",
      cover: "告警处置与复盘",
      summary: "围绕告警筛选、误报识别、派单闭环和复盘看板建立统一处理流程。",
      status: "scheduled",
      featured: true,
      sortOrder: 18,
      chapterCount: 2,
      videoCount: 3,
      updatedAt: "2026-04-20 17:00",
    },
    {
      id: "collection-home-curation",
      title: "首页运营素材编排",
      categoryId: "video-ops-home",
      cover: "首页内容运营",
      summary: "介绍首页的视频与文章位如何配合专题、节奏和客户类型做内容分发。",
      status: "draft",
      featured: false,
      sortOrder: 24,
      chapterCount: 2,
      videoCount: 3,
      updatedAt: "2026-04-15 09:20",
    },
  ],
  videoChapters: [
    {
      id: "chapter-safety-roles",
      collectionId: "collection-safety-bootcamp",
      title: "第 1 章 · 初始化权限与角色",
      sortOrder: 1,
      summary: "从账号体系开始，确保课程中的每一步都能被真实角色复现。",
    },
    {
      id: "chapter-safety-routines",
      collectionId: "collection-safety-bootcamp",
      title: "第 2 章 · 搭建标准巡检流程",
      sortOrder: 2,
      summary: "通过检测服务、检测计划和工单调度串起完整流程。",
    },
    {
      id: "chapter-alarm-judge",
      collectionId: "collection-alarm-closure",
      title: "第 1 章 · 告警筛选与归因",
      sortOrder: 1,
      summary: "分清误报与真实异常，先建立统一筛选口径。",
    },
    {
      id: "chapter-alarm-dispatch",
      collectionId: "collection-alarm-closure",
      title: "第 2 章 · 派单与闭环动作",
      sortOrder: 2,
      summary: "让处置动作、协同路径与结果反馈保持一致。",
    },
    {
      id: "chapter-home-strategy",
      collectionId: "collection-home-curation",
      title: "第 1 章 · 首页位的节奏设计",
      sortOrder: 1,
      summary: "把视频、文章与活动位安排成稳定的首页内容节奏。",
    },
    {
      id: "chapter-home-reuse",
      collectionId: "collection-home-curation",
      title: "第 2 章 · 老素材复用机制",
      sortOrder: 2,
      summary: "用推荐位、标签和摘要提高同一素材的复用效率。",
    },
  ],
  videoItems: [
    {
      id: "video-member-roles",
      chapterId: "chapter-safety-roles",
      categoryId: "video-safety-onboarding",
      title: "成员与角色的最小配置",
      cover: "角色权限拆解",
      duration: "08:42",
      summary: "快速说明哪些权限必须先配置，避免课程后续步骤因角色不足卡住。",
      status: "published",
      featured: true,
      sortOrder: 11,
      updatedAt: "2026-04-18 10:30",
    },
    {
      id: "video-menu-buttons",
      chapterId: "chapter-safety-roles",
      categoryId: "video-safety-onboarding",
      title: "菜单与按钮权限怎么配",
      cover: "权限矩阵实操",
      duration: "06:18",
      summary: "通过具体按钮示例说明后台维护权限的粒度控制方式。",
      status: "published",
      featured: false,
      sortOrder: 12,
      updatedAt: "2026-04-18 10:45",
    },
    {
      id: "video-service-plan-flow",
      chapterId: "chapter-safety-routines",
      categoryId: "video-safety-onboarding",
      title: "检测服务到计划的串联方法",
      cover: "服务与计划串联",
      duration: "10:05",
      summary: "如何把检测服务、检测计划和工单触发顺序配置成可复用模板。",
      status: "published",
      featured: true,
      sortOrder: 13,
      updatedAt: "2026-04-18 11:15",
    },
    {
      id: "video-workflow-review",
      chapterId: "chapter-safety-routines",
      categoryId: "video-safety-onboarding",
      title: "上线前的流程复核清单",
      cover: "流程复核清单",
      duration: "04:36",
      summary: "用一张清单在上线前确认巡检路径、字段和通知是否完整。",
      status: "draft",
      featured: false,
      sortOrder: 14,
      updatedAt: "2026-04-17 16:00",
    },
    {
      id: "video-alarm-filtering",
      chapterId: "chapter-alarm-judge",
      categoryId: "video-safety-diagnosis",
      title: "告警列表的误报筛选技巧",
      cover: "误报识别",
      duration: "07:12",
      summary: "从等级、来源和上下文三个维度快速筛掉明显误报。",
      status: "scheduled",
      featured: true,
      sortOrder: 21,
      updatedAt: "2026-04-20 17:00",
    },
    {
      id: "video-alarm-routing",
      chapterId: "chapter-alarm-dispatch",
      categoryId: "video-safety-diagnosis",
      title: "转交与派单的选择标准",
      cover: "协同动作判断",
      duration: "05:44",
      summary: "统一误报、转交和派单之间的选择标准，减少重复流转。",
      status: "scheduled",
      featured: false,
      sortOrder: 22,
      updatedAt: "2026-04-20 17:10",
    },
    {
      id: "video-alarm-followup",
      chapterId: "chapter-alarm-dispatch",
      categoryId: "video-safety-diagnosis",
      title: "闭环后如何回写复盘结果",
      cover: "闭环复盘",
      duration: "06:21",
      summary: "通过结果标签和备注沉淀可复用的复盘结构。",
      status: "draft",
      featured: false,
      sortOrder: 23,
      updatedAt: "2026-04-16 14:30",
    },
    {
      id: "video-home-storyline",
      chapterId: "chapter-home-strategy",
      categoryId: "video-ops-home",
      title: "首页内容的故事线搭建",
      cover: "首页节奏设计",
      duration: "09:06",
      summary: "让视频、文章和运营位在首页形成连续的用户浏览节奏。",
      status: "draft",
      featured: true,
      sortOrder: 31,
      updatedAt: "2026-04-15 09:20",
    },
    {
      id: "video-home-recycle",
      chapterId: "chapter-home-reuse",
      categoryId: "video-ops-distribution",
      title: "老素材复用的标签策略",
      cover: "标签与复用",
      duration: "03:58",
      summary: "通过标签、摘要和推荐权重延长高质量素材的生命周期。",
      status: "published",
      featured: false,
      sortOrder: 32,
      updatedAt: "2026-04-14 18:10",
    },
    {
      id: "video-home-priority",
      chapterId: "chapter-home-reuse",
      categoryId: "video-ops-home",
      title: "首页排序权重怎么定",
      cover: "首页排序权重",
      duration: "04:47",
      summary: "介绍首页推荐位里视频和文章的排序权重应该如何设置。",
      status: "draft",
      featured: false,
      sortOrder: 33,
      updatedAt: "2026-04-13 11:30",
    },
  ],
  articleItems: [
    {
      id: "article-home-campaign",
      categoryId: "article-home-featured",
      title: "四月安全巡检专题页编排说明",
      cover: "专题页编排",
      summary: "针对四月首页专题区的图文内容结构、节奏和推荐位安排做统一说明。",
      markdown: [
        "# 四月安全巡检专题页编排说明",
        "",
        "本期专题页的目标是让客户在 **90 秒内** 看到三类核心信息：",
        "",
        "- 本月重点巡检主题",
        "- 风险排查的最佳实践",
        "- 后续处理闭环的入口",
        "",
        "## 推荐结构",
        "",
        "1. 顶部放专题主视觉与一句话摘要",
        "2. 中段串联视频教程与图文指南",
        "3. 底部承接 FAQ 与工单入口",
        "",
        "> 建议首页推荐位至少保留 2 个教程入口，避免用户只看到静态图文。",
      ].join("\n"),
      tags: ["专题", "首页", "巡检"],
      status: "published",
      featured: true,
      sortOrder: 11,
      updatedAt: "2026-04-19 09:40",
    },
    {
      id: "article-home-roles",
      categoryId: "article-home-guide",
      title: "后台角色初始化清单",
      cover: "后台角色清单",
      summary: "给交付和运营同学的角色初始化 checklist，避免在开课前遗漏权限。",
      markdown: [
        "# 后台角色初始化清单",
        "",
        "在开始配置内容前，请先确认：",
        "",
        "- 成员已创建",
        "- 角色已绑定菜单权限",
        "- 首页内容维护角色已开放推荐位配置",
        "",
        "## 推荐顺序",
        "",
        "先建角色，再配成员，再校验按钮权限。",
      ].join("\n"),
      tags: ["角色", "配置"],
      status: "published",
      featured: false,
      sortOrder: 12,
      updatedAt: "2026-04-18 13:20",
    },
    {
      id: "article-faq-media",
      categoryId: "article-help-faq",
      title: "媒体库常见问题与排查建议",
      cover: "媒体库 FAQ",
      summary: "汇总内容上传、封面缺失、推荐位不展示等高频问题的排查建议。",
      markdown: [
        "# 媒体库常见问题与排查建议",
        "",
        "遇到首页内容不展示时，优先检查以下项目：",
        "",
        "- 内容状态是否为已发布",
        "- 是否设置首页推荐",
        "- 分类是否被首页模块引用",
        "",
        "`排序权重` 只在同一个推荐位里比较。",
      ].join("\n"),
      tags: ["FAQ", "排查"],
      status: "published",
      featured: true,
      sortOrder: 18,
      updatedAt: "2026-04-17 15:05",
    },
    {
      id: "article-release-202604",
      categoryId: "article-help-release",
      title: "2026.04 首页内容位更新说明",
      cover: "版本更新 2026.04",
      summary: "说明本月首页内容位排序策略与推荐字段的更新内容。",
      markdown: [
        "# 2026.04 首页内容位更新说明",
        "",
        "本次更新主要涉及首页内容运营：",
        "",
        "- 新增推荐权重字段",
        "- 首页支持图文与视频混排",
        "- 文章摘要长度规则统一",
      ].join("\n"),
      tags: ["版本", "首页"],
      status: "scheduled",
      featured: false,
      sortOrder: 21,
      updatedAt: "2026-04-20 08:00",
    },
    {
      id: "article-home-video-guide",
      categoryId: "article-home-guide",
      title: "首页视频教程位维护指南",
      cover: "视频位维护",
      summary: "介绍视频教程位的推荐位、摘要和排序如何配合设置。",
      markdown: [
        "# 首页视频教程位维护指南",
        "",
        "维护视频内容时，建议每条教程至少补齐：",
        "",
        "- 标题",
        "- 15 到 30 字摘要",
        "- 推荐位状态",
        "- 合理的排序权重",
      ].join("\n"),
      tags: ["视频", "首页", "指南"],
      status: "draft",
      featured: false,
      sortOrder: 24,
      updatedAt: "2026-04-16 10:15",
    },
    {
      id: "article-featured-review",
      categoryId: "article-home-featured",
      title: "专题内容复盘模板",
      cover: "内容复盘模板",
      summary: "帮助运营团队记录专题上线后的点击、完播和咨询转化表现。",
      markdown: [
        "# 专题内容复盘模板",
        "",
        "建议复盘时至少记录以下三项指标：",
        "",
        "- 点击率",
        "- 完读率 / 完播率",
        "- 咨询或任务触达转化",
      ].join("\n"),
      tags: ["专题", "复盘"],
      status: "draft",
      featured: true,
      sortOrder: 25,
      updatedAt: "2026-04-15 18:45",
    },
  ],
}

export function createMediaLibraryMockState(): MediaLibraryMockState {
  return structuredClone(MEDIA_LIBRARY_MOCK)
}
