<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import videoPreviewAsset from "@/assets/video.png"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  MEDIA_STATUS_OPTIONS,
  createMediaLibraryMockState,
  type ArticleItem,
  type ArticleMediaViewKey,
  type MediaCategoryNode,
  type MediaModuleKey,
  type MediaStatus,
  type VideoItem,
  type VideoMediaViewKey,
} from "@/lib/media-library-mock"
import { cn } from "@/lib/utils"

type SheetMode = "preview" | "edit" | "create"
type SheetEntityKind = "video" | "article"

type MediaEditorForm = {
  kind: SheetEntityKind
  title: string
  categoryId: string
  cover: string
  summary: string
  duration: string
  status: MediaStatus
  featured: boolean
  sortOrder: number
  markdown: string
  tagsText: string
}

type CategoryTreeRow = {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  expanded: boolean
  count: number
}

type VideoListEntry =
  { kind: "video"; id: string; title: string; summary: string; categoryId: string; status: MediaStatus; featured: boolean; sortOrder: number; updatedAt: string; meta: string }

type SwitchTab = {
  id: string
  label: string
  icon?: string
  badge?: string | number
}

const videoViewTabs: SwitchTab[] = [
  { id: "grid", label: "缩略图", icon: "ri-layout-grid-line" },
  { id: "list", label: "列表", icon: "ri-list-check-3" },
]

const articleViewTabs: SwitchTab[] = [
  { id: "grid", label: "缩略图", icon: "ri-layout-grid-line" },
  { id: "list", label: "列表", icon: "ri-align-justify" },
]

const statusLabelMap = new Map(MEDIA_STATUS_OPTIONS.map(option => [option.value, option.label]))
const coverToneClasses = [
  "bg-slate-100",
  "bg-zinc-100",
  "bg-stone-100",
  "bg-neutral-100",
  "bg-slate-100",
] as const
const coverAccentClasses = [
  "text-slate-700",
  "text-slate-700",
  "text-slate-700",
  "text-slate-700",
  "text-slate-700",
] as const

const initialState = createMediaLibraryMockState()
const videoCategories = ref(initialState.videoCategories)
const articleCategories = ref(initialState.articleCategories)
const videoItems = ref(initialState.videoItems)
const articleItems = ref(initialState.articleItems)

const activeModule = ref<MediaModuleKey>("videos")
const activeVideoView = ref<VideoMediaViewKey>("grid")
const activeArticleView = ref<ArticleMediaViewKey>("grid")
const selectedVideoCategoryId = ref(initialState.videoCategories[0]?.id ?? "")
const selectedArticleCategoryId = ref(initialState.articleCategories[0]?.id ?? "")
const searchQuery = ref("")
const searchExpanded = ref(false)
const expandedCategoryIds = reactive<Record<MediaModuleKey, string[]>>({
  videos: videoCategories.value.map(category => category.id),
  articles: articleCategories.value.map(category => category.id),
})

const sheetOpen = ref(false)
const sheetMode = ref<SheetMode>("preview")
const sheetEntityKind = ref<SheetEntityKind>("video")
const activeEntityId = ref("")
const formState = reactive<MediaEditorForm>(createEmptyForm("video"))

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())
const currentViewTabs = computed(() => activeModule.value === "videos" ? videoViewTabs : articleViewTabs)
const currentView = computed(() => activeModule.value === "videos" ? activeVideoView.value : activeArticleView.value)
const currentSearchPlaceholder = computed(() => activeModule.value === "videos"
  ? "搜索视频标题、分类或摘要"
  : "搜索文章标题、分类、标签或摘要")
const currentSelectedCategoryId = computed(() => (
  activeModule.value === "videos" ? selectedVideoCategoryId.value : selectedArticleCategoryId.value
))
const moduleSwitchTabs = computed<SwitchTab[]>(() => [
  {
    id: "videos",
    label: "视频",
    icon: "ri-movie-2-line",
    badge: videoItems.value.length,
  },
  {
    id: "articles",
    label: "文章",
    icon: "ri-article-line",
    badge: articleItems.value.length,
  },
])

const allVideoCategories = computed(() => flattenCategoryTree(videoCategories.value))
const allArticleCategories = computed(() => flattenCategoryTree(articleCategories.value))
const videoLeafCategories = computed(() => allVideoCategories.value.filter(node => !node.children?.length))
const articleLeafCategories = computed(() => allArticleCategories.value.filter(node => !node.children?.length))

const videoItemMap = computed(() => new Map(videoItems.value.map(item => [item.id, item])))
const articleItemMap = computed(() => new Map(articleItems.value.map(item => [item.id, item])))

const selectedVideoCategoryIds = computed(() => resolveSelectedCategoryIds(
  selectedVideoCategoryId.value,
  videoCategories.value,
))
const selectedArticleCategoryIds = computed(() => resolveSelectedCategoryIds(
  selectedArticleCategoryId.value,
  articleCategories.value,
))

const videoCategoryCounts = computed(() => buildCategoryCounts(
  videoCategories.value,
  videoItems.value.map(item => item.categoryId),
))
const articleCategoryCounts = computed(() => buildCategoryCounts(
  articleCategories.value,
  articleItems.value.map(item => item.categoryId),
))

