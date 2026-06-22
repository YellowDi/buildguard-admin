<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { toast } from "vue-sonner"

import FileUploadField from "@/components/upload/FileUploadField.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig } from "@/components/table-page/types"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { TooltipWrap } from "@/components/ui/tooltip"
import {
  createCustomerCase,
  deleteCustomerCase,
  fetchCustomerCases,
  updateCustomerCase,
  updateCustomerCasePublished,
  type CustomerCaseModule,
  type CustomerCaseRecord,
} from "@/lib/customer-cases-api"
import { fetchCustomers } from "@/lib/customers-api"
import { getApiErrorMessage } from "@/lib/api-errors"
import { uploadTencentCosFile } from "@/lib/tencent-cos-upload"
import { cn } from "@/lib/utils"

type CustomerCaseRow = CustomerCaseRecord & {
  bodyText: string
  customerNameText: string
  moduleCount: number
  statusLabel: string
}

type SheetMode = "create" | "edit" | "view"

type CustomerCaseForm = {
  id: string
  title: string
  customerUuid: string
  customerName: string
  body: string
  modules: CustomerCaseModule[]
  isPublished: boolean
}

const CUSTOMER_NONE_VALUE = "__none__"
const CUSTOMER_OPTIONS_PAGE_SIZE = 500

const cases = ref<CustomerCaseRecord[]>([])
const customerOptions = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)
const customerOptionsLoading = ref(false)
const submitting = ref(false)
const uploadingPhotoModuleId = ref("")
const keywordQuery = ref("")
const selectedStatus = ref("")
const sheetOpen = ref(false)
const sheetMode = ref<SheetMode>("create")
const deleteConfirmOpen = ref(false)
const deletingCaseId = ref("")
const draggingModuleId = ref("")
const dragOverModuleId = ref("")
const form = reactive<CustomerCaseForm>(createEmptyForm())

const statusOptions = [
  { value: "published", label: "对外展示" },
  { value: "hidden", label: "不展示" },
]

const rows = computed<CustomerCaseRow[]>(() => cases.value.map(toCustomerCaseRow))
const activeCase = computed(() => cases.value.find(item => item.id === form.id) ?? null)
const deletingCase = computed(() => cases.value.find(item => item.id === deletingCaseId.value) ?? null)
const customerSelectValue = computed(() => form.customerUuid || CUSTOMER_NONE_VALUE)
const isReadonly = computed(() => sheetMode.value === "view")
const sheetTitle = computed(() => {
  if (sheetMode.value === "create") return "新增客户案例"
  if (sheetMode.value === "edit") return "编辑客户案例"
  return "客户案例详情"
})
const orderedFormModules = computed(() => [...form.modules].sort(compareModules))

const schema: TablePageSchema<CustomerCaseRow> = {
  title: "客户案例",
  description: "维护官网和 App 首页展示的客户案例内容",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  primaryActionLabel: "新增客户案例",
  emptyState: {
    title: "暂无客户案例",
    description: "新增客户案例后，可通过展示开关控制是否出现在官网和 App 首页。",
    icon: "ri-profile-line",
  },
  rowActions: [
    {
      key: "view",
      label: "查看",
      onClick: row => openView(row),
    },
    {
      key: "edit",
      label: "编辑",
      onClick: row => openEdit(row),
    },
    {
      key: "delete",
      label: "删除",
      onClick: row => requestDelete(row.id),
    },
  ],
  onRowClick: row => openView(row),
  columns: [
    {
      key: "title",
      label: "标题",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      slot: "cell-title",
      sort: true,
    },
    {
      key: "statusLabel",
      label: "展示状态",
      filterType: "tag",
      slot: "cell-statusLabel",
      sort: true,
    },
    {
      key: "customerNameText",
      label: "客户",
      filterType: "text",
      sort: true,
    },
    {
      key: "moduleCount",
      label: "模块",
      filterType: "number",
      format: "numeric",
      slot: "cell-moduleCount",
      sort: {
        kind: "metric",
        value: row => row.moduleCount,
      },
    },
    {
      key: "bodyText",
      label: "项目描述",
      filterType: "text",
      width: "fill",
      slot: "cell-bodyText",
      sort: true,
    },
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      sort: true,
    },
  ],
  filters: [
    {
      key: "页面内容",
      label: "页面内容",
      type: "text",
      fixed: true,
      placeholder: "输入标题、客户、项目描述或模块内容",
      value: row => buildSearchText(row),
    },
  ],
  sort: {
    storageKey: "customer-cases-sort-preferences-v1",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows,
})
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "q",
      queryKey: "q",
      label: "关键词",
      icon: "ri-search-line",
      placeholder: "标题、客户、项目描述或模块内容",
      value: keywordQuery.value,
      expandedWidth: 280,
      collapsedMaxWidth: 280,
    },
    {
      type: "select",
      key: "status",
      queryKey: "status",
      label: "展示状态",
      icon: "ri-eye-line",
      value: selectedStatus.value,
      options: statusOptions,
      expandedWidth: 180,
      collapsedMaxWidth: 180,
      placeholder: "选择展示状态",
    },
  ],
  values: {
    q: keywordQuery.value,
    status: selectedStatus.value,
  },
  canClear: Boolean(keywordQuery.value || selectedStatus.value),
}))

