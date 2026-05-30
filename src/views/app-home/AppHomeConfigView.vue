<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipWrap } from "@/components/ui/tooltip"
import videoPreviewAsset from "@/assets/video.png"
import { buildCosVideoSnapshotUrl } from "@/lib/cos-video-snapshot"
import {
  type AppHomeArticleModule,
  type AppHomeModule,
  type AppHomeModuleType,
  type AppHomeVideoCategory,
  type AppHomeVideoModule,
  type AppHomeVideoSource,
} from "@/lib/app-home-types"
import {
  createMediaContent,
  deleteMediaContent,
  fetchMediaContents,
  updateMediaContent,
  updateMediaContentSort,
  updateMediaContentStatus,
  type MediaContentCategorySaveItem,
  type MediaContentRecord,
} from "@/lib/media-contents-api"
import {
  fetchMediaArticles,
  type MediaArticleRecord,
} from "@/lib/media-articles-api"
import {
  fetchMediaTypes,
  type MediaTypeRecord,
} from "@/lib/media-types-api"
import {
  fetchMediaVideos,
  type MediaVideoRecord,
} from "@/lib/media-videos-api"
import { handleApiError } from "@/lib/api-errors"
import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"
import { PERMISSION_CODES } from "@/lib/permission-codes"
import { cn } from "@/lib/utils"

type DragTarget = "module" | "category"
type MediaCategoryNode = {
  id: string
  name: string
  sortOrder: number
  children?: MediaCategoryNode[]
}
type VideoItem = {
  id: string
  categoryId: string
  title: string
  cover: string
  sortOrder: number
}
type VideoOptionGroup = {
  id: string
  label: string
  videos: VideoItem[]
}
type ArticleItem = {
  id: string
  categoryId: string
  title: string
  cover: string
  summary: string
  sortOrder: number
}

type NewVideoSourceForm = {
  kind: "category" | "video"
  categoryId: string
  videoIds: string[]
}
type AppHomeMediaOptionKind = "video" | "article"

const MEDIA_OPTION_PAGE_SIZE = 500
const MEDIA_CONTENT_PAGE_SIZE = 500
const APP_HOME_VIDEO_COVER_SNAPSHOT_OPTIONS = {
  width: 144,
  height: 0,
} as const

const { canButton } = useCurrentUserPermissions()

const mediaState = reactive<{
  videoCategories: MediaCategoryNode[]
  articleCategories: MediaCategoryNode[]
  videoItems: VideoItem[]
  articleItems: ArticleItem[]
}>({
  videoCategories: [],
  articleCategories: [],
  videoItems: [],
  articleItems: [],
})
const mediaOptionsLoaded = reactive<Record<AppHomeMediaOptionKind, boolean>>({
  video: false,
  article: false,
})
const mediaOptionsLoading = reactive<Record<AppHomeMediaOptionKind, boolean>>({
  video: false,
  article: false,
})
const modules = ref<AppHomeModule[]>([])
const selectedModuleId = ref(modules.value[0]?.id ?? "")
const sheetOpen = ref(false)
const loading = ref(false)
const submitting = ref(false)
const sortingSubmitting = ref(false)
const moduleDeleteConfirmOpen = ref(false)
const deletingModuleId = ref("")
const categoryDeleteConfirmOpen = ref(false)
const deletingCategoryId = ref("")
const deletingCategoryModuleId = ref("")
const sourceDeleteConfirmOpen = ref(false)
const deletingSourceId = ref("")
const deletingSourceCategoryId = ref("")
const persistedModuleIds = ref(new Set<string>())
const persistedCategoryIds = ref(new Set<string>())
const articleCategoryIds = ref(new Map<string, string>())
const activePreviewCategoryIds = reactive<Record<string, string>>({})
const draggingId = ref("")
const draggingTarget = ref<DragTarget | "">("")
const dragOverId = ref("")
const videoSourceForms = reactive<Record<string, NewVideoSourceForm>>({})
const mediaOptionLoadPromises: Partial<Record<AppHomeMediaOptionKind, Promise<void>>> = {}

const orderedModules = computed(() => [...modules.value].sort(compareBySortOrder))
const enabledModules = computed(() => orderedModules.value.filter(module => module.enabled))
const selectedModule = computed(() => modules.value.find(module => module.id === selectedModuleId.value) ?? null)
const deletingModule = computed(() => modules.value.find(module => module.id === deletingModuleId.value) ?? null)
const canSaveAppHomeConfig = computed(() => canButton(PERMISSION_CODES.appHomeConfigSave))
const canSaveAppHomeModule = computed(() => canButton(PERMISSION_CODES.appHomeModuleSave))
const canAddAppHomeVideoModule = computed(() => canButton(PERMISSION_CODES.appHomeVideoModuleAdd))
const canAddAppHomeArticleModule = computed(() => canButton(PERMISSION_CODES.appHomeArticleModuleAdd))
const canDeleteAppHomeModule = computed(() => canButton(PERMISSION_CODES.appHomeModuleDelete))
const canAddAppHomeCategory = computed(() => canButton(PERMISSION_CODES.appHomeCategoryAdd))
const canDeleteAppHomeCategory = computed(() => canButton(PERMISSION_CODES.appHomeCategoryDelete))
const canAddAppHomeSource = computed(() => canButton(PERMISSION_CODES.appHomeSourceAdd))
const canRemoveAppHomeSource = computed(() => canButton(PERMISSION_CODES.appHomeSourceRemove))
const selectedVideoModule = computed((): AppHomeVideoModule | null => (
  selectedModule.value?.type === "video" ? selectedModule.value : null
))
const selectedArticleModule = computed((): AppHomeArticleModule | null => (
  selectedModule.value?.type === "article" ? selectedModule.value : null
))
const selectedVideoCategories = computed(() => selectedVideoModule.value
  ? [...selectedVideoModule.value.categories].sort(compareBySortOrder)
  : [])

const videoCategoryOptions = computed(() => flattenCategoryTree(mediaState.videoCategories))
const articleOptions = computed(() => [...mediaState.articleItems].sort(compareBySortOrder))
const videoOptions = computed(() => [...mediaState.videoItems].sort(compareBySortOrder))
const videoOptionGroups = computed<VideoOptionGroup[]>(() => {
  const groups = new Map<string, VideoOptionGroup>()

  for (const video of videoOptions.value) {
    const id = video.categoryId || "__uncategorized__"
    const label = video.categoryId
      ? getCategoryPathLabel(mediaState.videoCategories, video.categoryId)
      : "未分配分类"
    const group = groups.get(id)

    if (group) {
      group.videos.push(video)
      continue
    }

    groups.set(id, {
      id,
      label,
      videos: [video],
    })
  }

  return [...groups.values()].sort((a, b) => {
    if (a.id === "__uncategorized__") return 1
    if (b.id === "__uncategorized__") return -1
    return a.label.localeCompare(b.label, "zh-Hans-CN")
  })
})
const videoItemMap = computed(() => new Map(mediaState.videoItems.map(item => [item.id, item])))
const articleItemMap = computed(() => new Map(mediaState.articleItems.map(item => [item.id, item])))
const videoSourceSelectValues = computed<Record<string, string[]>>(() => {
  const values: Record<string, string[]> = {}

  for (const category of selectedVideoCategories.value) {
    const formVideoIds = videoSourceForms[category.id]?.videoIds ?? []
    values[category.id] = uniqueIds([
      ...getCategoryVideoSourceIds(category),
      ...formVideoIds,
    ]).filter(videoId => videoItemMap.value.has(videoId))
  }

  return values
})
const hasLoadedModules = computed(() => modules.value.length > 0)
const showInitialSkeleton = computed(() => loading.value && !modules.value.length)

onMounted(() => {
  void loadInitialData()
})

watch(selectedVideoModule, (module) => {
  if (!module?.categories.length) {
    return
  }

  const firstCategoryId = [...module.categories].sort(compareBySortOrder)[0]?.id
  if (firstCategoryId && !activePreviewCategoryIds[module.id]) {
    activePreviewCategoryIds[module.id] = firstCategoryId
  }
}, { immediate: true })

