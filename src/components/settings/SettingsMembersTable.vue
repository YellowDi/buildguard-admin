<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { toast } from "vue-sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { createHttpError, handleApiError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"

type MemberViewKey = "members" | "departments" | "permission-groups"

type PermissionOption = {
  label: string
  uuid?: string
}

type MemberRow = {
  id: number
  uuid: string
  name: string
  phone: string
  departmentUuid: string
  departmentName: string
  position: string
  permissionGroup: string
  permissionOptions: PermissionOption[]
  status: string
}

type DepartmentRow = {
  id: string
  departmentName: string
  memberCount: number
  activeCount: number
  positionCount: number
  permissionGroupCount: number
  membersPreview: string
}

type PermissionGroupRow = {
  id: string
  permissionGroup: string
  memberCount: number
  departmentCount: number
  positionCount: number
  membersPreview: string
}

type ManualMemberForm = {
  name: string
  phone: string
  departmentName: string
  position: string
  permissionGroup: string
}

type EditMemberForm = {
  name: string
  phone: string
  departmentName: string
  position: string
  permissionGroup: string
  status: string
}

type ApiEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

type MemberActionKey =
  | "manual"
  | "import-excel"
  | "sync-directory"
  | "create-department"
  | "create-permission-group"
  | "view"
  | "invite"
  | "disable"

const MEMBERS_API_URL = buildApiUrl(API_PATHS.membersList)
const MEMBER_STATUS_UPDATE_API_URL = buildApiUrl(API_PATHS.memberStatusUpdate)
const MEMBER_UPDATE_API_URL = buildApiUrl(API_PATHS.memberUpdate)
const MEMBERS_LOAD_ERROR_MESSAGE = "成员列表加载失败，请稍后重试。"
const MEMBER_STATUS_UPDATE_ERROR_MESSAGE = "成员状态更新失败，请稍后重试。"
const MEMBER_UPDATE_ERROR_MESSAGE = "成员信息更新失败，请稍后重试。"
const toolbarIconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:!border-l-0 [&_thead_th:last-child]:w-0 [&_thead_th:last-child]:min-w-0 [&_thead_th:last-child]:p-0 [&_tbody_td:last-child]:w-0 [&_tbody_td:last-child]:min-w-0 [&_tbody_td:last-child]:p-0 [&_tbody_tr:hover]:bg-transparent [&_tbody_tr:hover_td]:bg-transparent"
const memberStatusMap = {
  正常: { tone: "green", icon: "check" },
  离职: { tone: "gray", icon: "minus" },
  未知状态: { tone: "gray", icon: "alert" },
} as const