const visibleVideoCategoryRows = computed(() => buildCategoryRows(
  videoCategories.value,
  new Set(expandedCategoryIds.videos),
  videoCategoryCounts.value,
))
const visibleArticleCategoryRows = computed(() => buildCategoryRows(
  articleCategories.value,
  new Set(expandedCategoryIds.articles),
  articleCategoryCounts.value,
))
const visibleCurrentCategoryRows = computed(() => (
  activeModule.value === "videos" ? visibleVideoCategoryRows.value : visibleArticleCategoryRows.value
))

const filteredVideoItems = computed(() => {
  const query = normalizedSearch.value

  return [...videoItems.value]
    .filter((item) => {
      if (!matchesSelectedCategory(item.categoryId, selectedVideoCategoryIds.value)) {
        return false
      }

      if (!query) {
        return true
      }

      return matchesQuery(query, [
        item.title,
        item.summary,
        item.cover,
        getCategoryPathLabel("videos", item.categoryId),
      ])
    })
    .sort(compareBySortOrder)
})

const filteredVideoListEntries = computed<VideoListEntry[]>(() => {
  const videoEntries: VideoListEntry[] = filteredVideoItems.value.map(item => ({
    kind: "video",
    id: item.id,
    title: item.title,
    summary: item.summary,
    categoryId: item.categoryId,
    status: item.status,
    featured: item.featured,
    sortOrder: item.sortOrder,
    updatedAt: item.updatedAt,
    meta: buildVideoPlacement(item),
  }))

  return videoEntries.sort(compareBySortOrder)
})

const filteredArticles = computed(() => {
  const query = normalizedSearch.value

  return [...articleItems.value]
    .filter((item) => {
      if (!matchesSelectedCategory(item.categoryId, selectedArticleCategoryIds.value)) {
        return false
      }

      if (!query) {
        return true
      }

      return matchesQuery(query, [
        item.title,
        item.summary,
        item.cover,
        item.tags.join(" "),
        item.markdown,
        getCategoryPathLabel("articles", item.categoryId),
      ])
    })
    .sort(compareBySortOrder)
})

const activeVideo = computed(() => videoItemMap.value.get(activeEntityId.value) ?? null)
const activeArticle = computed(() => articleItemMap.value.get(activeEntityId.value) ?? null)

const sheetTitle = computed(() => {
  if (sheetMode.value === "create") {
    return `新建${getEntityLabel(sheetEntityKind.value)}`
  }

  if (sheetMode.value === "edit") {
    return `编辑${getEntityLabel(sheetEntityKind.value)}`
  }

  return getPreviewTitle()
})

const sheetDescription = computed(() => {
  if (sheetMode.value === "create") {
    return activeModule.value === "videos"
      ? "先用 mock 数据把视频标题、摘要和首页分发字段定下来。"
      : "先用 Markdown 组织正文、摘要和首页推荐信息。"
  }

  if (sheetMode.value === "edit") {
    return "保存后仅更新本地 mock 数据，便于先打磨维护流程。"
  }

  return getPreviewDescription()
})

const previewMarkdownHtml = computed(() => {
  if (sheetMode.value === "preview") {
    return renderMockMarkdown(activeArticle.value?.markdown ?? "")
  }

  return renderMockMarkdown(formState.markdown)
})

watch(activeModule, () => {
  searchQuery.value = ""
  searchExpanded.value = false
  sheetOpen.value = false
})

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
  }

  searchExpanded.value = !searchExpanded.value
}

function toggleCategory(module: MediaModuleKey, id: string) {
  const next = new Set(expandedCategoryIds[module])
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedCategoryIds[module] = [...next]
}

function selectCategory(module: MediaModuleKey, id: string) {
  if (module === "videos") {
    selectedVideoCategoryId.value = id
    return
  }

  selectedArticleCategoryId.value = id
}

function addCategory(module: MediaModuleKey) {
  const prefix = module === "videos" ? "video" : "article"
  const nextIndex = flattenCategoryTree(module === "videos" ? videoCategories.value : articleCategories.value).length + 1
  const newCategory: MediaCategoryNode = {
    id: `${prefix}-category-${Date.now()}`,
    name: `新分类 ${nextIndex}`,
    slug: `${prefix}-category-${nextIndex}`,
    count: 0,
    module,
  }

  if (module === "videos") {
    videoCategories.value = [...videoCategories.value, newCategory]
    selectedVideoCategoryId.value = newCategory.id
    expandedCategoryIds.videos = [...expandedCategoryIds.videos, newCategory.id]
    toast.success("已添加视频分类")
    return
  }

  articleCategories.value = [...articleCategories.value, newCategory]
  selectedArticleCategoryId.value = newCategory.id
  expandedCategoryIds.articles = [...expandedCategoryIds.articles, newCategory.id]
  toast.success("已添加文章分类")
}

function openCreate(kind: SheetEntityKind, defaults: Partial<MediaEditorForm> = {}) {
  sheetMode.value = "create"
  sheetEntityKind.value = kind
  activeEntityId.value = ""

  const fallbackVideoCategory = resolveLeafCategoryId(selectedVideoCategoryId.value, videoCategories.value)
  const fallbackArticleCategory = resolveLeafCategoryId(selectedArticleCategoryId.value, articleCategories.value)

  applyForm(createEmptyForm(kind, {
    categoryId: kind === "article" ? fallbackArticleCategory : fallbackVideoCategory,
    markdown: kind === "article" ? "# 新文章标题\n\n请先输入摘要和正文。" : "",
    sortOrder: kind === "article"
      ? (articleItems.value[0]?.sortOrder ?? 0) + 1
      : (videoItems.value[0]?.sortOrder ?? 0) + 1,
    ...defaults,
  }))

  sheetOpen.value = true
}