watch(selectedModule, (module) => {
  void ensureMediaOptionsForModule(module)
}, { immediate: true })

watch(selectedVideoCategories, (categories) => {
  for (const category of categories) {
    ensureVideoSourceForm(category.id)
  }
}, { immediate: true })

async function loadInitialData(options: { silent?: boolean } = {}) {
  loading.value = true
  try {
    const contentResult = await fetchMediaContents({ PageNum: 1, PageSize: MEDIA_CONTENT_PAGE_SIZE })

    persistedModuleIds.value = new Set()
    persistedCategoryIds.value = new Set()
    articleCategoryIds.value = new Map()
    clearVideoSourceForms()
    modules.value = normalizeModuleOrders(contentResult.list.map(normalizeMediaContent).filter((item): item is AppHomeModule => item !== null))
    selectedModuleId.value = selectedModule.value?.id ?? modules.value[0]?.id ?? ""
    await ensureMediaOptionsForModule(selectedModule.value)
    syncMediaOptionDefaults()
    syncHomeMediaReferences()
    return true
  } catch (error) {
    handleApiError(error, {
      title: "App 首页配置加载失败",
      fallback: "App 首页配置加载失败，请稍后重试。",
    })
    return false
  } finally {
    loading.value = false
    if (!options.silent) {
      clearDrag()
    }
  }
}

async function ensureMediaOptionsForModule(module: AppHomeModule | null) {
  if (!module) {
    return
  }

  await ensureMediaOptions(module.type)
}

async function ensureMediaOptions(kind: AppHomeMediaOptionKind) {
  if (mediaOptionsLoaded[kind]) {
    return
  }

  if (mediaOptionLoadPromises[kind]) {
    return mediaOptionLoadPromises[kind]
  }

  const promise = loadMediaOptions(kind).finally(() => {
    delete mediaOptionLoadPromises[kind]
  })
  mediaOptionLoadPromises[kind] = promise

  return promise
}

async function loadMediaOptions(kind: AppHomeMediaOptionKind) {
  mediaOptionsLoading[kind] = true

  try {
    if (kind === "video") {
      const [categoryResult, videoResult] = await Promise.all([
        fetchMediaTypes({ Type: 1, PageNum: 1, PageSize: MEDIA_OPTION_PAGE_SIZE }),
        fetchMediaVideos({ PageNum: 1, PageSize: MEDIA_OPTION_PAGE_SIZE }),
      ])

      mediaState.videoCategories = normalizeMediaCategoryTree(categoryResult.list)
      mediaState.videoItems = videoResult.list.map((item, index) => normalizeMediaVideo(item, index))
    } else {
      const [categoryResult, articleResult] = await Promise.all([
        fetchMediaTypes({ Type: 2, PageNum: 1, PageSize: MEDIA_OPTION_PAGE_SIZE }),
        fetchMediaArticles({ PageNum: 1, PageSize: MEDIA_OPTION_PAGE_SIZE }),
      ])

      mediaState.articleCategories = normalizeMediaCategoryTree(categoryResult.list)
      mediaState.articleItems = articleResult.list.map((item, index) => normalizeMediaArticle(item, index))
    }

    mediaOptionsLoaded[kind] = true
    syncMediaOptionDefaults()
    syncHomeMediaReferences()
  } catch (error) {
    handleApiError(error, {
      title: kind === "video" ? "视频选项加载失败" : "文章选项加载失败",
      fallback: kind === "video" ? "视频选项加载失败，请稍后重试。" : "文章选项加载失败，请稍后重试。",
    })
  } finally {
    mediaOptionsLoading[kind] = false
  }
}

function openModule(moduleId: string) {
  selectedModuleId.value = moduleId
  sheetOpen.value = true
  void ensureMediaOptionsForModule(selectedModule.value)
}

async function addModule(type: AppHomeModuleType) {
  if (type === "video" && !canAddAppHomeVideoModule.value) {
    return
  }

  if (type === "article" && !canAddAppHomeArticleModule.value) {
    return
  }

  await ensureMediaOptions(type)
  const nextSortOrder = getNextSortOrder(modules.value)
  const nextModule = type === "video"
    ? createVideoModule(nextSortOrder)
    : createArticleModule(nextSortOrder)

  modules.value = normalizeModuleOrders([...modules.value, nextModule])
  selectedModuleId.value = nextModule.id
  sheetOpen.value = true
  toast.success(type === "video" ? "已添加视频模块" : "已添加文章模块")
}

function requestDeleteModule(moduleId: string) {
  if (!canDeleteAppHomeModule.value) {
    return
  }

  if (!modules.value.some(item => item.id === moduleId)) {
    return
  }

  deletingModuleId.value = moduleId
  moduleDeleteConfirmOpen.value = true
}

