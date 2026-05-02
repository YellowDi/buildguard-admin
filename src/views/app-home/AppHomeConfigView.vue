<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { TooltipWrap } from "@/components/ui/tooltip"
import videoPreviewAsset from "@/assets/video.png"
import {
  createAppHomeMockState,
  type AppHomeArticleModule,
  type AppHomeModule,
  type AppHomeModuleType,
  type AppHomeVideoCategory,
  type AppHomeVideoModule,
  type AppHomeVideoSource,
} from "@/lib/app-home-mock"
import {
  createMediaLibraryMockState,
  type ArticleItem,
  type MediaCategoryNode,
  type VideoItem,
} from "@/lib/media-library-mock"
import { cn } from "@/lib/utils"

type DragTarget = "module" | "category"

type NewVideoSourceForm = {
  kind: "category" | "video"
  categoryId: string
  videoId: string
}

const mediaState = createMediaLibraryMockState()
const initialHomeState = createAppHomeMockState()

const modules = ref<AppHomeModule[]>(normalizeModuleOrders(initialHomeState.modules))
const selectedModuleId = ref(modules.value[0]?.id ?? "")
const sheetOpen = ref(false)
const activePreviewCategoryIds = reactive<Record<string, string>>({})
const draggingId = ref("")
const draggingTarget = ref<DragTarget | "">("")
const dragOverId = ref("")
const newVideoSource = reactive<NewVideoSourceForm>({
  kind: "category",
  categoryId: mediaState.videoCategories[0]?.id ?? "",
  videoId: mediaState.videoItems[0]?.id ?? "",
})

const orderedModules = computed(() => [...modules.value].sort(compareBySortOrder))
const enabledModules = computed(() => orderedModules.value.filter(module => module.enabled))
const selectedModule = computed(() => modules.value.find(module => module.id === selectedModuleId.value) ?? null)
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
const videoItemMap = computed(() => new Map(mediaState.videoItems.map(item => [item.id, item])))
const articleItemMap = computed(() => new Map(mediaState.articleItems.map(item => [item.id, item])))

watch(selectedVideoModule, (module) => {
  if (!module?.categories.length) {
    return
  }

  const firstCategoryId = [...module.categories].sort(compareBySortOrder)[0]?.id
  if (firstCategoryId && !activePreviewCategoryIds[module.id]) {
    activePreviewCategoryIds[module.id] = firstCategoryId
  }
}, { immediate: true })

function openModule(moduleId: string) {
  selectedModuleId.value = moduleId
  sheetOpen.value = true
}

function addModule(type: AppHomeModuleType) {
  const nextSortOrder = getNextSortOrder(modules.value)
  const nextModule = type === "video"
    ? createVideoModule(nextSortOrder)
    : createArticleModule(nextSortOrder)

  modules.value = normalizeModuleOrders([...modules.value, nextModule])
  selectedModuleId.value = nextModule.id
  sheetOpen.value = true
  toast.success(type === "video" ? "已添加视频模块" : "已添加文章模块")
}

function deleteModule(moduleId: string) {
  const module = modules.value.find(item => item.id === moduleId)
  if (!module) {
    return
  }

  if (!window.confirm(`确认删除「${module.title}」模块？`)) {
    return
  }

  modules.value = normalizeModuleOrders(modules.value.filter(item => item.id !== moduleId))
  if (selectedModuleId.value === moduleId) {
    selectedModuleId.value = modules.value[0]?.id ?? ""
    sheetOpen.value = false
  }
  toast.success("模块已删除")
}

function updateSelectedModuleType(type: AppHomeModuleType) {
  const current = selectedModule.value
  if (!current || current.type === type) {
    return
  }

  const next = type === "video"
    ? {
        id: current.id,
        type: "video" as const,
        title: current.title || "视频模块",
        enabled: current.enabled,
        sortOrder: current.sortOrder,
        categories: [createVideoCategory("分类标题", 10)],
      }
    : {
        id: current.id,
        type: "article" as const,
        title: current.title || "文章卡片",
        enabled: current.enabled,
        sortOrder: current.sortOrder,
        articleId: articleOptions.value[0]?.id ?? "",
      }

  modules.value = modules.value.map(module => module.id === current.id ? next : module)
}