const rows = ref<MemberRow[]>([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref("")
const permissionUpdatingMemberIds = ref<number[]>([])
const statusUpdatingMemberIds = ref<number[]>([])
const activeView = ref<MemberViewKey>("members")
const manualDialogOpen = ref(false)
const editDialogOpen = ref(false)
const editingMemberId = ref<number | null>(null)
const editSubmitting = ref(false)
const editPermissionGroupOptions = ref<PermissionOption[]>([])
const searchExpanded = ref(false)
const searchQuery = ref("")
const availablePermissionGroups = computed(() => Array.from(
  new Set(rows.value.flatMap(row => row.permissionOptions.map(option => option.label)).filter(Boolean)),
))
const manualMemberForm = ref(createManualMemberForm())
const editMemberForm = ref(createEditMemberForm())

const memberColumns: TableColumn[] = [
  {
    key: "name",
    label: "成员",
    filterType: "contact",
    variant: "contact",
    width: "fill",
    cellRenderer: {
      kind: "dual-inline",
      primaryKey: "name",
      secondaryKey: "phone",
      primaryClass: "font-medium text-foreground",
      secondaryClass: "text-muted-foreground",
    },
  },
  {
    key: "departmentName",
    label: "部门",
    filterType: "tag",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
    width: "fill",
  },
  {
    key: "position",
    label: "职位",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "permissionGroup",
    label: "权限组",
    filterType: "tag",
    slot: "cell-permission",
  },
  {
    key: "status",
    label: "状态",
    filterType: "tag",
    cellRenderer: {
      kind: "status",
      map: memberStatusMap,
    },
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    headerClass: "w-[6.5rem]",
    cellClass: "w-[6.5rem] text-right",
  },
]

const departmentColumns: TableColumn[] = [
  {
    key: "departmentName",
    label: "部门",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "memberCount",
    label: "成员数量",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "人",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "activeCount",
    label: "在岗成员",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "人",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "positionCount",
    label: "职位数",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "个",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "permissionGroupCount",
    label: "权限组数",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "组",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "membersPreview",
    label: "成员",
    filterType: "none",
    variant: "note",
    format: "note",
    width: "fill",
    cellRenderer: { kind: "note" },
  },
]

const permissionGroupColumns: TableColumn[] = [
  {
    key: "permissionGroup",
    label: "权限组",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "memberCount",
    label: "成员数量",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "人",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "departmentCount",
    label: "覆盖部门",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "个",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "positionCount",
    label: "职位数",
    filterType: "number",
    variant: "metric",
    cellRenderer: {
      kind: "metric-unit",
      unit: "个",
      valueClass: "tabular-nums text-link",
      unitClass: "ml-1 text-[12px] text-muted-foreground",
    },
  },
  {
    key: "membersPreview",
    label: "成员",
    filterType: "none",
    variant: "note",
    format: "note",
    width: "fill",
    cellRenderer: { kind: "note" },
  },
]

const departmentRows = computed<DepartmentRow[]>(() => {
  const grouped = new Map<string, MemberRow[]>()

  for (const row of rows.value) {
    const key = row.departmentName || "未分组"
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .map(([departmentName, members]) => ({
      id: departmentName,
      departmentName,
      memberCount: members.length,
      activeCount: members.filter(member => member.status === "正常").length,
      positionCount: new Set(members.map(member => member.position)).size,
      permissionGroupCount: new Set(members.map(member => member.permissionGroup)).size,
      membersPreview: members.map(member => member.name).join("、"),
    }))
    .sort((left, right) => right.memberCount - left.memberCount || left.departmentName.localeCompare(right.departmentName, "zh-Hans-CN"))
})

const permissionGroupRows = computed<PermissionGroupRow[]>(() => {
  const grouped = new Map<string, MemberRow[]>()

  for (const row of rows.value) {
    const key = row.permissionGroup || "未分配"
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .map(([permissionGroup, members]) => ({
      id: permissionGroup,
      permissionGroup,
      memberCount: members.length,
      departmentCount: new Set(members.map(member => member.departmentName)).size,
      positionCount: new Set(members.map(member => member.position)).size,
      membersPreview: members.map(member => member.name).join("、"),
    }))
    .sort((left, right) => right.memberCount - left.memberCount || left.permissionGroup.localeCompare(right.permissionGroup, "zh-Hans-CN"))
})

const viewTabs = computed(() => [
  {
    id: "members",
    label: "成员列表",
    badge: rows.value.length,
  },
  {
    id: "departments",
    label: "部门列表",
    badge: departmentRows.value.length,
  },
  {
    id: "permission-groups",
    label: "权限组",
    badge: permissionGroupRows.value.length,
  },
])

const filteredMemberRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return rows.value.filter((row) => {
    if (!keyword) {
      return true
    }

    return [
      row.name,
      row.phone,
      row.departmentName,
      row.position,
      row.permissionGroup,
      row.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  })
})

const filteredDepartmentRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return departmentRows.value.filter((row) => {
    if (!keyword) {
      return true
    }

    return [
      row.departmentName,
      row.memberCount,
      row.activeCount,
      row.positionCount,
      row.permissionGroupCount,
      row.membersPreview,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  })
})

const filteredPermissionGroupRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return permissionGroupRows.value.filter((row) => {
    if (!keyword) {
      return true
    }

    return [
      row.permissionGroup,
      row.memberCount,
      row.departmentCount,
      row.positionCount,
      row.membersPreview,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  })
})

const currentColumns = computed(() => {
  if (activeView.value === "departments") {
    return departmentColumns
  }

  if (activeView.value === "permission-groups") {
    return permissionGroupColumns
  }

  return memberColumns
})

const currentRows = computed<Record<string, unknown>[]>(() => {
  if (activeView.value === "departments") {
    return filteredDepartmentRows.value
  }

  if (activeView.value === "permission-groups") {
    return filteredPermissionGroupRows.value
  }

  return filteredMemberRows.value
})

const currentRowKey = computed(() => (
  activeView.value === "members" ? "id" : "id"
))

const currentTotalRows = computed(() => {
  if (activeView.value === "departments") {
    return departmentRows.value.length
  }

  if (activeView.value === "permission-groups") {
    return permissionGroupRows.value.length
  }

  return rows.value.length
})

const currentSearchPlaceholder = computed(() => {
  if (activeView.value === "departments") {
    return "搜索部门名称或成员"
  }

  if (activeView.value === "permission-groups") {
    return "搜索权限组或成员"
  }

  return "搜索成员、手机号、部门或职位"
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: "加载中",
      description: "正在获取当前视图的数据，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (errorMessage.value) {
    return {
      title: "数据加载失败",
      description: errorMessage.value,
      icon: "ri-error-warning-line",
    }
  }

  if (searchQuery.value.trim()) {
    return {
      title: "没有匹配结果",
      description: "调整搜索关键词后再试一次。",
      icon: "ri-search-line",
    }
  }

  if (activeView.value === "departments") {
    return {
      title: "暂无部门数据",
      description: "当前成员数据还无法聚合出部门列表。",
      icon: "ri-building-line",
    }
  }

  if (activeView.value === "permission-groups") {
    return {
      title: "暂无权限组数据",
      description: "当前成员数据还无法聚合出权限组列表。",
      icon: "ri-shield-user-line",
    }
  }

  return {
    title: "暂无成员数据",
    description: "当前接口暂未返回可展示的成员列表。",
    icon: "ri-team-line",
  }
})