function openPreview(kind: SheetEntityKind, id: string) {
  sheetMode.value = "preview"
  sheetEntityKind.value = kind
  activeEntityId.value = id
  sheetOpen.value = true
}

function openEdit(kind: SheetEntityKind, id: string) {
  sheetMode.value = "edit"
  sheetEntityKind.value = kind
  activeEntityId.value = id

  if (kind === "video") {
    const entity = videoItemMap.value.get(id)
    if (!entity) {
      return
    }

    applyForm(createEmptyForm("video", {
      title: entity.title,
      categoryId: entity.categoryId,
      cover: entity.cover,
      duration: entity.duration,
      summary: entity.summary,
      status: entity.status,
      featured: entity.featured,
      sortOrder: entity.sortOrder,
    }))
  }

  if (kind === "article") {
    const entity = articleItemMap.value.get(id)
    if (!entity) {
      return
    }

    applyForm(createEmptyForm("article", {
      title: entity.title,
      categoryId: entity.categoryId,
      cover: entity.cover,
      summary: entity.summary,
      markdown: entity.markdown,
      tagsText: entity.tags.join(", "),
      status: entity.status,
      featured: entity.featured,
      sortOrder: entity.sortOrder,
    }))
  }

  sheetOpen.value = true
}

function editPreviewEntity() {
  if (!activeEntityId.value) {
    return
  }

  openEdit(sheetEntityKind.value, activeEntityId.value)
}

function closeSheet() {
  sheetOpen.value = false
}

function saveCurrentForm() {
  if (!formState.title.trim()) {
    toast.error("请先填写标题")
    return
  }

  if (!formState.categoryId) {
    toast.error(formState.kind === "article" ? "请选择文章分类" : "请选择视频分类")
    return
  }

  const timestamp = formatNow()

  if (formState.kind === "video") {
    const created = sheetMode.value === "create"
    const next: VideoItem = {
      id: sheetMode.value === "edit" ? activeEntityId.value : createId("video"),
      chapterId: "",
      categoryId: formState.categoryId,
      title: formState.title.trim(),
      cover: formState.cover.trim() || formState.title.trim(),
      duration: formState.duration.trim() || "05:00",
      summary: formState.summary.trim(),
      status: formState.status,
      featured: formState.featured,
      sortOrder: Number(formState.sortOrder) || 0,
      updatedAt: timestamp,
    }

    upsertById(videoItems.value, next)
    activeEntityId.value = next.id
    sheetMode.value = "preview"
    sheetEntityKind.value = "video"
    toast.success(created ? "视频已创建" : "视频已保存")
    return
  }

  const created = sheetMode.value === "create"
  const nextArticle: ArticleItem = {
    id: sheetMode.value === "edit" ? activeEntityId.value : createId("article"),
    categoryId: formState.categoryId,
    title: formState.title.trim(),
    cover: formState.cover.trim() || formState.title.trim(),
    summary: formState.summary.trim(),
    markdown: formState.markdown.trim(),
    tags: formState.tagsText
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean),
    status: formState.status,
    featured: formState.featured,
    sortOrder: Number(formState.sortOrder) || 0,
    updatedAt: timestamp,
  }

  upsertById(articleItems.value, nextArticle)
  activeEntityId.value = nextArticle.id
  sheetMode.value = "preview"
  sheetEntityKind.value = "article"
  toast.success(created ? "文章已创建" : "文章已保存")
}

function applyForm(next: MediaEditorForm) {
  Object.assign(formState, next)
}

function isActiveEntity(kind: SheetEntityKind, id: string) {
  return sheetOpen.value && sheetMode.value === "preview" && sheetEntityKind.value === kind && activeEntityId.value === id
}

function getPreviewTitle() {
  if (sheetEntityKind.value === "video") {
    return activeVideo.value?.title ?? "视频详情"
  }

  return activeArticle.value?.title ?? "文章详情"
}

function getPreviewDescription() {
  if (sheetEntityKind.value === "video" && activeVideo.value) {
    return buildVideoPlacement(activeVideo.value)
  }

  if (sheetEntityKind.value === "article" && activeArticle.value) {
    return getCategoryPathLabel("articles", activeArticle.value.categoryId)
  }

  return "媒体库预览"
}

function getEntityLabel(kind: SheetEntityKind) {
  switch (kind) {
    case "video":
      return "视频"
    case "article":
      return "文章"
  }
}

function getStatusLabel(status: MediaStatus) {
  return statusLabelMap.get(status) ?? "未知状态"
}

function getStatusBadgeClass(status: MediaStatus) {
  if (status === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "scheduled") {
    return "border-orange-200 bg-orange-50 text-orange-700"
  }

  return "border-border bg-muted text-muted-foreground"
}

function getCoverTone(seed: string) {
  const index = Math.abs(hashText(seed)) % coverToneClasses.length
  return {
    surface: coverToneClasses[index],
    accent: coverAccentClasses[index],
  }
}

function getCategoryPathLabel(module: MediaModuleKey, categoryId: string) {
  const tree = module === "videos" ? videoCategories.value : articleCategories.value
  const path = findCategoryPath(tree, categoryId)
  return path.length ? path.map(item => item.name).join(" / ") : "未分配分类"
}

