<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import TablePage from "@/components/table-page/TablePage.vue"
import type { TableExportRowsResolverPayload } from "@/components/table-page/export-utils"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema, TableQueryBarConfig, TableStatusOption } from "@/components/table-page/types"
import FileUploadField from "@/components/upload/FileUploadField.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection, DetailStatusValue } from "@/components/detail/types"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import FormDatePicker from "@/components/form/FormDatePicker.vue"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers } from "@/lib/customers-api"
import {
  createInspectionProject,
  createInspectionProjectProgress,
  fetchInspectionProjectDetail,
  fetchInspectionProjects,
  finishInspectionProject,
  updateInspectionProject,
  updateInspectionProjectProgress,
  updateInspectionProjectPublicStatus,
  type InspectionProjectRecord,
  type InspectionProjectProgressItem,
  type WorkOrderFileItem,
} from "@/lib/inspection-projects-api"
import { fetchAllPaginatedListItems } from "@/lib/paginated-list-export"
import { PERMISSION_CODES } from "@/lib/permission-codes"
import { uploadTencentCosFile } from "@/lib/tencent-cos-upload"

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

type CustomerOption = {
  uuid: string
  name: string
}

type ProjectSheetMode = "create" | "view" | "edit"

type ProjectForm = {
  name: string
  customerUuid: string
  customerName: string
  address: string
  projectTime: string
  duration: string
  introduction: string
}

type ProgressEditorMode = "create" | "edit"

type ProgressForm = {
  uuid: string
  stage: string
  progressDesc: string
  processInfo: string
  photos: WorkOrderFileItem[]
}

const CUSTOMER_NONE_VALUE = "__none__"
const CUSTOMER_OPTIONS_PAGE_SIZE = 500

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
const projectSheetMode = ref<ProjectSheetMode>("view")
const detailLoading = ref(false)
const selectedProject = ref<InspectionProjectRecord | null>(null)
const customerOptions = ref<CustomerOption[]>([])
const customerOptionsLoading = ref(false)
const projectFormSubmitting = ref(false)
const finishConfirmOpen = ref(false)
const projectActionSubmitting = ref(false)
const projectCoverUploading = ref(false)
const progressEditorOpen = ref(false)
const progressEditorMode = ref<ProgressEditorMode>("create")
const progressSubmitting = ref(false)
const progressUploading = ref(false)
const projectForm = reactive<ProjectForm>(createEmptyProjectForm())
const progressForm = reactive<ProgressForm>(createEmptyProgressForm())
let latestRequestId = 0
let latestDetailRequestId = 0
let syncingRoute = false

const route = useRoute()
const router = useRouter()
const { canButton } = useCurrentUserPermissions()

const statusOptions = [
  { value: "1", label: "进行中" },
  { value: "2", label: "已完结" },
]

const projectStatusMap = {
  进行中: { tone: "green", icon: "clock" },
  已完结: { tone: "green", icon: "check" },
  未填写: { tone: "gray", icon: "dot" },
} satisfies Record<string, TableStatusOption>

const projectStatusRenderer = {
  kind: "status",
  map: projectStatusMap,
  fallback: { tone: "gray", icon: "dot" },
} satisfies DetailStatusValue["renderer"]

const publicStatusRenderer = {
  kind: "status",
  map: {
    公开: { tone: "green", icon: "check" },
    不公开: { tone: "gray", icon: "minus" },
    未填写: { tone: "gray", icon: "dot" },
  },
  fallback: { tone: "gray", icon: "dot" },
} satisfies DetailStatusValue["renderer"]