void loadCases()
void loadCustomerOptions()

async function loadCases() {
  loading.value = true

  try {
    const result = await fetchCustomerCases({
      keyword: keywordQuery.value,
      isPublished: parseStatusFilter(selectedStatus.value),
    })
    cases.value = result.list
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "客户案例加载失败")
    cases.value = []
  } finally {
    loading.value = false
  }
}

async function loadCustomerOptions() {
  customerOptionsLoading.value = true

  try {
    const result = await fetchCustomers({
      PageNum: 1,
      PageSize: CUSTOMER_OPTIONS_PAGE_SIZE,
    })

    customerOptions.value = result.list
      .map(item => ({
        value: toText(item.Uuid),
        label: toText(item.CorpName, "未命名客户"),
      }))
      .filter(option => option.value)
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
  }
}

function openCreate() {
  Object.assign(form, createEmptyForm())
  sheetMode.value = "create"
  sheetOpen.value = true
}

function openEdit(row: CustomerCaseRow | CustomerCaseRecord | Record<string, unknown>) {
  Object.assign(form, createFormFromRecord(resolveCustomerCaseRecord(row)))
  sheetMode.value = "edit"
  sheetOpen.value = true
}

function openView(row: CustomerCaseRow | CustomerCaseRecord | Record<string, unknown>) {
  Object.assign(form, createFormFromRecord(resolveCustomerCaseRecord(row)))
  sheetMode.value = "view"
  sheetOpen.value = true
}

function enterEditMode() {
  if (!activeCase.value) {
    return
  }

  sheetMode.value = "edit"
}

async function saveCase() {
  if (isReadonly.value || submitting.value) {
    return
  }

  const title = form.title.trim()
  if (!title) {
    toast.error("请填写客户案例标题")
    return
  }

  submitting.value = true

  try {
    const payload = {
      title,
      customerUuid: form.customerUuid,
      customerName: getCustomerName(form.customerUuid, form.customerName),
      body: form.body.trim(),
      modules: normalizeModuleOrders(form.modules),
      isPublished: form.isPublished,
    }

    if (sheetMode.value === "create") {
      await createCustomerCase(payload)
      toast.success("客户案例已新增")
    } else {
      await updateCustomerCase({
        id: form.id,
        ...payload,
      })
      toast.success("客户案例已保存")
    }

    sheetOpen.value = false
    await loadCases()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "客户案例保存失败")
  } finally {
    submitting.value = false
  }
}

async function handlePublishedChange(row: CustomerCaseRow | Record<string, unknown>, value: boolean | "indeterminate") {
  const record = resolveCustomerCaseRecord(row)
  if (!record.id) {
    return
  }

  const nextPublished = value === true
  const previousCases = cases.value
  cases.value = cases.value.map(item => item.id === record.id ? { ...item, isPublished: nextPublished } : item)

  try {
    await updateCustomerCasePublished(record.id, nextPublished)
    await loadCases()
  } catch (error) {
    cases.value = previousCases
    toast.error(error instanceof Error ? error.message : "展示状态更新失败")
  }
}

function requestDelete(id: string) {
  deletingCaseId.value = id
  deleteConfirmOpen.value = true
}

async function confirmDelete() {
  const caseId = deletingCaseId.value

  if (!caseId || submitting.value) {
    return
  }

  submitting.value = true

  try {
    await deleteCustomerCase(caseId)
    toast.success("客户案例已删除")
    deleteConfirmOpen.value = false
    deletingCaseId.value = ""

    if (form.id === caseId) {
      sheetOpen.value = false
    }

    await loadCases()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "客户案例删除失败")
  } finally {
    submitting.value = false
  }
}