async function confirmDeleteModule() {
  if (!canDeleteAppHomeModule.value) {
    toast.error("无权删除首页模块")
    return
  }

  const moduleId = deletingModuleId.value
  if (!moduleId) {
    return
  }

  submitting.value = true
  try {
    if (persistedModuleIds.value.has(moduleId)) {
      await deleteMediaContent({ Uuid: moduleId })
      persistedModuleIds.value.delete(moduleId)
    }

    modules.value = normalizeModuleOrders(modules.value.filter(item => item.id !== moduleId))
    articleCategoryIds.value.delete(moduleId)
    if (selectedModuleId.value === moduleId) {
      selectedModuleId.value = modules.value[0]?.id ?? ""
      sheetOpen.value = false
    }
    toast.success("模块已删除")
    void persistModuleSort()
    moduleDeleteConfirmOpen.value = false
    deletingModuleId.value = ""
  } catch (error) {
    handleApiError(error, {
      title: "模块删除失败",
      fallback: "模块删除失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

async function handleSelectedModuleStatusChange(value: boolean | "indeterminate") {
  if (!canSaveAppHomeModule.value) {
    return
  }

  const module = selectedModule.value
  if (!module) {
    return
  }

  module.enabled = value === true

  if (!persistedModuleIds.value.has(module.id)) {
    return
  }

  try {
    await updateMediaContentStatus({
      Status: module.enabled ? 1 : 2,
      Uuid: module.id,
    })
  } catch (error) {
    module.enabled = !module.enabled
    handleApiError(error, {
      title: "模块状态更新失败",
      fallback: "模块状态更新失败，请稍后重试。",
    })
  }
}

function addVideoCategory(module: AppHomeVideoModule) {
  if (!canAddAppHomeCategory.value) {
    return
  }

  const nextCategory = createVideoCategory(`分类标题 ${module.categories.length + 1}`, getNextSortOrder(module.categories))
  module.categories.push(nextCategory)
  normalizeCategoryOrders(module.categories)
  getVideoSourceForm(nextCategory.id)
  activePreviewCategoryIds[module.id] = nextCategory.id
}

function requestDeleteCategory(module: AppHomeVideoModule, categoryId: string) {
  if (!canDeleteAppHomeCategory.value) {
    return
  }

  if (module.categories.length <= 1) {
    toast.error("视频模块至少保留一个分类")
    return
  }

  deletingCategoryModuleId.value = module.id
  deletingCategoryId.value = categoryId
  categoryDeleteConfirmOpen.value = true
}

function confirmDeleteCategory() {
  const module = modules.value.find(m => m.id === deletingCategoryModuleId.value) as AppHomeVideoModule | undefined
  const categoryId = deletingCategoryId.value

  if (!module || !categoryId) {
    return
  }

  module.categories = normalizeCategoryOrders(module.categories.filter(category => category.id !== categoryId))
  delete videoSourceForms[categoryId]
  if (activePreviewCategoryIds[module.id] === categoryId) {
    activePreviewCategoryIds[module.id] = module.categories[0]?.id ?? ""
  }

  categoryDeleteConfirmOpen.value = false
  deletingCategoryId.value = ""
  deletingCategoryModuleId.value = ""
}

function addSourceToCategory(category: AppHomeVideoCategory) {
  if (!canAddAppHomeSource.value) {
    return
  }

  const form = getVideoSourceForm(category.id)
  syncVideoSourceFormDefaults(form)

  if (form.kind === "category") {
    if (!form.categoryId) {
      toast.error("请先选择内容来源")
      return
    }

    category.sources.push({
      id: createId("source"),
      kind: "category",
      categoryId: form.categoryId,
    })
    return
  }

  if (!form.videoIds.length) {
    toast.error("请先选择视频")
    return
  }

  const existingVideoIds = new Set(category.sources
    .filter((source): source is Extract<AppHomeVideoSource, { kind: "video" }> => source.kind === "video")
    .map(source => source.videoId))
  const nextVideoIds = form.videoIds.filter(videoId => videoItemMap.value.has(videoId) && !existingVideoIds.has(videoId))

  if (!nextVideoIds.length) {
    toast.error("所选视频已在当前分类中")
    return
  }

  category.sources.push(...nextVideoIds.map(videoId => ({
    id: createId("source"),
    kind: "video" as const,
    videoId,
  })))
  form.videoIds = []
}

function requestDeleteSource(category: AppHomeVideoCategory, sourceId: string) {
  if (!canRemoveAppHomeSource.value) {
    return
  }

  deletingSourceCategoryId.value = category.id
  deletingSourceId.value = sourceId
  sourceDeleteConfirmOpen.value = true
}

function confirmDeleteSource() {
  const category = selectedVideoModule.value?.categories.find(c => c.id === deletingSourceCategoryId.value)
  const sourceId = deletingSourceId.value

  if (!category || !sourceId) {
    return
  }

  const source = category.sources.find(source => source.id === sourceId)
  category.sources = category.sources.filter(source => source.id !== sourceId)
  if (source?.kind === "video") {
    const form = videoSourceForms[category.id]
    if (form) {
      form.videoIds = form.videoIds.filter(videoId => videoId !== source.videoId)
    }
  }

  sourceDeleteConfirmOpen.value = false
  deletingSourceId.value = ""
  deletingSourceCategoryId.value = ""
}

async function saveConfig() {
  if (!canSaveAppHomeConfig.value && !canSaveAppHomeModule.value) {
    toast.error("无权保存 App 首页配置")
    return
  }

  if (submitting.value) {
    return
  }

  submitting.value = true
  try {
    for (const module of orderedModules.value) {
      const payload = buildMediaContentPayload(module)

      if (persistedModuleIds.value.has(module.id)) {
        await updateMediaContent({
          Uuid: module.id,
          ...payload,
        })
        continue
      }

      const created = await createMediaContent(payload)
      const uuid = toOptionalText(created.Uuid)
      if (uuid) {
        replaceModuleId(module.id, uuid)
        persistedModuleIds.value.add(uuid)
      }
    }

    await persistModuleSort()
    await loadInitialData({ silent: true })
    toast.success("首页配置已保存")
  } catch (error) {
    handleApiError(error, {
      title: "首页配置保存失败",
      fallback: "首页配置保存失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

async function refreshConfig() {
  sheetOpen.value = false
  const loaded = await loadInitialData()
  if (loaded) {
    toast.success("首页配置已刷新")
  }
}

function getModuleSummary(module: AppHomeModule) {
  if (module.type === "article") {
    const article = articleItemMap.value.get(module.articleId)
    return article?.title ?? "未选择文章"
  }

  const categoryCount = module.categories.length
  const sourceCount = module.categories.reduce((total, category) => total + category.sources.length, 0)
  return `${categoryCount} 个自定义分类 · ${sourceCount} 个内容来源`
}

function getModuleItemCount(module: AppHomeModule) {
  if (module.type === "article") {
    return module.articleId ? 1 : 0
  }

  return module.categories.reduce((total, category) => total + resolveCategoryVideos(category).length, 0)
}

function getVideoModuleActiveCategory(module: AppHomeVideoModule) {
  const orderedCategories = [...module.categories].sort(compareBySortOrder)
  const activeId = activePreviewCategoryIds[module.id]
  return orderedCategories.find(category => category.id === activeId) ?? orderedCategories[0] ?? null
}

function setVideoModuleActiveCategory(moduleId: string, categoryId: string) {
  activePreviewCategoryIds[moduleId] = categoryId
}

function resolveCategoryVideos(category: AppHomeVideoCategory) {
  const resolved: VideoItem[] = []
  const usedIds = new Set<string>()

  for (const source of category.sources) {
    const sourceVideos = source.kind === "category"
      ? getVideosByCategory(source.categoryId)
      : [videoItemMap.value.get(source.videoId)].filter((item): item is VideoItem => Boolean(item))

    for (const item of sourceVideos) {
      if (usedIds.has(item.id)) {
        continue
      }

      usedIds.add(item.id)
      resolved.push(item)
    }
  }

  return resolved.sort(compareBySortOrder)
}

function getVideosByCategory(categoryId: string) {
  const categoryIds = resolveCategoryIds(categoryId, mediaState.videoCategories)
  if (!categoryIds.size) {
    return []
  }

  return mediaState.videoItems.filter(item => categoryIds.has(item.categoryId))
}

function getArticle(module: AppHomeArticleModule) {
  return articleItemMap.value.get(module.articleId) ?? null
}

function getSourceLabel(source: AppHomeVideoSource) {
  if (source.kind === "category") {
    return `媒体库分类：${getCategoryPathLabel(mediaState.videoCategories, source.categoryId)}`
  }

  return `指定视频：${videoItemMap.value.get(source.videoId)?.title ?? "已删除视频"}`
}

function getArticleOptionLabel(article: ArticleItem) {
  return `${article.title} · ${getCategoryPathLabel(mediaState.articleCategories, article.categoryId)}`
}

function getCoverSrc(value: string) {
  const normalized = value.trim()
  if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(normalized)) {
    return normalized
  }

  return videoPreviewAsset
}

function syncMediaOptionDefaults() {
  if (!mediaOptionsLoaded.video) {
    return
  }

  for (const form of Object.values(videoSourceForms)) {
    syncVideoSourceFormDefaults(form)
  }
}

function getVideoSourceForm(categoryId: string) {
  return ensureVideoSourceForm(categoryId)
}

function ensureVideoSourceForm(categoryId: string) {
  if (!videoSourceForms[categoryId]) {
    videoSourceForms[categoryId] = createDefaultVideoSourceForm()
  }

  return videoSourceForms[categoryId]
}

function createDefaultVideoSourceForm(): NewVideoSourceForm {
  return {
    kind: "category",
    categoryId: videoCategoryOptions.value[0]?.id ?? "",
    videoIds: [],
  }
}

function syncVideoSourceFormDefaults(form: NewVideoSourceForm) {
  if (!form.categoryId || !findCategoryPath(mediaState.videoCategories, form.categoryId).length) {
    form.categoryId = videoCategoryOptions.value[0]?.id ?? ""
  }

  form.videoIds = form.videoIds.filter(videoId => videoItemMap.value.has(videoId))
}

function clearVideoSourceForms() {
  for (const key of Object.keys(videoSourceForms)) {
    delete videoSourceForms[key]
  }
}

function getCategoryVideoSourceIds(category: AppHomeVideoCategory) {
  return category.sources
    .filter((source): source is Extract<AppHomeVideoSource, { kind: "video" }> => source.kind === "video")
    .map(source => source.videoId)
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)]
}

function normalizeSelectedVideoIds(value: unknown) {
  const ids = Array.isArray(value)
    ? value.map(String)
    : value == null
      ? []
      : [String(value)]

  return uniqueIds(ids)
}

function handleVideoSourceVideoIdsChange(category: AppHomeVideoCategory, value: unknown) {
  const form = ensureVideoSourceForm(category.id)
  const existingVideoIds = new Set(getCategoryVideoSourceIds(category))
  const nextFormVideoIds = normalizeSelectedVideoIds(value)
    .filter(videoId => videoItemMap.value.has(videoId) && !existingVideoIds.has(videoId))

  if (form.videoIds.length === nextFormVideoIds.length && form.videoIds.every((id, index) => id === nextFormVideoIds[index])) {
    return
  }

  form.videoIds = nextFormVideoIds
}

function syncHomeMediaReferences() {
  const categoryIds = new Set(videoCategoryOptions.value.map(item => item.id))
  const videoIds = new Set(videoOptions.value.map(item => item.id))
  const articleIds = new Set(articleOptions.value.map(item => item.id))
  const fallbackCategoryId = videoCategoryOptions.value[0]?.id ?? ""
  const fallbackArticleId = articleOptions.value[0]?.id ?? ""
  const shouldSyncVideoReferences = mediaOptionsLoaded.video
  const shouldSyncArticleReferences = mediaOptionsLoaded.article

  modules.value = modules.value.map((module) => {
    if (module.type === "article") {
      if (!shouldSyncArticleReferences) {
        return module
      }

      return articleIds.has(module.articleId)
        ? module
        : {
            ...module,
            articleId: fallbackArticleId,
          }
    }

    if (!shouldSyncVideoReferences) {
      return module
    }

    return {
      ...module,
      categories: module.categories.map((category) => {
        const sources = category.sources.filter((source) => {
          if (source.kind === "category") {
            return categoryIds.has(source.categoryId)
          }

          return videoIds.has(source.videoId)
        })

        return {
          ...category,
          sources: sources.length || !fallbackCategoryId
            ? sources
            : [{
                id: createId("source"),
                kind: "category",
                categoryId: fallbackCategoryId,
              }],
        }
      }),
    }
  })
}

function handleDragStart(event: DragEvent, target: DragTarget, id: string) {
  draggingTarget.value = target
  draggingId.value = id
  dragOverId.value = id
  event.dataTransfer?.setData("text/plain", id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
  }
}

function handleDragOver(event: DragEvent, target: DragTarget, id: string) {
  if (draggingTarget.value !== target || draggingId.value === id) {
    return
  }

  event.preventDefault()
  dragOverId.value = id
}

function handleModuleDrop(event: DragEvent, targetId: string) {
  event.preventDefault()
  if (draggingTarget.value !== "module" || !canSaveAppHomeModule.value) {
    clearDrag()
    return
  }

  const sourceId = draggingId.value || event.dataTransfer?.getData("text/plain") || ""
  modules.value = reorderById(modules.value, sourceId, targetId)
  clearDrag()
  void persistModuleSort()
}

function handleCategoryDrop(event: DragEvent, module: AppHomeVideoModule, targetId: string) {
  event.preventDefault()
  if (draggingTarget.value !== "category" || !canSaveAppHomeModule.value) {
    clearDrag()
    return
  }

  const sourceId = draggingId.value || event.dataTransfer?.getData("text/plain") || ""
  module.categories = reorderById(module.categories, sourceId, targetId)
  clearDrag()
}

function clearDrag() {
  draggingTarget.value = ""
  draggingId.value = ""
  dragOverId.value = ""
}

function reorderById<T extends { id: string, sortOrder: number }>(items: T[], sourceId: string, targetId: string) {
  if (!sourceId || sourceId === targetId) {
    return items
  }

  const ordered = [...items].sort(compareBySortOrder)
  const sourceIndex = ordered.findIndex(item => item.id === sourceId)
  const targetIndex = ordered.findIndex(item => item.id === targetId)
  if (sourceIndex === -1 || targetIndex === -1) {
    return items
  }

  const [moved] = ordered.splice(sourceIndex, 1)
  ordered.splice(targetIndex, 0, moved)
  return ordered.map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * 10,
  }))
}

function createVideoModule(sortOrder: number): AppHomeVideoModule {
  return {
    id: createId("module"),
    type: "video",
    title: "视频模块",
    enabled: true,
    sortOrder,
    categories: [createVideoCategory("分类标题", 10)],
  }
}

function createArticleModule(sortOrder: number): AppHomeArticleModule {
  return {
    id: createId("module"),
    type: "article",
    title: "文章卡片标题",
    enabled: true,
    sortOrder,
    articleId: articleOptions.value[0]?.id ?? "",
  }
}

function createVideoCategory(title: string, sortOrder: number): AppHomeVideoCategory {
  return {
    id: createId("category"),
    title,
    sortOrder,
    sources: [],
  }
}

function normalizeModuleOrders(items: AppHomeModule[]) {
  return [...items].sort(compareBySortOrder).map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * 10,
  }))
}