const progressItems = computed(() => selectedProject.value?.ProgressList ?? [])
const isProjectFinished = computed(() => toNumber(selectedProject.value?.Status) === 2)
const isProjectFormMode = computed(() => projectSheetMode.value === "create" || projectSheetMode.value === "edit")
const projectSheetTitle = computed(() => {
  if (projectSheetMode.value === "create") return "添加客户项目"
  if (projectSheetMode.value === "edit") return "编辑客户项目"
  return "客户项目详情"
})
const projectSheetDescription = computed(() => {
  if (projectSheetMode.value === "create") return "新增客户项目基础信息。"
  if (projectSheetMode.value === "edit") return "编辑客户项目名称和关联客户。"
  return "查看客户项目基础信息和项目进度记录。"
})
const projectFormCustomerSelectValue = computed(() => projectForm.customerUuid || CUSTOMER_NONE_VALUE)
const projectFormSubmitLabel = computed(() => {
  if (projectFormSubmitting.value) {
    return projectSheetMode.value === "edit" ? "保存中..." : "提交中..."
  }

  return projectSheetMode.value === "edit" ? "保存" : "添加"
})
const progressEditorTitle = computed(() => progressEditorMode.value === "edit" ? "编辑项目进度" : "新增项目进度")
const progressMediaLabel = computed(() => progressForm.photos.length ? `已添加 ${progressForm.photos.length} 个附件` : "")
const projectCoverUrl = computed(() => getProjectCoverUrl(selectedProject.value))
const projectCoverSelectedLabel = computed(() => projectCoverUrl.value || "暂未设置封面")
const projectCoverButtonLabel = computed(() => projectCoverUrl.value ? "更换并保存封面" : "上传并保存封面")
const canAddCustomerProject = computed(() => canButton(PERMISSION_CODES.customerProjectAdd))
const canEditCustomerProject = computed(() => canButton(PERMISSION_CODES.customerProjectEdit))
const canUpdateCustomerProjectPublicStatus = computed(() => canButton(PERMISSION_CODES.customerProjectPublicUpdate))
const canUploadCustomerProjectCover = computed(() => canButton(PERMISSION_CODES.customerProjectCoverUpload))
const canFinishCustomerProject = computed(() => canButton(PERMISSION_CODES.customerProjectFinish))
const canAddCustomerProjectProgress = computed(() => canButton(PERMISSION_CODES.customerProjectProgressAdd))
const canEditCustomerProjectProgress = computed(() => canButton(PERMISSION_CODES.customerProjectProgressEdit))
const canSubmitProjectForm = computed(() => projectSheetMode.value === "edit" ? canEditCustomerProject.value : canAddCustomerProject.value)
const canSaveCustomerProjectProgress = computed(() => progressEditorMode.value === "edit" ? canEditCustomerProjectProgress.value : canAddCustomerProjectProgress.value)
const projectDetailSections = computed<DetailFieldSection[]>(() => {
  const project = selectedProject.value

  if (!project) {
    return []
  }

  const publicStatus = formatPublicStatus(project.IsPublic)

  return [
    {
      key: "basic",
      title: "基础信息",
      rows: [
        { key: "name", label: "项目名称", value: toText(project.Name) },
        { key: "customerName", label: "客户名称", value: toText(project.CustomerName) },
        { key: "corpName", label: "企业名称", value: toText(project.CorpName) },
        { key: "address", label: "项目地址", value: toText(project.Address), truncate: false },
        { key: "projectTime", label: "项目时间", value: formatDateOnly(toText(project.ProjectTime, "-")) },
        { key: "duration", label: "项目工期", value: formatDuration(project.Duration) },
        { key: "introduction", label: "项目介绍", value: toText(project.Introduction), truncate: false },
      ],
    },
    {
      key: "status",
      title: "状态信息",
      rows: [
        {
          key: "status",
          label: "项目状态",
          value: {
            kind: "status",
            value: formatProjectStatus(project.Status),
            renderer: projectStatusRenderer,
          },
        },
        {
          key: "publicStatus",
          label: "公开状态",
          value: {
            kind: "status",
            value: publicStatus,
            renderer: publicStatusRenderer,
          },
          suffixAction: canUpdateCustomerProjectPublicStatus.value ? {
            label: toNumber(project.IsPublic) === 1 ? "取消公开" : "公开",
            icon: toNumber(project.IsPublic) === 1 ? "ri-eye-off-line" : "ri-eye-line",
            onClick: () => handleProjectPublicChange(toNumber(selectedProject.value?.IsPublic) !== 1),
          } : undefined,
        },
      ],
    },
  ]
})

const schema: TablePageSchema<CustomerProjectRow> = {
  title: "客户项目",
  description: "管理客户项目基础信息，查看项目状态和进度记录",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  primaryActionLabel: "添加客户项目",
  primaryActionPermissionCode: PERMISSION_CODES.customerProjectAdd,
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

  projectSheetMode.value = "view"
  selectedProject.value = null
  detailLoading.value = false
  finishConfirmOpen.value = false
  progressEditorOpen.value = false
  latestDetailRequestId += 1
  Object.assign(projectForm, createEmptyProjectForm())
  Object.assign(progressForm, createEmptyProgressForm())
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
  if (!canAddCustomerProject.value) {
    toast.error("无权添加客户项目")
    return
  }

  selectedProject.value = null
  projectSheetMode.value = "create"
  detailLoading.value = false
  Object.assign(projectForm, createEmptyProjectForm())
  sheetOpen.value = true
  void loadCustomerOptions()
}

function openDetail(row: CustomerProjectRow | Record<string, unknown>) {
  openProjectSheet(row)
}

