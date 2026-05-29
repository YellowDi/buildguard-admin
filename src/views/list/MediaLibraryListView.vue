<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
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
import FileUploadField from "@/components/upload/FileUploadField.vue"
import { Button } from "@/components/ui/button"
import videoPreviewAsset from "@/assets/video.png"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from "@/components/ui/tags-input"
import { Textarea } from "@/components/ui/textarea"
import {
  getApiErrorMessage,
  handleApiError,
} from "@/lib/api-errors"
import {
  fetchBusinessPresetEntryOptions,
  type BusinessPresetEntryOption,
} from "@/lib/business-preset-options"
import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"
import { buildCosVideoSnapshotUrl } from "@/lib/cos-video-snapshot"
import {
  createMediaArticle,
  deleteMediaArticle,
  fetchMediaArticles,
  getMediaArticleDetail,
  type MediaArticleRecord,
  type MediaArticleStatus,
  updateMediaArticle,
} from "@/lib/media-articles-api"
import {
  createMediaType,
  deleteMediaType,
  fetchMediaTypes,
  getMediaTypeDetail,
  type MediaTypeKind,
  type MediaTypeRecord,
  updateMediaType,
} from "@/lib/media-types-api"
import {
  createMediaVideo,
  deleteMediaVideo,
  fetchMediaVideos,
  getMediaVideoDetail,
  type MediaVideoStatus,
  type MediaVideoRecord,
  updateMediaVideo,
} from "@/lib/media-videos-api"
import { PERMISSION_CODES } from "@/lib/permission-codes"
import { sanitizeRichTextHtml } from "@/lib/sanitize-html"
import { uploadTencentCosFile } from "@/lib/tencent-cos-sdk"

type SheetMode = "preview" | "edit" | "create"
type SheetEntityKind = "video" | "article"
type MediaModuleKey = "videos" | "articles"
type MediaStatus = "draft" | "published" | "scheduled"
type VideoMediaViewKey = "grid" | "list"
type ArticleMediaViewKey = "grid" | "list"

type MediaCategoryNode = {
  id: string
  name: string
  slug: string
  count: number
  module: MediaModuleKey
  isDefault?: boolean
  parentUuid?: string
  sortOrder?: number
  tag?: string
  children?: MediaCategoryNode[]
}

type VideoItem = {
  id: string
  categoryId: string
  title: string
  cover: string
  sourceUrl: string
  sourceFileName: string
  summary: string
  status: MediaStatus
  sortOrder: number
}

type ArticleItem = {
  id: string
  categoryId: string
  title: string
  cover: string
  content: string
  tags: string[]
  status: MediaStatus
  sortOrder: number
}

type MediaEditorForm = {
  kind: SheetEntityKind
  title: string
  categoryId: string
  cover: string
  sourceUrl: string
  sourceFileName: string
  summary: string
  status: MediaStatus
  sortOrder: number
  content: string
  tagsText: string
}

type CategoryTreeRow = {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  expanded: boolean
  count: number
  isDefault: boolean
  sortOrder: number
}

type MediaCategoryForm = {
  name: string
  sortNum: number
  parentUuid: string
  tag: string
}

type SelectOption = {
  value: string
  label: string
}

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

const MEDIA_TYPE_MAP: Record<MediaModuleKey, MediaTypeKind> = {
  videos: 1,
  articles: 2,
}
const MEDIA_LIBRARY_VIDEO_COVER_SNAPSHOT_OPTIONS = {
  width: 375,
  height: 0,
} as const
const MEDIA_CATEGORY_PAGE_SIZE = 500
const MEDIA_CATEGORY_LOAD_ERROR_MESSAGE = "媒体分类列表加载失败，请稍后重试。"
const MEDIA_VIDEO_PAGE_SIZE = 500
const MEDIA_VIDEO_LOAD_ERROR_MESSAGE = "媒体视频列表加载失败，请稍后重试。"
const MEDIA_ARTICLE_PAGE_SIZE = 500
const MEDIA_ARTICLE_LOAD_ERROR_MESSAGE = "媒体文章列表加载失败，请稍后重试。"
const ROOT_CATEGORY_PARENT_VALUE = "__root__"
const MEDIA_CATEGORY_TAG_EMPTY_VALUE = "__none__"

const { canButton } = useCurrentUserPermissions()
const MEDIA_STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: "published", label: "已发布" },
  { value: "scheduled", label: "待上线" },
  { value: "draft", label: "草稿" },
]

const statusLabelMap = new Map(MEDIA_STATUS_OPTIONS.map(option => [option.value, option.label]))

const videoCategories = ref<MediaCategoryNode[]>([])
const articleCategories = ref<MediaCategoryNode[]>([])
const videoItems = ref<VideoItem[]>([])
const articleItems = ref<ArticleItem[]>([])

const activeModule = ref<MediaModuleKey>("videos")
const activeVideoView = ref<VideoMediaViewKey>("grid")
const activeArticleView = ref<ArticleMediaViewKey>("list")
const selectedVideoCategoryId = ref("")
const selectedArticleCategoryId = ref("")
const searchQuery = ref("")
const searchExpanded = ref(false)
const expandedCategoryIds = reactive<Record<MediaModuleKey, string[]>>({
  videos: [],
  articles: [],
})
const categoryLoading = reactive<Record<MediaModuleKey, boolean>>({
  videos: false,
  articles: false,
})
const categoryErrorMessages = reactive<Record<MediaModuleKey, string>>({
  videos: "",
  articles: "",
})
const videoListLoading = ref(false)
const videoListErrorMessage = ref("")
const videoDetailLoading = ref(false)
const videoCreateSubmitting = ref(false)
const videoDeleteSubmitting = ref(false)
const videoDeleteConfirmOpen = ref(false)
const articleListLoading = ref(false)
const articleListErrorMessage = ref("")
const articleDetailLoading = ref(false)
const articleCreateSubmitting = ref(false)
const articleDeleteSubmitting = ref(false)
const articleDeleteConfirmOpen = ref(false)

const sheetOpen = ref(false)
const sheetMode = ref<SheetMode>("preview")
const sheetEntityKind = ref<SheetEntityKind>("video")
const activeEntityId = ref("")
const uploadingVideoFile = ref(false)
const uploadingArticleCover = ref(false)
const formState = reactive<MediaEditorForm>(createEmptyForm("video"))
const categoryCreateDialogOpen = ref(false)
const categoryEditDialogOpen = ref(false)
const categoryDeleteConfirmOpen = ref(false)
const categoryCreateSubmitting = ref(false)
const categoryEditSubmitting = ref(false)
const categoryDeleteSubmitting = ref(false)
const categoryDetailLoading = ref(false)
const mediaCategoryTagLoading = ref(false)
const categoryCreateModule = ref<MediaModuleKey>("videos")
const categoryEditModule = ref<MediaModuleKey>("videos")
const categoryDeleteModule = ref<MediaModuleKey>("videos")
const editingCategoryId = ref("")
const deletingCategoryId = ref("")
const categoryCreateForm = reactive<MediaCategoryForm>(createEmptyCategoryForm())
const categoryEditForm = reactive<MediaCategoryForm>(createEmptyCategoryForm())
const mediaCategoryTagEntries = ref<BusinessPresetEntryOption[]>([])

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())
const articleCoverPreviewSrc = computed(() => normalizeArticleCoverSource(formState.cover))
const articleCoverSelectedLabel = computed(() => {
  const cover = formState.cover.trim()

  if (!cover) {
    return "暂未选择封面"
  }

  return cover
})
const articleTagValues = computed<string[]>({
  get: () => parseTagText(formState.tagsText),
  set: value => {
    formState.tagsText = value.map(tag => tag.trim()).filter(Boolean).join(", ")
  },
})
const currentViewTabs = computed(() => activeModule.value === "videos" ? videoViewTabs : articleViewTabs)
const currentView = computed(() => activeModule.value === "videos" ? activeVideoView.value : activeArticleView.value)
const currentSearchPlaceholder = computed(() => activeModule.value === "videos"
  ? "搜索视频标题、分类或摘要"
  : "搜索文章标题、分类、标签或摘要")