function normalizeCategoryOrders(items: AppHomeVideoCategory[]) {
  return [...items].sort(compareBySortOrder).map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * 10,
  }))
}

function getNextSortOrder(items: Array<{ sortOrder: number }>) {
  return Math.max(0, ...items.map(item => item.sortOrder)) + 10
}

function compareBySortOrder<T extends { sortOrder: number, title?: string }>(left: T, right: T) {
  return left.sortOrder - right.sortOrder
    || String(left.title ?? "").localeCompare(String(right.title ?? ""), "zh-CN")
}

function normalizeMediaCategoryTree(records: MediaTypeRecord[]) {
  return records
    .map(normalizeMediaCategory)
    .sort(compareBySortOrder)
}

function normalizeMediaCategory(item: MediaTypeRecord): MediaCategoryNode {
  const id = toOptionalText(item.Uuid) || `media-category-${item.Id ?? hashText(JSON.stringify(item))}`
  const name = toOptionalText(item.Name) || `分类 ${item.Id ?? id}`

  return {
    id,
    name,
    sortOrder: toOptionalNumber(item.SortNum) ?? 0,
    children: Array.isArray(item.Children)
      ? normalizeMediaCategoryTree(item.Children)
      : undefined,
  }
}

function normalizeMediaVideo(item: MediaVideoRecord, index: number): VideoItem {
  const id = toOptionalText(item.Uuid) || `media-video-${item.Id ?? index + 1}`
  const title = toOptionalText(item.Title) || `视频 ${index + 1}`
  const sourceUrl = toOptionalText(item.Url)

  return {
    id,
    categoryId: toOptionalText(item.TypeUuid),
    title,
    cover: buildCosVideoSnapshotUrl(sourceUrl, APP_HOME_VIDEO_COVER_SNAPSHOT_OPTIONS),
    sortOrder: index + 1,
  }
}

function normalizeMediaArticle(item: MediaArticleRecord, index: number): ArticleItem {
  const id = toOptionalText(item.Uuid) || `media-article-${item.Id ?? index + 1}`
  const title = toOptionalText(item.Title) || `文章 ${index + 1}`
  const content = toOptionalText(item.Content)

  return {
    id,
    categoryId: toOptionalText(item.TypeUuid),
    title,
    cover: toOptionalText(item.CoverUrl),
    summary: stripHtml(content).slice(0, 80),
    sortOrder: index + 1,
  }
}

function normalizeMediaContent(item: MediaContentRecord, index: number): AppHomeModule | null {
  const id = toOptionalText(item.Uuid) || `media-content-${item.Id ?? index + 1}`
  const contentType = item.Type === 2 ? "article" : item.Type === 1 ? "video" : null

  if (!contentType) {
    return null
  }

  if (toOptionalText(item.Uuid)) {
    persistedModuleIds.value.add(id)
  }

  const categoryList = Array.isArray(item.CategoryList) ? item.CategoryList : []
  const base = {
    id,
    title: toOptionalText(item.Title) || (contentType === "video" ? "视频模块" : "文章卡片"),
    enabled: item.Status !== 2,
    sortOrder: toOptionalNumber(item.SortNum) ?? (index + 1) * 10,
  }

  if (contentType === "article") {
    const firstCategory = categoryList[0]
    const categoryUuid = toOptionalText(firstCategory?.Uuid)

    if (categoryUuid) {
      articleCategoryIds.value.set(id, categoryUuid)
    }

    return {
      ...base,
      type: "article",
      articleId: findFirstArticleUuid(categoryList),
    }
  }

  const categories = categoryList
    .map((category, categoryIndex) => normalizeMediaContentVideoCategory(category, categoryIndex))
    .filter((category): category is AppHomeVideoCategory => category !== null)

  return {
    ...base,
    type: "video",
    categories: categories.length ? normalizeCategoryOrders(categories) : [createVideoCategory("分类标题", 10)],
  }
}

