<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import TablePage from "@/components/table-page/TablePage.vue"
import type { TableExportRowsResolverPayload } from "@/components/table-page/export-utils"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig, TableStatusOption } from "@/components/table-page/types"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { handleApiError } from "@/lib/api-errors"
import {
  fetchInspectionProjectDetail,
  fetchInspectionProjects,
  type InspectionProjectRecord,
  type InspectionProjectProgressItem,
  type WorkOrderFileItem,
} from "@/lib/inspection-projects-api"
import { fetchAllPaginatedListItems } from "@/lib/paginated-list-export"

type CustomerProjectRow = {
  id: string
  uuid: string
  name: string
  customerUuid: string
  customerName: string
  corpName: string
  address: string
  duration: string
  durationValue: number | null
  introduction: string
  projectTime: string
  status: number | null
  statusLabel: string
  isPublic: number | null
  publicLabel: string
  progressCount: number
  latestStage: string
  latestProgressAt: string
  raw: InspectionProjectRecord
}

const projects = ref<CustomerProjectRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const nameQuery = ref("")
const selectedStatus = ref("")
const sortDirection = ref<"asc" | "desc">("desc")
const sheetOpen = ref(false)
const detailLoading = ref(false)
const selectedProject = ref<InspectionProjectRecord | null>(null)
let latestRequestId = 0
let latestDetailRequestId = 0
let syncingRoute = false

const route = useRoute()
const router = useRouter()

const statusOptions = [
  { value: "1", label: "进行中" },
  { value: "2", label: "已完结" },
]

const projectStatusMap = {
  进行中: { tone: "green", icon: "clock" },
  已完结: { tone: "green", icon: "check" },
  未填写: { tone: "gray", icon: "dot" },
} satisfies Record<string, TableStatusOption>

const progressItems = computed(() => selectedProject.value?.ProgressList ?? [])

const schema: TablePageSchema<CustomerProjectRow> = {
  title: "客户项目",
  description: "管理客户项目基础信息，查看项目状态和进度记录",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  primaryActionLabel: "添加客户项目",
  emptyState: {
    title: "暂无客户项目",
    description: "添加客户项目后，可在这里查看项目状态和进度。",
    icon: "ri-briefcase-4-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => openDetail(row),
    },
    {
      key: "edit",
      label: "编辑",
      onClick: row => openEdit(row),
    },
  ],
  onRowClick: row => openDetail(row),
  columns: [
    {
      key: "name",
      label: "项目名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      slot: "cell-name",
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: projectStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      sort: {
        kind: "metric",
        value: row => row.status ?? 0,
      },
    },
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      sort: true,
    },
    {
      key: "corpName",
      label: "企业名称",
      filterType: "text",
      sort: true,
    },
    {
      key: "address",
      label: "项目地址",
      filterType: "text",
      width: "fill",
      slot: "cell-address",
      sort: true,
    },
    {
      key: "projectTime",
      label: "项目时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      sort: {
        kind: "metric",
        value: row => toTimestamp(row.projectTime) ?? 0,
      },
    },
    {
      key: "durationValue",
      label: "工期",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "天",
      },
      sort: {
        kind: "metric",
        value: row => row.durationValue ?? 0,
      },
    },
    {
      key: "progressCount",
      label: "进度",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "条",
      },
      sort: {
        kind: "metric",
        value: row => row.progressCount,
      },
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入项目、客户、企业或地址",
      value: row => buildPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "customer-projects-sort-preferences-v1",
    initialField: "projectTime",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: computed(() => [...projects.value].sort(compareProjectRows)),
})
page.showControls.value = true
page.customSortEnabled.value = false

const queryBar = computed<TableQueryBarConfig>(() => ({
  controls: [
    {
      type: "search",
      key: "name",
      queryKey: "q",
      label: "项目名称",
      icon: "ri-search-line",
      placeholder: "输入项目名称",
      value: nameQuery.value,
      expandedWidth: 248,
      collapsedMaxWidth: 248,
    },
    {
      type: "select",
      key: "status",
      queryKey: "status",
      label: "项目状态",
      icon: "ri-price-tag-3-line",
      value: selectedStatus.value,
      options: statusOptions,
      placeholder: "请选择状态",
      expandedWidth: 180,
      collapsedMaxWidth: 180,
    },
  ],
  values: {
    name: nameQuery.value,
    status: selectedStatus.value,
  },
  canClear: Boolean(nameQuery.value || selectedStatus.value),
}))

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadProjects()
})