function openProjectSheet(row: CustomerProjectRow | Record<string, unknown>, mode: ProjectSheetMode = "view") {
  if (mode === "edit" && !canEditCustomerProject.value) {
    toast.error("无权编辑客户项目")
    return
  }

  const project = resolveProjectFromRow(row)

  if (!project.Uuid) {
    toast.error(mode === "edit" ? "客户项目信息不完整，无法编辑" : "客户项目信息不完整，无法打开详情")
    return
  }

  projectSheetMode.value = mode
  selectedProject.value = project
  if (mode === "edit") {
    applyProjectToForm(project)
    void loadCustomerOptions()
  }
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

    const previousCoverUrl = getProjectCoverUrl(selectedProject.value)
    selectedProject.value = previousCoverUrl && !getProjectCoverUrl(detail)
      ? withProjectCoverUrl(detail, previousCoverUrl)
      : detail
    if (projectSheetMode.value === "edit") {
      applyProjectToForm(detail)
      ensureCustomerOption(detail)
    }
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
  if (!canEditCustomerProject.value) {
    toast.error("无权编辑客户项目")
    return
  }

  if (!selectedProject.value?.Uuid) {
    toast.error("客户项目信息不完整，无法编辑")
    return
  }

  projectSheetMode.value = "edit"
  applyProjectToForm(selectedProject.value)
  ensureCustomerOption(selectedProject.value)
  void loadCustomerOptions()
}

async function reloadSelectedProject() {
  const uuid = toText(selectedProject.value?.Uuid)

  if (!uuid) {
    return
  }

  await loadProjectDetail(uuid)
  await loadProjects()
}

async function loadCustomerOptions() {
  if (customerOptionsLoading.value) {
    return
  }

  customerOptionsLoading.value = true

  try {
    const result = await fetchCustomers({
      PageNum: 1,
      PageSize: CUSTOMER_OPTIONS_PAGE_SIZE,
    })

    customerOptions.value = result.list
      .map(item => ({
        uuid: toText(item.Uuid),
        name: toText(item.CorpName, "未命名客户"),
      }))
      .filter(item => item.uuid)

    if (selectedProject.value) {
      ensureCustomerOption(selectedProject.value)
    }
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "客户列表加载失败，请稍后重试。",
    }))
  } finally {
    customerOptionsLoading.value = false
  }
}

async function saveProjectForm() {
  if (projectFormSubmitting.value || customerOptionsLoading.value) {
    return
  }

  if (!canSubmitProjectForm.value) {
    toast.error(projectSheetMode.value === "edit" ? "无权编辑客户项目" : "无权添加客户项目")
    return
  }

  const name = projectForm.name.trim()
  if (!name) {
    toast.error("请填写项目名称")
    return
  }

  const duration = parseOptionalPositiveInteger(projectForm.duration)
  if (duration === false) {
    toast.error("项目工期必须是正整数")
    return
  }

  projectFormSubmitting.value = true

  try {
    const customerName = getCustomerOptionName(projectForm.customerUuid, projectForm.customerName)

    if (projectSheetMode.value === "edit") {
      const uuid = toText(selectedProject.value?.Uuid)
      if (!uuid) {
        toast.error("客户项目信息不完整，无法保存")
        return
      }

      await updateInspectionProject({
        Uuid: uuid,
        Name: name,
        CustomerUuid: projectForm.customerUuid,
        CustomerName: customerName,
      })
      toast.success("客户项目已保存")
      projectSheetMode.value = "view"
      await reloadSelectedProject()
    } else {
      await createInspectionProject({
        Name: name,
        CustomerUuid: projectForm.customerUuid,
        CustomerName: customerName,
        Address: projectForm.address.trim(),
        ProjectTime: projectForm.projectTime.trim(),
        Duration: duration,
        Introduction: projectForm.introduction.trim(),
      })
      toast.success("客户项目已添加")
      sheetOpen.value = false
      await loadProjects()
    }
  } catch (error) {
    handleApiError(error, {
      title: projectSheetMode.value === "edit" ? "客户项目保存失败" : "客户项目添加失败",
      fallback: projectSheetMode.value === "edit" ? "客户项目保存失败，请稍后重试。" : "客户项目添加失败，请稍后重试。",
    })
  } finally {
    projectFormSubmitting.value = false
  }
}

function cancelProjectForm() {
  if (projectSheetMode.value === "edit" && selectedProject.value) {
    projectSheetMode.value = "view"
    applyProjectToForm(selectedProject.value)
    return
  }

  sheetOpen.value = false
}