onMounted(() => {
  void loadMembers()
})

async function loadMembers() {
  loading.value = true
  errorMessage.value = ""

  try {
    const response = await fetch(MEMBERS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
    const payload = await readResponseBody(response) as ApiEnvelope | unknown[]

    if (!response.ok) {
      throw createHttpError(response, payload, MEMBERS_LOAD_ERROR_MESSAGE)
    }

    const list = extractList(payload)

    rows.value = list.map((item, index) => normalizeMemberRow(item, index))
    total.value = extractTotal(payload, rows.value.length)
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: MEMBERS_LOAD_ERROR_MESSAGE,
    })
  } finally {
    loading.value = false
  }
}

function extractList(payload: ApiEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ApiEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List
    }

    if (Array.isArray(nested.list)) {
      return nested.list
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  return []
}

function extractTotal(payload: ApiEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ApiEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeMemberRow(raw: unknown, index: number): MemberRow {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const permissionOptions = extractRoleOptions(record.Roles)
  const initialPermissionGroup = permissionOptions[0]?.label ?? "未分配"

  return {
    id: toNumber(record.Id, index + 1),
    uuid: toText(record.Uuid),
    name: toText(record.Name, `成员 ${index + 1}`),
    phone: toText(record.Phone, "-"),
    departmentUuid: toText(record.DepartmentUuid),
    departmentName: toText(record.DepartmentName, "未分组"),
    position: toText(record.Position, "未设置职位"),
    permissionGroup: initialPermissionGroup,
    permissionOptions,
    status: normalizeStatus(record.Status),
  }
}

function extractRoleOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return buildPermissionOptions(value.map((item) => {
    const roleRecord = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
    return {
      label: toText(roleRecord.RoleName, roleRecord.Name),
      uuid: toText(roleRecord.Uuid, roleRecord.RoleUuid),
    }
  }))
}

function buildPermissionOptions(options: PermissionOption[]) {
  const deduped = new Map<string, PermissionOption>()

  options.forEach((option) => {
    if (!option.label) {
      return
    }

    const key = option.uuid || option.label

    if (!deduped.has(key)) {
      deduped.set(key, option)
    }
  })

  return Array.from(deduped.values())
}

function normalizeStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) {
      return "正常"
    }

    if (value === 2) {
      return "离职"
    }

    return "未知状态"
  }

  const text = toText(value).trim()

  if (text === "1" || text === "正常") {
    return "正常"
  }

  if (text === "2" || text === "离职") {
    return "离职"
  }

  return "未知状态"
}

function toStatusValue(status: string) {
  if (status === "正常") {
    return 1
  }

  if (status === "离职") {
    return 2
  }

  return 0
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number") {
      return String(value)
    }
  }

  return ""
}