watch(
  () => [
    normalizeQueryValue(route.query.q),
    normalizeQueryValue(route.query.status),
  ] as const,
  (nextValue, previousValue) => {
    if (syncingRoute) {
      return
    }

    if (
      previousValue
      && nextValue.length === previousValue.length
      && nextValue.every((value, index) => value === previousValue[index])
    ) {
      return
    }

    nameQuery.value = nextValue[0] ?? ""
    selectedStatus.value = nextValue[1] ?? ""

    if (pageNum.value !== 1) {
      pageNum.value = 1
      return
    }

    void loadProjects()
  },
  { immediate: true },
)

watch(sheetOpen, (open) => {
  if (open) {
    return
  }

  selectedProject.value = null
  detailLoading.value = false
  latestDetailRequestId += 1
})

async function loadProjects() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionProjects({
      Name: nameQuery.value || undefined,
      Status: selectedStatus.value ? Number(selectedStatus.value) : undefined,
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    projects.value = result.list.map((item, index) => normalizeProjectRow(item, index))

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    projects.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户项目列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function resolveExportRows(payload: TableExportRowsResolverPayload) {
  if (payload.scope !== "filtered") {
    return payload.defaultRows
  }

  const items = await fetchAllPaginatedListItems(({ PageNum, PageSize }) => fetchInspectionProjects({
    Name: nameQuery.value || undefined,
    Status: selectedStatus.value ? Number(selectedStatus.value) : undefined,
    PageNum,
    PageSize,
  }))

  return items.map((item, index) => normalizeProjectRow(item, index)).sort(compareProjectRows)
}

function openCreate() {
  void router.push({ name: "customer-project-create" })
}

function openDetail(row: CustomerProjectRow | Record<string, unknown>) {
  openProjectSheet(row)
}

function openEdit(row: CustomerProjectRow | Record<string, unknown>) {
  const project = resolveProjectFromRow(row)

  if (!project.Uuid) {
    toast.error("客户项目信息不完整，无法编辑")
    return
  }

  void router.push({
    name: "customer-project-edit",
    params: { id: project.Uuid },
  })
}

function openProjectSheet(row: CustomerProjectRow | Record<string, unknown>) {
  const project = resolveProjectFromRow(row)

  if (!project.Uuid) {
    toast.error("客户项目信息不完整，无法打开详情")
    return
  }

  selectedProject.value = project
  sheetOpen.value = true
  void loadProjectDetail(project.Uuid)
}

async function loadProjectDetail(uuid: string) {
  const requestId = ++latestDetailRequestId

  detailLoading.value = true

  try {
    const detail = await fetchInspectionProjectDetail({ Uuid: uuid })

    if (requestId !== latestDetailRequestId) {
      return
    }

    selectedProject.value = detail
  } catch (error) {
    if (requestId !== latestDetailRequestId) {
      return
    }

    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "客户项目详情加载失败，请稍后重试。",
    }))
  } finally {
    if (requestId === latestDetailRequestId) {
      detailLoading.value = false
    }
  }
}

function editSelectedProject() {
  const uuid = toText(selectedProject.value?.Uuid)

  if (!uuid) {
    toast.error("客户项目信息不完整，无法编辑")
    return
  }

  void router.push({
    name: "customer-project-edit",
    params: { id: uuid },
  })
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
}

function handleQueryChange(payload: { key: string; value: string | string[] }) {
  const value = typeof payload.value === "string" ? payload.value.trim() : ""

  if (payload.key === "name") {
    nameQuery.value = value
  } else if (payload.key === "status") {
    selectedStatus.value = value
  } else {
    return
  }

  void syncRouteQueryAndReload()
}

function handleQueryClear() {
  if (!nameQuery.value && !selectedStatus.value) {
    return
  }

  nameQuery.value = ""
  selectedStatus.value = ""
  void syncRouteQueryAndReload()
}

async function syncRouteQueryAndReload() {
  syncingRoute = true

  try {
    await router.replace({
      query: {
        ...route.query,
        q: nameQuery.value || undefined,
        status: selectedStatus.value || undefined,
      },
    })
  } finally {
    syncingRoute = false
  }

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadProjects()
}

function normalizeProjectRow(item: InspectionProjectRecord, index: number): CustomerProjectRow {
  const uuid = toText(item.Uuid)
  const progressList = Array.isArray(item.ProgressList) ? item.ProgressList : []
  const latestProgress = progressList[0]
  const durationValue = toNumber(item.Duration)
  const projectTime = formatDateOnly(toText(item.ProjectTime, "-"))

  return {
    id: uuid || `${pageNum.value}-${index + 1}`,
    uuid,
    name: toText(item.Name, "未命名项目"),
    customerUuid: toText(item.CustomerUuid),
    customerName: toText(item.CustomerName, "-"),
    corpName: toText(item.CorpName, "-"),
    address: toText(item.Address, "-"),
    duration: durationValue === null ? "-" : String(durationValue),
    durationValue,
    introduction: toText(item.Introduction, "-"),
    projectTime,
    status: toNumber(item.Status),
    statusLabel: formatProjectStatus(item.Status),
    isPublic: toNumber(item.IsPublic),
    publicLabel: formatPublicStatus(item.IsPublic),
    progressCount: progressList.length,
    latestStage: latestProgress ? toText(latestProgress.Stage, "-") : "-",
    latestProgressAt: latestProgress ? formatDateOnly(toText(latestProgress.CreatedAt, "-")) : "-",
    raw: item,
  }
}