function buildVideoPlacement(item: VideoItem) {
  return [getCategoryPathLabel("videos", item.categoryId), item.duration].filter(Boolean).join(" · ")
}

function matchesSelectedCategory(categoryId: string, selectedIds: Set<string> | null) {
  return !selectedIds || selectedIds.has(categoryId)
}

function compareBySortOrder<
  T extends {
    sortOrder: number
    updatedAt?: string
    title?: string
  },
>(left: T, right: T) {
  return left.sortOrder - right.sortOrder
    || String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""))
    || String(left.title ?? "").localeCompare(String(right.title ?? ""), "zh-CN")
}

function formatNow() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const date = `${now.getDate()}`.padStart(2, "0")
  const hours = `${now.getHours()}`.padStart(2, "0")
  const minutes = `${now.getMinutes()}`.padStart(2, "0")
  return `${year}-${month}-${date} ${hours}:${minutes}`
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}`
}

function createEmptyForm(kind: SheetEntityKind, overrides: Partial<MediaEditorForm> = {}): MediaEditorForm {
  return {
    kind,
    title: "",
    categoryId: "",
    cover: "",
    summary: "",
    duration: "05:00",
    status: "draft",
    featured: false,
    sortOrder: 10,
    markdown: "",
    tagsText: "",
    ...overrides,
  }
}

function upsertById<T extends { id: string }>(list: T[], next: T) {
  const index = list.findIndex(item => item.id === next.id)

  if (index === -1) {
    list.unshift(next)
    return
  }

  list.splice(index, 1, next)
}

function flattenCategoryTree(nodes: MediaCategoryNode[]): MediaCategoryNode[] {
  const flattened: MediaCategoryNode[] = []

  const visit = (items: MediaCategoryNode[]) => {
    for (const item of items) {
      flattened.push(item)
      if (item.children?.length) {
        visit(item.children)
      }
    }
  }

  visit(nodes)
  return flattened
}

function resolveSelectedCategoryIds(selectedId: string, tree: MediaCategoryNode[]) {
  if (!selectedId || selectedId === "all") {
    return null
  }

  const ids = new Set<string>()
  const collect = (items: MediaCategoryNode[]) => {
    for (const item of items) {
      if (item.id === selectedId) {
        collectNodeIds(item, ids)
        return true
      }

      if (item.children?.length && collect(item.children)) {
        return true
      }
    }

    return false
  }

  collect(tree)
  return ids
}

function resolveLeafCategoryId(selectedId: string, tree: MediaCategoryNode[]): string {
  if (!tree.length) {
    return ""
  }

  if (!selectedId || selectedId === "all") {
    return findFirstLeafCategoryId(tree)
  }

  const path = findCategoryPath(tree, selectedId)
  const target = path[path.length - 1]
  return target ? findFirstLeafCategoryId([target]) : findFirstLeafCategoryId(tree)
}

function findFirstLeafCategoryId(nodes: MediaCategoryNode[]): string {
  for (const node of nodes) {
    if (!node.children?.length) {
      return node.id
    }

    const childLeafId = findFirstLeafCategoryId(node.children)
    if (childLeafId) {
      return childLeafId
    }
  }

  return ""
}

function collectNodeIds(node: MediaCategoryNode, bucket: Set<string>) {
  bucket.add(node.id)
  for (const child of node.children ?? []) {
    collectNodeIds(child, bucket)
  }
}

function buildCategoryCounts(tree: MediaCategoryNode[], usedCategoryIds: string[]) {
  const directCounts = new Map<string, number>()
  for (const categoryId of usedCategoryIds) {
    directCounts.set(categoryId, (directCounts.get(categoryId) ?? 0) + 1)
  }

  const aggregatedCounts = new Map<string, number>()
  const visit = (node: MediaCategoryNode): number => {
    const own = directCounts.get(node.id) ?? 0
    const childTotal = (node.children ?? []).reduce((sum, child) => sum + visit(child), 0)
    const total = own + childTotal
    aggregatedCounts.set(node.id, total)
    return total
  }

  for (const node of tree) {
    visit(node)
  }

  return aggregatedCounts
}

function buildCategoryRows(
  nodes: MediaCategoryNode[],
  expandedIds: Set<string>,
  counts: Map<string, number>,
  depth = 0,
  rows: CategoryTreeRow[] = [],
) {
  for (const node of nodes) {
    const hasChildren = Boolean(node.children?.length)
    const expanded = expandedIds.has(node.id)
    rows.push({
      id: node.id,
      name: node.name,
      depth,
      hasChildren,
      expanded,
      count: counts.get(node.id) ?? 0,
    })

    if (hasChildren && expanded) {
      buildCategoryRows(node.children ?? [], expandedIds, counts, depth + 1, rows)
    }
  }

  return rows
}

function findCategoryPath(nodes: MediaCategoryNode[], categoryId: string, stack: MediaCategoryNode[] = []): MediaCategoryNode[] {
  for (const node of nodes) {
    const nextStack = [...stack, node]
    if (node.id === categoryId) {
      return nextStack
    }
    if (node.children?.length) {
      const match = findCategoryPath(node.children, categoryId, nextStack)
      if (match.length) {
        return match
      }
    }
  }

  return []
}

function hashText(value: string) {
  return [...value].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7)
}

function matchesQuery(query: string, values: Array<string | undefined | null>) {
  const normalizedValues = values
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase()

  return normalizedValues.includes(query)
}

function renderMockMarkdown(markdown: string) {
  if (!markdown.trim()) {
    return "<p>暂无正文。</p>"
  }

  const lines = markdown.split("\n")
  const html: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      html.push("</ul>")
      inList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      closeList()
      continue
    }

    const escaped = renderInlineMarkdown(escapeHtml(line.trim()))

    if (line.startsWith("### ")) {
      closeList()
      html.push(`<h3>${renderInlineMarkdown(escapeHtml(line.slice(4)))}</h3>`)
      continue
    }

    if (line.startsWith("## ")) {
      closeList()
      html.push(`<h2>${renderInlineMarkdown(escapeHtml(line.slice(3)))}</h2>`)
      continue
    }

    if (line.startsWith("# ")) {
      closeList()
      html.push(`<h1>${renderInlineMarkdown(escapeHtml(line.slice(2)))}</h1>`)
      continue
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>")
        inList = true
      }
      html.push(`<li>${renderInlineMarkdown(escapeHtml(line.slice(2)))}</li>`)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      closeList()
      html.push(`<p>${escaped}</p>`)
      continue
    }

    if (line.startsWith("> ")) {
      closeList()
      html.push(`<blockquote>${renderInlineMarkdown(escapeHtml(line.slice(2)))}</blockquote>`)
      continue
    }

    closeList()
    html.push(`<p>${escaped}</p>`)
  }

  closeList()
  return html.join("")
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
</script>

<template>
  <section class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
    <SettingsPageHeader
      title="媒体库"
      description="为客户 app 首页维护视频教程与图文内容。当前版本全部基于 mock 数据，重点先验证后台维护结构和操作节奏。"
    >
      <SettingsToolbarRow>
        <template #leading>
          <div class="w-fit shrink-0">
            <TopTabSwitch
              :tabs="moduleSwitchTabs"
              :model-value="activeModule"
              :collapse-inactive="false"
              tone="default"
              aria-label="切换媒体库模块"
              @update:model-value="activeModule = $event as MediaModuleKey"
            />
          </div>
        </template>

        <div class="flex flex-nowrap items-center justify-end gap-2">
          <div class="flex shrink-0 items-center gap-1">
            <Button
              v-for="view in currentViewTabs"
              :key="view.id"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground"
              :class="currentView === view.id ? 'bg-accent text-foreground' : ''"
              :aria-label="view.label"
              :title="view.label"
              @click="activeModule === 'videos'
                ? (activeVideoView = view.id as VideoMediaViewKey)
                : (activeArticleView = view.id as ArticleMediaViewKey)"
            >
              <i v-if="view.icon" :class="[view.icon, 'text-[15px]']" />
              <span class="sr-only">{{ view.label }}</span>
            </Button>
          </div>

          <SettingsToolbarSearchInput
            v-model="searchQuery"
            :expanded="searchExpanded"
            :placeholder="currentSearchPlaceholder"
            @toggle="toggleSearch"
          />

          <Button size="sm" class="h-8 rounded-md px-3" @click="openCreate(activeModule === 'videos' ? 'video' : 'article')">
            <i class="ri-add-line text-base" />
            <span>添加</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </SettingsPageHeader>

    <div class="mx-auto flex min-h-0 w-full max-w-4xl flex-1 gap-8 overflow-hidden pb-4">
      <aside class="w-[240px] shrink-0 overflow-y-auto pt-4">
        <div class="mb-2 px-1">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            分类
          </p>
        </div>

        <div class="space-y-0.5">
          <div
            v-for="row in visibleCurrentCategoryRows"
            :key="row.id"
            class="flex w-full items-center gap-1.5 px-1 py-0.5"
          >
            <span :style="{ width: `${row.depth * 14}px` }" class="shrink-0" aria-hidden="true" />
            <button
              v-if="row.hasChildren"
              type="button"
              class="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              @click.stop="toggleCategory(activeModule, row.id)"
            >
              <i :class="[row.expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line', 'text-sm']" />
            </button>
            <span v-else class="flex size-4 shrink-0 items-center justify-center text-muted-foreground/40">
              <i class="ri-corner-down-right-line text-[11px]" />
            </span>

            <button
              type="button"
              class="min-w-0 flex-1 rounded-md px-1.5 py-1 text-left text-sm transition-colors"
              :class="currentSelectedCategoryId === row.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
              @click="selectCategory(activeModule, row.id)"
            >
              <span class="truncate">{{ row.name }}</span>
            </button>

            <span class="shrink-0 px-1 text-[11px] text-muted-foreground">
              {{ row.count }}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          class="mt-3 h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
          @click="addCategory(activeModule)"
        >
          <i class="ri-add-line text-[15px]" />
          <span>添加分类</span>
        </Button>
      </aside>

      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto pt-4">
        <section
          v-if="activeModule === 'videos' && currentView === 'grid'"
          class="space-y-0"
        >
          <div v-if="filteredVideoItems.length" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <button
              v-for="item in filteredVideoItems"
              :key="item.id"
              type="button"
              class="group block text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              @click="openPreview('video', item.id)"
            >
              <div
                class="video-thumbnail-card relative aspect-[3/4] overflow-hidden rounded-[18px] bg-slate-950 text-white transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                :class="isActiveEntity('video', item.id) ? 'ring-2 ring-foreground/18 ring-offset-2 ring-offset-background' : ''"
              >
                <img
                  class="absolute inset-0 h-full w-full object-cover"
                  :src="videoPreviewAsset"
                  alt=""
                  aria-hidden="true"
                />
                <div class="absolute inset-0 bg-black/6" aria-hidden="true" />
                <div class="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/82 via-black/38 to-transparent" aria-hidden="true" />

                <div class="absolute right-2.5 top-2.5">
                  <span class="flex size-6.5 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-[0_4px_8px_rgba(15,23,42,0.16)]">
                    <i class="ri-play-fill translate-x-[1px] text-[14px] leading-none" />
                  </span>
                </div>

                <div class="absolute inset-x-0 bottom-0 p-4">
                  <h4 class="video-thumbnail-title text-[16px] leading-[1.25] font-semibold tracking-[-0.02em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]">
                    {{ item.title }}
                  </h4>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
            当前筛选下没有视频内容。
          </div>
        </section>

        <section
          v-else-if="activeModule === 'videos' && currentView === 'list'"
          class="rounded-xl border border-border/70 bg-background"
        >
          <div class="border-b border-border/70 px-4 py-3">
            <h3 class="text-lg font-semibold tracking-tight">内容列表</h3>
            <p class="text-sm text-muted-foreground">更适合快速检查状态、推荐位和排序权重。</p>
          </div>

          <div v-if="filteredVideoListEntries.length" class="divide-y divide-border/70">
            <article
              v-for="entry in filteredVideoListEntries"
              :key="`${entry.kind}-${entry.id}`"
              class="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 lg:flex-row lg:items-center"
              :class="isActiveEntity('video', entry.id) ? 'bg-accent/30' : ''"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" class="border-border/80 bg-background text-muted-foreground">
                    视频
                  </Badge>
                  <Badge :class="getStatusBadgeClass(entry.status)">
                    {{ getStatusLabel(entry.status) }}
                  </Badge>
                  <Badge v-if="entry.featured" class="border-amber-200 bg-amber-50 text-amber-700">
                    首页推荐
                  </Badge>
                </div>

                <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h4 class="text-base font-semibold tracking-tight text-foreground">
                    {{ entry.title }}
                  </h4>
                  <span class="text-xs text-muted-foreground">
                    {{ getCategoryPathLabel('videos', entry.categoryId) }}
                  </span>
                </div>

                <p class="media-card-summary mt-2 text-sm leading-6 text-muted-foreground">
                  {{ entry.summary }}
                </p>
              </div>

              <div class="flex min-w-0 flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
                <div class="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {{ entry.meta }}
                </div>
                <div class="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs font-semibold text-foreground">
                  排序 {{ entry.sortOrder }}
                </div>
                <span class="text-xs text-muted-foreground">
                  {{ entry.updatedAt }}
                </span>
                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="rounded-md"
                    @click="openPreview(entry.kind, entry.id)"
                  >
                    预览
                  </Button>
                  <Button
                    size="sm"
                    class="rounded-md"
                    @click="openEdit(entry.kind, entry.id)"
                  >
                    编辑
                  </Button>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="px-6 py-14 text-center text-sm text-muted-foreground">
            当前筛选下没有可展示的列表内容。
          </div>
        </section>

        <section
          v-else-if="activeModule === 'articles' && currentView === 'grid'"
          class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
        >
          <article
            v-for="item in filteredArticles"
            :key="item.id"
            class="rounded-xl border border-border/70 bg-background p-4"
            :class="isActiveEntity('article', item.id) ? 'border-foreground/20 bg-accent/20' : ''"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :class="getStatusBadgeClass(item.status)">
                    {{ getStatusLabel(item.status) }}
                  </Badge>
                  <Badge
                    v-if="item.featured"
                    class="border-amber-200 bg-amber-50 text-amber-700"
                  >
                    首页推荐
                  </Badge>
                </div>
                <h3 class="mt-3 text-lg font-semibold tracking-tight text-foreground">
                  {{ item.title }}
                </h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ item.cover }}
                </p>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">
                {{ item.updatedAt }}
              </span>
            </div>

            <p class="media-card-summary mt-3 text-sm leading-6 text-muted-foreground">
              {{ item.summary }}
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" class="border-border/80 bg-background text-muted-foreground">
                {{ getCategoryPathLabel('articles', item.categoryId) }}
              </Badge>
              <Badge
                v-for="tag in item.tags"
                :key="tag"
                variant="outline"
                class="border-border/80 bg-muted/25 text-muted-foreground"
              >
                {{ tag }}
              </Badge>
            </div>

            <div class="mt-4 border-t border-border/70 pt-3">
              <div class="media-markdown media-markdown-preview" v-html="renderMockMarkdown(item.markdown)" />
            </div>

            <div class="mt-4 flex items-center justify-end gap-2">
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" class="rounded-md" @click="openPreview('article', item.id)">
                  预览
                </Button>
                <Button size="sm" class="rounded-md" @click="openEdit('article', item.id)">
                  编辑
                </Button>
              </div>
            </div>
          </article>

          <div
            v-if="!filteredArticles.length"
            class="col-span-full rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground"
          >
            当前筛选下没有图文文章。
          </div>
        </section>

        <section
          v-else
          class="rounded-xl border border-border/70 bg-background"
        >
          <div class="border-b border-border/70 px-4 py-3">
            <h3 class="text-lg font-semibold tracking-tight">文章列表</h3>
            <p class="text-sm text-muted-foreground">更适合检查发布状态、标签和首页推荐字段。</p>
          </div>

          <div v-if="filteredArticles.length" class="divide-y divide-border/70">
            <article
              v-for="item in filteredArticles"
              :key="item.id"
              class="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 lg:flex-row lg:items-center"
              :class="isActiveEntity('article', item.id) ? 'bg-accent/30' : ''"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :class="getStatusBadgeClass(item.status)">
                    {{ getStatusLabel(item.status) }}
                  </Badge>
                  <Badge v-if="item.featured" class="border-amber-200 bg-amber-50 text-amber-700">
                    首页推荐
                  </Badge>
                  <Badge variant="outline" class="border-border/80 bg-background text-muted-foreground">
                    {{ getCategoryPathLabel('articles', item.categoryId) }}
                  </Badge>
                </div>

                <h4 class="mt-2 text-base font-semibold tracking-tight text-foreground">
                  {{ item.title }}
                </h4>
                <p class="media-card-summary mt-2 text-sm leading-6 text-muted-foreground">
                  {{ item.summary }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <Badge
                    v-for="tag in item.tags"
                    :key="tag"
                    variant="outline"
                    class="border-border/80 bg-muted/25 text-muted-foreground"
                  >
                    {{ tag }}
                  </Badge>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
                <div class="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  排序 {{ item.sortOrder }}
                </div>
                <span class="text-xs text-muted-foreground">
                  {{ item.updatedAt }}
                </span>
                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" class="rounded-md" @click="openPreview('article', item.id)">
                    预览
                  </Button>
                  <Button size="sm" class="rounded-md" @click="openEdit('article', item.id)">
                    编辑
                  </Button>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="px-6 py-14 text-center text-sm text-muted-foreground">
            当前筛选下没有文章内容。
          </div>
        </section>
      </main>
    </div>

    <ResponsiveRightSheet
      :open="sheetOpen"
      :show-primary="false"
      sheet-content-class="overflow-hidden sm:max-w-2xl"
      :title="sheetTitle"
      :description="sheetDescription"
      @update:open="sheetOpen = $event"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <Button
            v-if="sheetMode === 'preview'"
            variant="ghost"
            size="sm"
            class="rounded-md"
            @click="editPreviewEntity"
          >
            <i class="ri-edit-line text-sm" />
            <span>编辑</span>
          </Button>

          <Button
            v-else
            size="sm"
            class="rounded-md"
            @click="saveCurrentForm"
          >
            <i class="ri-save-line text-sm" />
            <span>{{ sheetMode === "create" ? "创建" : "保存" }}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            class="rounded-md"
            @click="closeSheet"
          >
            <i class="ri-close-line text-base" />
            <span class="sr-only">关闭面板</span>
          </Button>
        </div>
      </template>

      <div class="min-h-0 overflow-y-auto px-1 pb-1">
        <div v-if="sheetMode === 'preview'" class="space-y-5">
          <template v-if="sheetEntityKind === 'video' && activeVideo">
            <div
              class="rounded-xl border border-border/70 px-5 py-5"
              :class="getCoverTone(activeVideo.title).surface"
            >
              <div class="flex items-center justify-between gap-3">
                <Badge :class="getStatusBadgeClass(activeVideo.status)">
                  {{ getStatusLabel(activeVideo.status) }}
                </Badge>
                <Badge class="border-border bg-background text-foreground">
                  {{ activeVideo.duration }}
                </Badge>
              </div>
              <p class="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {{ activeVideo.cover }}
              </p>
              <h3 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {{ activeVideo.title }}
              </h3>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-lg border border-border/70 bg-background p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">分类路径</p>
                <p class="mt-2 text-sm leading-6">{{ getCategoryPathLabel('videos', activeVideo.categoryId) }}</p>
              </div>
              <div class="rounded-lg border border-border/70 bg-background p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">首页分发</p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <Badge :class="getStatusBadgeClass(activeVideo.status)">
                    {{ getStatusLabel(activeVideo.status) }}
                  </Badge>
                  <Badge v-if="activeVideo.featured" class="border-amber-200 bg-amber-50 text-amber-700">
                    首页推荐
                  </Badge>
                  <Badge variant="outline" class="border-border/80 bg-background text-muted-foreground">
                    排序 {{ activeVideo.sortOrder }}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border/70 bg-background p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">视频简介</p>
              <p class="mt-3 text-sm leading-7">
                {{ activeVideo.summary }}
              </p>
            </div>
          </template>

          <template v-else-if="sheetEntityKind === 'article' && activeArticle">
            <div
              class="rounded-xl border border-border/70 px-5 py-5"
              :class="getCoverTone(activeArticle.title).surface"
            >
              <div class="flex flex-wrap items-center gap-2">
                <Badge :class="getStatusBadgeClass(activeArticle.status)">
                  {{ getStatusLabel(activeArticle.status) }}
                </Badge>
                <Badge v-if="activeArticle.featured" class="border-amber-200 bg-amber-50 text-amber-700">
                  首页推荐
                </Badge>
              </div>
              <p class="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {{ activeArticle.cover }}
              </p>
              <h3 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {{ activeArticle.title }}
              </h3>
            </div>

            <div class="rounded-lg border border-border/70 bg-background p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">文章摘要</p>
              <p class="mt-3 text-sm leading-7">
                {{ activeArticle.summary }}
              </p>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-lg border border-border/70 bg-background p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">分类路径</p>
                <p class="mt-2 text-sm leading-6">{{ getCategoryPathLabel('articles', activeArticle.categoryId) }}</p>
              </div>
              <div class="rounded-lg border border-border/70 bg-background p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">标签</p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    v-for="tag in activeArticle.tags"
                    :key="tag"
                    variant="outline"
                    class="border-border/80 bg-muted/25 text-muted-foreground"
                  >
                    {{ tag }}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border/70 bg-background p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Markdown 预览</p>
              <div class="media-markdown mt-4" v-html="previewMarkdownHtml" />
            </div>
          </template>
        </div>

        <div v-else class="space-y-5">
          <section class="rounded-xl border border-border/70 bg-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">基础信息</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label class="space-y-2 md:col-span-2">
                <span class="text-sm font-medium text-foreground">标题</span>
                <Input v-model="formState.title" placeholder="输入标题" />
              </label>

              <label class="space-y-2">
                <span class="text-sm font-medium text-foreground">分类</span>
                <Select v-model="formState.categoryId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="category in formState.kind === 'article' ? articleLeafCategories : videoLeafCategories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ getCategoryPathLabel(formState.kind === 'article' ? 'articles' : 'videos', category.id) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label v-if="formState.kind === 'video'" class="space-y-2">
                <span class="text-sm font-medium text-foreground">封面文案</span>
                <Input v-model="formState.cover" placeholder="封面主文案或主题词" />
              </label>

              <label v-else class="space-y-2">
                <span class="text-sm font-medium text-foreground">封面文案</span>
                <Input v-model="formState.cover" placeholder="封面主文案或主题词" />
              </label>

              <label v-if="formState.kind === 'video'" class="space-y-2">
                <span class="text-sm font-medium text-foreground">时长</span>
                <Input v-model="formState.duration" placeholder="例如 05:30" />
              </label>

              <label class="space-y-2">
                <span class="text-sm font-medium text-foreground">状态</span>
                <Select v-model="formState.status">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="status in MEDIA_STATUS_OPTIONS"
                      :key="status.value"
                      :value="status.value"
                    >
                      {{ status.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label class="space-y-2">
                <span class="text-sm font-medium text-foreground">排序权重</span>
                <Input v-model="formState.sortOrder" type="number" placeholder="输入排序权重" />
              </label>

              <label class="space-y-2 md:col-span-2">
                <span class="text-sm font-medium text-foreground">摘要</span>
                <Textarea
                  v-model="formState.summary"
                  class="min-h-[108px]"
                  :placeholder="formState.kind === 'article' ? '输入文章摘要，用于首页和列表概览' : '输入内容简介，说明适用场景和主要收益'"
                />
              </label>
            </div>
          </section>

          <section class="rounded-xl border border-border/70 bg-background p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">首页分发</p>
                <p class="mt-1 text-sm text-muted-foreground">这部分字段先用来模拟 app 首页运营配置。</p>
              </div>
              <label class="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm font-medium">
                <Checkbox v-model:checked="formState.featured" />
                首页推荐
              </label>
            </div>
          </section>

          <section
            v-if="formState.kind === 'article'"
            class="rounded-xl border border-border/70 bg-background p-4"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">文章正文</p>
            <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div class="space-y-4">
                <label class="space-y-2">
                  <span class="text-sm font-medium text-foreground">标签</span>
                  <Input v-model="formState.tagsText" placeholder="多个标签使用英文逗号分隔" />
                </label>
                <label class="space-y-2">
                  <span class="text-sm font-medium text-foreground">Markdown</span>
                  <Textarea
                    v-model="formState.markdown"
                    class="min-h-[360px] font-mono text-sm"
                    placeholder="输入 Markdown 正文"
                  />
                </label>
              </div>

              <div class="rounded-lg border border-border/70 bg-muted/20 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium">实时预览</span>
                  <Badge variant="outline" class="border-border/80 bg-background text-muted-foreground">
                    Markdown
                  </Badge>
                </div>
                <div class="media-markdown mt-4" v-html="previewMarkdownHtml" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </ResponsiveRightSheet>
  </section>
</template>

<style scoped>
.media-card-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.video-thumbnail-card::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  content: "";
  pointer-events: none;
}

.video-thumbnail-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-markdown {
  color: hsl(var(--foreground));
  font-size: 0.95rem;
  line-height: 1.8;
}

.media-markdown :deep(h1),
.media-markdown :deep(h2),
.media-markdown :deep(h3) {
  margin: 0 0 0.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.media-markdown :deep(h1) {
  font-size: 1.55rem;
}

.media-markdown :deep(h2) {
  font-size: 1.2rem;
}

.media-markdown :deep(h3) {
  font-size: 1rem;
}

.media-markdown :deep(p),
.media-markdown :deep(ul),
.media-markdown :deep(blockquote) {
  margin: 0 0 0.85rem;
}

.media-markdown :deep(ul) {
  padding-left: 1.15rem;
}

.media-markdown :deep(li) {
  margin: 0.3rem 0;
}

.media-markdown :deep(blockquote) {
  border-left: 3px solid rgba(15, 23, 42, 0.16);
  padding-left: 0.9rem;
  color: rgb(71 85 105);
}

.media-markdown :deep(code) {
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.06);
  padding: 0.1rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  font-size: 0.88em;
}

.media-markdown :deep(a) {
  color: rgb(3 105 161);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.media-markdown-preview {
  max-height: 220px;
  overflow: hidden;
}
</style>