function getPermissionOption(member: MemberRow, groupLabel: string) {
  return member.permissionOptions.find(option => option.label === groupLabel)
}

function toggleSearch() {
  if (searchExpanded.value) {
    searchQuery.value = ""
    searchExpanded.value = false
    return
  }

  searchExpanded.value = true
}

function buildMemberUpdatePayload(member: MemberRow, nextPermissionGroup = member.permissionGroup) {
  const nextOption = getPermissionOption(member, nextPermissionGroup)

  return {
    Uuid: member.uuid || undefined,
    DepartmentUuid: member.departmentUuid || undefined,
    Name: member.name,
    Phone: member.phone === "-" ? "" : member.phone,
    Position: member.position === "未设置职位" ? "" : member.position,
    Status: toStatusValue(member.status),
    RoleUuids: nextPermissionGroup === "未分配"
      ? []
      : nextOption?.uuid
        ? [nextOption.uuid]
        : [],
  }
}

function isMemberPermissionUpdating(memberId: number) {
  return permissionUpdatingMemberIds.value.includes(memberId)
}

async function updatePermissionGroup(memberId: number, nextGroup: string) {
  const member = rows.value.find(row => row.id === memberId)

  if (!member || member.permissionGroup === nextGroup || isMemberPermissionUpdating(memberId)) {
    return
  }

  if (!member.uuid) {
    toast.error("成员信息更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
    })
    return
  }

  if (nextGroup !== "未分配" && !getPermissionOption(member, nextGroup)?.uuid) {
    toast.error("成员信息更新失败", {
      description: `${nextGroup} 缺少权限组 UUID，无法提交更新。`,
    })
    return
  }

  permissionUpdatingMemberIds.value = [...permissionUpdatingMemberIds.value, memberId]

  try {
    const response = await fetch(MEMBER_UPDATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildMemberUpdatePayload(member, nextGroup)),
    })
    const payload = await readResponseBody(response)

    if (!response.ok) {
      throw createHttpError(response, payload, MEMBER_UPDATE_ERROR_MESSAGE)
    }

    member.permissionGroup = nextGroup
    member.permissionOptions = buildPermissionOptions([
      ...member.permissionOptions,
      ...(nextGroup === "未分配" ? [] : [{
        label: nextGroup,
        uuid: getPermissionOption(member, nextGroup)?.uuid,
      }]),
    ])
    toast.success("权限组已更新", {
      description: `${member.name} 已切换到 ${nextGroup}。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员信息更新失败",
      fallback: MEMBER_UPDATE_ERROR_MESSAGE,
    })
  } finally {
    permissionUpdatingMemberIds.value = permissionUpdatingMemberIds.value.filter(id => id !== memberId)
  }
}

function isMemberStatusUpdating(memberId: number) {
  return statusUpdatingMemberIds.value.includes(memberId)
}

async function updateMemberStatus(member: MemberRow, nextStatus: number) {
  if (isMemberStatusUpdating(member.id)) {
    return
  }

  if (member.status === "离职") {
    toast("成员状态未变更", {
      description: `${member.name} 当前已是停用状态。`,
    })
    return
  }

  statusUpdatingMemberIds.value = [...statusUpdatingMemberIds.value, member.id]

  try {
    const response = await fetch(MEMBER_STATUS_UPDATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: member.id,
        status: nextStatus,
      }),
    })
    const payload = await readResponseBody(response)

    if (!response.ok) {
      throw createHttpError(response, payload, MEMBER_STATUS_UPDATE_ERROR_MESSAGE)
    }

    member.status = normalizeStatus(nextStatus)
    toast.success("成员状态已更新", {
      description: `${member.name} 已停用。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员状态更新失败",
      fallback: MEMBER_STATUS_UPDATE_ERROR_MESSAGE,
    })
  } finally {
    statusUpdatingMemberIds.value = statusUpdatingMemberIds.value.filter(id => id !== member.id)
  }
}