function handleProjectCustomerChange(value: unknown) {
  const nextValue = toText(value)

  if (!nextValue || nextValue === CUSTOMER_NONE_VALUE) {
    projectForm.customerUuid = ""
    projectForm.customerName = ""
    return
  }

  projectForm.customerUuid = nextValue
  projectForm.customerName = getCustomerOptionName(nextValue)
}

async function handleProjectPublicChange(value: boolean | "indeterminate") {
  if (value === "indeterminate") {
    return
  }

  if (!canUpdateCustomerProjectPublicStatus.value) {
    toast.error("无权更新客户项目公开状态")
    return
  }

  const uuid = toText(selectedProject.value?.Uuid)

  if (!uuid || projectActionSubmitting.value) {
    return
  }

  projectActionSubmitting.value = true

  try {
    await updateInspectionProjectPublicStatus({
      Uuid: uuid,
      IsPublic: value ? 1 : 2,
      Url: projectCoverUrl.value,
    })
    toast.success(value ? "客户项目已公开" : "客户项目已取消公开")
    await reloadSelectedProject()
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "客户项目公开状态更新失败，请稍后重试。",
    }))
  } finally {
    projectActionSubmitting.value = false
  }
}

async function handleProjectCoverFilesSelected(files: File[]) {
  if (!files.length || projectCoverUploading.value) {
    return
  }

  if (!canUploadCustomerProjectCover.value) {
    toast.error("无权上传项目封面")
    return
  }

  const uuid = toText(selectedProject.value?.Uuid)
  const publicStatus = toNumber(selectedProject.value?.IsPublic) === 1 ? 1 : 2

  if (!uuid) {
    toast.error("客户项目信息不完整，无法上传封面")
    return
  }

  const file = files[0]

  if (!file?.type.startsWith("image/")) {
    toast.error("请选择图片文件")
    return
  }

  projectCoverUploading.value = true

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `inspection-projects/covers/${uuid}-${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || undefined,
    })
    const coverUrl = result.url

    await updateInspectionProjectPublicStatus({
      Uuid: uuid,
      IsPublic: publicStatus,
      Url: coverUrl,
    })

    mergeProjectCoverUrl(uuid, coverUrl)
    toast.success("项目封面已保存")
    await loadProjects()
    mergeProjectCoverUrl(uuid, coverUrl)
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "项目封面上传失败，请稍后重试。",
    }))
  } finally {
    projectCoverUploading.value = false
  }
}

async function confirmFinishProject() {
  if (!canFinishCustomerProject.value) {
    toast.error("无权完结客户项目")
    return
  }

  const uuid = toText(selectedProject.value?.Uuid)

  if (!uuid || projectActionSubmitting.value) {
    return
  }

  projectActionSubmitting.value = true

  try {
    await finishInspectionProject({ Uuid: uuid })
    toast.success("客户项目已完结")
    finishConfirmOpen.value = false
    await reloadSelectedProject()
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "客户项目完结失败，请稍后重试。",
    }))
  } finally {
    projectActionSubmitting.value = false
  }
}

function openProgressCreate() {
  if (!canAddCustomerProjectProgress.value) {
    toast.error("无权新增项目进度")
    return
  }

  if (!selectedProject.value?.Uuid) {
    toast.error("客户项目信息不完整，无法新增进度")
    return
  }

  progressEditorMode.value = "create"
  Object.assign(progressForm, createEmptyProgressForm())
  progressEditorOpen.value = true
}

function openProgressEdit(item: InspectionProjectProgressItem) {
  if (!canEditCustomerProjectProgress.value) {
    toast.error("无权编辑项目进度")
    return
  }

  progressEditorMode.value = "edit"
  Object.assign(progressForm, {
    uuid: toText(item.Uuid),
    stage: toText(item.Stage),
    progressDesc: toText(item.ProgressDesc),
    processInfo: toText(item.ProcessInfo),
    photos: Array.isArray(item.Photos)
      ? item.Photos.map(file => ({ ...file }))
      : [],
  } satisfies ProgressForm)
  progressEditorOpen.value = true
}

function cancelProgressEdit() {
  progressEditorOpen.value = false
  Object.assign(progressForm, createEmptyProgressForm())
}

function handleProgressDialogOpenChange(open: boolean) {
  if (open) {
    progressEditorOpen.value = true
    return
  }

  if (progressSubmitting.value || progressUploading.value) {
    return
  }

  cancelProgressEdit()
}

async function saveProgress() {
  const projectUuid = toText(selectedProject.value?.Uuid)

  if (!projectUuid || progressSubmitting.value || progressUploading.value) {
    return
  }

  if (!canSaveCustomerProjectProgress.value) {
    toast.error(progressEditorMode.value === "edit" ? "无权编辑项目进度" : "无权新增项目进度")
    return
  }

  if (!hasProgressFormContent()) {
    toast.error("请填写项目进度内容")
    return
  }

  progressSubmitting.value = true

  try {
    const payload = {
      Photos: progressForm.photos,
      ProcessInfo: progressForm.processInfo.trim(),
      ProgressDesc: progressForm.progressDesc.trim(),
      Stage: progressForm.stage.trim(),
    }

    if (progressEditorMode.value === "edit") {
      await updateInspectionProjectProgress({
        ...payload,
        Uuid: progressForm.uuid,
      })
      toast.success("项目进度已保存")
    } else {
      await createInspectionProjectProgress({
        ...payload,
        ProjectUuid: projectUuid,
      })
      toast.success("项目进度已新增")
    }

    cancelProgressEdit()
    await reloadSelectedProject()
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "项目进度保存失败，请稍后重试。",
    }))
  } finally {
    progressSubmitting.value = false
  }
}

function hasProgressFormContent() {
  return Boolean(
    progressForm.stage.trim()
    || progressForm.progressDesc.trim()
    || progressForm.processInfo.trim()
    || progressForm.photos.length,
  )
}

async function handleProgressFilesSelected(files: File[]) {
  if (!files.length || progressUploading.value) {
    return
  }

  if (!canSaveCustomerProjectProgress.value) {
    toast.error(progressEditorMode.value === "edit" ? "无权编辑项目进度" : "无权新增项目进度")
    return
  }

  const invalidFile = files.find(file => !file.type.startsWith("image/") && !file.type.startsWith("video/"))

  if (invalidFile) {
    toast.error("请选择图片或视频文件")
    return
  }

  progressUploading.value = true

  try {
    const uploadedFiles: WorkOrderFileItem[] = []

    for (const file of files) {
      const result = await uploadTencentCosFile({
        file,
        key: `inspection-projects/progress/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
        contentType: file.type || undefined,
      })

      uploadedFiles.push({
        Type: file.type.startsWith("video/") ? 2 : 1,
        Url: result.url,
      })
    }

    progressForm.photos = [...progressForm.photos, ...uploadedFiles]
    toast.success("项目进度附件已上传")
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "项目进度附件上传失败，请稍后重试。",
    }))
  } finally {
    progressUploading.value = false
  }
}