function normalizeMediaContentVideoCategory(category: unknown, index: number): AppHomeVideoCategory | null {
  if (!category || typeof category !== "object" || Array.isArray(category)) {
    return null
  }

  const record = category as Record<string, unknown>
  const uuid = toOptionalText(record.Uuid)
  const id = uuid || `media-content-category-${record.Id ?? index + 1}`

  if (uuid) {
    persistedCategoryIds.value.add(uuid)
  }

  return {
    id,
    title: toOptionalText(record.Title) || `分类 ${index + 1}`,
    sortOrder: toOptionalNumber(record.SortNum) ?? (index + 1) * 10,
    sources: normalizeMediaContentVideoSources(record.MediaVideo),
  }
}

function normalizeMediaContentVideoSources(value: unknown): AppHomeVideoSource[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const uuid = item && typeof item === "object" && !Array.isArray(item)
        ? toOptionalText((item as Record<string, unknown>).Uuid)
        : ""

      return uuid
        ? {
            id: createId("source"),
            kind: "video" as const,
            videoId: uuid,
          }
        : null
    })
    .filter((item): item is Extract<AppHomeVideoSource, { kind: "video" }> => item !== null)
}

function findFirstArticleUuid(categoryList: unknown[]) {
  for (const category of categoryList) {
    if (!category || typeof category !== "object" || Array.isArray(category)) {
      continue
    }

    const articles = (category as Record<string, unknown>).MediaArticle
    if (!Array.isArray(articles)) {
      continue
    }

    for (const article of articles) {
      if (!article || typeof article !== "object" || Array.isArray(article)) {
        continue
      }

      const uuid = toOptionalText((article as Record<string, unknown>).Uuid)
      if (uuid) {
        return uuid
      }
    }
  }

  return ""
}

function buildMediaContentPayload(module: AppHomeModule) {
  return {
    CategoryList: buildMediaContentCategoryList(module),
    SortNum: module.sortOrder,
    Status: module.enabled ? 1 as const : 2 as const,
    Title: module.title.trim() || (module.type === "video" ? "视频模块" : "文章卡片"),
    Type: module.type === "video" ? 1 as const : 2 as const,
  }
}

function buildMediaContentCategoryList(module: AppHomeModule): MediaContentCategorySaveItem[] {
  if (module.type === "article") {
    return [{
      MediaList: module.articleId
        ? [{
            SortNum: 10,
            Uuid: module.articleId,
          }]
        : [],
      SortNum: 10,
      Title: module.title.trim() || "文章内容",
      Uuid: articleCategoryIds.value.get(module.id),
    }]
  }

  return [...module.categories].sort(compareBySortOrder).map((category, index) => ({
    MediaList: resolveCategoryVideos(category).map((item, mediaIndex) => ({
      SortNum: (mediaIndex + 1) * 10,
      Uuid: item.id,
    })),
    SortNum: (index + 1) * 10,
    Title: category.title.trim() || `分类 ${index + 1}`,
    Uuid: persistedCategoryIds.value.has(category.id) ? category.id : undefined,
  }))
}

async function persistModuleSort() {
  if (!canSaveAppHomeModule.value) {
    return
  }

  const list = orderedModules.value
    .filter(module => persistedModuleIds.value.has(module.id))
    .map((module, index) => ({
      SortNum: (index + 1) * 10,
      Uuid: module.id,
    }))

  if (list.length <= 1 || sortingSubmitting.value) {
    return
  }

  sortingSubmitting.value = true
  try {
    await updateMediaContentSort({ List: list })
  } catch (error) {
    handleApiError(error, {
      title: "模块排序保存失败",
      fallback: "模块排序保存失败，请稍后重试。",
    })
  } finally {
    sortingSubmitting.value = false
  }
}

function replaceModuleId(previousId: string, nextId: string) {
  if (!previousId || !nextId || previousId === nextId) {
    return
  }

  const activeCategoryId = activePreviewCategoryIds[previousId]
  modules.value = modules.value.map(module => module.id === previousId ? { ...module, id: nextId } : module)

  if (selectedModuleId.value === previousId) {
    selectedModuleId.value = nextId
  }

  if (activeCategoryId) {
    activePreviewCategoryIds[nextId] = activeCategoryId
    delete activePreviewCategoryIds[previousId]
  }

  const articleCategoryId = articleCategoryIds.value.get(previousId)
  if (articleCategoryId) {
    articleCategoryIds.value.delete(previousId)
    articleCategoryIds.value.set(nextId, articleCategoryId)
  }
}

function flattenCategoryTree(nodes: MediaCategoryNode[]) {
  const result: MediaCategoryNode[] = []

  const visit = (items: MediaCategoryNode[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children?.length) {
        visit(item.children)
      }
    }
  }

  visit(nodes)
  return result
}

function resolveCategoryIds(categoryId: string, nodes: MediaCategoryNode[]) {
  const ids = new Set<string>()

  const visit = (items: MediaCategoryNode[]) => {
    for (const item of items) {
      if (item.id === categoryId) {
        collectCategoryIds(item, ids)
        return true
      }

      if (item.children?.length && visit(item.children)) {
        return true
      }
    }

    return false
  }

  visit(nodes)
  return ids
}

function collectCategoryIds(node: MediaCategoryNode, ids: Set<string>) {
  ids.add(node.id)
  for (const child of node.children ?? []) {
    collectCategoryIds(child, ids)
  }
}

function getCategoryPathLabel(nodes: MediaCategoryNode[], categoryId: string) {
  const path = findCategoryPath(nodes, categoryId)
  return path.length ? path.map(item => item.name).join(" / ") : "未分配分类"
}