function addModule() {
  form.modules = normalizeModuleOrders([
    ...form.modules,
    createEmptyModule(getNextSortOrder(form.modules)),
  ])
}

function removeModule(moduleId: string) {
  form.modules = normalizeModuleOrders(form.modules.filter(module => module.id !== moduleId))
}

function handleModuleDragStart(event: DragEvent, moduleId: string) {
  if (isReadonly.value) {
    return
  }

  draggingModuleId.value = moduleId
  dragOverModuleId.value = moduleId
  event.dataTransfer?.setData("text/plain", moduleId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
  }
}

function handleModuleDragOver(event: DragEvent, moduleId: string) {
  if (isReadonly.value || !draggingModuleId.value || draggingModuleId.value === moduleId) {
    return
  }

  event.preventDefault()
  dragOverModuleId.value = moduleId
}

function handleModuleDrop(event: DragEvent, targetId: string) {
  event.preventDefault()

  if (isReadonly.value) {
    clearDrag()
    return
  }

  const sourceId = draggingModuleId.value || event.dataTransfer?.getData("text/plain") || ""
  form.modules = reorderById(form.modules, sourceId, targetId)
  clearDrag()
}

function clearDrag() {
  draggingModuleId.value = ""
  dragOverModuleId.value = ""
}

function handleCustomerChange(value: unknown) {
  const nextValue = toText(value)

  if (!nextValue || nextValue === CUSTOMER_NONE_VALUE) {
    form.customerUuid = ""
    form.customerName = ""
    return
  }

  form.customerUuid = nextValue
  form.customerName = getCustomerName(nextValue)
}