function removeProgressPhoto(index: number) {
  progressForm.photos = progressForm.photos.filter((_, itemIndex) => itemIndex !== index)
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

function createEmptyProjectForm(): ProjectForm {
  return {
    name: "",
    customerUuid: "",
    customerName: "",
    address: "",
    projectTime: "",
    duration: "",
    introduction: "",
  }
}

function createEmptyProgressForm(): ProgressForm {
  return {
    uuid: "",
    stage: "",
    progressDesc: "",
    processInfo: "",
    photos: [],
  }
}

function applyProjectToForm(project: InspectionProjectRecord) {
  projectForm.name = toText(project.Name)
  projectForm.customerUuid = toText(project.CustomerUuid)
  projectForm.customerName = toText(project.CustomerName)
  projectForm.address = toText(project.Address)
  projectForm.projectTime = toDatePickerInput(toText(project.ProjectTime))
  projectForm.duration = toText(project.Duration)
  projectForm.introduction = toText(project.Introduction)
}

function ensureCustomerOption(project: InspectionProjectRecord) {
  const uuid = toText(project.CustomerUuid)

  if (!uuid || customerOptions.value.some(item => item.uuid === uuid)) {
    return
  }

  customerOptions.value = [
    ...customerOptions.value,
    {
      uuid,
      name: toText(project.CustomerName, toText(project.CorpName, "未命名客户")),
    },
  ]
}

function getCustomerOptionName(customerUuid: string, fallback = "") {
  return customerOptions.value.find(item => item.uuid === customerUuid)?.name ?? fallback
}

function parseOptionalPositiveInteger(value: unknown) {
  const normalized = toText(value)

  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : false
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

function formatDateOnly(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function toDatePickerInput(value: string) {
  const normalized = toText(value)

  if (!normalized) {
    return ""
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/)
  return match?.[1] ?? ""
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

function getProjectCoverUrl(project: InspectionProjectRecord | null | undefined) {
  if (!project) {
    return ""
  }

  const record = project as Record<string, unknown>
  return toText(record.Url)
    || toText(record.CoverUrl)
    || toText(record.coverUrl)
    || toText(record.cover)
}

function withProjectCoverUrl(project: InspectionProjectRecord, coverUrl: string): InspectionProjectRecord {
  return {
    ...project,
    CoverUrl: coverUrl,
    Url: coverUrl,
  }
}

function mergeProjectCoverUrl(uuid: string, coverUrl: string) {
  if (!uuid) {
    return
  }

  if (selectedProject.value && toText(selectedProject.value.Uuid) === uuid) {
    selectedProject.value = withProjectCoverUrl(selectedProject.value, coverUrl)
  }

  projects.value = projects.value.map(row => row.uuid === uuid
    ? {
        ...row,
        raw: withProjectCoverUrl(row.raw, coverUrl),
      }
    : row)
}

function getFileUrl(file: WorkOrderFileItem) {
  return toText(file.Url)
}

function isVideoFile(file: WorkOrderFileItem) {
  return toNumber(file.Type) === 2
}

function sanitizeObjectKeyFileName(value: string) {
  const normalized = value.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

  return normalized || "project-progress-file"
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
      :title="projectSheetTitle"
      :description="projectSheetDescription"
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
              v-if="isProjectFormMode"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              :disabled="projectFormSubmitting"
              @click="cancelProjectForm"
            >
              <span>取消</span>
            </Button>
            <Button
              v-if="isProjectFormMode && canSubmitProjectForm"
              type="button"
              size="sm"
              class="h-8 rounded-md px-2.5"
              :disabled="projectFormSubmitting || customerOptionsLoading"
              @click="saveProjectForm"
            >
              <i :class="[projectFormSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
              <span>{{ projectFormSubmitLabel }}</span>
            </Button>
            <Button
              v-if="!isProjectFormMode && selectedProject?.Uuid && canAddCustomerProjectProgress"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              :disabled="progressSubmitting || progressUploading"
              @click="openProgressCreate"
            >
              <i class="ri-add-line text-sm" />
              <span>新增进度</span>
            </Button>
            <Button
              v-if="!isProjectFormMode && selectedProject?.Uuid && !isProjectFinished && canFinishCustomerProject"
              type="button"
              variant="ghost"
              size="sm"
              class="right-sheet-text-button"
              :disabled="projectActionSubmitting"
              @click="finishConfirmOpen = true"
            >
              <i class="ri-checkbox-circle-line text-sm" />
              <span>完结</span>
            </Button>
            <Button
              v-if="!isProjectFormMode && selectedProject?.Uuid && canEditCustomerProject"
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

      <div v-if="isProjectFormMode" class="min-h-0 flex-1 overflow-y-auto">
        <form class="project-editor-list px-4 pb-6 pt-1 sm:px-5" @submit.prevent="saveProjectForm">
          <label class="project-editor-row">
            <span class="project-editor-label">项目名称</span>
            <span class="project-editor-control">
              <Input
                v-model="projectForm.name"
                :disabled="projectFormSubmitting"
                required
                placeholder="请输入项目名称"
              />
            </span>
          </label>

          <div class="project-editor-row">
            <span class="project-editor-label">关联客户</span>
            <div class="project-editor-control">
              <Select
                :model-value="projectFormCustomerSelectValue"
                :disabled="customerOptionsLoading || projectFormSubmitting"
                @update:model-value="handleProjectCustomerChange"
              >
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="customerOptionsLoading ? '正在加载客户...' : '请选择关联客户'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="CUSTOMER_NONE_VALUE">不关联客户</SelectItem>
                  <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                    {{ customer.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <template v-if="projectSheetMode === 'create'">
            <label class="project-editor-row">
              <span class="project-editor-label">项目地址</span>
              <span class="project-editor-control">
                <Input
                  v-model="projectForm.address"
                  :disabled="projectFormSubmitting"
                  placeholder="请输入项目地址"
                />
              </span>
            </label>

            <div class="project-editor-row">
              <span class="project-editor-label">项目时间</span>
              <div class="project-editor-control">
                <FormDatePicker
                  v-model="projectForm.projectTime"
                  :disabled="projectFormSubmitting"
                  placeholder="请选择项目时间"
                />
              </div>
            </div>

            <label class="project-editor-row">
              <span class="project-editor-label">项目工期</span>
              <span class="project-editor-control">
                <Input
                  v-model="projectForm.duration"
                  :disabled="projectFormSubmitting"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="请输入工期天数"
                />
              </span>
            </label>

            <label class="project-editor-row project-editor-row--top">
              <span class="project-editor-label">项目介绍</span>
              <span class="project-editor-control">
                <Textarea
                  v-model="projectForm.introduction"
                  :disabled="projectFormSubmitting"
                  class="min-h-28 resize-y"
                  placeholder="请输入项目介绍"
                />
              </span>
            </label>
          </template>

          <div v-else class="project-editor-row project-editor-row--top">
            <span class="project-editor-label">只读信息</span>
            <div class="project-editor-control">
              <p class="mb-3 text-xs text-muted-foreground">
                项目更新接口目前只支持修改项目名称和关联客户。
              </p>
              <dl class="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm sm:grid-cols-2">
                <div class="min-w-0">
                  <dt class="text-muted-foreground">项目地址</dt>
                  <dd class="mt-1 truncate font-medium text-foreground">{{ projectForm.address || '-' }}</dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-muted-foreground">项目时间</dt>
                  <dd class="mt-1 font-medium text-foreground">{{ projectForm.projectTime || '-' }}</dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-muted-foreground">项目工期</dt>
                  <dd class="mt-1 font-medium text-foreground">{{ projectForm.duration ? `${projectForm.duration} 天` : '-' }}</dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-muted-foreground">状态</dt>
                  <dd class="mt-1 font-medium text-foreground">
                    {{ formatProjectStatus(selectedProject?.Status) }} / {{ formatPublicStatus(selectedProject?.IsPublic) }}
                  </dd>
                </div>
                <div class="min-w-0 sm:col-span-2">
                  <dt class="text-muted-foreground">项目介绍</dt>
                  <dd class="mt-1 whitespace-pre-wrap font-medium text-foreground">{{ projectForm.introduction || '-' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </form>
      </div>

      <div v-else-if="detailLoading && !selectedProject" class="min-h-0 flex-1 overflow-y-auto pb-6">
        <DetailFieldsSkeleton :sections="2" :rows-per-section="4" />
      </div>

      <div v-else-if="selectedProject" class="min-h-0 flex-1 overflow-y-auto pb-6">
        <DetailFieldSections :sections="projectDetailSections" use-title-block />

        <section v-if="canUploadCustomerProjectCover || projectCoverUrl" class="border-t border-border/80 pt-4">
          <div class="detail-section-inset mb-3">
            <h2 class="detail-field-section__heading">项目封面</h2>
          </div>
          <div class="detail-section-inset pb-4">
            <FileUploadField
              v-if="canUploadCustomerProjectCover"
              accept="image/*"
              title="上传项目封面"
              description="用于 App 首页客户项目卡片展示，选择图片后会立即上传并保存。"
              :button-label="projectCoverButtonLabel"
              loading-label="保存中..."
              icon="ri-image-add-line"
              :loading="projectCoverUploading"
              :disabled="projectActionSubmitting"
              :selected-label="projectCoverSelectedLabel"
              :show-supplement="Boolean(projectCoverUrl)"
              @files-selected="files => { void handleProjectCoverFilesSelected(files) }"
            >
              <template v-if="projectCoverUrl" #preview="{ open }">
                <button
                  type="button"
                  class="block aspect-[16/9] w-full max-w-sm overflow-hidden rounded-md bg-muted text-left outline outline-1 -outline-offset-1 outline-black/5 transition-transform duration-180 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  aria-label="更换项目封面"
                  @click="open"
                >
                  <img
                    :src="projectCoverUrl"
                    :alt="`${toText(selectedProject.Name, '客户项目')}封面`"
                    class="h-full w-full object-cover"
                  >
                </button>
              </template>
            </FileUploadField>
            <img
              v-else-if="projectCoverUrl"
              :src="projectCoverUrl"
              :alt="`${toText(selectedProject.Name, '客户项目')}封面`"
              class="aspect-[16/9] w-full max-w-sm rounded-md bg-muted object-cover"
            >
          </div>
        </section>

        <section class="border-t border-border/80 pt-4">
          <div class="detail-section-inset mb-3 flex items-center justify-between gap-3">
            <h2 class="detail-field-section__heading">项目进度</h2>
            <Button
              v-if="canAddCustomerProjectProgress"
              type="button"
              variant="outline"
              size="sm"
              class="h-8 rounded-md"
              :disabled="progressSubmitting || progressUploading"
              @click="openProgressCreate"
            >
              <i class="ri-add-line text-sm" />
              <span>新增进度</span>
            </Button>
          </div>

          <div class="detail-section-inset">
            <div v-if="progressItems.length" class="space-y-3">
              <article
                v-for="(item, index) in progressItems"
                :key="getProgressKey(item, index)"
                class="rounded-lg border border-border/70 bg-background p-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-base font-semibold leading-6 text-foreground">
                      {{ toText(item.Stage, '未填写阶段') }}
                    </p>
                  </div>
                  <Button
                    v-if="canEditCustomerProjectProgress"
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-8 rounded-md px-2 text-muted-foreground"
                    :disabled="progressSubmitting || progressUploading"
                    @click="openProgressEdit(item)"
                  >
                    <i class="ri-edit-line text-sm" />
                    <span>编辑</span>
                  </Button>
                </div>

                <div class="mt-3 grid gap-3 text-sm">
                  <div v-if="toText(item.ProgressDesc)" class="rounded-md bg-muted/45 p-2.5">
                    <p class="text-xs font-medium text-foreground">进度描述</p>
                    <p class="mt-1 text-muted-foreground">{{ toText(item.ProgressDesc) }}</p>
                  </div>
                  <div v-if="toText(item.ProcessInfo)" class="rounded-md bg-muted/45 p-2.5">
                    <p class="text-xs font-medium text-foreground">工艺信息</p>
                    <p class="mt-1 text-muted-foreground">{{ toText(item.ProcessInfo) }}</p>
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
        </section>
      </div>
    </ResponsiveRightSheet>

    <Dialog :open="progressEditorOpen" @update:open="handleProgressDialogOpenChange">
      <DialogContent
        class="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
        :show-close-button="!progressSubmitting && !progressUploading"
      >
        <DialogHeader class="pr-8">
          <DialogTitle>{{ progressEditorTitle }}</DialogTitle>
          <DialogDescription>
            项目阶段、工地照片、进度描述、工艺信息
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-foreground">项目阶段</span>
            <Input
              v-model="progressForm.stage"
              placeholder="请输入项目阶段"
              :disabled="progressSubmitting"
            />
          </label>

          <FileUploadField
            v-if="canSaveCustomerProjectProgress"
            accept="image/*,video/*"
            multiple
            compact
            title="工地照片"
            description="支持图片或视频文件。"
            :selected-label="progressMediaLabel"
            :button-label="progressForm.photos.length ? '继续上传' : '选择文件'"
            loading-label="上传中..."
            :loading="progressUploading"
            :disabled="progressSubmitting || progressUploading"
            :show-supplement="Boolean(progressForm.photos.length)"
            @files-selected="handleProgressFilesSelected"
          >
            <template v-if="progressForm.photos.length" #preview>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div
                  v-for="(file, fileIndex) in progressForm.photos"
                  :key="`${getFileUrl(file)}-${fileIndex}`"
                  class="group relative overflow-hidden rounded-md bg-muted"
                >
                  <video
                    v-if="isVideoFile(file) && getFileUrl(file)"
                    :src="getFileUrl(file)"
                    controls
                    preload="metadata"
                    class="aspect-video w-full object-cover"
                  />
                  <img
                    v-else-if="getFileUrl(file)"
                    :src="getFileUrl(file)"
                    alt=""
                    class="aspect-video w-full object-cover"
                  >
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    class="absolute right-1.5 top-1.5 size-7 rounded-md opacity-95"
                    :disabled="progressSubmitting || progressUploading"
                    @click.stop="removeProgressPhoto(fileIndex)"
                  >
                    <i class="ri-close-line text-sm" />
                    <span class="sr-only">移除附件</span>
                  </Button>
                </div>
              </div>
            </template>
          </FileUploadField>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-foreground">进度描述</span>
            <Textarea
              v-model="progressForm.progressDesc"
              class="min-h-20 resize-y"
              placeholder="请输入进度描述"
              :disabled="progressSubmitting"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-foreground">工艺信息</span>
            <Textarea
              v-model="progressForm.processInfo"
              class="min-h-20 resize-y"
              placeholder="请输入工艺信息"
              :disabled="progressSubmitting"
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="progressSubmitting || progressUploading"
            @click="cancelProgressEdit"
          >
            取消
          </Button>
          <Button
            v-if="canSaveCustomerProjectProgress"
            type="button"
            size="sm"
            :disabled="progressSubmitting || progressUploading"
            @click="saveProgress"
          >
            <i :class="[progressSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-save-line', 'text-sm']" />
            <span>{{ progressSubmitting ? '保存中...' : '保存进度' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="finishConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>完结这个客户项目？</AlertDialogTitle>
          <AlertDialogDescription>
            完结后，该项目状态会变为已完结。
            <span v-if="selectedProject" class="mt-2 block font-medium text-foreground">
              {{ toText(selectedProject.Name, '未命名项目') }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="projectActionSubmitting">取消</AlertDialogCancel>
          <AlertDialogAction :disabled="projectActionSubmitting" @click.prevent="confirmFinishProject">
            <i :class="[projectActionSubmitting ? 'ri-loader-4-line animate-spin' : 'ri-checkbox-circle-line', 'text-sm']" />
            <span>{{ projectActionSubmitting ? '处理中...' : '确认完结' }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