function resolveProjectFromRow(row: CustomerProjectRow | Record<string, unknown>): InspectionProjectRecord {
  if ("raw" in row && row.raw && typeof row.raw === "object") {
    return row.raw as InspectionProjectRecord
  }

  return {
    Address: toText(row.address),
    CorpName: toText(row.corpName),
    CustomerName: toText(row.customerName),
    CustomerUuid: toText(row.customerUuid),
    Duration: toNumber(row.durationValue) ?? undefined,
    Introduction: toText(row.introduction),
    IsPublic: toNumber(row.isPublic) ?? undefined,
    Name: toText(row.name),
    ProjectTime: toText(row.projectTime),
    Status: toNumber(row.status) ?? undefined,
    Uuid: toText(row.uuid),
    ProgressList: [],
  }
}

function buildPageFilterText(row: CustomerProjectRow) {
  return [
    row.name,
    row.customerName,
    row.corpName,
    row.address,
    row.statusLabel,
    row.projectTime,
    row.introduction,
    row.latestStage,
  ].join(" ")
}

function compareProjectRows(left: CustomerProjectRow, right: CustomerProjectRow) {
  const leftValue = toTimestamp(left.projectTime) ?? 0
  const rightValue = toTimestamp(right.projectTime) ?? 0

  if (leftValue !== rightValue) {
    return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
  }

  return left.name.localeCompare(right.name, "zh-CN")
}

function formatProjectStatus(value: unknown) {
  const status = toNumber(value)

  if (status === 1) {
    return "进行中"
  }

  if (status === 2) {
    return "已完结"
  }

  return "未填写"
}

function formatPublicStatus(value: unknown) {
  const status = toNumber(value)

  if (status === 1) {
    return "公开"
  }

  if (status === 2) {
    return "不公开"
  }

  return "未填写"
}

function formatDuration(value: unknown) {
  const text = toText(value)
  return text ? `${text} 天` : "-"
}

function getStatusBadgeVariant(status: unknown) {
  return toNumber(status) === 1 ? "default" : "secondary"
}