const currentSelectedCategoryId = computed(() => (
  activeModule.value === "videos" ? selectedVideoCategoryId.value : selectedArticleCategoryId.value
))
const currentCategoryLoading = computed(() => categoryLoading[activeModule.value])
const currentCategoryErrorMessage = computed(() => categoryErrorMessages[activeModule.value])
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
const editingCategory = computed(() => findCategoryById(
  categoryEditModule.value === "videos" ? videoCategories.value : articleCategories.value,
  editingCategoryId.value,
))
const deletingCategory = computed(() => findCategoryById(
  categoryDeleteModule.value === "videos" ? videoCategories.value : articleCategories.value,
  deletingCategoryId.value,
))

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
  videoItems.value.map(item => normalizeItemCategoryId("videos", item.categoryId)),
))
const articleCategoryCounts = computed(() => buildCategoryCounts(
  articleCategories.value,
  articleItems.value.map(item => normalizeItemCategoryId("articles", item.categoryId)),
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
const categoryCreateParentOptions = computed(() => flattenCategoryTree(getModuleCategories(categoryCreateModule.value)))
const categoryCreateParentModel = computed(() => categoryCreateForm.parentUuid || ROOT_CATEGORY_PARENT_VALUE)
const categoryCreateTagModel = computed({
  get: () => categoryCreateForm.tag || MEDIA_CATEGORY_TAG_EMPTY_VALUE,
  set: value => {
    categoryCreateForm.tag = normalizeCategoryTagSelectValue(value)
  },
})
const categoryEditTagModel = computed({
  get: () => categoryEditForm.tag || MEDIA_CATEGORY_TAG_EMPTY_VALUE,
  set: value => {
    categoryEditForm.tag = normalizeCategoryTagSelectValue(value)
  },
})
const categoryCreateTagOptions = computed(() => buildMediaCategoryTagOptions(categoryCreateForm.tag))
const categoryEditTagOptions = computed(() => buildMediaCategoryTagOptions(categoryEditForm.tag))
const canAddMediaContent = computed(() => canButton(PERMISSION_CODES.mediaLibraryContentAdd))
const canEditMediaContent = computed(() => canButton(PERMISSION_CODES.mediaLibraryContentEdit))
const canDeleteMediaContent = computed(() => canButton(PERMISSION_CODES.mediaLibraryContentDelete))
const canAddMediaCategory = computed(() => canButton(PERMISSION_CODES.mediaLibraryCategoryAdd))
const canAddMediaChildCategory = computed(() => canButton(PERMISSION_CODES.mediaLibraryCategoryChildAdd))
const canEditMediaCategory = computed(() => canButton(PERMISSION_CODES.mediaLibraryCategoryEdit))
const canDeleteMediaCategory = computed(() => canButton(PERMISSION_CODES.mediaLibraryCategoryDelete))
const canUploadMediaVideo = computed(() => canButton(PERMISSION_CODES.mediaLibraryVideoUpload))
const canUploadMediaCover = computed(() => canButton(PERMISSION_CODES.mediaLibraryCoverUpload))
const canUploadMediaContentImage = computed(() => canButton(PERMISSION_CODES.mediaLibraryContentImageUpload))

const filteredVideoItems = computed(() => {
  const query = normalizedSearch.value

  return [...videoItems.value]
    .filter((item) => {
      const categoryId = normalizeItemCategoryId("videos", item.categoryId)

      if (!matchesSelectedCategory(categoryId, selectedVideoCategoryIds.value)) {
        return false
      }

      if (!query) {
        return true
      }

      return matchesQuery(query, [
        item.title,
        item.summary,
        getCategoryPathLabel("videos", categoryId),
      ])
    })
    .sort(compareBySortOrder)
})

const filteredArticles = computed(() => {
  const query = normalizedSearch.value

  return [...articleItems.value]
    .filter((item) => {
      const categoryId = normalizeItemCategoryId("articles", item.categoryId)

      if (!matchesSelectedCategory(categoryId, selectedArticleCategoryIds.value)) {
        return false
      }

      if (!query) {
        return true
      }

      return matchesQuery(query, [
        item.title,
        item.cover,
        item.tags.join(" "),
        item.content,
        getCategoryPathLabel("articles", categoryId),
      ])
    })
    .sort(compareBySortOrder)
})

const activeVideo = computed(() => videoItemMap.value.get(activeEntityId.value) ?? null)
const activeArticle = computed(() => articleItemMap.value.get(activeEntityId.value) ?? null)
const isMediaFormSubmitting = computed(() => (
  formState.kind === "video"
    ? videoCreateSubmitting.value || uploadingVideoFile.value
    : articleCreateSubmitting.value || uploadingArticleCover.value
))

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
      ? "上传视频文件并维护标题、分类、状态和摘要。"
      : "维护文章标题、分类、封面、状态、标签和正文。"
  }

  if (sheetMode.value === "edit") {
    return "保存后将同步更新媒体库内容。"
  }

  return getPreviewDescription()
})

const previewArticleContentHtml = computed(() => {
  if (sheetMode.value === "preview") {
    return renderArticleContentHtml(activeArticle.value?.content ?? "")
  }

  return renderArticleContentHtml(formState.content)
})

onMounted(() => {
  void loadAllMediaCategories()
  void loadMediaCategoryTagOptions()
  void loadMediaVideos()
  void loadMediaArticles()
})

const videoPreviewSections = computed<DetailFieldSection[]>(() => {
  if (!activeVideo.value) return []

  return [
    {
      key: "video-preview-fields",
      title: "",
      rows: [
        { key: "sourceUrl", label: "视频文件", value: activeVideo.value.sourceFileName || activeVideo.value.sourceUrl || "—", truncate: false },
        { key: "category", label: "分类", value: getCategoryPathLabel("videos", normalizeItemCategoryId("videos", activeVideo.value.categoryId)) },
        { key: "status", label: "状态", value: getStatusLabel(activeVideo.value.status) },
        { key: "summary", label: "摘要", value: activeVideo.value.summary || "—", truncate: false, valueClass: "leading-6" },
      ],
    },
  ]
})

const articlePreviewSections = computed<DetailFieldSection[]>(() => {
  if (!activeArticle.value) return []

  return [
    {
      key: "article-preview-fields",
      title: "",
      rows: [
        { key: "category", label: "分类", value: getCategoryPathLabel("articles", normalizeItemCategoryId("articles", activeArticle.value.categoryId)) },
        { key: "status", label: "状态", value: getStatusLabel(activeArticle.value.status) },
        { key: "tags", label: "标签", value: activeArticle.value.tags.length ? activeArticle.value.tags.join("、") : "—", truncate: false },
      ],
    },
  ]
})

watch(activeModule, () => {
  searchQuery.value = ""
  searchExpanded.value = false
  sheetOpen.value = false
})

async function loadAllMediaCategories() {
  await Promise.all([
    loadMediaCategories("videos"),
    loadMediaCategories("articles"),
  ])
}