function findCategoryPath(nodes: MediaCategoryNode[], categoryId: string, stack: MediaCategoryNode[] = []): MediaCategoryNode[] {
  for (const node of nodes) {
    const nextStack = [...stack, node]
    if (node.id === categoryId) {
      return nextStack
    }

    if (node.children?.length) {
      const matched = findCategoryPath(node.children, categoryId, nextStack)
      if (matched.length) {
        return matched
      }
    }
  }

  return []
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function toOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function toOptionalNumber(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  return Number.isFinite(parsed) ? parsed : undefined
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function hashText(value: string) {
  return [...value].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7)
}
</script>

<template>
  <section class="app-home-page relative flex flex-col overflow-visible bg-background">
    <div class="sticky top-0 z-[6] shrink-0 bg-background px-3 pb-3 pt-4 sm:px-4">
      <div class="app-home-header-row mx-auto flex w-full max-w-4xl items-end justify-between gap-3">
        <TitleBlock
          class="min-w-0 flex-1"
          title="App 首页"
          description="维护客户端首页展示模块、展示状态、排序和内容来源。"
        />

        <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2 pb-0.5">
          <Button variant="outline" size="sm" class="h-8 rounded-md px-3" :disabled="loading || submitting" @click="refreshConfig">
            <i class="ri-refresh-line text-base" />
            <span>{{ loading ? '加载中...' : '刷新' }}</span>
          </Button>
          <Button v-if="canSaveAppHomeConfig || canSaveAppHomeModule" size="sm" class="h-8 rounded-md px-3" :disabled="loading || submitting" @click="saveConfig">
            <i class="ri-save-line text-base" />
            <span>{{ submitting ? '保存中...' : '保存' }}</span>
          </Button>
        </div>
      </div>
    </div>

    <div class="px-3 sm:px-4">
      <div class="app-home-layout mx-auto flex w-full max-w-4xl gap-8 overflow-visible">
        <aside class="app-home-sidebar flex w-[240px] shrink-0 flex-col overflow-visible bg-background">
          <div class="app-home-module-panel min-h-0 flex-1 overflow-y-auto pt-4">
        <div class="mb-2 px-1">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            模块
          </p>
        </div>

        <div v-if="showInitialSkeleton" class="space-y-2">
          <div
            v-for="index in 5"
            :key="`module-skeleton-${index}`"
            class="rounded-md px-1 py-1.5"
          >
            <div class="flex items-start gap-2">
              <Skeleton class="size-7 shrink-0 rounded-md" />
              <div class="min-w-0 flex-1 space-y-2">
                <div class="flex items-center gap-2">
                  <Skeleton class="h-4 w-28" />
                  <Skeleton class="ml-auto h-5 w-9 rounded" />
                </div>
                <Skeleton :class="['h-3', index % 2 === 0 ? 'w-40' : 'w-32']" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-0.5">
          <article
            v-for="module in orderedModules"
            :key="module.id"
            :class="cn(
              'group rounded-md px-1 py-0.5 transition-[opacity,background-color] duration-180 ease-out',
              selectedModuleId === module.id ? 'bg-accent' : 'hover:bg-accent/50',
              draggingTarget === 'module' && dragOverId === module.id && draggingId !== module.id ? 'bg-accent/70 shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.2)]' : '',
              draggingId === module.id ? 'opacity-60' : '',
            )"
            @dragover="handleDragOver($event, 'module', module.id)"
            @drop="handleModuleDrop($event, module.id)"
          >
            <div class="flex items-center gap-1.5">
              <TooltipWrap content="拖动调整模块顺序">
                <button
                  type="button"
                  draggable="true"
                  class="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:cursor-grabbing"
                  aria-label="拖动调整模块顺序"
                  @dragstart="handleDragStart($event, 'module', module.id)"
                  @dragend="clearDrag"
                >
                  <i class="ri-draggable text-[15px]" />
                </button>
              </TooltipWrap>

              <button type="button" class="min-w-0 flex-1 rounded-md px-1.5 py-1 text-left" @click="openModule(module.id)">
                <div class="flex min-w-0 items-center gap-1.5">
                  <i
                    :class="[
                      module.type === 'video' ? 'ri-movie-2-line' : 'ri-article-line',
                      'shrink-0 text-[15px] text-muted-foreground',
                    ]"
                  />
                  <h3 class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {{ module.title || '未命名模块' }}
                  </h3>
                  <span
                    :class="module.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'"
                    class="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none"
                  >
                    {{ module.enabled ? '启用' : '停用' }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs text-muted-foreground">
                  {{ module.type === 'video' ? '视频' : '文章' }} · {{ getModuleItemCount(module) }} 条 · {{ getModuleSummary(module) }}
                </p>
              </button>
            </div>
          </article>
        </div>

        <div v-if="!showInitialSkeleton && !hasLoadedModules" class="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          暂无首页模块
        </div>

        <div class="mt-3 space-y-1">
          <Button
            v-if="canAddAppHomeVideoModule"
            variant="ghost"
            size="sm"
            class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
            @click="addModule('video')"
          >
            <i class="ri-add-line text-[15px]" />
            <span>添加视频模块</span>
          </Button>
          <Button
            v-if="canAddAppHomeArticleModule"
            variant="ghost"
            size="sm"
            class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
            @click="addModule('article')"
          >
            <i class="ri-add-line text-[15px]" />
            <span>添加文章模块</span>
          </Button>
        </div>
      </div>

        </aside>

        <main class="app-home-preview-pane flex min-w-0 flex-1 items-center justify-center overflow-visible px-10 py-6">
      <div class="app-home-preview-shell flex min-h-0 flex-col bg-zinc-950 p-[10px]">
        <span class="app-home-phone-button app-home-phone-button--mute" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--volume-up" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--volume-down" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--power" aria-hidden="true" />

        <div class="app-home-device-screen flex min-h-0 flex-1 flex-col overflow-hidden bg-card-background">
          <div class="app-home-preview-reserved app-home-preview-reserved--top shrink-0">
            <span>顶部导航栏</span>
          </div>

          <div class="app-home-preview-scroll min-h-0 flex-1 overflow-y-auto bg-card-background px-4 py-4">
            <div v-if="showInitialSkeleton" class="space-y-6">
              <section class="min-w-0 border-b border-dashed border-zinc-300/90 pb-4">
                <Skeleton class="h-[18px] w-24 bg-zinc-300/90" />
                <div class="mt-4 flex gap-4">
                  <Skeleton class="h-4 w-12 bg-zinc-300/90" />
                  <Skeleton class="h-4 w-12 bg-zinc-300/90" />
                  <Skeleton class="h-4 w-12 bg-zinc-300/90" />
                </div>
                <div class="app-home-video-rail -mx-4 mt-5 flex gap-4 overflow-hidden px-4 pb-1">
                  <div
                    v-for="index in 3"
                    :key="`preview-video-skeleton-${index}`"
                    class="h-48 w-36 shrink-0 overflow-hidden rounded-[8px] bg-zinc-200/70 p-2"
                  >
                    <Skeleton class="h-full w-full rounded-md bg-zinc-300/90" />
                  </div>
                </div>
              </section>

              <section>
                <Skeleton class="aspect-[1.34/1] w-full rounded-[12px] bg-zinc-300/90" />
              </section>
            </div>

            <template v-else>
              <div
                v-for="module in enabledModules"
                :key="module.id"
                class="border-b border-dashed border-zinc-300/90 py-4 first:pt-0 last:border-b-0"
              >
            <template v-if="module.type === 'video'">
              <section class="min-w-0">
                <h2 class="px-0 text-[18px] font-semibold leading-none text-zinc-950">
                  {{ module.title || '视频模块' }}
                </h2>

                <div v-if="module.categories.length" class="mt-4 flex gap-4 overflow-x-auto pb-0.5">
                  <button
                    v-for="category in [...module.categories].sort(compareBySortOrder)"
                    :key="category.id"
                    type="button"
                    class="shrink-0 border-r border-zinc-300 pr-4 text-[15px] leading-none text-zinc-500 last:border-r-0"
                    :class="getVideoModuleActiveCategory(module)?.id === category.id ? 'font-medium text-zinc-950' : ''"
                    @click="setVideoModuleActiveCategory(module.id, category.id)"
                  >
                    {{ category.title || '分类标题' }}
                  </button>
                </div>

                <div v-if="getVideoModuleActiveCategory(module)" class="app-home-video-rail -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1">
                  <article
                    v-for="item in resolveCategoryVideos(getVideoModuleActiveCategory(module)!).slice(0, 8)"
                    :key="item.id"
                    class="relative h-48 w-36 shrink-0 overflow-hidden rounded-[8px] bg-zinc-950 text-white"
                  >
                    <img
                      :src="getCoverSrc(item.cover)"
                      alt=""
                      class="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <div class="absolute inset-0 bg-black/5" />
                    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/42 to-transparent" />
                    <h3 class="absolute inset-x-0 bottom-0 p-3 text-[14px] font-semibold leading-[1.35] text-white">
                      <span class="app-home-video-card-title">{{ item.title }}</span>
                    </h3>
                  </article>

                  <div
                    v-if="!resolveCategoryVideos(getVideoModuleActiveCategory(module)!).length"
                    class="flex h-32 min-w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500"
                  >
                    当前分类暂无视频
                  </div>
                </div>

                <div v-else class="mt-5 rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500">
                  暂未配置分类
                </div>
              </section>
            </template>

            <template v-else>
              <section>
                <article
                  v-if="getArticle(module)"
                  class="app-home-article-card relative aspect-[1.34/1] overflow-hidden bg-white"
                >
                  <img
                    :src="getCoverSrc(getArticle(module)!.cover)"
                    alt=""
                    class="absolute inset-0 h-full w-full object-cover"
                  />
                  <div class="app-home-article-glass absolute inset-x-0 bottom-0 flex min-h-16 items-center gap-3 px-4 py-4 text-white">
                    <h3 class="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {{ module.title || getArticle(module)!.title }}
                    </h3>
                    <span class="shrink-0 rounded-full bg-white/22 px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
                      查看详情
                    </span>
                  </div>
                </article>

                <div v-else class="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500">
                  暂未选择文章
                </div>
              </section>
            </template>
              </div>
            </template>

          <div v-if="!showInitialSkeleton && !enabledModules.length" class="py-20 text-center text-sm text-zinc-500">
            暂无启用模块
          </div>
        </div>

          <div class="app-home-preview-reserved app-home-preview-reserved--bottom shrink-0">
            <span>Tab 栏</span>
          </div>
        </div>
      </div>
        </main>
      </div>
    </div>

    <ResponsiveRightSheet
      v-model:open="sheetOpen"
      :title="selectedModule?.title || '模块配置'"
      description="编辑模块展示名称、启用状态和内容来源。"
      :show-primary="false"
      sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-2xl"
    >
      <template #actions>
        <div class="right-sheet-actions">
          <div class="right-sheet-actions__primary">
            <Button
              v-if="canDeleteAppHomeModule"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="sheetOpen = false"
            >
              <i class="ri-close-line text-base" />
              <span class="sr-only">关闭模块配置</span>
            </Button>
          </div>

          <div v-if="selectedModule" class="right-sheet-actions__secondary">
            <Button
              v-if="canSaveAppHomeConfig || canSaveAppHomeModule"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button text-destructive hover:text-destructive"
              :disabled="submitting"
              @click="requestDeleteModule(selectedModule.id)"
            >
              <i class="ri-delete-bin-line text-sm" />
              <span>删除</span>
            </Button>
            <Button
              type="button"
              size="sm"
              class="h-8 rounded-md px-2.5"
              :disabled="submitting"
              @click="saveConfig"
            >
              <i class="ri-save-line text-sm" />
              <span>{{ submitting ? '保存中...' : '保存' }}</span>
            </Button>
          </div>
        </div>
      </template>

      <div v-if="selectedModule" class="min-h-0 flex-1 overflow-y-auto">
        <div class="article-editor-list pb-4 pt-1">
          <label class="article-editor-row">
            <span class="article-editor-label">标题</span>
            <span class="article-editor-control">
              <Input v-model="selectedModule.title" placeholder="输入客户端展示标题" />
            </span>
          </label>

          <div class="article-editor-row">
            <span class="article-editor-label">状态</span>
            <div class="article-editor-control">
              <div class="flex min-h-9 items-center justify-between gap-3">
                <span class="text-sm text-muted-foreground">
                  {{ selectedModule.enabled ? '已在客户端首页展示' : '已停用，仅保留配置' }}
                </span>
                <Switch :model-value="selectedModule.enabled" :disabled="!canSaveAppHomeModule" @update:model-value="handleSelectedModuleStatusChange" />
              </div>
            </div>
          </div>

          <template v-if="selectedVideoModule">
            <div class="article-editor-row article-editor-row--top">
              <span class="article-editor-label">分类</span>
              <div class="article-editor-control">
                <div class="space-y-2">
                  <article
                    v-for="category in selectedVideoCategories"
                    :key="category.id"
                    :class="cn(
                      'rounded-lg border border-border/70 bg-background p-2.5',
                      draggingTarget === 'category' && dragOverId === category.id && draggingId !== category.id ? 'ring-2 ring-primary/20' : '',
                      draggingId === category.id ? 'opacity-60' : '',
                    )"
                    @dragover="handleDragOver($event, 'category', category.id)"
                    @drop="handleCategoryDrop($event, selectedVideoModule, category.id)"
                  >
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        draggable="true"
                        class="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
                        aria-label="拖动调整分类顺序"
                        @dragstart="handleDragStart($event, 'category', category.id)"
                        @dragend="clearDrag"
                      >
                        <i class="ri-draggable text-[17px]" />
                      </button>
                      <Input v-model="category.title" class="min-w-0 flex-1" placeholder="客户端分类名称" />
                      <Button v-if="canDeleteAppHomeCategory" variant="ghost" size="icon-sm" class="size-9 rounded-md text-muted-foreground" @click="requestDeleteCategory(selectedVideoModule, category.id)">
                        <i class="ri-delete-bin-line text-base" />
                        <span class="sr-only">删除分类</span>
                      </Button>
                    </div>

                    <div class="mt-2 space-y-1.5">
                      <div
                        v-for="source in category.sources"
                        :key="source.id"
                        class="flex items-center gap-2 rounded-md bg-muted/45 px-2.5 py-2 text-sm"
                      >
                        <i :class="[source.kind === 'category' ? 'ri-folder-video-line' : 'ri-movie-line', 'text-base text-muted-foreground']" />
                        <span class="min-w-0 flex-1 truncate">{{ getSourceLabel(source) }}</span>
                        <Button v-if="canRemoveAppHomeSource" variant="ghost" size="icon-sm" class="size-8 rounded-md text-muted-foreground" @click="requestDeleteSource(category, source.id)">
                          <i class="ri-close-line text-base" />
                          <span class="sr-only">移除来源</span>
                        </Button>
                      </div>

                      <div v-if="!category.sources.length" class="rounded-md border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
                        当前分类暂无内容来源
                      </div>
                    </div>

                    <div v-if="videoSourceForms[category.id] && canAddAppHomeSource" class="mt-2 grid gap-2 sm:grid-cols-[184px_minmax(0,1fr)_auto]">
                      <Tabs v-model="videoSourceForms[category.id].kind" class="w-full">
                        <TabsList class="h-9 w-full rounded-md">
                          <TabsTrigger value="category" class="h-8 flex-1 rounded-md px-2 text-xs">
                            媒体库分类
                          </TabsTrigger>
                          <TabsTrigger value="video" class="h-8 flex-1 rounded-md px-2 text-xs">
                            指定视频
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <Select v-if="videoSourceForms[category.id].kind === 'category'" v-model="videoSourceForms[category.id].categoryId">
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="选择媒体库分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="item in videoCategoryOptions"
                            :key="item.id"
                            :value="item.id"
                          >
                            {{ getCategoryPathLabel(mediaState.videoCategories, item.id) }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        v-else
                        :model-value="videoSourceSelectValues[category.id] ?? []"
                        multiple
                        @update:model-value="handleVideoSourceVideoIdsChange(category, $event)"
                      >
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="选择视频" />
                        </SelectTrigger>
                        <SelectContent class="max-h-[360px]">
                          <SelectGroup
                            v-for="group in videoOptionGroups"
                            :key="group.id"
                          >
                            <SelectLabel>
                              {{ group.label }}
                            </SelectLabel>
                            <SelectItem
                              v-for="video in group.videos"
                              :key="video.id"
                              :value="video.id"
                              :class="(videoSourceSelectValues[category.id] ?? []).includes(video.id) ? 'bg-accent text-accent-foreground font-medium' : ''"
                            >
                              <template #indicator-icon>
                                <span class="sr-only">已选择</span>
                              </template>
                              <span class="flex min-w-0 flex-1 items-center gap-2">
                                <i
                                  v-if="(videoSourceSelectValues[category.id] ?? []).includes(video.id)"
                                  class="ri-check-line shrink-0 text-base leading-none"
                                  aria-hidden="true"
                                />
                                <span v-else class="size-4 shrink-0" aria-hidden="true" />
                                <span class="truncate">{{ video.title }}</span>
                              </span>
                            </SelectItem>
                          </SelectGroup>
                          <div v-if="!videoOptionGroups.length" class="px-2 py-6 text-center text-sm text-muted-foreground">
                            暂无可选视频
                          </div>
                        </SelectContent>
                      </Select>

                      <Button size="sm" class="h-9 rounded-md px-3" @click="addSourceToCategory(category)">
                        添加
                      </Button>
                    </div>
                  </article>

                  <Button v-if="canAddAppHomeCategory" variant="ghost" size="sm" class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground" @click="addVideoCategory(selectedVideoModule)">
                    <i class="ri-add-line text-[15px]" />
                    <span>添加分类</span>
                  </Button>
                </div>
              </div>
            </div>
          </template>

          <template v-if="selectedArticleModule">
            <div class="article-editor-row">
              <span class="article-editor-label">文章</span>
              <div class="article-editor-control">
                <Select v-model="selectedArticleModule.articleId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择媒体库文章" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="article in articleOptions"
                      :key="article.id"
                      :value="article.id"
                    >
                      {{ getArticleOptionLabel(article) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="article-editor-row article-editor-row--top">
              <span class="article-editor-label">预览</span>
              <div class="article-editor-control">
                <article v-if="getArticle(selectedArticleModule)" class="overflow-hidden rounded-lg border border-border/70 bg-background">
                  <div class="aspect-[2.4/1] overflow-hidden bg-muted">
                    <img
                      :src="getCoverSrc(getArticle(selectedArticleModule)!.cover)"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div class="p-3">
                    <h4 class="line-clamp-1 text-sm font-semibold text-foreground">
                      {{ getArticle(selectedArticleModule)!.title }}
                    </h4>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {{ getArticle(selectedArticleModule)!.summary }}
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </template>
        </div>
      </div>
    </ResponsiveRightSheet>

    <AlertDialog v-model:open="moduleDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移除这个首页模块？</AlertDialogTitle>
          <AlertDialogDescription>
            移除后，用户将不会在 App 首页看到这个模块。相关媒体库内容不会被删除。
            <span v-if="deletingModule" class="mt-2 block font-medium text-foreground">
              {{ deletingModule.title || '未命名模块' }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="submitting">取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="submitting"
            @click.prevent="confirmDeleteModule"
          >
            <i :class="[submitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
            <span>{{ submitting ? '移除中' : '确认移除' }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="categoryDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除这个分类？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后，该分类及其下的所有内容来源将被移除。相关媒体库内容不会被删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click.prevent="confirmDeleteCategory"
          >
            <i class="ri-delete-bin-line text-sm" />
            <span>确认删除</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="sourceDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移除这个内容来源？</AlertDialogTitle>
          <AlertDialogDescription>
            移除后，该来源将不再展示在 App 首页的对应分类中。相关媒体库内容不会被删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click.prevent="confirmDeleteSource"
          >
            <i class="ri-delete-bin-line text-sm" />
            <span>确认移除</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<style scoped>
.app-home-preview-pane {
  min-width: calc(390px + 5rem);
}

.app-home-preview-shell {
  position: relative;
  aspect-ratio: 390 / 844;
  width: clamp(360px, calc((100svh - 12rem) * 390 / 844), 390px);
  min-width: 360px;
  border-radius: 56px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 0 0 2px rgba(9, 9, 11, 0.95),
    inset 0 0 0 7px rgba(39, 39, 42, 0.85),
    0 24px 48px rgba(15, 23, 42, 0.22),
    0 6px 14px rgba(15, 23, 42, 0.1);
}

.app-home-phone-button {
  position: absolute;
  z-index: 0;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #3f3f46 0%, #18181b 48%, #09090b 100%);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.14),
    0 1px 2px rgba(15, 23, 42, 0.28);
}

.app-home-phone-button--mute {
  top: 13.2%;
  left: -4px;
  height: 28px;
}

.app-home-phone-button--volume-up {
  top: 20.2%;
  left: -5px;
  height: 54px;
}

.app-home-phone-button--volume-down {
  top: 28.6%;
  left: -5px;
  height: 54px;
}

.app-home-phone-button--power {
  top: 22.8%;
  right: -5px;
  height: 76px;
}

.app-home-device-screen {
  position: relative;
  z-index: 1;
  border-radius: 44px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    inset 0 1px 3px rgba(24, 24, 27, 0.06);
}

.app-home-preview-reserved {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(245, 158, 11, 0.14) 0,
      rgba(245, 158, 11, 0.14) 8px,
      rgba(254, 243, 199, 0.72) 8px,
      rgba(254, 243, 199, 0.72) 16px
    );
  box-shadow:
    inset 0 0 0 1px rgba(245, 158, 11, 0.28),
    inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

.app-home-preview-reserved > span {
  position: relative;
  z-index: 1;
  border: 1px dashed rgba(180, 83, 9, 0.45);
  border-radius: 999px;
  background: rgba(255, 251, 235, 0.82);
  padding: 0.25rem 0.75rem;
  color: rgb(146, 64, 14);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.app-home-preview-reserved--top {
  height: 86px;
  border-bottom: 1px dashed rgba(180, 83, 9, 0.42);
}

.app-home-preview-reserved--bottom {
  height: 72px;
  border-top: 1px dashed rgba(180, 83, 9, 0.42);
}

.app-home-preview-scroll {
  scrollbar-width: none;
}

.app-home-preview-scroll::-webkit-scrollbar {
  display: none;
}

.app-home-video-rail {
  scrollbar-width: none;
  scroll-padding-inline: 1rem;
}

.app-home-video-rail::-webkit-scrollbar {
  display: none;
}

.app-home-video-card-title {
  display: -webkit-box;
  overflow: hidden;
  max-height: calc(2 * 1.35em);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.app-home-article-card {
  border-radius: 12px;
  isolation: isolate;
}

.app-home-article-glass {
  background: rgba(128, 128, 128, 0.3);
  background-blend-mode: luminosity;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  border-width: 1.5px 0 0;
  border-style: solid;
  border-image: linear-gradient(94deg, rgba(255, 255, 255, 0.4) -31%, rgba(255, 255, 255, 0.0001) 40%, rgba(255, 255, 255, 0.0001) 80%, rgba(255, 255, 255, 0.1) 164%) 1.5 0 0 0;
  box-sizing: border-box;
  -webkit-backdrop-filter: blur(16px) saturate(100%);
  backdrop-filter: blur(16px) saturate(100%);
}

.article-editor-list {
  padding-left: 1rem;
  padding-right: 1rem;
}

.article-editor-row {
  display: grid;
  grid-template-columns: 7.25rem minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
  border-bottom: 1px dashed var(--border);
  padding: 0.75rem 0;
  font-size: 14px;
  line-height: 1.5rem;
}

.article-editor-row:last-child {
  border-bottom: 0;
}

.article-editor-row--top {
  align-items: start;
}

.article-editor-label {
  padding-top: 0.375rem;
  color: var(--muted-foreground);
  font-weight: 400;
  transition: color 150ms ease;
}

.article-editor-row:hover .article-editor-label {
  color: var(--foreground);
}

.article-editor-control {
  min-width: 0;
  width: 100%;
}

@media (max-width: 768px) {
  .app-home-header-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .app-home-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .app-home-sidebar {
    width: 100%;
  }

  .app-home-module-panel {
    max-height: 42svh;
    min-height: 0;
    padding-top: 1rem;
  }

  .app-home-preview-pane {
    min-width: 0;
    justify-content: center;
    padding: 0.75rem 0 2rem;
    width: 100%;
  }

  .app-home-preview-shell {
    width: min(100%, 360px);
    min-width: 0;
    border-radius: 46px;
  }

  .app-home-device-screen {
    border-radius: 36px;
  }

  .app-home-phone-button--mute {
    left: -3px;
  }

  .app-home-phone-button--volume-up,
  .app-home-phone-button--volume-down {
    left: -4px;
  }

  .app-home-phone-button--power {
    right: -4px;
  }
}

@media (max-width: 640px) {
  .article-editor-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }

  .article-editor-label {
    line-height: 1.25rem;
  }
}
</style>