function addVideoCategory(module: AppHomeVideoModule) {
  const nextCategory = createVideoCategory(`分类标题 ${module.categories.length + 1}`, getNextSortOrder(module.categories))
  module.categories.push(nextCategory)
  normalizeCategoryOrders(module.categories)
  activePreviewCategoryIds[module.id] = nextCategory.id
}

function deleteVideoCategory(module: AppHomeVideoModule, categoryId: string) {
  if (module.categories.length <= 1) {
    toast.error("视频模块至少保留一个分类")
    return
  }

  module.categories = normalizeCategoryOrders(module.categories.filter(category => category.id !== categoryId))
  if (activePreviewCategoryIds[module.id] === categoryId) {
    activePreviewCategoryIds[module.id] = module.categories[0]?.id ?? ""
  }
}

function addSourceToCategory(category: AppHomeVideoCategory) {
  const nextSource: AppHomeVideoSource | null = newVideoSource.kind === "category"
    ? newVideoSource.categoryId
      ? {
          id: createId("source"),
          kind: "category",
          categoryId: newVideoSource.categoryId,
        }
      : null
    : newVideoSource.videoId
      ? {
          id: createId("source"),
          kind: "video",
          videoId: newVideoSource.videoId,
        }
      : null

  if (!nextSource) {
    toast.error("请先选择内容来源")
    return
  }

  category.sources.push(nextSource)
}

function deleteSource(category: AppHomeVideoCategory, sourceId: string) {
  category.sources = category.sources.filter(source => source.id !== sourceId)
}

function saveMockConfig() {
  toast.success("首页配置已保存在当前 mock 会话")
}

function resetMockConfig() {
  modules.value = normalizeModuleOrders(createAppHomeMockState().modules)
  selectedModuleId.value = modules.value[0]?.id ?? ""
  sheetOpen.value = false
  toast.success("已恢复初始 mock 配置")
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

function getVideoOptionLabel(video: VideoItem) {
  return `${video.title} · ${getCategoryPathLabel(mediaState.videoCategories, video.categoryId)}`
}

function getCoverSrc(value: string) {
  const normalized = value.trim()
  if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(normalized)) {
    return normalized
  }

  return videoPreviewAsset
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
  if (draggingTarget.value !== "module") {
    clearDrag()
    return
  }

  const sourceId = draggingId.value || event.dataTransfer?.getData("text/plain") || ""
  modules.value = reorderById(modules.value, sourceId, targetId)
  clearDrag()
}