async function loadMediaCategories(module: MediaModuleKey) {
  categoryLoading[module] = true
  categoryErrorMessages[module] = ""

  try {
    const result = await fetchMediaTypes({
      Type: MEDIA_TYPE_MAP[module],
      PageNum: 1,
      PageSize: MEDIA_CATEGORY_PAGE_SIZE,
    })
    const nextTree = normalizeMediaCategoryTree(result.list, module)
    setModuleCategories(module, nextTree)
    syncExpandedCategoryIds(module, nextTree)
    ensureSelectedCategory(module)
  } catch (error) {
    categoryErrorMessages[module] = handleApiError(error, {
      title: "媒体分类加载失败",
      fallback: MEDIA_CATEGORY_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    categoryLoading[module] = false
  }
}

async function loadMediaCategoryTagOptions() {
  mediaCategoryTagLoading.value = true

  try {
    const options = await fetchBusinessPresetEntryOptions(["mediaCategory"])
    mediaCategoryTagEntries.value = options.mediaCategory ?? []
  } catch (error) {
    mediaCategoryTagEntries.value = []
    handleApiError(error, {
      title: "媒体库分类预设加载失败",
      fallback: "媒体库分类预设加载失败，请稍后重试。",
    })
  } finally {
    mediaCategoryTagLoading.value = false
  }
}

function refreshCurrentCategories() {
  void loadMediaCategories(activeModule.value)
}

async function loadMediaVideos() {
  videoListLoading.value = true
  videoListErrorMessage.value = ""

  try {
    const result = await fetchMediaVideos({
      PageNum: 1,
      PageSize: MEDIA_VIDEO_PAGE_SIZE,
    })

    videoItems.value = result.list.map((item, index) => normalizeMediaVideo(item, index))
  } catch (error) {
    videoItems.value = []
    videoListErrorMessage.value = handleApiError(error, {
      title: "媒体视频加载失败",
      fallback: MEDIA_VIDEO_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    videoListLoading.value = false
  }
}

function refreshMediaVideos() {
  void loadMediaVideos()
}

async function loadMediaArticles() {
  articleListLoading.value = true
  articleListErrorMessage.value = ""

  try {
    const result = await fetchMediaArticles({
      PageNum: 1,
      PageSize: MEDIA_ARTICLE_PAGE_SIZE,
    })

    articleItems.value = result.list.map((item, index) => normalizeMediaArticle(item, index))
  } catch (error) {
    articleItems.value = []
    articleListErrorMessage.value = handleApiError(error, {
      title: "媒体文章加载失败",
      fallback: MEDIA_ARTICLE_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    articleListLoading.value = false
  }
}

function refreshMediaArticles() {
  void loadMediaArticles()
}

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

function openCreateRootCategoryDialog(module: MediaModuleKey) {
  openCreateCategoryDialog(module, "")
}

function openCreateChildCategoryDialog(module: MediaModuleKey, parentUuid: string) {
  openCreateCategoryDialog(module, parentUuid)
}

function openCreateCategoryDialog(module: MediaModuleKey, parentUuid: string) {
  if (parentUuid ? !canAddMediaChildCategory.value : !canAddMediaCategory.value) {
    return
  }

  categoryCreateModule.value = module
  Object.assign(categoryCreateForm, createEmptyCategoryForm({
    parentUuid,
    sortNum: getNextCategorySortNum(module, parentUuid),
    tag: "",
  }))
  categoryCreateDialogOpen.value = true
}

function updateCreateCategoryParent(value: unknown) {
  const nextParentUuid = typeof value === "string" && value !== ROOT_CATEGORY_PARENT_VALUE ? value : ""

  categoryCreateForm.parentUuid = nextParentUuid
  categoryCreateForm.sortNum = getNextCategorySortNum(categoryCreateModule.value, nextParentUuid)
}

async function submitCreateCategory() {
  if (categoryCreateForm.parentUuid ? !canAddMediaChildCategory.value : !canAddMediaCategory.value) {
    toast.error("无权添加媒体分类")
    return
  }

  const name = categoryCreateForm.name.trim()

  if (!name) {
    toast.error("请先填写分类名称")
    return
  }

  categoryCreateSubmitting.value = true

  try {
    const created = await createMediaType({
      Type: MEDIA_TYPE_MAP[categoryCreateModule.value],
      Name: name,
      ParentUuid: categoryCreateForm.parentUuid,
      SortNum: categoryCreateForm.sortNum,
      Tag: categoryCreateForm.tag.trim(),
    })
    await loadMediaCategories(categoryCreateModule.value)
    const createdUuid = typeof created.Uuid === "string" ? created.Uuid : ""

    if (createdUuid) {
      selectCategory(categoryCreateModule.value, createdUuid)
      expandCategoryAncestors(categoryCreateModule.value, createdUuid)
    }

    categoryCreateDialogOpen.value = false
    toast.success("媒体分类已创建", {
      description: `${name} 已加入当前分类树。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "媒体分类创建失败",
      fallback: "媒体分类创建失败，请稍后重试。",
    })
  } finally {
    categoryCreateSubmitting.value = false
  }
}

async function openEditCategoryDialog(module: MediaModuleKey, id: string) {
  if (!canEditMediaCategory.value) {
    return
  }

  const row = findCategoryById(getModuleCategories(module), id)

  if (!row) {
    return
  }

  categoryEditModule.value = module
  editingCategoryId.value = id
  Object.assign(categoryEditForm, createEmptyCategoryForm({
    name: row.name,
    sortNum: row.sortOrder ?? 0,
    parentUuid: row.parentUuid ?? "",
    tag: row.tag ?? "",
  }))
  categoryDetailLoading.value = true
  categoryEditDialogOpen.value = true

  try {
    const detail = await getMediaTypeDetail({ Uuid: id })
    const detailNode = normalizeMediaCategory(detail, module)

    if (editingCategoryId.value === id) {
      Object.assign(categoryEditForm, createEmptyCategoryForm({
        name: detailNode.name || row.name,
        sortNum: detailNode.sortOrder ?? row.sortOrder ?? 0,
        parentUuid: detailNode.parentUuid ?? row.parentUuid ?? "",
        tag: detailNode.tag ?? row.tag ?? "",
      }))
    }
  } catch (error) {
    handleApiError(error, {
      title: "媒体分类详情加载失败",
      fallback: "媒体分类详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingCategoryId.value === id) {
      categoryDetailLoading.value = false
    }
  }
}

function closeEditCategoryDialog() {
  categoryEditDialogOpen.value = false
  editingCategoryId.value = ""
  categoryDetailLoading.value = false
  Object.assign(categoryEditForm, createEmptyCategoryForm())
}

async function submitEditCategory() {
  if (!canEditMediaCategory.value) {
    toast.error("无权编辑媒体分类")
    return
  }

  const name = categoryEditForm.name.trim()

  if (!editingCategoryId.value || !name) {
    toast.error("请先填写分类名称")
    return
  }

  categoryEditSubmitting.value = true

  try {
    await updateMediaType({
      Name: name,
      ParentUuid: categoryEditForm.parentUuid,
      SortNum: categoryEditForm.sortNum,
      Tag: categoryEditForm.tag.trim(),
      Type: MEDIA_TYPE_MAP[categoryEditModule.value],
      Uuid: editingCategoryId.value,
    })
    await loadMediaCategories(categoryEditModule.value)
    selectCategory(categoryEditModule.value, editingCategoryId.value)
    expandCategoryAncestors(categoryEditModule.value, editingCategoryId.value)
    closeEditCategoryDialog()
    toast.success("媒体分类已更新", {
      description: `${name} 的名称和排序已保存。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "媒体分类更新失败",
      fallback: "媒体分类更新失败，请稍后重试。",
    })
  } finally {
    categoryEditSubmitting.value = false
  }
}

function promptDeleteCategory(module: MediaModuleKey, id: string) {
  if (!canDeleteMediaCategory.value) {
    return
  }

  const row = findCategoryById(getModuleCategories(module), id)

  if (!row || row.isDefault) {
    return
  }

  categoryDeleteModule.value = module
  deletingCategoryId.value = id
  categoryDeleteConfirmOpen.value = true
}

function openCreateChildForEditingCategory() {
  if (!editingCategoryId.value) {
    return
  }

  const module = categoryEditModule.value
  const parentUuid = editingCategoryId.value

  closeEditCategoryDialog()
  openCreateChildCategoryDialog(module, parentUuid)
}

async function confirmDeleteCategory() {
  if (!canDeleteMediaCategory.value) {
    toast.error("无权删除媒体分类")
    return
  }

  const target = deletingCategory.value

  if (!target || categoryDeleteSubmitting.value) {
    return
  }

  categoryDeleteSubmitting.value = true

  try {
    await deleteMediaType({ Uuid: target.id })
    await loadMediaCategories(categoryDeleteModule.value)
    ensureSelectedCategory(categoryDeleteModule.value)
    categoryDeleteConfirmOpen.value = false
    if (editingCategoryId.value === target.id) {
      closeEditCategoryDialog()
    }
    deletingCategoryId.value = ""
    toast.success("媒体分类已删除", {
      description: `${target.name} 已从当前分类树移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "媒体分类删除失败",
      fallback: "媒体分类删除失败，请稍后重试。",
    })
  } finally {
    categoryDeleteSubmitting.value = false
  }
}

function openCreate(kind: SheetEntityKind, defaults: Partial<MediaEditorForm> = {}) {
  if (!canAddMediaContent.value) {
    return
  }

  sheetMode.value = "create"
  sheetEntityKind.value = kind
  activeEntityId.value = ""

  const fallbackVideoCategory = resolveLeafCategoryId(selectedVideoCategoryId.value, videoCategories.value)
  const fallbackArticleCategory = resolveLeafCategoryId(selectedArticleCategoryId.value, articleCategories.value)

  applyForm(createEmptyForm(kind, {
    categoryId: kind === "article" ? fallbackArticleCategory : fallbackVideoCategory,
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

  if (kind === "video") {
    void syncActiveVideoDetail(id)
  }

  if (kind === "article") {
    void syncActiveArticleDetail(id)
  }
}

function openEdit(kind: SheetEntityKind, id: string) {
  if (!canEditMediaContent.value) {
    return
  }

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
      categoryId: normalizeItemCategoryId("videos", entity.categoryId),
      sourceUrl: entity.sourceUrl,
      sourceFileName: entity.sourceFileName,
      summary: entity.summary,
      status: entity.status,
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
      categoryId: normalizeItemCategoryId("articles", entity.categoryId),
      cover: entity.cover,
      content: renderArticleContentHtml(entity.content),
      tagsText: entity.tags.join(", "),
      status: entity.status,
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

async function syncActiveVideoDetail(id: string) {
  videoDetailLoading.value = true

  try {
    const detail = await getMediaVideoDetail({ Uuid: id })
    const index = videoItems.value.findIndex(item => item.id === id)
    const next = normalizeMediaVideo(detail, index >= 0 ? index : 0)

    if (index === -1) {
      videoItems.value = [next, ...videoItems.value]
    } else {
      videoItems.value.splice(index, 1, next)
    }
  } catch (error) {
    handleApiError(error, {
      title: "媒体视频详情加载失败",
      fallback: "媒体视频详情加载失败，请稍后重试。",
    })
  } finally {
    videoDetailLoading.value = false
  }
}

async function syncActiveArticleDetail(id: string) {
  articleDetailLoading.value = true

  try {
    const detail = await getMediaArticleDetail({ Uuid: id })
    const index = articleItems.value.findIndex(item => item.id === id)
    const next = normalizeMediaArticle(detail, index >= 0 ? index : 0)

    if (index === -1) {
      articleItems.value = [next, ...articleItems.value]
    } else {
      articleItems.value.splice(index, 1, next)
    }
  } catch (error) {
    handleApiError(error, {
      title: "媒体文章详情加载失败",
      fallback: "媒体文章详情加载失败，请稍后重试。",
    })
  } finally {
    articleDetailLoading.value = false
  }
}

function closeSheet() {
  sheetOpen.value = false
}

async function handleArticleCoverFiles(files: File[]) {
  if (!canUploadMediaCover.value) {
    toast.error("无权上传封面")
    return
  }

  const file = files[0]

  if (!file) {
    return
  }

  if (!file.type.startsWith("image/")) {
    toast.error("请选择图片文件")
    return
  }

  uploadingArticleCover.value = true

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `media-library/articles/covers/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || undefined,
    })

    formState.cover = result.url
    toast.success("封面已上传")
  } catch (error) {
    toast.error("封面上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
  } finally {
    uploadingArticleCover.value = false
  }
}

async function uploadArticleContentImage(file: File) {
  if (!canUploadMediaContentImage.value) {
    toast.error("无权上传正文图片")
    return ""
  }

  if (!file.type.startsWith("image/")) {
    toast.error("请选择图片文件")
    return ""
  }

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `media-library/articles/content-images/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || undefined,
    })

    toast.success("正文图片已上传")
    return result.url
  } catch (error) {
    toast.error("正文图片上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
    throw error
  }
}

function removeArticleCover() {
  formState.cover = ""
}

async function saveCurrentForm() {
  if (sheetMode.value === "create" && !canAddMediaContent.value) {
    toast.error("无权添加媒体内容")
    return
  }

  if (sheetMode.value === "edit" && !canEditMediaContent.value) {
    toast.error("无权编辑媒体内容")
    return
  }

  if (!formState.title.trim()) {
    toast.error("请先填写标题")
    return
  }

  if (!formState.categoryId) {
    toast.error(formState.kind === "article" ? "请选择文章分类" : "请选择视频分类")
    return
  }

  if (formState.kind === "video") {
    await saveVideoForm()
    return
  }

  await saveArticleForm()
}

async function saveVideoForm() {
  const title = formState.title.trim()
  const created = sheetMode.value === "create"
  videoCreateSubmitting.value = true

  try {
    const payload = {
      Title: title,
      TypeUuid: formState.categoryId,
      Url: formState.sourceUrl.trim(),
      Abstract: formState.summary.trim(),
      Status: toMediaVideoStatus(formState.status),
    }
    const saved = created
      ? await createMediaVideo(payload)
      : await updateMediaVideo({
          Uuid: activeEntityId.value,
          ...payload,
        })
    await loadMediaVideos()
    const savedUuid = typeof saved.Uuid === "string" && saved.Uuid.trim()
      ? saved.Uuid.trim()
      : activeEntityId.value

    if (savedUuid) {
      activeEntityId.value = savedUuid
      await syncActiveVideoDetail(savedUuid)
    } else {
      const matched = videoItems.value.find(item => item.title === title)
      activeEntityId.value = matched?.id ?? ""
    }

    sheetMode.value = "preview"
    sheetEntityKind.value = "video"
    toast.success(created ? "视频已创建" : "视频已保存", {
      description: created ? `${title} 已加入媒体库。` : `${title} 已更新。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: created ? "媒体视频创建失败" : "媒体视频更新失败",
      fallback: created ? "媒体视频创建失败，请稍后重试。" : "媒体视频更新失败，请稍后重试。",
    })
  } finally {
    videoCreateSubmitting.value = false
  }
}

async function saveArticleForm() {
  const title = formState.title.trim()
  const created = sheetMode.value === "create"
  articleCreateSubmitting.value = true

  try {
    const payload = {
      Title: title,
      TypeUuid: formState.categoryId,
      CoverUrl: formState.cover.trim(),
      Content: normalizeRichTextContent(formState.content),
      Tags: parseTagText(formState.tagsText),
      Status: toMediaArticleStatus(formState.status),
    }
    const saved = created
      ? await createMediaArticle(payload)
      : await updateMediaArticle({
          Uuid: activeEntityId.value,
          ...payload,
        })
    await loadMediaArticles()
    const savedUuid = typeof saved.Uuid === "string" && saved.Uuid.trim()
      ? saved.Uuid.trim()
      : activeEntityId.value

    if (savedUuid) {
      activeEntityId.value = savedUuid
      await syncActiveArticleDetail(savedUuid)
    } else {
      const matched = articleItems.value.find(item => item.title === title)
      activeEntityId.value = matched?.id ?? ""
    }

    sheetMode.value = "preview"
    sheetEntityKind.value = "article"
    toast.success(created ? "文章已创建" : "文章已保存", {
      description: created ? `${title} 已加入媒体库。` : `${title} 已更新。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: created ? "媒体文章创建失败" : "媒体文章更新失败",
      fallback: created ? "媒体文章创建失败，请稍后重试。" : "媒体文章更新失败，请稍后重试。",
    })
  } finally {
    articleCreateSubmitting.value = false
  }
}

async function handleVideoFiles(files: File[]) {
  if (!canUploadMediaVideo.value) {
    toast.error("无权上传视频")
    return
  }

  const file = files[0]

  if (!file) {
    return
  }

  await uploadVideoFile(file)
}

async function uploadVideoFile(file: File) {
  uploadingVideoFile.value = true

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `media-library/videos/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || undefined,
    })

    formState.sourceUrl = result.url
    formState.sourceFileName = file.name

    if (!formState.title.trim()) {
      formState.title = stripFileExtension(file.name)
    }

    toast.success("视频已上传")
  } catch (error) {
    toast.error("视频上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
  } finally {
    uploadingVideoFile.value = false
  }
}

function promptDeleteActiveVideo() {
  if (!canDeleteMediaContent.value) {
    return
  }

  if (!activeVideo.value) {
    return
  }

  videoDeleteConfirmOpen.value = true
}

function promptDeleteActiveArticle() {
  if (!canDeleteMediaContent.value) {
    return
  }

  if (!activeArticle.value) {
    return
  }

  articleDeleteConfirmOpen.value = true
}

async function confirmDeleteActiveVideo() {
  if (!canDeleteMediaContent.value) {
    toast.error("无权删除媒体内容")
    return
  }

  const target = activeVideo.value

  if (!target || videoDeleteSubmitting.value) {
    return
  }

  videoDeleteSubmitting.value = true

  try {
    await deleteMediaVideo({ Uuid: target.id })
    await loadMediaVideos()
    videoDeleteConfirmOpen.value = false
    closeSheet()
    toast.success("媒体视频已删除", {
      description: `${target.title} 已从媒体库移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "媒体视频删除失败",
      fallback: "媒体视频删除失败，请稍后重试。",
    })
  } finally {
    videoDeleteSubmitting.value = false
  }
}

async function confirmDeleteActiveArticle() {
  if (!canDeleteMediaContent.value) {
    toast.error("无权删除媒体内容")
    return
  }

  const target = activeArticle.value

  if (!target || articleDeleteSubmitting.value) {
    return
  }

  articleDeleteSubmitting.value = true

  try {
    await deleteMediaArticle({ Uuid: target.id })
    await loadMediaArticles()
    articleDeleteConfirmOpen.value = false
    closeSheet()
    toast.success("媒体文章已删除", {
      description: `${target.title} 已从媒体库移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "媒体文章删除失败",
      fallback: "媒体文章删除失败，请稍后重试。",
    })
  } finally {
    articleDeleteSubmitting.value = false
  }
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
    return getCategoryPathLabel("articles", normalizeItemCategoryId("articles", activeArticle.value.categoryId))
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

function buildMediaCategoryTagOptions(currentValue: string): SelectOption[] {
  const options = mediaCategoryTagEntries.value.map(entry => ({
    value: entry.name,
    label: entry.name,
  }))
  const normalizedCurrentValue = currentValue.trim()

  if (normalizedCurrentValue && !options.some(option => option.value === normalizedCurrentValue)) {
    options.unshift({
      value: normalizedCurrentValue,
      label: normalizedCurrentValue,
    })
  }

  return dedupeSelectOptions(options)
}

function normalizeCategoryTagSelectValue(value: unknown) {
  return typeof value === "string" && value !== MEDIA_CATEGORY_TAG_EMPTY_VALUE ? value : ""
}

function dedupeSelectOptions(options: SelectOption[]) {
  const seen = new Set<string>()

  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) {
      return false
    }

    seen.add(option.value)
    return true
  })
}

function normalizeArticleCoverSource(value: string) {
  const normalized = value.trim()
  if (/^(https?:\/\/|blob:|\/)/i.test(normalized)) {
    return normalized
  }

  return ""
}

function getArticleCoverSrc(value: string) {
  return normalizeArticleCoverSource(value) || videoPreviewAsset
}

function getVideoCoverSrc(value: string) {
  return normalizeArticleCoverSource(value) || videoPreviewAsset
}

function parseTagText(value: string) {
  return value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
}

function getCategoryPathLabel(module: MediaModuleKey, categoryId: string) {
  const tree = module === "videos" ? videoCategories.value : articleCategories.value
  const path = findCategoryPath(tree, categoryId)
  return path.length ? path.map(item => item.name).join(" / ") : "未分配分类"
}

function buildVideoPlacement(item: VideoItem) {
  return getCategoryPathLabel("videos", normalizeItemCategoryId("videos", item.categoryId))
}

function matchesSelectedCategory(categoryId: string, selectedIds: Set<string> | null) {
  return !selectedIds || selectedIds.has(categoryId)
}

function compareBySortOrder<
  T extends {
    sortOrder: number
    title?: string
  },
>(left: T, right: T) {
  return left.sortOrder - right.sortOrder
    || String(left.title ?? "").localeCompare(String(right.title ?? ""), "zh-CN")
}

function createEmptyForm(kind: SheetEntityKind, overrides: Partial<MediaEditorForm> = {}): MediaEditorForm {
  return {
    kind,
    title: "",
    categoryId: "",
    cover: "",
    sourceUrl: "",
    sourceFileName: "",
    summary: "",
    status: "draft",
    sortOrder: 10,
    content: "",
    tagsText: "",
    ...overrides,
  }
}

function createEmptyCategoryForm(overrides: Partial<MediaCategoryForm> = {}): MediaCategoryForm {
  return {
    name: "",
    sortNum: 0,
    parentUuid: "",
    tag: "",
    ...overrides,
  }
}

function normalizeMediaCategoryTree(records: MediaTypeRecord[], module: MediaModuleKey) {
  return records
    .map(item => normalizeMediaCategory(item, module))
    .sort(compareCategories)
}

function normalizeMediaCategory(item: MediaTypeRecord, module: MediaModuleKey): MediaCategoryNode {
  const id = toOptionalText(item.Uuid) || `media-category-${item.Id ?? hashText(JSON.stringify(item))}`
  const name = toOptionalText(item.Name) || `分类 ${item.Id ?? id}`
  const children = Array.isArray(item.Children)
    ? normalizeMediaCategoryTree(item.Children, module)
    : undefined

  return {
    id,
    name,
    slug: id,
    count: 0,
    module,
    isDefault: Number(item.IsDefault) === 1,
    parentUuid: toOptionalText(item.ParentUuid),
    sortOrder: toOptionalNumber(item.SortNum) ?? 0,
    tag: toOptionalText(item.Tag),
    children,
  }
}

function compareCategories(left: MediaCategoryNode, right: MediaCategoryNode) {
  return (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
    || left.name.localeCompare(right.name, "zh-CN")
    || left.id.localeCompare(right.id)
}

function getModuleCategories(module: MediaModuleKey) {
  return module === "videos" ? videoCategories.value : articleCategories.value
}

function setModuleCategories(module: MediaModuleKey, categories: MediaCategoryNode[]) {
  if (module === "videos") {
    videoCategories.value = categories
    return
  }

  articleCategories.value = categories
}

function getModuleSelectedCategoryId(module: MediaModuleKey) {
  return module === "videos" ? selectedVideoCategoryId.value : selectedArticleCategoryId.value
}

function setModuleSelectedCategoryId(module: MediaModuleKey, id: string) {
  if (module === "videos") {
    selectedVideoCategoryId.value = id
    return
  }

  selectedArticleCategoryId.value = id
}

function ensureSelectedCategory(module: MediaModuleKey) {
  const tree = getModuleCategories(module)
  const currentId = getModuleSelectedCategoryId(module)

  if (currentId && findCategoryById(tree, currentId)) {
    return
  }

  setModuleSelectedCategoryId(module, tree[0]?.id ?? "")
}

function syncExpandedCategoryIds(module: MediaModuleKey, tree: MediaCategoryNode[]) {
  const existing = new Set(expandedCategoryIds[module])
  const next = flattenCategoryTree(tree)
    .filter(category => category.children?.length || existing.has(category.id))
    .map(category => category.id)

  expandedCategoryIds[module] = next
}

function expandCategoryAncestors(module: MediaModuleKey, id: string) {
  const path = findCategoryPath(getModuleCategories(module), id)

  if (!path.length) {
    return
  }

  const expanded = new Set(expandedCategoryIds[module])
  for (const category of path) {
    expanded.add(category.id)
  }
  expandedCategoryIds[module] = [...expanded]
}

function getNextCategorySortNum(module: MediaModuleKey, parentUuid: string) {
  const siblings = parentUuid
    ? findCategoryById(getModuleCategories(module), parentUuid)?.children ?? []
    : getModuleCategories(module)
  const maxSort = siblings.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), 0)

  return maxSort + 10
}

function findCategoryById(nodes: MediaCategoryNode[], categoryId: string): MediaCategoryNode | null {
  if (!categoryId) {
    return null
  }

  for (const node of nodes) {
    if (node.id === categoryId) {
      return node
    }

    const childMatch = findCategoryById(node.children ?? [], categoryId)
    if (childMatch) {
      return childMatch
    }
  }

  return null
}

function normalizeItemCategoryId(_module: MediaModuleKey, categoryId: string) {
  return categoryId.trim()
}

function normalizeMediaVideo(item: MediaVideoRecord, index: number): VideoItem {
  const id = toOptionalText(item.Uuid) || `media-video-${item.Id ?? index + 1}`
  const title = toOptionalText(item.Title) || `视频 ${index + 1}`
  const sourceUrl = toOptionalText(item.Url)

  return {
    id,
    categoryId: toOptionalText(item.TypeUuid),
    title,
    cover: buildCosVideoSnapshotUrl(sourceUrl, MEDIA_LIBRARY_VIDEO_COVER_SNAPSHOT_OPTIONS),
    sourceUrl,
    sourceFileName: getFileNameFromUrl(sourceUrl),
    summary: toOptionalText(item.Abstract),
    status: normalizeMediaVideoStatus(item.Status),
    sortOrder: index + 1,
  }
}

function normalizeMediaArticle(item: MediaArticleRecord, index: number): ArticleItem {
  const id = toOptionalText(item.Uuid) || `media-article-${item.Id ?? index + 1}`
  const title = toOptionalText(item.Title) || `文章 ${index + 1}`

  return {
    id,
    categoryId: toOptionalText(item.TypeUuid),
    title,
    cover: toOptionalText(item.CoverUrl),
    content: normalizeRichTextContent(toOptionalText(item.Content)),
    tags: normalizeMediaArticleTags(item.Tags),
    status: normalizeMediaStatus(item.Status),
    sortOrder: index + 1,
  }
}

function normalizeMediaArticleTags(value: unknown) {
  return Array.isArray(value)
    ? value.map(item => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : []
}

function normalizeMediaVideoStatus(value: unknown): MediaStatus {
  return normalizeMediaStatus(value)
}

function normalizeMediaStatus(value: unknown): MediaStatus {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  if (parsed === 2) {
    return "scheduled"
  }

  if (parsed === 3) {
    return "published"
  }

  return "draft"
}

function toMediaVideoStatus(status: MediaStatus): MediaVideoStatus {
  return toMediaStatusCode(status)
}

function toMediaArticleStatus(status: MediaStatus): MediaArticleStatus {
  return toMediaStatusCode(status)
}

function toMediaStatusCode(status: MediaStatus) {
  if (status === "scheduled") {
    return 2
  }

  if (status === "published") {
    return 3
  }

  return 1
}

function getFileNameFromUrl(value: string) {
  if (!value) {
    return ""
  }

  try {
    const pathname = new URL(value).pathname
    const segments = pathname.split("/").filter(Boolean)
    return decodeURIComponent(segments[segments.length - 1] ?? "")
  } catch {
    const segments = (value.split("?")[0] ?? "").split("/").filter(Boolean)
    return segments[segments.length - 1] ?? ""
  }
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

function sanitizeObjectKeyFileName(value: string) {
  const normalized = value.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

  return normalized || "media-file"
}

function stripFileExtension(value: string) {
  const normalized = value.trim()
  const lastDotIndex = normalized.lastIndexOf(".")

  return lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized
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
      isDefault: Boolean(node.isDefault),
      sortOrder: node.sortOrder ?? 0,
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

function renderPlainTextContent(value: string) {
  if (!value.trim()) {
    return "<p>暂无正文。</p>"
  }

  return value
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

function renderArticleContentHtml(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return "<p>暂无正文。</p>"
  }

  if (looksLikeHtml(normalized)) {
    return sanitizeRichTextHtml(normalized) || "<p>暂无正文。</p>"
  }

  return sanitizeRichTextHtml(renderPlainTextContent(normalized)) || "<p>暂无正文。</p>"
}

function normalizeRichTextContent(value: string) {
  const normalized = sanitizeRichTextHtml(value)
  return normalized || "<p>暂无正文。</p>"
}

function looksLikeHtml(value: string) {
  return /<\/?(p|h1|h2|h3|blockquote|ul|ol|li|strong|em|b|i|a|pre|code|div|br)\b/i.test(value)
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
  <section class="relative flex min-h-full flex-1 flex-col overflow-visible bg-background">
    <SettingsPageHeader
      title="媒体库"
      description="维护客户 app 首页的视频教程与图文内容。"
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

        <div class="flex flex-nowrap items-center justify-end gap-1">
          <div class="flex shrink-0 items-center gap-1">
            <Button
              v-for="view in currentViewTabs"
              :key="view.id"
              variant="ghost"
              size="icon-sm"
              class="size-8 rounded-md text-muted-foreground"
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

          <Button v-if="canAddMediaContent" size="sm" class="h-8 rounded-md px-3" @click="openCreate(activeModule === 'videos' ? 'video' : 'article')">
            <i class="ri-add-line text-base" />
            <span>添加</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </SettingsPageHeader>

    <div class="min-h-0 flex-1 px-3 pb-8 sm:px-4">
      <div class="media-library-layout mx-auto flex min-h-full w-full max-w-4xl gap-8 overflow-visible">
        <aside class="media-library-sidebar w-[240px] shrink-0 pt-2">
        <div class="media-library-sidebar-panel sticky top-[10.5rem] flex max-h-[calc(100svh-11.5rem)] flex-col overflow-hidden">
          <div class="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              分类
            </p>
            <Button
              v-if="canAddMediaChildCategory"
              variant="ghost"
              size="icon-sm"
              class="size-7 rounded-md text-muted-foreground"
              :disabled="currentCategoryLoading"
              aria-label="刷新分类"
              title="刷新分类"
              @click="refreshCurrentCategories"
            >
              <i :class="[currentCategoryLoading ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line', 'text-sm']" />
            </Button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div
              v-if="currentCategoryErrorMessage"
              class="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive"
            >
              <p>{{ currentCategoryErrorMessage }}</p>
              <Button
                variant="ghost"
                size="sm"
                class="mt-1 h-7 rounded-md px-2 text-destructive hover:text-destructive"
                @click="refreshCurrentCategories"
              >
                <i class="ri-refresh-line text-sm" />
                <span>重试</span>
              </Button>
            </div>

            <div v-else-if="currentCategoryLoading && !visibleCurrentCategoryRows.length" class="space-y-2 px-1 py-2">
              <div
                v-for="index in 5"
                :key="index"
                class="flex items-center gap-2"
              >
                <Skeleton class="size-4 shrink-0 rounded-sm" />
                <Skeleton :class="['h-7 rounded-md', index % 3 === 0 ? 'w-28' : index % 2 === 0 ? 'w-36' : 'w-24']" />
                <Skeleton class="ml-auto h-4 w-5 rounded-sm" />
              </div>
            </div>

            <div v-else-if="!visibleCurrentCategoryRows.length" class="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs leading-5 text-muted-foreground">
              暂无分类，先添加一个分类。
            </div>

            <div v-else class="space-y-0.5">
              <div
                v-for="row in visibleCurrentCategoryRows"
                :key="row.id"
                class="group/category-row flex w-full items-center gap-1.5 px-1 py-0.5"
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
                  v-if="canEditMediaCategory"
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

                <button
                  type="button"
                  class="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/category-row:opacity-100 focus-visible:opacity-100"
                  aria-label="编辑分类"
                  title="编辑分类"
                  @click.stop="openEditCategoryDialog(activeModule, row.id)"
                >
                  <i class="ri-edit-line text-[13px]" />
                </button>
              </div>
            </div>

            <Button
              v-if="canAddMediaCategory"
              variant="ghost"
              size="sm"
              class="mt-3 h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
              @click="openCreateRootCategoryDialog(activeModule)"
            >
              <i class="ri-add-line text-[15px]" />
              <span>添加分类</span>
            </Button>
          </div>
        </div>
        </aside>

        <main class="media-library-content min-w-0 flex-1 overflow-visible pt-4">
        <section
          v-if="activeModule === 'videos' && currentView === 'grid'"
          class="space-y-0"
        >
          <div
            v-if="videoListErrorMessage"
            class="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive"
          >
            <p>{{ videoListErrorMessage }}</p>
            <Button
              v-if="canDeleteMediaCategory"
              variant="ghost"
              size="sm"
              class="mt-2 rounded-md text-destructive hover:text-destructive"
              @click="refreshMediaVideos"
            >
              <i class="ri-refresh-line text-sm" />
              <span>重试</span>
            </Button>
          </div>

          <div v-else-if="videoListLoading" class="media-library-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div
              v-for="index in 6"
              :key="index"
              class="aspect-[3/4] overflow-hidden rounded-[18px] bg-muted/30 p-3"
            >
              <Skeleton class="h-full w-full rounded-[14px]" />
            </div>
          </div>

          <div v-else-if="filteredVideoItems.length" class="media-library-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
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
                  class="absolute inset-0 h-full w-full object-cover object-center"
                  :src="getVideoCoverSrc(item.cover)"
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
          class="space-y-0"
        >
          <div
            v-if="videoListErrorMessage"
            class="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive"
          >
            <p>{{ videoListErrorMessage }}</p>
            <Button
              variant="ghost"
              size="sm"
              class="mt-2 rounded-md text-destructive hover:text-destructive"
              @click="refreshMediaVideos"
            >
              <i class="ri-refresh-line text-sm" />
              <span>重试</span>
            </Button>
          </div>

          <div v-else-if="videoListLoading" class="space-y-2">
            <div
              v-for="index in 6"
              :key="index"
              class="flex h-[4.5rem] items-center gap-3 rounded-lg p-2"
            >
              <Skeleton class="size-14 shrink-0 rounded-md" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton :class="['h-4', index % 2 === 0 ? 'w-3/5' : 'w-4/5']" />
                <Skeleton class="h-3 w-32" />
              </div>
            </div>
          </div>

          <div v-else-if="filteredVideoItems.length" class="space-y-1">
            <div
              v-for="item in filteredVideoItems"
              :key="item.id"
              class="border-b border-dashed border-border/80 pb-1 last:border-b-0"
            >
              <button
                type="button"
                class="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-180 ease-out"
                :class="isActiveEntity('video', item.id) ? 'bg-muted/60' : 'bg-transparent hover:bg-muted/45'"
                @click="openPreview('video', item.id)"
              >
                <div class="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted/40">
                  <img
                    class="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                    :src="getVideoCoverSrc(item.cover)"
                    alt=""
                    aria-hidden="true"
                  />
                  <div class="absolute inset-0 bg-black/0 transition-colors duration-180 ease-out group-hover:bg-black/10" aria-hidden="true" />
                  <span class="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-black/62 text-white opacity-0 transition-[opacity,transform] duration-180 ease-out group-hover:translate-y-0 group-hover:opacity-100 translate-y-0.5">
                    <i class="ri-play-fill translate-x-[0.5px] text-[11px] leading-none" />
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-sm font-medium text-foreground transition-colors duration-180 ease-out group-hover:text-foreground/88">
                    {{ item.title }}
                  </h4>
                </div>
              </button>
            </div>
          </div>

          <div v-else class="py-14 text-center text-sm text-muted-foreground">
            当前筛选下没有可展示的列表内容。
          </div>
        </section>

        <section
          v-else-if="activeModule === 'articles' && currentView === 'grid'"
          class="space-y-0"
        >
          <div
            v-if="articleListErrorMessage"
            class="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive"
          >
            <p>{{ articleListErrorMessage }}</p>
            <Button
              variant="ghost"
              size="sm"
              class="mt-2 rounded-md text-destructive hover:text-destructive"
              @click="refreshMediaArticles"
            >
              <i class="ri-refresh-line text-sm" />
              <span>重试</span>
            </Button>
          </div>

          <div v-else-if="articleListLoading" class="media-library-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div
              v-for="index in 6"
              :key="index"
              class="aspect-[3/4] overflow-hidden rounded-[18px] bg-muted/30 p-3"
            >
              <Skeleton class="h-full w-full rounded-[14px]" />
            </div>
          </div>

          <div v-else-if="filteredArticles.length" class="media-library-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
            <button
              v-for="item in filteredArticles"
              :key="item.id"
              type="button"
              class="group block text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              @click="openPreview('article', item.id)"
            >
              <div
                class="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-border/70 bg-slate-100 transition-colors duration-200 ease-out"
                :class="isActiveEntity('article', item.id) ? 'ring-2 ring-foreground/18 ring-offset-2 ring-offset-background' : 'group-hover:border-border'"
              >
                <img
                  class="absolute inset-0 h-full w-full object-cover"
                  :src="getArticleCoverSrc(item.cover)"
                  alt=""
                  aria-hidden="true"
                />
                <div class="absolute inset-0 bg-black/8" aria-hidden="true" />
                <div class="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/66 via-black/28 to-transparent" aria-hidden="true" />

                <div class="absolute inset-x-0 bottom-0 p-4">
                  <h4 class="text-[16px] leading-[1.25] font-semibold tracking-[-0.02em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.28)]">
                    {{ item.title }}
                  </h4>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
            当前筛选下没有图文文章。
          </div>
        </section>

        <section
          v-else
          class="space-y-0"
        >
          <div
            v-if="articleListErrorMessage"
            class="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive"
          >
            <p>{{ articleListErrorMessage }}</p>
            <Button
              variant="ghost"
              size="sm"
              class="mt-2 rounded-md text-destructive hover:text-destructive"
              @click="refreshMediaArticles"
            >
              <i class="ri-refresh-line text-sm" />
              <span>重试</span>
            </Button>
          </div>

          <div v-else-if="articleListLoading" class="space-y-2">
            <div
              v-for="index in 6"
              :key="index"
              class="flex h-[4.5rem] items-center gap-3 rounded-lg p-2"
            >
              <Skeleton class="size-14 shrink-0 rounded-md" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton :class="['h-4', index % 2 === 0 ? 'w-3/5' : 'w-4/5']" />
                <Skeleton class="h-3 w-40" />
              </div>
            </div>
          </div>

          <div v-else-if="filteredArticles.length" class="space-y-1">
            <div
              v-for="item in filteredArticles"
              :key="item.id"
              class="border-b border-dashed border-border/80 pb-1 last:border-b-0"
            >
              <button
                type="button"
                class="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-180 ease-out"
                :class="isActiveEntity('article', item.id) ? 'bg-muted/60' : 'bg-transparent hover:bg-muted/45'"
                @click="openPreview('article', item.id)"
              >
                <div class="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted/40">
                  <img
                    class="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                    :src="getArticleCoverSrc(item.cover)"
                    alt=""
                    aria-hidden="true"
                  />
                  <div class="absolute inset-0 bg-black/0 transition-colors duration-180 ease-out group-hover:bg-black/8" aria-hidden="true" />
                  <span class="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-background/88 text-muted-foreground opacity-0 transition-opacity duration-180 ease-out group-hover:opacity-100">
                    <i class="ri-article-line text-[11px] leading-none" />
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-sm font-medium text-foreground transition-colors duration-180 ease-out group-hover:text-foreground/88">
                    {{ item.title }}
                  </h4>
                </div>
              </button>
            </div>
          </div>

          <div v-else class="py-14 text-center text-sm text-muted-foreground">
            当前筛选下没有文章内容。
          </div>
        </section>
        </main>
      </div>
    </div>

    <ResponsiveRightSheet
      :open="sheetOpen"
      :show-primary="false"
      sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-2xl"
      :title="sheetTitle"
      :description="sheetDescription"
      @update:open="sheetOpen = $event"
    >
      <template #actions>
        <div class="right-sheet-actions">
          <div class="right-sheet-actions__primary">
            <Button
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="closeSheet"
            >
              <i class="ri-close-line text-base" />
              <span class="sr-only">关闭面板</span>
            </Button>
          </div>

          <div class="right-sheet-actions__secondary">
            <Button
              v-if="sheetMode === 'preview' && sheetEntityKind === 'video' && activeVideo && canDeleteMediaContent"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button text-destructive hover:text-destructive"
              :disabled="videoDeleteSubmitting"
              @click="promptDeleteActiveVideo"
            >
              <i :class="[videoDeleteSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
              <span>删除</span>
            </Button>

            <Button
              v-if="sheetMode === 'preview' && sheetEntityKind === 'article' && activeArticle && canDeleteMediaContent"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button text-destructive hover:text-destructive"
              :disabled="articleDeleteSubmitting"
              @click="promptDeleteActiveArticle"
            >
              <i :class="[articleDeleteSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
              <span>删除</span>
            </Button>

            <Button
              v-if="sheetMode === 'preview' && canEditMediaContent"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              @click="editPreviewEntity"
            >
              <i class="ri-edit-line text-sm" />
              <span>编辑</span>
            </Button>

            <Button
              v-if="sheetMode !== 'preview'"
              size="sm"
              class="h-8 rounded-md px-2.5"
              :disabled="isMediaFormSubmitting"
              @click="saveCurrentForm"
            >
              <i :class="[isMediaFormSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
              <span>{{ isMediaFormSubmitting ? "保存中" : sheetMode === "create" ? "创建" : "保存" }}</span>
            </Button>
          </div>
        </div>
      </template>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="sheetMode === 'preview'" class="space-y-5">
          <template v-if="sheetEntityKind === 'video' && activeVideo">
            <div
              v-if="videoDetailLoading"
              class="rounded-lg border border-border/70 bg-muted/30 px-4 py-2 text-sm text-muted-foreground"
            >
              正在同步视频详情...
            </div>

            <div
              class="overflow-hidden border border-border/70 bg-background"
            >
              <div class="relative aspect-video bg-slate-950">
                <video
                  v-if="activeVideo.sourceUrl"
                  class="absolute inset-0 h-full w-full object-cover"
                  :src="activeVideo.sourceUrl"
                  controls
                  preload="metadata"
                />
                <img
                  v-else
                  class="absolute inset-0 h-full w-full object-cover"
                  :src="videoPreviewAsset"
                  alt=""
                  aria-hidden="true"
                />
                <div v-if="!activeVideo.sourceUrl" class="absolute inset-0 bg-black/10" aria-hidden="true" />
                <div v-if="!activeVideo.sourceUrl" class="absolute inset-0 flex items-center justify-center">
                  <span class="flex size-11 items-center justify-center rounded-full bg-white/92 text-slate-900">
                    <i class="ri-play-fill translate-x-[1px] text-[22px] leading-none" />
                  </span>
                </div>
              </div>
            </div>

            <DetailFieldSections
              :sections="videoPreviewSections"
              compact
              :show-section-titles="false"
              label-width-mobile="5.5rem"
              label-width-desktop="92px"
            />
          </template>

          <template v-else-if="sheetEntityKind === 'article' && activeArticle">
            <div
              v-if="articleDetailLoading"
              class="rounded-lg border border-border/70 bg-muted/30 px-4 py-2 text-sm text-muted-foreground"
            >
              正在同步文章详情...
            </div>

            <div class="overflow-hidden border border-border/70 bg-background">
              <img
                class="aspect-video w-full object-cover"
                :src="getArticleCoverSrc(activeArticle.cover)"
                alt=""
                aria-hidden="true"
              />
            </div>

            <div class="px-4 py-3">
              <div class="media-markdown" v-html="previewArticleContentHtml" />
            </div>

            <DetailFieldSections
              :sections="articlePreviewSections"
              compact
              :show-section-titles="false"
              label-width-mobile="5.5rem"
              label-width-desktop="92px"
            />
          </template>

          <template v-else-if="sheetEntityKind === 'article' && !activeArticle">
            <div class="text-sm text-muted-foreground">
              暂无文章内容。
            </div>
          </template>
        </div>

        <div v-else class="pb-4 pt-1">
          <div v-if="formState.kind === 'article'" class="article-editor-list">
            <label class="article-editor-row">
              <span class="article-editor-label">标题</span>
              <span class="article-editor-control">
                <Input
                  v-model="formState.title"
                  class="article-editor-input"
                  placeholder="输入标题"
                />
              </span>
            </label>

            <div class="article-editor-row">
              <span class="article-editor-label">分类</span>
              <div class="article-editor-control">
                <Select v-model="formState.categoryId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="category in articleLeafCategories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ getCategoryPathLabel('articles', category.id) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="article-editor-row">
              <span class="article-editor-label">封面</span>
              <div class="article-editor-control">
                <FileUploadField
                  v-if="canUploadMediaCover"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  :loading="uploadingArticleCover"
                  title="上传封面"
                  description="支持 JPG、PNG、WEBP，上传后会写入封面地址。"
                  :selected-label="articleCoverSelectedLabel"
                  button-label="选择封面"
                  loading-label="上传中..."
                  icon="ri-image-add-line"
                  compact
                  :show-supplement="Boolean(articleCoverPreviewSrc)"
                  @files-selected="files => { void handleArticleCoverFiles(files) }"
                >
                  <template v-if="articleCoverPreviewSrc" #preview="{ open }">
                    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      <figure class="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted shadow-(--shadow-border)">
                        <button
                          type="button"
                          class="block h-full w-full text-left"
                          aria-label="更换文章封面"
                          @click="open"
                        >
                          <img
                            class="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/5"
                            :src="articleCoverPreviewSrc"
                            alt=""
                            aria-hidden="true"
                          >
                        </button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          class="absolute right-1.5 top-1.5 size-8 bg-background/92 text-foreground opacity-0 shadow-sm transition-[opacity,background-color] duration-180 ease-out hover:bg-background group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="移除文章封面"
                          @click.stop="removeArticleCover"
                        >
                          <i class="ri-close-line text-base" />
                        </Button>
                      </figure>
                    </div>
                  </template>
                </FileUploadField>
              </div>
            </div>

            <div class="article-editor-row">
              <span class="article-editor-label">状态</span>
              <div class="article-editor-control">
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
              </div>
            </div>

            <label class="article-editor-row">
              <span class="article-editor-label">标签</span>
              <span class="article-editor-control">
                <TagsInput
                  v-model="articleTagValues"
                  add-on-blur
                  add-on-paste
                  delimiter=","
                >
                  <TagsInputItem
                    v-for="tag in articleTagValues"
                    :key="tag"
                    :value="tag"
                  >
                    <TagsInputItemText />
                    <TagsInputItemDelete />
                  </TagsInputItem>
                  <TagsInputInput placeholder="输入标签后按回车" />
                </TagsInput>
              </span>
            </label>

            <div class="article-editor-row article-editor-row--top">
              <span class="article-editor-label">正文</span>
              <div class="article-editor-control">
                <RichTextEditor
                  v-model="formState.content"
                  placeholder="输入正文内容"
                  :upload-image="canUploadMediaContentImage ? uploadArticleContentImage : undefined"
                />
              </div>
            </div>
          </div>

          <div v-else class="article-editor-list">
            <div class="article-editor-row article-editor-row--top">
              <span class="article-editor-label">视频文件</span>
              <div class="article-editor-control">
                <FileUploadField
                  v-if="canUploadMediaVideo"
                  accept="video/*"
                  :loading="uploadingVideoFile"
                  title="上传视频文件"
                  description="支持浏览器可选择的视频文件，上传后会写入视频地址和文件名。"
                  :selected-label="formState.sourceFileName || formState.sourceUrl || '暂未选择文件'"
                  button-label="上传视频"
                  loading-label="上传中..."
                  icon="ri-upload-2-line"
                  compact
                  @files-selected="files => { void handleVideoFiles(files) }"
                />
              </div>
            </div>

            <div class="article-editor-row">
              <span class="article-editor-label">标题</span>
              <div class="article-editor-control">
                <Input v-model="formState.title" placeholder="输入标题" />
              </div>
            </div>

            <div class="article-editor-row">
              <span class="article-editor-label">分类</span>
              <div class="article-editor-control">
                <Select v-model="formState.categoryId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="category in videoLeafCategories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ getCategoryPathLabel('videos', category.id) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="article-editor-row">
              <span class="article-editor-label">状态</span>
              <div class="article-editor-control">
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
              </div>
            </div>

            <div class="article-editor-row article-editor-row--top">
              <span class="article-editor-label">摘要</span>
              <div class="article-editor-control">
                <Textarea
                  v-model="formState.summary"
                  class="min-h-[108px]"
                  placeholder="输入内容简介，说明适用场景和主要收益"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveRightSheet>

    <Dialog v-model:open="categoryCreateDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加媒体分类</DialogTitle>
          <DialogDescription>
            {{ categoryCreateForm.parentUuid ? `添加到 ${getCategoryPathLabel(categoryCreateModule, categoryCreateForm.parentUuid)} 下` : `添加${categoryCreateModule === 'videos' ? '视频' : '文章'}根分类` }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <label class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">分类名称</span>
            <Input
              v-model="categoryCreateForm.name"
              placeholder="输入分类名称"
              @keydown.enter.prevent="submitCreateCategory"
            />
          </label>

          <div v-if="categoryCreateModule === 'articles'" class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">媒体库分类</span>
            <Select
              v-model="categoryCreateTagModel"
              :disabled="categoryCreateSubmitting || mediaCategoryTagLoading"
            >
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="mediaCategoryTagLoading ? '正在加载媒体库分类...' : '请选择媒体库分类'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="MEDIA_CATEGORY_TAG_EMPTY_VALUE">
                  不选择媒体库分类
                </SelectItem>
                <SelectItem
                  v-for="option in categoryCreateTagOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="!mediaCategoryTagLoading && !categoryCreateTagOptions.length"
              class="text-xs leading-5 text-muted-foreground"
            >
              暂无可选 Tag，可先不选择，或在业务预设中维护「媒体库分类Tag」。
            </p>
          </div>

          <div class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">父级分类</span>
            <Select
              :model-value="categoryCreateParentModel"
              :disabled="categoryCreateSubmitting || categoryLoading[categoryCreateModule]"
              @update:model-value="updateCreateCategoryParent"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择父级分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ROOT_CATEGORY_PARENT_VALUE">
                  {{ categoryCreateModule === 'videos' ? '视频根分类' : '文章根分类' }}
                </SelectItem>
                <SelectItem
                  v-for="category in categoryCreateParentOptions"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ getCategoryPathLabel(categoryCreateModule, category.id) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="!categoryCreateParentOptions.length"
              class="text-xs leading-5 text-muted-foreground"
            >
              当前还没有可选父级，只能尝试创建根分类。
            </p>
          </div>

          <label class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">排序</span>
            <Input
              v-model.number="categoryCreateForm.sortNum"
              type="number"
              inputmode="numeric"
              placeholder="输入排序值"
              @keydown.enter.prevent="submitCreateCategory"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="categoryCreateSubmitting" @click="categoryCreateDialogOpen = false">
            取消
          </Button>
          <Button :disabled="categoryCreateSubmitting || !categoryCreateForm.name.trim()" @click="submitCreateCategory">
            <i :class="[categoryCreateSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
            <span>{{ categoryCreateSubmitting ? "保存中" : "保存分类" }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="categoryEditDialogOpen" @update:open="value => value ? (categoryEditDialogOpen = value) : closeEditCategoryDialog()">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑媒体分类</DialogTitle>
          <DialogDescription>
            {{ categoryDetailLoading ? "正在同步分类详情..." : editingCategory ? `更新 ${editingCategory.name} 的名称和排序。` : "更新当前分类的名称和排序。" }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <label class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">分类名称</span>
            <Input
              v-model="categoryEditForm.name"
              placeholder="输入分类名称"
              :disabled="categoryDetailLoading"
              @keydown.enter.prevent="submitEditCategory"
            />
          </label>

          <div v-if="categoryEditModule === 'articles'" class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">媒体库分类</span>
            <Select
              v-model="categoryEditTagModel"
              :disabled="categoryDetailLoading || categoryEditSubmitting || mediaCategoryTagLoading"
            >
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="mediaCategoryTagLoading ? '正在加载媒体库分类...' : '请选择媒体库分类'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="MEDIA_CATEGORY_TAG_EMPTY_VALUE">
                  不选择媒体库分类
                </SelectItem>
                <SelectItem
                  v-for="option in categoryEditTagOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="!mediaCategoryTagLoading && !categoryEditTagOptions.length"
              class="text-xs leading-5 text-muted-foreground"
            >
              暂无可选 Tag，可先不选择，或在业务预设中维护「媒体库分类Tag」。
            </p>
          </div>

          <label class="grid gap-2 text-sm">
            <span class="font-medium text-foreground">排序</span>
            <Input
              v-model.number="categoryEditForm.sortNum"
              type="number"
              inputmode="numeric"
              placeholder="输入排序值"
              :disabled="categoryDetailLoading"
              @keydown.enter.prevent="submitEditCategory"
            />
          </label>
        </div>

        <DialogFooter class="gap-2 sm:justify-between">
          <div class="flex flex-wrap justify-start gap-2">
            <Button
              variant="ghost"
              :disabled="categoryDetailLoading || categoryEditSubmitting || !editingCategoryId"
              @click="openCreateChildForEditingCategory"
            >
              <i class="ri-node-tree text-sm" />
              <span>添加子分类</span>
            </Button>

            <Button
              variant="ghost"
              class="text-destructive hover:text-destructive"
              :disabled="categoryDetailLoading || categoryEditSubmitting || Boolean(editingCategory?.isDefault)"
              @click="editingCategoryId && promptDeleteCategory(categoryEditModule, editingCategoryId)"
            >
              <i class="ri-delete-bin-line text-sm" />
              <span>删除分类</span>
            </Button>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" :disabled="categoryEditSubmitting" @click="closeEditCategoryDialog">
              取消
            </Button>
            <Button v-if="canEditMediaCategory" :disabled="categoryDetailLoading || categoryEditSubmitting || !categoryEditForm.name.trim()" @click="submitEditCategory">
              <i :class="[categoryEditSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
              <span>{{ categoryEditSubmitting ? "保存中" : "保存修改" }}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="categoryDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除媒体分类？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后将无法恢复。请确认该分类下没有仍需保留的内容或子分类。
            <span v-if="deletingCategory" class="mt-2 block font-medium text-foreground">
              {{ deletingCategory.name }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="categoryDeleteSubmitting">取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="categoryDeleteSubmitting"
            @click.prevent="confirmDeleteCategory"
          >
            <i :class="[categoryDeleteSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
            <span>{{ categoryDeleteSubmitting ? "删除中" : "删除分类" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="videoDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除媒体视频？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后将无法恢复。
            <span v-if="activeVideo" class="mt-2 block font-medium text-foreground">
              {{ activeVideo.title }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="videoDeleteSubmitting">取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="videoDeleteSubmitting"
            @click.prevent="confirmDeleteActiveVideo"
          >
            <i :class="[videoDeleteSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
            <span>{{ videoDeleteSubmitting ? "删除中" : "删除视频" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="articleDeleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除媒体文章？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后将无法恢复。
            <span v-if="activeArticle" class="mt-2 block font-medium text-foreground">
              {{ activeArticle.title }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="articleDeleteSubmitting">取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="articleDeleteSubmitting"
            @click.prevent="confirmDeleteActiveArticle"
          >
            <i :class="[articleDeleteSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
            <span>{{ articleDeleteSubmitting ? "删除中" : "删除文章" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<style scoped>
.article-editor-list {
  padding: 0 1rem;
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

.article-editor-textarea {
  resize: vertical;
}

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
.media-markdown :deep(ol),
.media-markdown :deep(blockquote) {
  margin: 0 0 0.85rem;
}

.media-markdown :deep(ul),
.media-markdown :deep(ol) {
  padding-left: 1.15rem;
}

.media-markdown :deep(ul) {
  list-style-type: disc;
}

.media-markdown :deep(ol) {
  list-style-type: decimal;
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

@media (max-width: 768px) {
  .media-library-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .media-library-sidebar {
    width: 100%;
    padding-top: 1rem;
  }

  .media-library-sidebar-panel {
    position: static;
    max-height: none;
    overflow: visible;
  }

  .media-library-sidebar-panel > .min-h-0 {
    max-height: 42svh;
    min-height: 0;
  }

  .media-library-content {
    padding-top: 0;
  }

  .media-library-grid {
    gap: 0.75rem;
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