function formatDateOnly(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toTimestamp(value: unknown) {
  const text = toText(value)

  if (!text || text === "-") {
    return null
  }

  const timestamp = new Date(text.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizeQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}

function getProgressKey(item: InspectionProjectProgressItem, index: number) {
  return toText(item.Uuid) || `${toText(item.Version, "progress")}-${index}`
}

function getProgressVersion(item: InspectionProjectProgressItem) {
  const version = toNumber(item.Version)
  return version === null ? "-" : `v${version}`
}

function getFileUrl(file: WorkOrderFileItem) {
  return toText(file.Url)
}

function isVideoFile(file: WorkOrderFileItem) {
  return toNumber(file.Type) === 2
}

function asProjectRow(row: Record<string, unknown>) {
  return row as CustomerProjectRow
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>客户项目接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadProjects">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage
      :page="page"
      :loading="loading"
      :query-bar="queryBar"
      :export-rows-resolver="resolveExportRows"
      :export-filtered-rows-count="total"
      :export-total-rows-count="total"
      toolbar-sort-behavior="toggle"
      :toolbar-sort-direction="sortDirection"
      fill-available-height
      @refresh-action="loadProjects"
      @primary-action="openCreate"
      @toolbar-sort-toggle="handleToolbarSortToggle"
      @query-change="handleQueryChange"
      @query-clear="handleQueryClear"
    >
      <template #cell-name="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full min-w-0 items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="openDetail(asProjectRow(row))"
        >
          <span class="truncate">{{ row.name }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
      </template>

      <template #cell-address="{ row }">
        <span class="block max-w-[360px] truncate text-sm text-muted-foreground" :title="toText(row.address)">
          {{ toText(row.address) }}
        </span>
      </template>

      <template #footer>
        <Pagination
          v-model:page="pageNum"
          :items-per-page="pageSize"
          :total="total"
          :sibling-count="1"
          :disabled="loading"
          show-edges
          class="w-full justify-end"
        >
          <PaginationContent v-slot="{ items }" class="justify-end">
            <PaginationFirst />
            <PaginationPrevious />

            <template
              v-for="(item, index) in items"
              :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
            >
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === pageNum"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else />
            </template>

            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
      </template>
    </TablePage>

    <ResponsiveRightSheet
      v-model:open="sheetOpen"
      title="客户项目详情"
      description="查看客户项目基础信息和项目进度记录。"
      :show-primary="false"
      sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-3xl"
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
              <span class="sr-only">关闭客户项目</span>
            </Button>
          </div>

          <div class="right-sheet-actions__secondary">
            <Button
              v-if="selectedProject?.Uuid"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              @click="editSelectedProject"
            >
              <i class="ri-edit-line text-sm" />
              <span>编辑</span>
            </Button>
          </div>
        </div>
      </template>

      <div v-if="detailLoading && !selectedProject" class="space-y-3 px-4 py-5 sm:px-5">
        <Skeleton class="h-9 w-2/3" />
        <Skeleton class="h-9 w-full" />
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-36 w-full" />
      </div>

      <div v-else-if="selectedProject" class="min-h-0 flex-1 overflow-y-auto">
        <div class="project-editor-list px-4 pb-6 pt-1 sm:px-5">
          <div class="project-editor-row">
            <span class="project-editor-label">项目名称</span>
            <p class="project-editor-value">{{ toText(selectedProject.Name, '-') }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">客户名称</span>
            <p class="project-editor-value">{{ toText(selectedProject.CustomerName, '-') }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">企业名称</span>
            <p class="project-editor-value">{{ toText(selectedProject.CorpName, '-') }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">项目地址</span>
            <p class="project-editor-value">{{ toText(selectedProject.Address, '-') }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">项目时间</span>
            <p class="project-editor-value">{{ formatDateOnly(toText(selectedProject.ProjectTime, '-')) }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">项目工期</span>
            <p class="project-editor-value">{{ formatDuration(selectedProject.Duration) }}</p>
          </div>

          <div class="project-editor-row project-editor-row--top">
            <span class="project-editor-label">项目介绍</span>
            <p class="project-editor-value whitespace-pre-wrap">{{ toText(selectedProject.Introduction, '-') }}</p>
          </div>

          <div class="project-editor-row">
            <span class="project-editor-label">展示状态</span>
            <div class="project-editor-control">
              <div class="flex flex-wrap items-center gap-2">
                <Badge :variant="getStatusBadgeVariant(selectedProject.Status)">
                  {{ formatProjectStatus(selectedProject.Status) }}
                </Badge>
                <Badge variant="secondary">
                  {{ formatPublicStatus(selectedProject.IsPublic) }}
                </Badge>
              </div>
            </div>
          </div>

          <div class="project-editor-row project-editor-row--top">
            <span class="project-editor-label">项目进度</span>
            <div class="project-editor-control">
              <div v-if="progressItems.length" class="space-y-3">
                <article
                  v-for="(item, index) in progressItems"
                  :key="getProgressKey(item, index)"
                  class="rounded-lg border border-border/70 bg-background p-3"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">
                        {{ toText(item.Stage, '未填写阶段') }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        {{ getProgressVersion(item) }} · {{ formatDateOnly(toText(item.CreatedAt, '-')) }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-3 text-sm">
                    <div v-if="toText(item.ProgressDesc)" class="rounded-md bg-muted/45 p-2.5 text-muted-foreground">
                      {{ toText(item.ProgressDesc) }}
                    </div>
                    <div v-if="toText(item.ProcessInfo)" class="rounded-md bg-muted/45 p-2.5 text-muted-foreground">
                      {{ toText(item.ProcessInfo) }}
                    </div>
                  </div>

                  <div v-if="item.Photos?.length" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <template
                      v-for="(file, fileIndex) in item.Photos"
                      :key="`${getProgressKey(item, index)}-${fileIndex}`"
                    >
                      <video
                        v-if="isVideoFile(file) && getFileUrl(file)"
                        :src="getFileUrl(file)"
                        controls
                        preload="metadata"
                        class="aspect-video w-full rounded-md bg-muted object-cover"
                      />
                      <img
                        v-else-if="getFileUrl(file)"
                        :src="getFileUrl(file)"
                        alt=""
                        class="aspect-video w-full rounded-md bg-muted object-cover"
                      >
                    </template>
                  </div>
                </article>
              </div>
              <div v-else class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                暂无项目进度
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveRightSheet>
  </section>
</template>

<style scoped>
.project-editor-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.project-editor-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 16px;
  border-bottom: 1px solid hsl(var(--border) / 0.7);
  padding: 14px 2px;
}

.project-editor-row:last-child {
  border-bottom: 0;
}

.project-editor-row--top {
  align-items: start;
}

.project-editor-label {
  padding-top: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.project-editor-control {
  min-width: 0;
}

.project-editor-value {
  min-width: 0;
  padding-top: 8px;
  color: hsl(var(--foreground));
  font-size: 14px;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .project-editor-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .project-editor-label {
    padding-top: 0;
  }
}
</style>