function handleCategoryDrop(event: DragEvent, module: AppHomeVideoModule, targetId: string) {
  event.preventDefault()
  if (draggingTarget.value !== "category") {
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
</script>

<template>
  <section class="app-home-page relative flex flex-col overflow-visible bg-background">
    <div class="sticky top-0 z-[6] shrink-0 bg-background px-3 pb-3 pt-4 sm:px-4">
      <div class="mx-auto flex w-full max-w-4xl items-end justify-between gap-3">
        <TitleBlock
          class="min-w-0 flex-1"
          title="App 首页"
          description="维护客户端首页展示模块。当前版本使用前端 mock 数据，刷新页面会恢复初始配置。"
        />

        <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2 pb-0.5">
          <Button variant="outline" size="sm" class="h-8 rounded-md px-3" @click="resetMockConfig">
            <i class="ri-refresh-line text-base" />
            <span>重置</span>
          </Button>
          <Button size="sm" class="h-8 rounded-md px-3" @click="saveMockConfig">
            <i class="ri-save-line text-base" />
            <span>保存</span>
          </Button>
        </div>
      </div>
    </div>

    <div class="px-3 sm:px-4">
      <div class="mx-auto flex w-full max-w-4xl gap-8 overflow-visible">
        <aside class="flex w-[240px] shrink-0 flex-col overflow-visible bg-background">
          <div class="min-h-0 flex-1 overflow-y-auto pt-4">
        <div class="mb-2 px-1">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            模块
          </p>
        </div>

        <div class="space-y-0.5">
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

        <div class="mt-3 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
            @click="addModule('video')"
          >
            <i class="ri-add-line text-[15px]" />
            <span>添加视频模块</span>
          </Button>
          <Button
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

        <main class="app-home-preview-pane flex min-w-0 flex-1 items-center justify-center overflow-visible px-12 pb-20 pt-8">
      <div class="app-home-preview-shell flex min-h-0 flex-col bg-zinc-950 p-[10px]">
        <span class="app-home-phone-button app-home-phone-button--mute" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--volume-up" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--volume-down" aria-hidden="true" />
        <span class="app-home-phone-button app-home-phone-button--power" aria-hidden="true" />

        <div class="app-home-device-screen flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f4f4]">
          <div class="app-home-preview-reserved app-home-preview-reserved--top shrink-0">
            <span>顶部导航栏</span>
          </div>

          <div class="app-home-preview-scroll min-h-0 flex-1 overflow-y-auto bg-[#f4f4f4] px-4 py-4">
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
                    class="relative h-48 w-36 shrink-0 overflow-hidden rounded-[8px] bg-zinc-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                  >
                    <img
                      :src="getCoverSrc(item.cover)"
                      alt=""
                      class="absolute inset-0 h-full w-full object-cover"
                    />
                    <div class="absolute inset-0 bg-black/5" />
                    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/42 to-transparent" />
                    <h3 class="absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-[14px] font-semibold leading-[1.35] text-white">
                      {{ item.title }}
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
                  class="app-home-article-card relative aspect-[1.34/1] overflow-hidden bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
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

          <div v-if="!enabledModules.length" class="py-20 text-center text-sm text-zinc-500">
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
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button text-destructive hover:text-destructive"
              @click="deleteModule(selectedModule.id)"
            >
              <i class="ri-delete-bin-line text-sm" />
              <span>删除</span>
            </Button>
            <Button
              type="button"
              size="sm"
              class="h-8 rounded-md px-2.5"
              @click="saveMockConfig"
            >
              <i class="ri-save-line text-sm" />
              <span>保存</span>
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
            <span class="article-editor-label">类型</span>
            <div class="article-editor-control">
              <Select :model-value="selectedModule.type" @update:model-value="updateSelectedModuleType($event as AppHomeModuleType)">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    视频模块
                  </SelectItem>
                  <SelectItem value="article">
                    文章模块
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="article-editor-row">
            <span class="article-editor-label">状态</span>
            <div class="article-editor-control">
              <div class="flex min-h-9 items-center justify-between gap-3">
                <span class="text-sm text-muted-foreground">
                  {{ selectedModule.enabled ? '已在客户端首页展示' : '已停用，仅保留配置' }}
                </span>
                <Switch v-model="selectedModule.enabled" />
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
                      <Button variant="ghost" size="icon-sm" class="h-9 w-9 rounded-md text-muted-foreground" @click="deleteVideoCategory(selectedVideoModule, category.id)">
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
                        <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-md text-muted-foreground" @click="deleteSource(category, source.id)">
                          <i class="ri-close-line text-base" />
                          <span class="sr-only">移除来源</span>
                        </Button>
                      </div>

                      <div v-if="!category.sources.length" class="rounded-md border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
                        当前分类暂无内容来源
                      </div>
                    </div>

                    <div class="mt-2 grid gap-2 sm:grid-cols-[126px_minmax(0,1fr)_auto]">
                      <Select v-model="newVideoSource.kind">
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="来源类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="category">
                            媒体库分类
                          </SelectItem>
                          <SelectItem value="video">
                            指定视频
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select v-if="newVideoSource.kind === 'category'" v-model="newVideoSource.categoryId">
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

                      <Select v-else v-model="newVideoSource.videoId">
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="选择视频" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="item in videoOptions"
                            :key="item.id"
                            :value="item.id"
                          >
                            {{ getVideoOptionLabel(item) }}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button size="sm" class="h-9 rounded-md px-3" @click="addSourceToCategory(category)">
                        添加
                      </Button>
                    </div>
                  </article>

                  <Button variant="ghost" size="sm" class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground" @click="addVideoCategory(selectedVideoModule)">
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
  </section>
</template>

<style scoped>
.app-home-preview-pane {
  min-width: calc(410px + 6rem);
}

.app-home-preview-shell {
  position: relative;
  aspect-ratio: 390 / 844;
  width: clamp(360px, calc((100svh - 5.5rem) * 390 / 844), 410px);
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
  -webkit-backdrop-filter: blur(100px) saturate(100%);
  backdrop-filter: blur(100px) saturate(100%);
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