async function handleSitePhotoSelected(module: CustomerCaseModule, files: File[]) {
  const file = files[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith("image/")) {
    toast.error("请选择图片文件")
    return
  }

  uploadingPhotoModuleId.value = module.id

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `customer-cases/site-photos/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || undefined,
    })

    module.sitePhotoUrl = result.url
    toast.success("工地照片已上传")
  } catch (error) {
    toast.error("工地照片上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
  } finally {
    uploadingPhotoModuleId.value = ""
  }
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  if (payload.key === "q") {
    keywordQuery.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  if (payload.key === "status") {
    selectedStatus.value = typeof payload.value === "string" ? payload.value.trim() : ""
  }

  void loadCases()
}

function handleQueryClear() {
  if (!keywordQuery.value && !selectedStatus.value) {
    return
  }

  keywordQuery.value = ""
  selectedStatus.value = ""
  void loadCases()
}

function createEmptyForm(): CustomerCaseForm {
  return {
    id: "",
    title: "",
    customerUuid: "",
    customerName: "",
    body: "",
    modules: [],
    isPublished: true,
  }
}

function createFormFromRecord(record: CustomerCaseRecord): CustomerCaseForm {
  return {
    id: record.id,
    title: record.title,
    customerUuid: record.customerUuid,
    customerName: record.customerName,
    body: stripHtml(record.body),
    modules: record.modules.map(module => ({ ...module })),
    isPublished: record.isPublished,
  }
}

function toCustomerCaseRow(record: CustomerCaseRecord): CustomerCaseRow {
  return {
    ...record,
    bodyText: stripHtml(record.body) || "-",
    customerNameText: record.customerName || "未关联客户",
    moduleCount: record.modules.length,
    statusLabel: record.isPublished ? "对外展示" : "不展示",
  }
}

function resolveCustomerCaseRecord(row: CustomerCaseRow | CustomerCaseRecord | Record<string, unknown>): CustomerCaseRecord {
  return {
    id: toText(row.id),
    title: toText(row.title),
    customerUuid: toText(row.customerUuid),
    customerName: toText(row.customerName),
    body: toText(row.body),
    modules: Array.isArray(row.modules)
      ? row.modules.map(normalizeModuleFromUnknown)
      : [],
    isPublished: row.isPublished === true,
    updatedAt: toText(row.updatedAt),
  }
}

function normalizeModuleFromUnknown(value: unknown, index: number): CustomerCaseModule {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  return {
    id: toText(source.id) || createId("module"),
    projectProgress: toText(source.projectProgress),
    projectStage: toText(source.projectStage),
    sitePhotoUrl: toText(source.sitePhotoUrl),
    progressDescription: toText(source.progressDescription),
    craftInfo: toText(source.craftInfo),
    sortOrder: toNumber(source.sortOrder) ?? (index + 1) * 10,
  }
}

function createEmptyModule(sortOrder: number): CustomerCaseModule {
  return {
    id: createId("module"),
    projectProgress: "",
    projectStage: "",
    sitePhotoUrl: "",
    progressDescription: "",
    craftInfo: "",
    sortOrder,
  }
}

function getRowTitle(row: Record<string, unknown>) {
  return toText(row.title)
}

function getRowStatusLabel(row: Record<string, unknown>) {
  return toText(row.statusLabel, getRowPublished(row) ? "对外展示" : "不展示")
}

function getRowPublished(row: Record<string, unknown>) {
  return row.isPublished === true
}

function getRowBodyText(row: Record<string, unknown>) {
  return toText(row.bodyText, stripHtml(toText(row.body)) || "-")
}

function getRowModuleCount(row: Record<string, unknown>) {
  return toNumber(row.moduleCount) ?? (Array.isArray(row.modules) ? row.modules.length : 0)
}

function getCustomerName(customerUuid: string, fallback = "") {
  return customerOptions.value.find(option => option.value === customerUuid)?.label ?? fallback
}

function parseStatusFilter(value: string) {
  if (value === "published") return true
  if (value === "hidden") return false
  return null
}

function buildSearchText(row: CustomerCaseRow) {
  return [
    row.title,
    row.customerNameText,
    row.bodyText,
    row.statusLabel,
    row.modules.map(buildModuleSearchText).join(" "),
  ].join(" ")
}

function buildModuleSearchText(module: CustomerCaseModule) {
  return [
    module.projectProgress,
    module.projectStage,
    module.progressDescription,
    module.craftInfo,
  ].join(" ")
}

function normalizeModuleOrders(items: CustomerCaseModule[]) {
  return [...items].sort(compareModules).map((item, index) => ({
    ...item,
    projectProgress: item.projectProgress.trim(),
    projectStage: item.projectStage.trim(),
    sitePhotoUrl: item.sitePhotoUrl.trim(),
    progressDescription: item.progressDescription.trim(),
    craftInfo: item.craftInfo.trim(),
    sortOrder: (index + 1) * 10,
  }))
}

function reorderById(items: CustomerCaseModule[], sourceId: string, targetId: string) {
  if (!sourceId || sourceId === targetId) {
    return items
  }

  const ordered = [...items].sort(compareModules)
  const sourceIndex = ordered.findIndex(item => item.id === sourceId)
  const targetIndex = ordered.findIndex(item => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return items
  }

  const [moved] = ordered.splice(sourceIndex, 1)
  ordered.splice(targetIndex, 0, moved)
  return normalizeModuleOrders(ordered)
}

function compareModules(left: CustomerCaseModule, right: CustomerCaseModule) {
  return left.sortOrder - right.sortOrder
}

function getNextSortOrder(items: Array<{ sortOrder: number }>) {
  return Math.max(0, ...items.map(item => item.sortOrder)) + 10
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function sanitizeObjectKeyFileName(value: string) {
  const normalized = value.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

  return normalized || "site-photo"
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  return Number.isFinite(parsed) ? parsed : undefined
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <TablePage
      :page="page"
      :loading="loading"
      :query-bar="queryBar"
      fill-available-height
      @refresh-action="loadCases"
      @primary-action="openCreate"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-title="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full min-w-0 items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="openView(row)"
        >
          <span class="truncate">{{ getRowTitle(row) }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
      </template>

      <template #cell-statusLabel="{ row }">
        <div class="flex items-center gap-2">
          <Badge :variant="getRowPublished(row) ? 'default' : 'secondary'">
            {{ getRowStatusLabel(row) }}
          </Badge>
          <Switch
            :model-value="getRowPublished(row)"
            :aria-label="`${getRowTitle(row)} 展示状态`"
            @update:model-value="handlePublishedChange(row, $event)"
          />
        </div>
      </template>

      <template #cell-bodyText="{ row }">
        <p class="w-full min-w-0 truncate text-sm leading-5 text-muted-foreground" :title="getRowBodyText(row)">
          {{ getRowBodyText(row) }}
        </p>
      </template>

      <template #cell-moduleCount="{ row }">
        <span>{{ getRowModuleCount(row) }} 个模块</span>
      </template>
    </TablePage>

    <ResponsiveRightSheet
      v-model:open="sheetOpen"
      :title="sheetTitle"
      description="维护标题、客户、项目描述、客户案例模块和对外展示状态。"
      :show-primary="false"
      sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-3xl"
    >
      <template #actions>
        <div class="right-sheet-actions">
          <div class="right-sheet-actions__primary">
            <TooltipWrap content="关闭客户案例">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="right-sheet-icon-button"
                @click="sheetOpen = false"
              >
                <i class="ri-close-line text-base" />
                <span class="sr-only">关闭客户案例</span>
              </Button>
            </TooltipWrap>
          </div>

          <div class="right-sheet-actions__secondary">
            <Button
              v-if="sheetMode === 'view' && activeCase"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              @click="enterEditMode"
            >
              <i class="ri-edit-line text-sm" />
              <span>编辑</span>
            </Button>
            <Button
              v-if="sheetMode !== 'create' && activeCase"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button text-destructive hover:text-destructive"
              :disabled="submitting"
              @click="requestDelete(form.id)"
            >
              <i class="ri-delete-bin-line text-sm" />
              <span>删除</span>
            </Button>
            <Button
              v-if="!isReadonly"
              type="button"
              size="sm"
              class="h-8 rounded-md px-2.5"
              :disabled="submitting"
              @click="saveCase"
            >
              <i :class="[submitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
              <span>{{ submitting ? '保存中...' : '保存' }}</span>
            </Button>
          </div>
        </div>
      </template>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="case-editor-list pb-6 pt-1">
          <label class="case-editor-row">
            <span class="case-editor-label">标题</span>
            <span class="case-editor-control">
              <Input v-model="form.title" :disabled="isReadonly" placeholder="输入客户案例标题" />
            </span>
          </label>

          <div class="case-editor-row">
            <span class="case-editor-label">客户</span>
            <div class="case-editor-control">
              <Select
                :model-value="customerSelectValue"
                :disabled="isReadonly || customerOptionsLoading"
                @update:model-value="handleCustomerChange"
              >
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="customerOptionsLoading ? '正在加载客户...' : '请选择客户（非必填）'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="CUSTOMER_NONE_VALUE">不关联客户</SelectItem>
                  <SelectItem
                    v-for="customer in customerOptions"
                    :key="customer.value"
                    :value="customer.value"
                  >
                    {{ customer.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="case-editor-row">
            <span class="case-editor-label">展示</span>
            <div class="case-editor-control">
              <div class="flex min-h-9 items-center justify-between gap-3">
                <span class="text-sm text-muted-foreground">
                  {{ form.isPublished ? '已对外展示，App 首页自动展示' : '未对外展示，仅管理端可见' }}
                </span>
                <Switch v-model="form.isPublished" :disabled="isReadonly" />
              </div>
            </div>
          </div>

          <label class="case-editor-row case-editor-row--top">
            <span class="case-editor-label">项目描述</span>
            <span class="case-editor-control">
              <Textarea
                v-model="form.body"
                :disabled="isReadonly"
                class="min-h-28 resize-y"
                placeholder="输入项目描述"
              />
            </span>
          </label>

          <div class="case-editor-row case-editor-row--top">
            <span class="case-editor-label">模块</span>
            <div class="case-editor-control">
              <div class="flex flex-col gap-2">
                <article
                  v-for="(module, index) in orderedFormModules"
                  :key="module.id"
                  :class="cn(
                    'rounded-lg border border-border/70 bg-background p-2.5',
                    draggingModuleId === module.id ? 'opacity-60' : '',
                    dragOverModuleId === module.id && draggingModuleId !== module.id ? 'ring-2 ring-primary/20' : '',
                  )"
                  @dragover="handleModuleDragOver($event, module.id)"
                  @drop="handleModuleDrop($event, module.id)"
                >
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      draggable="true"
                      class="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                      :disabled="isReadonly"
                      aria-label="拖动调整模块顺序"
                      @dragstart="handleModuleDragStart($event, module.id)"
                      @dragend="clearDrag"
                    >
                      <i class="ri-draggable text-[17px]" />
                    </button>

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-foreground">
                        模块 {{ index + 1 }}
                      </p>
                      <p class="mt-0.5 truncate text-xs text-muted-foreground">
                        项目进度、项目阶段、工地照片、进度描述、工艺信息
                      </p>
                    </div>

                    <Button
                      v-if="!isReadonly"
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      class="size-9 rounded-md text-muted-foreground"
                      @click="removeModule(module.id)"
                    >
                      <i class="ri-delete-bin-line text-base" />
                      <span class="sr-only">删除模块</span>
                    </Button>
                  </div>

                  <div class="mt-3 grid gap-3 sm:grid-cols-2">
                    <label class="grid gap-1.5 text-sm">
                      <span class="font-medium text-foreground">项目进度</span>
                      <Input
                        v-model="module.projectProgress"
                        :disabled="isReadonly"
                        placeholder="例如：完成 70%"
                      />
                    </label>

                    <label class="grid gap-1.5 text-sm">
                      <span class="font-medium text-foreground">项目阶段</span>
                      <Input
                        v-model="module.projectStage"
                        :disabled="isReadonly"
                        placeholder="例如：主体施工"
                      />
                    </label>
                  </div>

                  <div class="mt-3 grid gap-1.5 text-sm">
                    <span class="font-medium text-foreground">工地照片</span>
                    <FileUploadField
                      accept="image/*"
                      title="上传工地照片"
                      description="支持浏览器可选择的图片文件。"
                      :selected-label="module.sitePhotoUrl ? '已上传工地照片' : ''"
                      :button-label="module.sitePhotoUrl ? '更换图片' : '上传图片'"
                      loading-label="上传中..."
                      :loading="uploadingPhotoModuleId === module.id"
                      :disabled="isReadonly || uploadingPhotoModuleId === module.id"
                      :show-supplement="Boolean(module.sitePhotoUrl)"
                      compact
                      @files-selected="handleSitePhotoSelected(module, $event)"
                    >
                      <template v-if="module.sitePhotoUrl" #preview>
                        <div class="aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                          <img
                            :src="module.sitePhotoUrl"
                            alt=""
                            class="h-full w-full object-cover"
                          >
                        </div>
                      </template>

                      <template v-if="module.sitePhotoUrl && !isReadonly" #actions>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="h-9 rounded-md text-muted-foreground"
                          @click.stop="module.sitePhotoUrl = ''"
                        >
                          <i class="ri-close-line text-sm" />
                          <span>移除</span>
                        </Button>
                      </template>
                    </FileUploadField>
                  </div>

                  <label class="mt-3 grid gap-1.5 text-sm">
                    <span class="font-medium text-foreground">进度描述</span>
                    <Textarea
                      v-model="module.progressDescription"
                      :disabled="isReadonly"
                      class="min-h-20 resize-y"
                      placeholder="输入进度描述"
                    />
                  </label>

                  <label class="mt-3 grid gap-1.5 text-sm">
                    <span class="font-medium text-foreground">工艺信息</span>
                    <Textarea
                      v-model="module.craftInfo"
                      :disabled="isReadonly"
                      class="min-h-20 resize-y"
                      placeholder="输入工艺信息"
                    />
                  </label>
                </article>

                <div v-if="!form.modules.length" class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  暂无自定义模块
                </div>

                <Button
                  v-if="!isReadonly"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-full justify-start rounded-md px-2 text-muted-foreground"
                  @click="addModule"
                >
                  <i class="ri-add-line text-[15px]" />
                  <span>新增模块</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveRightSheet>

    <AlertDialog v-model:open="deleteConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除这个客户案例？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后，该案例不会再出现在管理列表和 App 首页预览中。
            <span v-if="deletingCase" class="mt-2 block font-medium text-foreground">
              {{ deletingCase.title }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="submitting">取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="submitting"
            @click.prevent="confirmDelete"
          >
            <i :class="[submitting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line', 'text-sm']" />
            <span>{{ submitting ? '删除中' : '确认删除' }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<style scoped>
.case-editor-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.case-editor-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 16px;
  border-bottom: 1px solid hsl(var(--border) / 0.7);
  padding: 14px 2px;
}

.case-editor-row:last-child {
  border-bottom: 0;
}

.case-editor-row--top {
  align-items: start;
}

.case-editor-label {
  padding-top: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.case-editor-control {
  min-width: 0;
}

@media (max-width: 640px) {
  .case-editor-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .case-editor-label {
    padding-top: 0;
  }
}
</style>