function handleMemberAction(actionKey: MemberActionKey, member?: MemberRow) {
  if (actionKey === "manual") {
    openManualMemberDialog()
    return
  }

  if (actionKey === "import-excel") {
    toast("导入流程待接入", {
      description: "后续可接 Excel / CSV 导入并校验成员数据。",
    })
    return
  }

  if (actionKey === "sync-directory") {
    toast("组织架构同步待接入", {
      description: "当前先预留同步入口，后续可接企业微信或内部组织树。",
    })
    return
  }

  if (actionKey === "create-department") {
    toast("创建部门待接入", {
      description: "后续可接部门表单或组织架构同步能力。",
    })
    return
  }

  if (actionKey === "create-permission-group") {
    toast("创建权限组待接入", {
      description: "后续可接权限组配置抽屉和成员授权流。",
    })
    return
  }

  if (!member) {
    return
  }

  if (actionKey === "view") {
    toast("成员详情待接入", {
      description: `已为 ${member.name} 预留详情入口。`,
    })
    return
  }

  if (actionKey === "invite") {
    toast.success("已重新发送邀请", {
      description: `${member.name} 的邀请通知已重新触发。`,
    })
    return
  }

  void updateMemberStatus(member, 2)
}

function handlePrimaryAction() {
  if (activeView.value === "departments") {
    handleMemberAction("create-department")
    return
  }

  if (activeView.value === "permission-groups") {
    handleMemberAction("create-permission-group")
  }
}

function createManualMemberForm(): ManualMemberForm {
  return {
    name: "",
    phone: "",
    departmentName: "",
    position: "",
    permissionGroup: availablePermissionGroups.value[0] ?? "",
  }
}

function createEditMemberForm(): EditMemberForm {
  return {
    name: "",
    phone: "",
    departmentName: "",
    position: "",
    permissionGroup: "",
    status: "",
  }
}

function openManualMemberDialog() {
  manualMemberForm.value = createManualMemberForm()
  manualDialogOpen.value = true
}

function openEditMemberDialog(member: MemberRow) {
  editingMemberId.value = member.id
  editPermissionGroupOptions.value = buildPermissionOptions([
    ...member.permissionOptions,
    ...(member.permissionGroup && member.permissionGroup !== "未分配"
      ? [{ label: member.permissionGroup, uuid: getPermissionOption(member, member.permissionGroup)?.uuid }]
      : []),
  ])
  editMemberForm.value = {
    name: member.name,
    phone: member.phone === "-" ? "" : member.phone,
    departmentName: member.departmentName === "未分组" ? "" : member.departmentName,
    position: member.position === "未设置职位" ? "" : member.position,
    permissionGroup: member.permissionGroup === "未分配" ? "" : member.permissionGroup,
    status: member.status,
  }
  editDialogOpen.value = true
}

function submitManualMember() {
  const name = manualMemberForm.value.name.trim()

  if (!name) {
    toast.error("请填写成员姓名")
    return
  }

  const permissionGroup = manualMemberForm.value.permissionGroup.trim() || "未分配"

  rows.value.unshift({
    id: getNextMemberId(),
    uuid: "",
    name,
    phone: manualMemberForm.value.phone.trim() || "-",
    departmentUuid: "",
    departmentName: manualMemberForm.value.departmentName.trim() || "未分组",
    position: manualMemberForm.value.position.trim() || "未设置职位",
    permissionGroup,
    permissionOptions: permissionGroup === "未分配" ? [] : [{ label: permissionGroup }],
    status: "正常",
  })
  total.value = rows.value.length
  manualDialogOpen.value = false
  toast.success("成员已添加", {
    description: `${name} 已加入当前成员列表。`,
  })
}

function getNextMemberId() {
  const maxId = rows.value.reduce((currentMax, row) => Math.max(currentMax, row.id), 0)
  return maxId + 1
}

