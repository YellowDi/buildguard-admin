<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { toast } from "vue-sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
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
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { handleApiError } from "@/lib/api-errors"
import {
  createMember as requestMemberCreate,
  deleteMember as requestMemberDelete,
  fetchMembers,
  getMemberDetail,
  updateMember as requestMemberUpdate,
  updateMemberStatus as requestMemberStatusUpdate,
} from "@/lib/members-api"
import {
  createRole as requestRoleCreate,
  deleteRole as requestRoleDelete,
  fetchRoles,
  getRoleDetail,
  updateRole as requestRoleUpdate,
} from "@/lib/roles-api"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

type MemberViewKey = "members" | "roles" | "permission-groups"

type PermissionOption = {
  label: string
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
  userType?: number
  status: string
  source: "remote" | "local"
}

type RoleRow = {
  id: number
  uuid: string
  name: string
  remark: string
  createdAt: string
  updatedAt: string
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

type RoleForm = {
  name: string
  remark: string
}

type EditMemberForm = {
  name: string
  phone: string
  departmentName: string
  position: string
  permissionGroup: string
  status: string
}

type MemberActionKey =
  | "manual"
  | "import-excel"
  | "sync-directory"
  | "create-role"
  | "create-permission-group"
  | "view"
  | "invite"
  | "disable"

const MEMBERS_LOAD_ERROR_MESSAGE = "成员列表加载失败，请稍后重试。"
const MEMBER_STATUS_UPDATE_ERROR_MESSAGE = "成员状态更新失败，请稍后重试。"
const MEMBER_UPDATE_ERROR_MESSAGE = "成员信息更新失败，请稍后重试。"
const memberStatusMap = {
  正常: { tone: "green", icon: "check" },
  离职: { tone: "gray", icon: "minus" },
  未知状态: { tone: "gray", icon: "alert" },
} as const
const MEMBER_USER_TYPE_OPTIONS = [
  { label: "后台", value: 1 },
  { label: "检修", value: 2 },
  { label: "维修", value: 3 },
] as const

const rows = ref<MemberRow[]>([])
const roleRows = ref<RoleRow[]>([])
const loading = ref(false)
const rolesLoading = ref(false)
const errorMessage = ref("")
const rolesErrorMessage = ref("")
const permissionUpdatingMemberIds = ref<number[]>([])
const statusUpdatingMemberIds = ref<number[]>([])
const activeView = ref<MemberViewKey>("members")
const manualDialogOpen = ref(false)
const roleDialogOpen = ref(false)
const editDialogOpen = ref(false)
const editingMemberId = ref<number | null>(null)
const editingRoleId = ref<number | null>(null)
const editingRoleUuid = ref("")
const manualSubmitting = ref(false)
const roleSubmitting = ref(false)
const roleDetailLoading = ref(false)
const roleDeleteSubmitting = ref(false)
const roleDeleteConfirmOpen = ref(false)
const editDetailLoading = ref(false)
const editSubmitting = ref(false)
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const editPermissionGroupOptions = ref<PermissionOption[]>([])
const searchExpanded = ref(false)
const searchQuery = ref("")
const globalPermissionOptions = computed(() => buildPermissionOptions(MEMBER_USER_TYPE_OPTIONS.map(option => ({
  label: option.label,
}))))
const availablePermissionGroups = computed(() => globalPermissionOptions.value.map(option => option.label))
const manualMemberForm = ref(createManualMemberForm())
const roleForm = ref(createRoleForm())
const editMemberForm = ref(createEditMemberForm())

const memberColumns: TableColumn[] = [
  {
    key: "name",
    label: "成员",
    filterType: "contact",
    variant: "contact",
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
    tone: "muted",
    cellClass: "text-muted-foreground",
  },
  {
    key: "position",
    label: "职位",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "permissionGroup",
    label: "角色",
    filterType: "tag",
    slot: "cell-permission",
  },
  {
    key: "status",
    label: "状态",
    filterType: "tag",
    width: "fill",
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
    cellClass: "text-right",
  },
]

const roleColumns: TableColumn[] = [
  {
    key: "name",
    label: "角色",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "remark",
    label: "备注",
    filterType: "text",
    tone: "muted",
    variant: "note",
    cellRenderer: { kind: "note" },
  },
  {
    key: "createdAt",
    label: "创建时间",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "updatedAt",
    label: "更新时间",
    filterType: "text",
    tone: "muted",
    width: "fill",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    cellClass: "text-right",
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

const permissionGroupRows = computed<PermissionGroupRow[]>(() => {
  const grouped = new Map<string, MemberRow[]>()

  for (const row of rows.value) {
    const key = row.permissionGroup || "后台"
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
    id: "roles",
    label: "角色",
    badge: roleRows.value.length,
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

const filteredRoleRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return roleRows.value.filter((row) => {
    if (!keyword) {
      return true
    }

    return [
      row.name,
      row.remark,
      row.createdAt,
      row.updatedAt,
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
  if (activeView.value === "roles") {
    return roleColumns
  }

  if (activeView.value === "permission-groups") {
    return permissionGroupColumns
  }

  return memberColumns
})

const currentRows = computed<Record<string, unknown>[]>(() => {
  if (activeView.value === "roles") {
    return filteredRoleRows.value
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
  if (activeView.value === "roles") {
    return roleRows.value.length
  }

  if (activeView.value === "permission-groups") {
    return permissionGroupRows.value.length
  }

  return rows.value.length
})

const currentSearchPlaceholder = computed(() => {
  if (activeView.value === "roles") {
    return "搜索角色名称或备注"
  }

  if (activeView.value === "permission-groups") {
    return "搜索权限组或成员"
  }

  return "搜索成员、手机号、部门或职位"
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (currentLoading.value) {
    return {
      title: "加载中",
      description: "正在获取当前视图的数据，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (currentErrorMessage.value) {
    return {
      title: "数据加载失败",
      description: currentErrorMessage.value,
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

  if (activeView.value === "roles") {
    return {
      title: "暂无角色数据",
      description: "暂时还没有角色，您可以先添加一个角色。",
      icon: "ri-shield-user-line",
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
    description: "暂时还没有成员，您可以先添加一个成员。",
    icon: "ri-team-line",
  }
})

onMounted(() => {
  void loadAllData()
})

const currentLoading = computed(() => (
  activeView.value === "roles" ? rolesLoading.value : loading.value
))

const currentErrorMessage = computed(() => (
  activeView.value === "roles" ? rolesErrorMessage.value : errorMessage.value
))

async function loadAllData() {
  await Promise.allSettled([
    loadMembers(),
    loadRoles(),
  ])
}

async function loadMembers() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchMembers()
    const nextRows = result.list.map((item, index) => normalizeMemberRow(item, index))

    rows.value = nextRows
    await hydrateMemberRolesFromDetail(nextRows)
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: MEMBERS_LOAD_ERROR_MESSAGE,
    })
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  rolesLoading.value = true
  rolesErrorMessage.value = ""

  try {
    const result = await fetchRoles()

    roleRows.value = result.list.map((item, index) => normalizeRoleRow(item, index))
  } catch (error) {
    rolesErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "角色列表加载失败，请稍后重试。",
    })
  } finally {
    rolesLoading.value = false
  }
}

function normalizeMemberRow(raw: unknown, index: number): MemberRow {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const userType = normalizeUserType(record.UserType)
  const permissionOptions = buildPermissionOptions(getUserTypeOption(userType))
  const initialPermissionGroup = permissionOptions[0]?.label ?? "后台"

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
    userType,
    status: normalizeStatus(record.Status),
    source: "remote",
  }
}

async function hydrateMemberRolesFromDetail(memberRows: MemberRow[]) {
  const missingRoleRows = memberRows.filter(row => row.uuid && row.permissionOptions.length === 0)

  if (missingRoleRows.length === 0) {
    return
  }

  const detailResults = await Promise.allSettled(missingRoleRows.map(async (row) => {
    const detail = await getMemberDetail({
      Uuid: row.uuid,
    })

    return {
      row,
      detail,
    }
  }))

  detailResults.forEach((result) => {
    if (result.status !== "fulfilled") {
      return
    }

    const userType = normalizeUserType(result.value.detail.UserType)
    const permissionOptions = buildPermissionOptions(getUserTypeOption(userType))

    if (permissionOptions.length === 0) {
      return
    }

    result.value.row.permissionOptions = permissionOptions
    result.value.row.permissionGroup = permissionOptions[0]?.label ?? "后台"
    result.value.row.userType = userType
  })
}

function normalizeRoleRow(raw: unknown, index: number): RoleRow {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>

  return {
    id: toNumber(record.Id, record.id, record.RoleId, record.roleId, index + 1),
    uuid: toText(record.Uuid, record.uuid, record.RoleUuid, record.roleUuid),
    name: toText(record.Name, record.name, record.RoleName, record.roleName, `角色 ${index + 1}`),
    remark: toText(record.Remark, record.remark, "-"),
    createdAt: toText(record.CreatedAt, record.createdAt, "-"),
    updatedAt: toText(record.UpdatedAt, record.updatedAt, "-"),
  }
}

function buildPermissionOptions(options: PermissionOption[]) {
  const deduped = new Map<string, PermissionOption>()

  options.forEach((option) => {
    const label = option.label.trim()

    if (!label) {
      return
    }

    const current = deduped.get(label)

    if (!current) {
      deduped.set(label, {
        label,
      })
      return
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

function toNumber(...values: unknown[]) {
  const fallback = typeof values[values.length - 1] === "number" ? values[values.length - 1] as number : 0

  for (const value of values) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
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

function normalizeUserType(value: unknown) {
  const parsed = typeof value === "string" ? Number(value.trim()) : value

  if (parsed === 1 || parsed === 2 || parsed === 3) {
    return parsed
  }

  return 1
}

function getUserTypeOption(value: number | undefined): PermissionOption[] {
  const matched = MEMBER_USER_TYPE_OPTIONS.find(option => option.value === value)
  return matched ? [{ label: matched.label }] : []
}

function getUserTypeValueByLabel(label: string) {
  return MEMBER_USER_TYPE_OPTIONS.find(option => option.label === label)?.value
}

function getAssignablePermissionOptions(member: MemberRow) {
  return buildPermissionOptions([
    ...globalPermissionOptions.value,
    ...member.permissionOptions,
    ...(member.permissionGroup
      ? [{ label: member.permissionGroup }]
      : []),
  ])
}

function getDepartmentMatch(departmentName: string) {
  const normalizedName = departmentName.trim()

  if (!normalizedName) {
    return null
  }

  return rows.value.find(row => row.departmentName === normalizedName) ?? null
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
  return {
    Uuid: member.uuid || undefined,
    DepartmentUuid: member.departmentUuid || undefined,
    Name: member.name,
    Phone: member.phone === "-" ? "" : member.phone,
    Position: member.position === "未设置职位" ? "" : member.position,
    Status: toStatusValue(member.status),
    UserType: getUserTypeValueByLabel(nextPermissionGroup) ?? 1,
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

  if (!getUserTypeValueByLabel(nextGroup)) {
    toast.error("成员信息更新失败", {
      description: `${nextGroup} 不是有效角色，无法提交更新。`,
    })
    return
  }

  permissionUpdatingMemberIds.value = [...permissionUpdatingMemberIds.value, memberId]

  try {
    await requestMemberUpdate(buildMemberUpdatePayload(member, nextGroup))

    member.permissionGroup = nextGroup
    member.userType = getUserTypeValueByLabel(nextGroup) ?? 1
    member.permissionOptions = buildPermissionOptions([
      ...member.permissionOptions,
      { label: nextGroup },
    ])
    toast.success("角色已更新", {
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

  if (!member.uuid) {
    toast.error("成员状态更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
    })
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
    await requestMemberStatusUpdate({
      Uuid: member.uuid,
      Status: nextStatus,
    })

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

  if (actionKey === "create-role") {
    openRoleDialog()
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
  if (activeView.value === "roles") {
    handleMemberAction("create-role")
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
    permissionGroup: "后台",
  }
}

function createRoleForm(): RoleForm {
  return {
    name: "",
    remark: "",
  }
}

function createEditMemberForm(): EditMemberForm {
  return {
    name: "",
    phone: "",
    departmentName: "",
    position: "",
    permissionGroup: "后台",
    status: "",
  }
}

function openManualMemberDialog() {
  manualMemberForm.value = createManualMemberForm()
  manualDialogOpen.value = true
}

function openRoleDialog() {
  editingRoleId.value = null
  editingRoleUuid.value = ""
  roleDetailLoading.value = false
  roleDeleteConfirmOpen.value = false
  roleForm.value = createRoleForm()
  roleDialogOpen.value = true
}

function openEditRoleDialog(role: RoleRow) {
  editingRoleId.value = role.id
  editingRoleUuid.value = role.uuid
  roleDetailLoading.value = false
  roleDeleteConfirmOpen.value = false
  applyRoleSnapshot(role)
  roleDialogOpen.value = true

  if (role.uuid) {
    void loadEditRoleDetail(role)
  }
}

function closeRoleDialog() {
  roleDialogOpen.value = false
  editingRoleId.value = null
  editingRoleUuid.value = ""
  roleDetailLoading.value = false
  roleDeleteConfirmOpen.value = false
}

function openEditMemberDialog(member: MemberRow) {
  editingMemberId.value = member.id
  editDetailLoading.value = false
  applyEditMemberSnapshot(member)
  editDialogOpen.value = true

  if (member.uuid) {
    void loadEditMemberDetail(member)
  }
}

function closeEditDialog() {
  editDialogOpen.value = false
  editingMemberId.value = null
  deleteConfirmOpen.value = false
  editDetailLoading.value = false
}

async function submitManualMember() {
  const name = manualMemberForm.value.name.trim()

  if (!name) {
    toast.error("请填写成员姓名")
    return
  }

  const departmentName = manualMemberForm.value.departmentName.trim()
  const departmentMatch = getDepartmentMatch(departmentName)

  if (departmentName && (!departmentMatch || !departmentMatch.departmentUuid)) {
    toast.error("成员创建失败", {
      description: "当前部门无法映射到 DepartmentUuid，请填写已存在的部门名称。",
    })
    return
  }

  const permissionGroup = manualMemberForm.value.permissionGroup.trim() || "后台"
  const userType = getUserTypeValueByLabel(permissionGroup)

  if (!userType) {
    toast.error("成员创建失败", {
      description: `${permissionGroup} 不是有效角色，无法提交创建请求。`,
    })
    return
  }

  manualSubmitting.value = true

  try {
    await requestMemberCreate({
      DepartmentUuid: departmentMatch?.departmentUuid || undefined,
      Name: name,
      Phone: manualMemberForm.value.phone.trim() || undefined,
      Position: manualMemberForm.value.position.trim() || undefined,
      UserType: userType,
    })

    manualDialogOpen.value = false
    manualMemberForm.value = createManualMemberForm()
    toast.success("成员已创建", {
      description: `${name} 已提交到成员接口。`,
    })
    await loadMembers()
  } catch (error) {
    handleApiError(error, {
      title: "成员创建失败",
      fallback: "成员创建失败，请稍后重试。",
    })
  } finally {
    manualSubmitting.value = false
  }
}

async function submitRole() {
  const name = roleForm.value.name.trim()

  if (!name) {
    toast.error("请填写角色名称")
    return
  }

  roleSubmitting.value = true

  try {
    const editingRole = roleRows.value.find(role => role.id === editingRoleId.value) ?? null
    const editingRoleUuidValue = editingRoleUuid.value || editingRole?.uuid || ""

    if (editingRoleId.value !== null) {
      if (!editingRoleUuidValue) {
        toast.error("角色更新失败", {
          description: `${name} 缺少角色 Uuid，无法提交更新。`,
        })
        return
      }

      const result = await requestRoleUpdate({
        Uuid: editingRoleUuidValue,
        Name: name,
        Remark: roleForm.value.remark.trim() || undefined,
      })

      if (result.Uuid) {
        editingRoleUuid.value = result.Uuid
      }

      closeRoleDialog()
      roleForm.value = createRoleForm()
      toast.success("角色已更新", {
        description: `${name} 的信息已保存。`,
      })
    } else {
      const result = await requestRoleCreate({
        Name: name,
        Remark: roleForm.value.remark.trim() || undefined,
      })

      if (result.Uuid) {
        editingRoleUuid.value = result.Uuid
      }

      closeRoleDialog()
      roleForm.value = createRoleForm()
      toast.success("角色已创建", {
        description: `${name} 已提交到角色接口。`,
      })
    }

    await loadRoles()
  } catch (error) {
    handleApiError(error, {
      title: editingRoleId.value === null ? "角色创建失败" : "角色更新失败",
      fallback: editingRoleId.value === null ? "角色创建失败，请稍后重试。" : "角色更新失败，请稍后重试。",
    })
  } finally {
    roleSubmitting.value = false
  }
}

function promptDeleteEditingRole() {
  if (editingRoleId.value === null || roleSubmitting.value || roleDeleteSubmitting.value) {
    return
  }

  roleDeleteConfirmOpen.value = true
}

async function confirmDeleteEditingRole() {
  const role = roleRows.value.find(item => item.id === editingRoleId.value)

  if (!role || roleDeleteSubmitting.value) {
    return
  }

  const roleUuid = editingRoleUuid.value || role.uuid

  if (!roleUuid) {
    toast.error("角色删除失败", {
      description: `${role.name} 缺少角色 Uuid，无法提交删除。`,
    })
    return
  }

  roleDeleteSubmitting.value = true

  try {
    await requestRoleDelete({
      Uuid: roleUuid,
    })

    roleDeleteConfirmOpen.value = false
    closeRoleDialog()
    toast.success("角色已删除", {
      description: `${role.name} 已从当前角色列表移除。`,
    })
    await loadRoles()
  } catch (error) {
    handleApiError(error, {
      title: "角色删除失败",
      fallback: "角色删除失败，请稍后重试。",
    })
  } finally {
    roleDeleteSubmitting.value = false
  }
}

function applyRoleSnapshot(role: RoleRow) {
  roleForm.value = {
    name: role.name,
    remark: role.remark === "-" ? "" : role.remark,
  }
}

async function loadEditRoleDetail(role: RoleRow) {
  const currentEditingId = role.id

  roleDetailLoading.value = true

  try {
    const detail = await getRoleDetail({
      Uuid: role.uuid,
    })

    if (editingRoleId.value !== currentEditingId) {
      return
    }

    role.uuid = toText(detail.Uuid, role.uuid)
    role.name = toText(detail.Name, role.name)
    role.remark = toText(detail.Remark, role.remark === "-" ? "" : role.remark) || "-"
    role.createdAt = toText(detail.CreatedAt, role.createdAt) || "-"
    role.updatedAt = toText(detail.UpdatedAt, role.updatedAt) || "-"
    editingRoleUuid.value = role.uuid

    applyRoleSnapshot(role)
  } catch (error) {
    handleApiError(error, {
      title: "角色详情加载失败",
      fallback: "角色详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingRoleId.value === currentEditingId) {
      roleDetailLoading.value = false
    }
  }
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

  const nextPermissionGroup = editMemberForm.value.permissionGroup.trim() || "后台"

  if (!getUserTypeValueByLabel(nextPermissionGroup)) {
    toast.error("成员信息更新失败", {
      description: `${nextPermissionGroup} 不是有效角色，无法提交更新。`,
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
      userType: getUserTypeValueByLabel(nextPermissionGroup) ?? 1,
      status: editMemberForm.value.status || member.status,
      permissionOptions: buildPermissionOptions([
        ...member.permissionOptions,
        { label: nextPermissionGroup },
      ]),
    }

    await requestMemberUpdate(buildMemberUpdatePayload(nextMember, nextPermissionGroup))

    member.name = nextMember.name
    member.phone = nextMember.phone
    member.departmentName = nextMember.departmentName
    member.position = nextMember.position
    member.permissionGroup = nextMember.permissionGroup
    member.permissionOptions = nextMember.permissionOptions
    member.userType = nextMember.userType
    closeEditDialog()
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

function applyEditMemberSnapshot(member: MemberRow) {
  editPermissionGroupOptions.value = getAssignablePermissionOptions(member)
  editMemberForm.value = {
    name: member.name,
    phone: member.phone === "-" ? "" : member.phone,
    departmentName: member.departmentName === "未分组" ? "" : member.departmentName,
    position: member.position === "未设置职位" ? "" : member.position,
    permissionGroup: member.permissionGroup,
    status: member.status,
  }
}

async function loadEditMemberDetail(member: MemberRow) {
  const currentEditingId = member.id

  editDetailLoading.value = true

  try {
    const detail = await getMemberDetail({
      Uuid: member.uuid,
    })

    if (editingMemberId.value !== currentEditingId) {
      return
    }

    const userType = normalizeUserType(detail.UserType)
    const permissionOptions = buildPermissionOptions(getUserTypeOption(userType))
    const permissionGroup = permissionOptions[0]?.label ?? "后台"

    member.uuid = toText(detail.Uuid, member.uuid)
    member.name = toText(detail.Name, member.name)
    member.phone = toText(detail.Phone, member.phone === "-" ? "" : member.phone) || "-"
    member.departmentUuid = toText(detail.DepartmentUuid, member.departmentUuid)
    member.departmentName = toText(detail.DepartmentName, member.departmentName) || "未分组"
    member.position = toText(detail.Position, member.position) || "未设置职位"
    member.permissionOptions = permissionOptions
    member.permissionGroup = permissionGroup
    member.userType = userType
    member.status = normalizeStatus(detail.Status ?? member.status)

    applyEditMemberSnapshot(member)
  } catch (error) {
    handleApiError(error, {
      title: "成员详情加载失败",
      fallback: "成员详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingMemberId.value === currentEditingId) {
      editDetailLoading.value = false
    }
  }
}

function promptDeleteEditingMember() {
  if (editSubmitting.value || deleteSubmitting.value) {
    return
  }

  deleteConfirmOpen.value = true
}

async function confirmDeleteEditingMember() {
  const memberId = editingMemberId.value
  const member = rows.value.find(row => row.id === memberId)

  if (!member || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    if (member.source === "local") {
      rows.value = rows.value.filter(row => row.id !== member.id)
    } else {
      if (!member.uuid) {
        toast.error("成员删除失败", {
          description: `${member.name} 缺少 Uuid，无法提交删除请求。`,
        })
        return
      }

      await requestMemberDelete({
        Uuid: member.uuid,
      })
      rows.value = rows.value.filter(row => row.id !== member.id)
    }

    deleteConfirmOpen.value = false
    closeEditDialog()
    toast.success("成员已删除", {
      description: `${member.name} 已从当前成员列表移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员删除失败",
      fallback: "成员删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function asMemberRow(row: Record<string, unknown>) {
  return row as MemberRow
}

function asRoleRow(row: Record<string, unknown>) {
  return row as RoleRow
}
</script>

<template>
  <SettingsRightPanelLayout
    variant="with-tabs"
    :title="props.pageTitle"
    :description="props.pageDescription"
  >
    <template #toolbar>
      <SettingsToolbarRow>
        <template #leading>
        <TopTabSwitch
          :tabs="viewTabs"
          :model-value="activeView"
          :collapse-inactive="false"
          tone="default"
          aria-label="成员管理视图切换"
          @update:model-value="activeView = $event as MemberViewKey"
        />
        </template>

        <div class="flex flex-nowrap items-center justify-end gap-2">
          <SettingsToolbarSearchInput
            v-model="searchQuery"
            :expanded="searchExpanded"
            :placeholder="currentSearchPlaceholder"
            @toggle="toggleSearch"
          />

          <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
            <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" @click="loadAllData">
              <i class="ri-refresh-line text-sm" />
              <span>刷新列表</span>
            </Button>
          </SettingsToolbarRefreshSlot>

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
            <span>{{ activeView === "roles" ? "添加角色" : "添加权限组" }}</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </template>

    <section class="space-y-5">
    <Alert
      v-if="currentErrorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/3"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>{{ activeView === "roles" ? "角色接口加载失败" : "成员接口加载失败" }}</AlertTitle>
      <AlertDescription>
        {{ currentErrorMessage }}
      </AlertDescription>
    </Alert>

    <TablePageTable
      sticky-header
      :end-spacer="false"
      :columns="currentColumns"
      :rows="currentRows"
      :row-key="currentRowKey"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-permission="{ row: rawRow }">
        <DropdownMenu v-if="activeView === 'members'">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              :disabled="isMemberPermissionUpdating(asMemberRow(rawRow).id)"
              class="inline-flex h-7 max-w-36 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:bg-surface-tertiary focus-visible:text-foreground focus-visible:outline-none"
            >
              <span class="truncate">
                {{ isMemberPermissionUpdating(asMemberRow(rawRow).id) ? "更新中..." : asMemberRow(rawRow).permissionGroup }}
              </span>
              <i class="ri-arrow-down-s-line text-sm text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[190px] rounded-xl p-1.5">
            <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
              切换角色
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="asMemberRow(rawRow).permissionGroup"
              @update:model-value="updatePermissionGroup(asMemberRow(rawRow).id, String($event))"
            >
              <DropdownMenuItem
                v-if="getAssignablePermissionOptions(asMemberRow(rawRow)).length === 0"
                disabled
                class="rounded-lg px-2.5 py-2 text-muted-foreground"
              >
                暂无可用角色
              </DropdownMenuItem>
              <DropdownMenuRadioItem
                v-for="option in getAssignablePermissionOptions(asMemberRow(rawRow))"
                :key="`${asMemberRow(rawRow).id}-${option.label}`"
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
        <Button
          v-else-if="activeView === 'roles'"
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click="openEditRoleDialog(asRoleRow(rawRow))"
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
            填写基础信息后会调用新建用户接口创建成员。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitManualMember">
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
            <label class="text-sm font-medium text-foreground" for="manual-member-permission-group">角色</label>
            <Select v-model="manualMemberForm.permissionGroup">
              <SelectTrigger id="manual-member-permission-group" class="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-if="availablePermissionGroups.length === 0" value="__no_permission_group__" disabled>
                  暂无可用角色
                </SelectItem>
                <SelectItem
                  v-for="option in availablePermissionGroups"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" :disabled="manualSubmitting" @click="manualDialogOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="manualSubmitting">
              {{ manualSubmitting ? "创建中..." : "添加成员" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="roleDialogOpen" @update:open="($event ? (roleDialogOpen = true) : closeRoleDialog())">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{{ editingRoleId === null ? "添加角色" : "编辑角色" }}</DialogTitle>
          <DialogDescription>
            {{ editingRoleId === null ? "填写角色名称和备注后，将调用角色新建接口保存。" : "修改角色名称和备注后，保存时会调用角色更新接口。" }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitRole">
          <p v-if="roleDetailLoading" class="text-sm text-muted-foreground">
            正在加载角色详情并回填表单...
          </p>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="role-name">角色名称</label>
            <Input id="role-name" v-model="roleForm.name" :disabled="roleDetailLoading" placeholder="请输入角色名称" />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="role-remark">备注</label>
            <Input id="role-remark" v-model="roleForm.remark" :disabled="roleDetailLoading" placeholder="请输入角色备注" />
          </div>

          <DialogFooter :class="editingRoleId === null ? 'pt-2' : 'pt-2 sm:justify-between'">
            <Button
              v-if="editingRoleId !== null"
              type="button"
              variant="outline"
              class="border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
              :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting"
              @click="promptDeleteEditingRole"
            >
              {{ roleDeleteSubmitting ? "删除中..." : "删除角色" }}
            </Button>
            <div class="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting" @click="closeRoleDialog">
                取消
              </Button>
              <Button type="submit" :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting || !roleForm.name.trim()">
                {{ roleSubmitting ? "保存中..." : editingRoleId === null ? "添加角色" : "保存" }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="($event ? (editDialogOpen = true) : closeEditDialog())">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑用户信息</DialogTitle>
          <DialogDescription>
            修改成员基础信息后，保存时会调用用户更新接口。
          </DialogDescription>
          <p v-if="editDetailLoading" class="text-sm text-muted-foreground">
            正在同步用户详情...
          </p>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitEditMember">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-name">成员姓名</label>
              <Input id="edit-member-name" v-model="editMemberForm.name" :disabled="editDetailLoading" placeholder="请输入成员姓名" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-phone">手机号</label>
              <Input id="edit-member-phone" v-model="editMemberForm.phone" :disabled="editDetailLoading" placeholder="请输入手机号" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-department">部门</label>
              <Input id="edit-member-department" v-model="editMemberForm.departmentName" :disabled="editDetailLoading" placeholder="例如：运营中心" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-position">职位</label>
              <Input id="edit-member-position" v-model="editMemberForm.position" :disabled="editDetailLoading" placeholder="例如：调度主管" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-member-permission-group">角色</label>
              <Select v-model="editMemberForm.permissionGroup" :disabled="editDetailLoading">
                <SelectTrigger id="edit-member-permission-group" class="w-full">
                <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in editPermissionGroupOptions"
                    :key="option.label"
                    :value="option.label"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-status">成员状态</label>
              <Select v-model="editMemberForm.status" :disabled="editDetailLoading">
                <SelectTrigger id="edit-member-status" class="w-full">
                  <SelectValue placeholder="选择成员状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正常">
                    正常
                  </SelectItem>
                  <SelectItem value="离职">
                    离职
                  </SelectItem>
                  <SelectItem v-if="editMemberForm.status === '未知状态'" value="未知状态">
                    未知状态
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              class="border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              @click="promptDeleteEditingMember"
            >
              {{ deleteSubmitting ? "删除中..." : "删除用户" }}
            </Button>
            <div class="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" :disabled="editDetailLoading || editSubmitting || deleteSubmitting" @click="closeEditDialog">
                取消
              </Button>
              <Button type="submit" :disabled="editDetailLoading || editSubmitting || deleteSubmitting">
                {{ editSubmitting ? "保存中..." : "保存" }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前成员，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            :disabled="deleteSubmitting"
            @click="confirmDeleteEditingMember"
          >
            {{ deleteSubmitting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="roleDeleteConfirmOpen" @update:open="roleDeleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除角色？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前角色，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="roleDeleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            :disabled="roleDeleteSubmitting"
            @click="confirmDeleteEditingRole"
          >
            {{ roleDeleteSubmitting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
  </SettingsRightPanelLayout>
</template>