async function submitEditMember() {
  const memberId = editingMemberId.value
  const member = rows.value.find(row => row.id === memberId)

  if (!member) {
    return
  }

  const name = editMemberForm.value.name.trim()

  if (!name) {
    toast.error("请填写成员姓名")
    return
  }

  if (!member.uuid) {
    toast.error("成员信息更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
    })
    return
  }

  const nextPermissionGroup = editMemberForm.value.permissionGroup.trim() || "未分配"
  const nextPermissionOption = editPermissionGroupOptions.value.find(option => option.label === nextPermissionGroup)

  if (nextPermissionGroup !== "未分配" && !nextPermissionOption?.uuid) {
    toast.error("成员信息更新失败", {
      description: `${nextPermissionGroup} 缺少权限组 UUID，无法提交更新。`,
    })
    return
  }

  editSubmitting.value = true

  try {
    const nextMember: MemberRow = {
      ...member,
      name,
      phone: editMemberForm.value.phone.trim() || "-",
      departmentName: editMemberForm.value.departmentName.trim() || "未分组",
      position: editMemberForm.value.position.trim() || "未设置职位",
      permissionGroup: nextPermissionGroup,
      status: editMemberForm.value.status || member.status,
      permissionOptions: nextPermissionGroup === "未分配"
        ? member.permissionOptions
        : buildPermissionOptions([
            ...member.permissionOptions,
            { label: nextPermissionGroup, uuid: nextPermissionOption?.uuid },
          ]),
    }

    const response = await fetch(MEMBER_UPDATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildMemberUpdatePayload(nextMember, nextPermissionGroup)),
    })
    const payload = await readResponseBody(response)

    if (!response.ok) {
      throw createHttpError(response, payload, MEMBER_UPDATE_ERROR_MESSAGE)
    }

    member.name = nextMember.name
    member.phone = nextMember.phone
    member.departmentName = nextMember.departmentName
    member.position = nextMember.position
    member.permissionGroup = nextMember.permissionGroup
    member.permissionOptions = nextMember.permissionOptions
    editDialogOpen.value = false
    toast.success("成员信息已更新", {
      description: `${member.name} 的信息已保存。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员信息更新失败",
      fallback: MEMBER_UPDATE_ERROR_MESSAGE,
    })
  } finally {
    editSubmitting.value = false
  }
}

function asMemberRow(row: Record<string, unknown>) {
  return row as MemberRow
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <TopTabSwitch
          :tabs="viewTabs"
          :model-value="activeView"
          :collapse-inactive="false"
          tone="default"
          aria-label="成员管理视图切换"
          @update:model-value="activeView = $event as MemberViewKey"
        />

        <div class="flex flex-wrap items-center justify-end gap-2">
          <div
            :class="
              cn(
                'flex h-8 items-center overflow-hidden rounded-full border border-input bg-background transition-[width,padding] duration-200 ease-out',
                searchExpanded ? 'w-[260px] px-1.5' : 'w-8 justify-center px-0 border-transparent',
              )
            "
          >
            <button
              type="button"
              :class="toolbarIconButtonClass"
              @click="toggleSearch"
            >
              <i :class="searchExpanded ? 'ri-close-line text-[17px]' : 'ri-search-line text-[17px]'" />
            </button>
            <Input
              v-if="searchExpanded"
              v-model="searchQuery"
              :placeholder="currentSearchPlaceholder"
              class="h-8 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
          </div>

          <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" @click="loadMembers">
            <i class="ri-refresh-line text-sm" />
            <span>刷新列表</span>
          </Button>

          <div v-if="activeView === 'members'" class="inline-flex items-center">
            <Button class="h-8 gap-1 rounded-r-none pr-2.5 pl-3 text-[14px]" @click="handleMemberAction('manual')">
              <i class="ri-user-add-line text-base" />
              <span>添加成员</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  class="h-8 w-8 rounded-l-none border-l border-white/15 px-0 text-[14px]"
                  aria-label="打开成员操作菜单"
                >
                  <i class="ri-arrow-down-s-line text-base" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-[220px] rounded-xl p-1.5">
                <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  成员操作
                </DropdownMenuLabel>
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleMemberAction('manual')">
                  手动添加成员
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleMemberAction('import-excel')">
                  导入数据
                </DropdownMenuItem>
                <DropdownMenuSeparator class="my-1" />
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleMemberAction('sync-directory')">
                  从组织架构同步
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            v-else
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            @click="handlePrimaryAction"
          >
            <i class="ri-add-line text-base" />
            <span>{{ activeView === "departments" ? "添加部门" : "添加权限组" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/[0.03]"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>成员接口加载失败</AlertTitle>
      <AlertDescription>
        {{ errorMessage }}。当前请求地址为 {{ MEMBERS_API_URL }}
      </AlertDescription>
    </Alert>

    <TablePageTable
      :columns="currentColumns"
      :rows="currentRows"
      :row-key="currentRowKey"
      :empty-state="tableEmptyState"
      :table-class="compactTableClass"
    >
      <template #cell-permission="{ row: rawRow }">
        <DropdownMenu v-if="activeView === 'members'">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              :disabled="isMemberPermissionUpdating(asMemberRow(rawRow).id)"
              class="inline-flex h-7 max-w-[9rem] items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:bg-surface-tertiary focus-visible:text-foreground focus-visible:outline-none"
            >
              <span class="truncate">
                {{ isMemberPermissionUpdating(asMemberRow(rawRow).id) ? "更新中..." : asMemberRow(rawRow).permissionGroup }}
              </span>
              <i class="ri-arrow-down-s-line text-sm text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[190px] rounded-xl p-1.5">
            <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
              切换权限组
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="asMemberRow(rawRow).permissionGroup"
              @update:model-value="updatePermissionGroup(asMemberRow(rawRow).id, String($event))"
            >
              <DropdownMenuItem
                v-if="asMemberRow(rawRow).permissionOptions.length === 0"
                disabled
                class="rounded-lg px-2.5 py-2 text-muted-foreground"
              >
                暂无可用权限组
              </DropdownMenuItem>
              <DropdownMenuRadioItem
                v-for="option in asMemberRow(rawRow).permissionOptions"
                :key="`${asMemberRow(rawRow).id}-${option.uuid ?? option.label}`"
                :value="option.label"
                class="rounded-lg py-2 pr-2 pl-8"
              >
                {{ option.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>

      <template #cell-actions="{ row: rawRow }">
        <Button
          v-if="activeView === 'members'"
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click="openEditMemberDialog(asMemberRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="manualDialogOpen" @update:open="manualDialogOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>手动添加成员</DialogTitle>
          <DialogDescription>
            填写基础信息后，成员会先加入当前列表，后续再接真实创建接口。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4 py-2" @submit.prevent="submitManualMember">
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="manual-member-name">成员姓名</label>
            <Input id="manual-member-name" v-model="manualMemberForm.name" placeholder="请输入成员姓名" />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="manual-member-phone">手机号</label>
            <Input id="manual-member-phone" v-model="manualMemberForm.phone" placeholder="请输入手机号" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="manual-member-department">部门</label>
              <Input id="manual-member-department" v-model="manualMemberForm.departmentName" placeholder="例如：运营中心" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="manual-member-position">职位</label>
              <Input id="manual-member-position" v-model="manualMemberForm.position" placeholder="例如：调度主管" />
            </div>
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="manual-member-permission-group">权限组</label>
            <NativeSelect id="manual-member-permission-group" v-model="manualMemberForm.permissionGroup" class="w-full">
              <option v-if="availablePermissionGroups.length === 0" value="">
                暂无可用权限组
              </option>
              <option
                v-for="option in availablePermissionGroups"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </NativeSelect>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" @click="manualDialogOpen = false">
              取消
            </Button>
            <Button type="submit">
              添加成员
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="editDialogOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑用户信息</DialogTitle>
          <DialogDescription>
            修改成员基础信息后，保存时会调用用户更新接口。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4 py-2" @submit.prevent="submitEditMember">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-name">成员姓名</label>
              <Input id="edit-member-name" v-model="editMemberForm.name" placeholder="请输入成员姓名" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-phone">手机号</label>
              <Input id="edit-member-phone" v-model="editMemberForm.phone" placeholder="请输入手机号" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-department">部门</label>
              <Input id="edit-member-department" v-model="editMemberForm.departmentName" placeholder="例如：运营中心" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-position">职位</label>
              <Input id="edit-member-position" v-model="editMemberForm.position" placeholder="例如：调度主管" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-permission-group">权限组</label>
              <NativeSelect id="edit-member-permission-group" v-model="editMemberForm.permissionGroup" class="w-full">
                <option value="">
                  未分配
                </option>
                <option
                  v-for="option in editPermissionGroupOptions"
                  :key="option.uuid ?? option.label"
                  :value="option.label"
                >
                  {{ option.label }}
                </option>
              </NativeSelect>
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-status">成员状态</label>
              <NativeSelect id="edit-member-status" v-model="editMemberForm.status" class="w-full">
                <option value="正常">
                  正常
                </option>
                <option value="离职">
                  离职
                </option>
                <option v-if="editMemberForm.status === '未知状态'" value="未知状态">
                  未知状态
                </option>
              </NativeSelect>
            </div>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" @click="editDialogOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="editSubmitting">
              {{ editSubmitting ? "保存中..." : "保存" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
</template>
