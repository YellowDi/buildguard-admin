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
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import { fetchMenus, type MenuRecord } from "@/lib/menus-api"
import {
  bindMemberRoles,
  createMember as requestMemberCreate,
  deleteMember as requestMemberDelete,
  fetchMembers,
  getMemberDetail,
  updateMember as requestMemberUpdate,
  updateMemberStatus as requestMemberStatusUpdate,
  updateMemberUserType,
} from "@/lib/members-api"
import {
  bindRoleMenus,
  createRole as requestRoleCreate,
  deleteRole as requestRoleDelete,
  fetchRoles,
  getRoleDetail,
  updateRole as requestRoleUpdate,
} from "@/lib/roles-api"
import { fetchSystemButtons, type SystemResourceRecord } from "@/lib/system-resources-api"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

type MemberViewKey = "members" | "roles"
type MemberUserType = 1 | 2 | 3

type MemberRow = {
  id: number
  uuid: string
  name: string
  phone: string
  departmentUuid: string
  departmentName: string
  position: string
  roleNames: string[]
  roleUuids: string[]
  rolesLoaded: boolean
  userTypes: MemberUserType[]
  userTypeLabel: string
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

type ManualMemberForm = {
  name: string
  phone: string
  departmentName: string
  position: string
  userTypes: string[]
  roleUuid: string
}

type RoleForm = {
  name: string
  remark: string
  selectedMenuUuids: string[]
}

type EditMemberForm = {
  name: string
  phone: string
  departmentName: string
  position: string
  userTypes: string[]
  roleUuid: string
  status: string
}

type RoleOption = {
  label: string
  value: string
}

type MemberActionKey =
  | "manual"
  | "import-excel"
  | "sync-directory"
  | "create-role"
  | "view"
  | "invite"
  | "disable"

type PermissionMenuRow = {
  id: string
  uuid: string
  name: string
  path: string
  parentUuid: string
  parentName: string
  level: number
  sort: number
}

type PermissionButtonRow = {
  id: string
  uuid: string
  name: string
  code: string
  menuUuid: string
  menuName: string
}

type PermissionPanelButtonRow = PermissionButtonRow

type PermissionMenuGroup = {
  key: string
  title: string
  path: string
  rows: Array<PermissionMenuRow & { depth: number }>
  visibleRows: Array<PermissionMenuRow & { depth: number }>
}

type SelectedPermissionMenuPanel = PermissionMenuRow & {
  depth: number
  rootKey: string
  rootName: string
  rootPath: string
  buttons: PermissionPanelButtonRow[]
}

type SelectedPermissionMenuGroup = {
  key: string
  title: string
  path: string
  panels: SelectedPermissionMenuPanel[]
  visiblePanels: SelectedPermissionMenuPanel[]
}

const MEMBERS_LOAD_ERROR_MESSAGE = "成员列表加载失败，请稍后重试。"
const MEMBER_STATUS_UPDATE_ERROR_MESSAGE = "成员状态更新失败，请稍后重试。"
const MEMBER_UPDATE_ERROR_MESSAGE = "成员信息更新失败，请稍后重试。"
const MEMBER_USER_TYPE_OPTIONS = [
  { label: "后台", value: 1 },
  { label: "检修", value: 2 },
  { label: "维修", value: 3 },
] as const
const MEMBER_STATUS_OPTIONS = [
  { label: "正常", value: 1 },
  { label: "离职", value: 2 },
] as const
const MEMBER_ROLE_UNASSIGNED = "__member_role_unassigned__"

const rows = ref<MemberRow[]>([])
const roleRows = ref<RoleRow[]>([])
const loading = ref(false)
const rolesLoading = ref(false)
const errorMessage = ref("")
const rolesErrorMessage = ref("")
const permissionUpdatingMemberIds = ref<number[]>([])
const userTypeUpdatingMemberIds = ref<number[]>([])
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
const searchExpanded = ref(false)
const searchQuery = ref("")
const permissionMenuRows = ref<PermissionMenuRow[]>([])
const permissionButtonRows = ref<PermissionButtonRow[]>([])
const rolePermissionResourcesLoading = ref(false)
const rolePermissionResourcesLoaded = ref(false)
const rolePermissionResourcesErrorMessage = ref("")
const collapsedPermissionGroupKeys = ref<string[]>([])
const manualMemberForm = ref(createManualMemberForm())
const roleForm = ref(createRoleForm())
const editMemberForm = ref(createEditMemberForm())
const availableRoleOptions = computed<RoleOption[]>(() => roleRows.value
  .filter(role => role.uuid)
  .map(role => ({
    label: role.name,
    value: role.uuid,
  })))

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
    key: "roleSummary",
    label: "权限组",
    filterType: "tag",
    slot: "cell-role",
  },
  {
    key: "userTypeLabel",
    label: "用户类型",
    filterType: "tag",
    slot: "cell-user-type",
  },
  {
    key: "status",
    label: "状态",
    filterType: "tag",
    width: "fill",
    slot: "cell-status",
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

const viewTabs = computed(() => [
  {
    id: "members",
    label: "成员列表",
    badge: rows.value.length,
  },
  {
    id: "roles",
    label: "权限组",
    badge: roleRows.value.length,
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
      getRoleSummary(row),
      row.userTypeLabel,
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

const currentColumns = computed(() => {
  if (activeView.value === "roles") {
    return roleColumns
  }

  return memberColumns
})

const currentRows = computed<Record<string, unknown>[]>(() => {
  if (activeView.value === "roles") {
    return filteredRoleRows.value
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

  return rows.value.length
})

const currentSearchPlaceholder = computed(() => {
  if (activeView.value === "roles") {
    return "搜索角色名称或备注"
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

const selectedMenuSet = computed(() => new Set(roleForm.value.selectedMenuUuids))

const menuRowsByUuid = computed(() => new Map(permissionMenuRows.value.map(row => [row.uuid, row])))

function resolvePermissionMenuRoot(row: PermissionMenuRow) {
  let current = row
  let guard = 0

  while (current.parentUuid && menuRowsByUuid.value.has(current.parentUuid) && guard < 16) {
    current = menuRowsByUuid.value.get(current.parentUuid) as PermissionMenuRow
    guard += 1
  }

  return current
}

const menuPermissionGroups = computed(() => {
  const rows = [...permissionMenuRows.value]
    .sort((left, right) => left.level - right.level || left.sort - right.sort || left.name.localeCompare(right.name, "zh-Hans-CN"))

  const groups = new Map<string, PermissionMenuGroup>()

  rows.forEach((row) => {
    const root = resolvePermissionMenuRoot(row)
    const depth = Math.max(0, row.level - root.level)
    const key = root.uuid || root.id
    const current = groups.get(key)

    if (current) {
      current.rows.push({
        ...row,
        depth,
      })
      return
    }

    groups.set(key, {
      key,
      title: root.name,
      path: root.path,
      rows: [{
        ...row,
        depth,
      }],
      visibleRows: [],
    })
  })

  return Array.from(groups.values())
    .map((group) => {
      const hasNestedRows = group.rows.some(row => row.depth > 0)
      const visibleRows = hasNestedRows
        ? group.rows.filter(row => !(row.depth === 0 && row.name === group.title && row.path === group.path))
        : group.rows

      return {
        ...group,
        visibleRows,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title, "zh-Hans-CN"))
})

const allPermissionButtonRows = computed<PermissionPanelButtonRow[]>(() => permissionButtonRows.value)

const selectedPermissionMenus = computed(() => permissionMenuRows.value
  .filter(row => row.uuid && selectedMenuSet.value.has(row.uuid))
  .sort((left, right) => left.level - right.level || left.sort - right.sort || left.name.localeCompare(right.name, "zh-Hans-CN")))

const selectedMenuPermissionPanels = computed<SelectedPermissionMenuPanel[]>(() => {
  const buttonRowsByMenu = new Map<string, PermissionPanelButtonRow[]>()

  allPermissionButtonRows.value
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN") || left.code.localeCompare(right.code, "zh-Hans-CN"))
    .forEach((button) => {
      const current = buttonRowsByMenu.get(button.menuUuid) ?? []
      current.push(button)
      buttonRowsByMenu.set(button.menuUuid, current)
    })

  return selectedPermissionMenus.value
    .map((menu) => {
      const root = resolvePermissionMenuRoot(menu)

      return {
        ...menu,
        depth: Math.max(0, menu.level - root.level),
        rootKey: root.uuid || root.id,
        rootName: root.name,
        rootPath: root.path,
        buttons: buttonRowsByMenu.get(menu.uuid) ?? [],
      }
    })
    .sort((left, right) => (
      left.rootName.localeCompare(right.rootName, "zh-Hans-CN")
      || left.level - right.level
      || left.sort - right.sort
      || left.name.localeCompare(right.name, "zh-Hans-CN")
    ))
})

const selectedMenuPermissionGroups = computed<SelectedPermissionMenuGroup[]>(() => {
  const groups = new Map<string, SelectedPermissionMenuGroup>()

  selectedMenuPermissionPanels.value.forEach((panel) => {
    const current = groups.get(panel.rootKey)

    if (current) {
      current.panels.push(panel)
      return
    }

    groups.set(panel.rootKey, {
      key: panel.rootKey,
      title: panel.rootName,
      path: panel.rootPath,
      panels: [panel],
      visiblePanels: [],
    })
  })

  return Array.from(groups.values())
    .map((group) => {
      const hasNestedPanels = group.panels.some(panel => panel.depth > 0)
      const visiblePanels = hasNestedPanels
        ? group.panels.filter(panel => !(panel.depth === 0 && panel.name === group.title && panel.path === group.path))
        : group.panels

      return {
        ...group,
        visiblePanels,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title, "zh-Hans-CN"))
})

const selectedMenuCount = computed(() => roleForm.value.selectedMenuUuids.length)
const selectedButtonCount = computed(() => selectedMenuPermissionPanels.value.reduce((total, panel) => total + panel.buttons.length, 0))
const menuSelectionState = computed<boolean | "indeterminate">(() => {
  if (permissionMenuRows.value.length === 0 || selectedMenuCount.value === 0) {
    return false
  }

  if (selectedMenuCount.value >= permissionMenuRows.value.length) {
    return true
  }

  return "indeterminate"
})

let rolePermissionResourcesPromise: Promise<void> | null = null

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

async function ensureRolePermissionResources(options?: { force?: boolean }) {
  const force = options?.force === true

  if (!force && rolePermissionResourcesLoaded.value) {
    return
  }

  if (rolePermissionResourcesPromise) {
    return rolePermissionResourcesPromise
  }

  rolePermissionResourcesLoading.value = true
  rolePermissionResourcesErrorMessage.value = ""

  rolePermissionResourcesPromise = (async () => {
    const [menusResult, buttonsResult] = await Promise.allSettled([
      fetchMenus({
        Name: "",
        Status: 0,
        PageNum: 0,
        PageSize: 0,
      }),
      fetchSystemButtons(),
    ])

    let errorMessages: string[] = []

    if (menusResult.status === "fulfilled") {
      permissionMenuRows.value = menusResult.value.list.map((item, index) => normalizePermissionMenu(item, index))
    } else {
      permissionMenuRows.value = []
      errorMessages = [
        ...errorMessages,
        handleApiError(menusResult.reason, {
          mode: "silent",
          fallback: "页面权限列表加载失败，请稍后重试。",
        }),
      ]
    }

    if (buttonsResult.status === "fulfilled") {
      permissionButtonRows.value = buttonsResult.value.list.map((item, index) => normalizePermissionButton(item, index))
    } else {
      permissionButtonRows.value = []
      errorMessages = [
        ...errorMessages,
        handleApiError(buttonsResult.reason, {
          mode: "silent",
          fallback: "按钮权限列表加载失败，请稍后重试。",
        }),
      ]
    }

    rolePermissionResourcesLoaded.value = true
    rolePermissionResourcesErrorMessage.value = errorMessages.join(" ")
  })()

  try {
    await rolePermissionResourcesPromise
  } finally {
    rolePermissionResourcesPromise = null
    rolePermissionResourcesLoading.value = false
  }
}

function normalizeMemberRow(raw: unknown, index: number): MemberRow {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const userTypes = normalizeUserTypes(record.UserType)
  const normalizedRoles = normalizeMemberRoles(record.Roles)

  return {
    id: toNumber(record.Id, index + 1),
    uuid: toText(record.Uuid),
    name: toText(record.Name, `成员 ${index + 1}`),
    phone: toText(record.Phone, "-"),
    departmentUuid: toText(record.DepartmentUuid),
    departmentName: toText(record.DepartmentName, "未分组"),
    position: toText(record.Position, "未设置职位"),
    roleNames: normalizedRoles.names,
    roleUuids: normalizedRoles.uuids,
    rolesLoaded: Array.isArray(record.Roles),
    userTypes,
    userTypeLabel: formatUserTypeLabel(userTypes),
    status: normalizeStatus(record.Status),
    source: "remote",
  }
}

async function hydrateMemberRolesFromDetail(memberRows: MemberRow[]) {
  const missingRoleRows = memberRows.filter(row => row.uuid && !row.rolesLoaded)

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

    const userTypes = normalizeUserTypes(result.value.detail.UserType)
    const normalizedRoles = normalizeMemberRoles(result.value.detail.Roles)

    result.value.row.roleUuids = normalizedRoles.uuids
    result.value.row.roleNames = normalizedRoles.names
    result.value.row.rolesLoaded = true
    result.value.row.userTypes = userTypes
    result.value.row.userTypeLabel = formatUserTypeLabel(userTypes)
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

function normalizePermissionMenu(raw: MenuRecord, index: number): PermissionMenuRow {
  const id = toNumber(raw.Id, index + 1)

  return {
    id: toText(raw.Uuid, `permission-menu-${id}`),
    uuid: toText(raw.Uuid),
    name: toText(raw.Name, `页面 ${id}`),
    path: toText(raw.Path, "/"),
    parentUuid: toText(raw.ParentUuid),
    parentName: toText(raw.ParentName, "顶级页面"),
    level: toNumber(raw.Level, 0),
    sort: toNumber(raw.Sort, 0),
  }
}

function normalizePermissionButton(raw: SystemResourceRecord, index: number): PermissionButtonRow {
  const numericId = toNumber(raw.Id, index + 1)

  return {
    id: toText(raw.Uuid, raw.Id, `permission-button-${numericId}`),
    uuid: toText(raw.Uuid),
    name: toText(raw.Name, `按钮 ${numericId}`),
    code: toText(raw.Code, "-"),
    menuUuid: toText(raw.MenuUuid),
    menuName: toText(raw.MenuName, "未绑定页面"),
  }
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

function normalizeUserTypes(value: unknown): MemberUserType[] {
  const values = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === ""
      ? []
      : [value]

  const normalizedValues = Array.from(new Set(
    values
      .map((item) => {
        const parsed = typeof item === "string" ? Number(item.trim()) : Number(item)

        if (parsed === 1 || parsed === 2 || parsed === 3) {
          return parsed
        }

        return null
      })
      .filter((item): item is MemberUserType => item !== null),
  ))

  return MEMBER_USER_TYPE_OPTIONS
    .map(option => option.value)
    .filter(optionValue => normalizedValues.includes(optionValue))
}

function formatUserTypeLabel(values: MemberUserType[]) {
  const labels = normalizeUserTypes(values)
    .map(value => MEMBER_USER_TYPE_OPTIONS.find(option => option.value === value)?.label ?? "")
    .filter(Boolean)

  if (labels.length === 0) {
    return "未设置"
  }

  return labels.join("、")
}

function getUserTypeValues(value: unknown): MemberUserType[] {
  return normalizeUserTypes(value)
}

function isSameUserTypes(left: MemberUserType[], right: MemberUserType[]) {
  const normalizedLeft = normalizeUserTypes(left)
  const normalizedRight = normalizeUserTypes(right)

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function normalizeRoleMenuUuids(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim()
        }

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>
          return toText(record.Uuid, record.MenuUuid, record.uuid, record.menuUuid)
        }

        return ""
      })
      .filter(Boolean)
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return normalizeRoleMenuUuids(record.MenuUuids ?? record.Menus ?? record.menuUuids ?? record.menus)
  }

  return []
}

function normalizeMemberRoles(value: unknown) {
  if (!Array.isArray(value)) {
    return {
      uuids: [] as string[],
      names: [] as string[],
    }
  }

  const uuids: string[] = []
  const names: string[] = []

  value.forEach((item) => {
    const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
    const uuid = toText(record.RoleUuid, record.Uuid, record.uuid)
    const name = toText(record.RoleName, record.Name, record.name)

    if (uuid) {
      uuids.push(uuid)
    }

    if (name) {
      names.push(name)
    }
  })

  return {
    uuids: Array.from(new Set(uuids)),
    names: Array.from(new Set(names)),
  }
}

function getRoleSummary(member: MemberRow) {
  if (member.roleNames.length > 0) {
    return member.roleNames.join("、")
  }

  return "未分配"
}

function getPrimaryRoleUuid(member: MemberRow) {
  return member.roleUuids[0] ?? MEMBER_ROLE_UNASSIGNED
}

function getRoleNameByUuid(roleUuid: string) {
  return roleRows.value.find(role => role.uuid === roleUuid)?.name ?? ""
}

function normalizeRoleSelectionValue(value: string) {
  return value === MEMBER_ROLE_UNASSIGNED ? "" : value
}

function updateRoleMenuSelection(menuUuid: string, checked: boolean) {
  const nextSelectedMenus = new Set(roleForm.value.selectedMenuUuids)

  if (checked) {
    nextSelectedMenus.add(menuUuid)
  } else {
    nextSelectedMenus.delete(menuUuid)
  }

  roleForm.value.selectedMenuUuids = Array.from(nextSelectedMenus)
}

function getPermissionGroupSelectionState(group: PermissionMenuGroup): boolean | "indeterminate" {
  if (group.visibleRows.length === 0) {
    return false
  }

  const selectedCount = group.visibleRows.filter(row => selectedMenuSet.value.has(row.uuid)).length

  if (selectedCount === 0) {
    return false
  }

  if (selectedCount >= group.visibleRows.length) {
    return true
  }

  return "indeterminate"
}

function togglePermissionGroupRows(group: PermissionMenuGroup, checked: boolean) {
  const nextSelectedMenus = new Set(roleForm.value.selectedMenuUuids)

  group.visibleRows.forEach((row) => {
    if (checked) {
      nextSelectedMenus.add(row.uuid)
      return
    }

    nextSelectedMenus.delete(row.uuid)
  })

  roleForm.value.selectedMenuUuids = Array.from(nextSelectedMenus)
}

function toggleAllMenus(checked: boolean) {
  roleForm.value.selectedMenuUuids = checked
    ? permissionMenuRows.value.map(row => row.uuid).filter(Boolean)
    : []
}

function isPermissionGroupCollapsed(groupKey: string) {
  return collapsedPermissionGroupKeys.value.includes(groupKey)
}

function togglePermissionGroup(groupKey: string) {
  if (isPermissionGroupCollapsed(groupKey)) {
    collapsedPermissionGroupKeys.value = collapsedPermissionGroupKeys.value.filter(key => key !== groupKey)
    return
  }

  collapsedPermissionGroupKeys.value = [...collapsedPermissionGroupKeys.value, groupKey]
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

function buildMemberUpdatePayload(member: MemberRow) {
  return {
    Uuid: member.uuid || undefined,
    DepartmentUuid: member.departmentUuid || undefined,
    Name: member.name,
    Phone: member.phone === "-" ? "" : member.phone,
    Position: member.position === "未设置职位" ? "" : member.position,
    Status: toStatusValue(member.status),
  }
}

function isMemberPermissionUpdating(memberId: number) {
  return permissionUpdatingMemberIds.value.includes(memberId)
}

async function updateMemberRole(memberId: number, nextRoleUuidValue: string) {
  const member = rows.value.find(row => row.id === memberId)
  const nextRoleUuid = normalizeRoleSelectionValue(nextRoleUuidValue)

  if (!member || isMemberPermissionUpdating(memberId) || getPrimaryRoleUuid(member) === (nextRoleUuid || MEMBER_ROLE_UNASSIGNED)) {
    return
  }

  if (!member.uuid) {
    toast.error("成员权限组更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
    })
    return
  }

  permissionUpdatingMemberIds.value = [...permissionUpdatingMemberIds.value, memberId]

  try {
    await bindMemberRoles({
      Uuid: member.uuid,
      RoleUuids: nextRoleUuid ? [nextRoleUuid] : [],
    })

    member.roleUuids = nextRoleUuid ? [nextRoleUuid] : []
    member.roleNames = nextRoleUuid ? [getRoleNameByUuid(nextRoleUuid) || "未命名权限组"] : []
    member.rolesLoaded = true
    toast.success("权限组已更新", {
      description: nextRoleUuid
        ? `${member.name} 已切换到 ${member.roleNames[0]}。`
        : `${member.name} 已取消权限组绑定。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员权限组更新失败",
      fallback: "成员权限组更新失败，请稍后重试。",
    })
  } finally {
    permissionUpdatingMemberIds.value = permissionUpdatingMemberIds.value.filter(id => id !== memberId)
  }
}

function isMemberUserTypeUpdating(memberId: number) {
  return userTypeUpdatingMemberIds.value.includes(memberId)
}

async function updateMemberUserTypesInline(memberId: number, nextUserTypeValues: string[]) {
  const member = rows.value.find(row => row.id === memberId)
  const nextUserTypes = getUserTypeValues(nextUserTypeValues)

  if (!member || isMemberUserTypeUpdating(memberId) || isSameUserTypes(member.userTypes, nextUserTypes)) {
    return
  }

  if (nextUserTypes.length === 0) {
    toast.error("成员类型更新失败", {
      description: "至少选择一个用户类型。",
    })
    return
  }

  if (!member.uuid) {
    toast.error("成员类型更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
    })
    return
  }

  userTypeUpdatingMemberIds.value = [...userTypeUpdatingMemberIds.value, memberId]

  try {
    await updateMemberUserType({
      Uuid: member.uuid,
      UserType: nextUserTypes,
    })

    member.userTypes = nextUserTypes
    member.userTypeLabel = formatUserTypeLabel(nextUserTypes)
    toast.success("用户类型已更新", {
      description: `${member.name} 已更新为 ${member.userTypeLabel}。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "成员类型更新失败",
      fallback: "成员类型更新失败，请稍后重试。",
    })
  } finally {
    userTypeUpdatingMemberIds.value = userTypeUpdatingMemberIds.value.filter(id => id !== memberId)
  }
}

function isMemberStatusUpdating(memberId: number) {
  return statusUpdatingMemberIds.value.includes(memberId)
}

async function updateMemberStatus(member: MemberRow, nextStatus: number) {
  if (isMemberStatusUpdating(member.id) || toStatusValue(member.status) === nextStatus) {
    return
  }

  if (!member.uuid) {
    toast.error("成员状态更新失败", {
      description: `${member.name} 缺少用户 UUID，无法提交更新。`,
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
      description: `${member.name} 已切换为${member.status}。`,
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
    void openRoleDialog()
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
  }
}

function createManualMemberForm(): ManualMemberForm {
  return {
    name: "",
    phone: "",
    departmentName: "",
    position: "",
    userTypes: ["1"],
    roleUuid: MEMBER_ROLE_UNASSIGNED,
  }
}

function createRoleForm(): RoleForm {
  return {
    name: "",
    remark: "",
    selectedMenuUuids: [],
  }
}

function createEditMemberForm(): EditMemberForm {
  return {
    name: "",
    phone: "",
    departmentName: "",
    position: "",
    userTypes: ["1"],
    roleUuid: MEMBER_ROLE_UNASSIGNED,
    status: "",
  }
}

function openManualMemberDialog() {
  manualMemberForm.value = createManualMemberForm()
  manualDialogOpen.value = true
}

async function openRoleDialog() {
  editingRoleId.value = null
  editingRoleUuid.value = ""
  roleDetailLoading.value = false
  roleDeleteConfirmOpen.value = false
  roleForm.value = createRoleForm()
  roleDialogOpen.value = true
  await ensureRolePermissionResources({
    force: Boolean(rolePermissionResourcesErrorMessage.value),
  })
}

async function openEditRoleDialog(role: RoleRow) {
  editingRoleId.value = role.id
  editingRoleUuid.value = role.uuid
  roleDetailLoading.value = false
  roleDeleteConfirmOpen.value = false
  roleForm.value = createRoleForm()
  applyRoleSnapshot(role)
  roleDialogOpen.value = true
  await ensureRolePermissionResources({
    force: Boolean(rolePermissionResourcesErrorMessage.value),
  })

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

  const userTypes = getUserTypeValues(manualMemberForm.value.userTypes)

  if (userTypes.length === 0) {
    toast.error("成员创建失败", {
      description: "请至少选择一个有效的用户类型。",
    })
    return
  }

  manualSubmitting.value = true

  try {
    const result = await requestMemberCreate({
      DepartmentUuid: departmentMatch?.departmentUuid || undefined,
      Name: name,
      Phone: manualMemberForm.value.phone.trim() || undefined,
      Position: manualMemberForm.value.position.trim() || undefined,
      UserType: userTypes,
    })

    const selectedRoleUuid = normalizeRoleSelectionValue(manualMemberForm.value.roleUuid)

    if (selectedRoleUuid && result.Uuid) {
      await bindMemberRoles({
        Uuid: result.Uuid,
        RoleUuids: [selectedRoleUuid],
      })
    }

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
    let savedRoleUuid = editingRoleUuidValue

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

      savedRoleUuid = result.Uuid || editingRoleUuidValue

      await bindRoleMenus({
        RoleUuid: savedRoleUuid,
        MenuUuids: roleForm.value.selectedMenuUuids,
      })

      closeRoleDialog()
      roleForm.value = createRoleForm()
      toast.success("角色已更新", {
        description: `${name} 的信息和菜单权限已保存。`,
      })
    } else {
      const result = await requestRoleCreate({
        Name: name,
        Remark: roleForm.value.remark.trim() || undefined,
      })

      if (result.Uuid) {
        editingRoleUuid.value = result.Uuid
      }

      savedRoleUuid = result.Uuid || ""

      if (!savedRoleUuid) {
        toast.error("角色创建失败", {
          description: `${name} 缺少角色 Uuid，无法保存菜单权限。`,
        })
        return
      }

      await bindRoleMenus({
        RoleUuid: savedRoleUuid,
        MenuUuids: roleForm.value.selectedMenuUuids,
      })

      closeRoleDialog()
      roleForm.value = createRoleForm()
      toast.success("角色已创建", {
        description: `${name} 已创建并完成菜单权限分配。`,
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
    selectedMenuUuids: roleForm.value.selectedMenuUuids,
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

    roleForm.value.selectedMenuUuids = normalizeRoleMenuUuids(detail)
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

  const nextUserTypes = getUserTypeValues(editMemberForm.value.userTypes)

  if (nextUserTypes.length === 0) {
    toast.error("成员信息更新失败", {
      description: "请至少选择一个有效的用户类型。",
    })
    return
  }

  editSubmitting.value = true

  try {
    const nextRoleUuid = normalizeRoleSelectionValue(editMemberForm.value.roleUuid)
    const currentRoleUuid = normalizeRoleSelectionValue(getPrimaryRoleUuid(member))
    const nextMember: MemberRow = {
      ...member,
      name,
      phone: editMemberForm.value.phone.trim() || "-",
      departmentName: editMemberForm.value.departmentName.trim() || "未分组",
      position: editMemberForm.value.position.trim() || "未设置职位",
      roleUuids: nextRoleUuid ? [nextRoleUuid] : [],
      roleNames: nextRoleUuid ? [getRoleNameByUuid(nextRoleUuid) || "未命名权限组"] : [],
      rolesLoaded: true,
      userTypes: nextUserTypes,
      userTypeLabel: formatUserTypeLabel(nextUserTypes),
      status: editMemberForm.value.status || member.status,
    }

    await requestMemberUpdate(buildMemberUpdatePayload(nextMember))

    if (!isSameUserTypes(member.userTypes, nextUserTypes)) {
      await updateMemberUserType({
        Uuid: member.uuid,
        UserType: nextUserTypes,
      })
    }

    if (currentRoleUuid !== nextRoleUuid) {
      await bindMemberRoles({
        Uuid: member.uuid,
        RoleUuids: nextRoleUuid ? [nextRoleUuid] : [],
      })
    }

    member.name = nextMember.name
    member.phone = nextMember.phone
    member.departmentName = nextMember.departmentName
    member.position = nextMember.position
    member.roleUuids = nextMember.roleUuids
    member.roleNames = nextMember.roleNames
    member.rolesLoaded = true
    member.userTypes = nextMember.userTypes
    member.userTypeLabel = nextMember.userTypeLabel
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
  editMemberForm.value = {
    name: member.name,
    phone: member.phone === "-" ? "" : member.phone,
    departmentName: member.departmentName === "未分组" ? "" : member.departmentName,
    position: member.position === "未设置职位" ? "" : member.position,
    userTypes: member.userTypes.map(value => String(value)),
    roleUuid: getPrimaryRoleUuid(member),
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

    const userTypes = normalizeUserTypes(detail.UserType)
    const normalizedRoles = normalizeMemberRoles(detail.Roles)

    member.uuid = toText(detail.Uuid, member.uuid)
    member.name = toText(detail.Name, member.name)
    member.phone = toText(detail.Phone, member.phone === "-" ? "" : member.phone) || "-"
    member.departmentUuid = toText(detail.DepartmentUuid, member.departmentUuid)
    member.departmentName = toText(detail.DepartmentName, member.departmentName) || "未分组"
    member.position = toText(detail.Position, member.position) || "未设置职位"
    member.roleUuids = normalizedRoles.uuids
    member.roleNames = normalizedRoles.names
    member.rolesLoaded = true
    member.userTypes = userTypes
    member.userTypeLabel = formatUserTypeLabel(userTypes)
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

function handleCurrentRowClick(row: Record<string, unknown>) {
  if (activeView.value === "members") {
    void openEditMemberDialog(asMemberRow(row))
    return
  }

  if (activeView.value === "roles") {
    void openEditRoleDialog(asRoleRow(row))
  }
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

        <div class="flex flex-nowrap items-center justify-end gap-1">
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
              <Tooltip>
                <TooltipTrigger as-child>
                  <DropdownMenuTrigger as-child>
                    <Button
                      class="h-8 w-8 rounded-l-none border-l border-border/60 px-0 text-[14px]"
                      aria-label="打开成员操作菜单"
                    >
                      <i class="ri-arrow-down-s-line text-base" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>打开成员操作菜单</TooltipContent>
              </Tooltip>
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
            <span>添加权限组</span>
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
      show-index
      sticky-header
      :end-spacer="false"
      :show-index-checkbox="false"
      :edge-gutter="false"
      :show-row-action-icons="true"
      :columns="currentColumns"
      :rows="currentRows"
      :row-key="currentRowKey"
      :on-row-click="handleCurrentRowClick"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-role="{ row: rawRow }">
        <DropdownMenu v-if="activeView === 'members'">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              :disabled="isMemberPermissionUpdating(asMemberRow(rawRow).id)"
              class="inline-flex h-7 max-w-36 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:bg-surface-tertiary focus-visible:text-foreground focus-visible:outline-none"
            >
              <span class="truncate">
                {{ isMemberPermissionUpdating(asMemberRow(rawRow).id) ? "更新中..." : getRoleSummary(asMemberRow(rawRow)) }}
              </span>
              <i class="ri-arrow-down-s-line text-sm text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[190px] rounded-xl p-1.5">
            <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
              切换权限组
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="getPrimaryRoleUuid(asMemberRow(rawRow))"
              @update:model-value="updateMemberRole(asMemberRow(rawRow).id, String($event))"
            >
              <DropdownMenuRadioItem :value="MEMBER_ROLE_UNASSIGNED" class="rounded-lg py-2 pr-2 pl-8">
                未分配
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                v-for="option in availableRoleOptions"
                :key="`${asMemberRow(rawRow).id}-${option.value}`"
                :value="option.value"
                class="rounded-lg py-2 pr-2 pl-8"
              >
                {{ option.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>

      <template #cell-user-type="{ row: rawRow }">
        <Select
          v-if="activeView === 'members'"
          multiple
          :model-value="asMemberRow(rawRow).userTypes.map(value => String(value))"
          :disabled="isMemberUserTypeUpdating(asMemberRow(rawRow).id)"
          @update:model-value="updateMemberUserTypesInline(asMemberRow(rawRow).id, ($event as string[]) ?? [])"
        >
          <SelectTrigger
            class="h-7 max-w-40 border-0 bg-transparent px-1.5 text-[12px] font-medium shadow-none hover:bg-surface-tertiary focus-visible:bg-surface-tertiary"
            @click.stop
          >
            <span class="truncate">
              {{ isMemberUserTypeUpdating(asMemberRow(rawRow).id) ? "更新中..." : asMemberRow(rawRow).userTypeLabel }}
            </span>
          </SelectTrigger>
          <SelectContent class="w-[200px] rounded-xl p-1.5" @click.stop>
            <SelectItem
              v-for="option in MEMBER_USER_TYPE_OPTIONS"
              :key="`${asMemberRow(rawRow).id}-type-${option.value}`"
              :value="String(option.value)"
              class="rounded-lg py-2 pr-8"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>

      <template #cell-status="{ row: rawRow }">
        <DropdownMenu v-if="activeView === 'members'">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              :disabled="isMemberStatusUpdating(asMemberRow(rawRow).id)"
              class="inline-flex h-7 max-w-24 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:bg-surface-tertiary focus-visible:text-foreground focus-visible:outline-none"
            >
              <span class="truncate">
                {{ isMemberStatusUpdating(asMemberRow(rawRow).id) ? "更新中..." : asMemberRow(rawRow).status }}
              </span>
              <i class="ri-arrow-down-s-line text-sm text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[150px] rounded-xl p-1.5">
            <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
              切换成员状态
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="String(toStatusValue(asMemberRow(rawRow).status))"
              @update:model-value="updateMemberStatus(asMemberRow(rawRow), Number($event))"
            >
              <DropdownMenuRadioItem
                v-for="option in MEMBER_STATUS_OPTIONS"
                :key="`${asMemberRow(rawRow).id}-status-${option.value}`"
                :value="String(option.value)"
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
          class="ml-auto h-7 gap-1.5 rounded-md px-2.5 text-[13px]"
          @click.stop="openEditMemberDialog(asMemberRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
        <Button
          v-else-if="activeView === 'roles'"
          variant="outline"
          size="sm"
          class="ml-auto h-7 gap-1.5 rounded-md px-2.5 text-[13px]"
          @click.stop="openEditRoleDialog(asRoleRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="manualDialogOpen" @update:open="manualDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="sm:max-w-[520px]">
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

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground">用户类型</label>
              <Select v-model="manualMemberForm.userTypes" multiple>
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择用户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in MEMBER_USER_TYPE_OPTIONS"
                    :key="`manual-member-type-${option.value}`"
                    :value="String(option.value)"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="manual-member-role-uuid">权限组</label>
              <Select v-model="manualMemberForm.roleUuid">
                <SelectTrigger id="manual-member-role-uuid" class="w-full">
                  <SelectValue placeholder="选择权限组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="MEMBER_ROLE_UNASSIGNED">
                    不绑定权限组
                  </SelectItem>
                  <SelectItem
                    v-for="option in availableRoleOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
      <DialogContent stack-above-sticky-header class="flex h-[90vh] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        <DialogHeader class="border-b border-border/70 p-4">
          <DialogTitle>{{ editingRoleId === null ? "添加权限组" : "编辑权限组" }}</DialogTitle>
          <DialogDescription>
            {{ editingRoleId === null ? "填写基础信息，并预配置页面访问和操作按钮的可见范围。" : "调整权限组基础信息，并预览后续接入权限接口后的页面与按钮控制范围。" }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitRole">
          <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-[280px_minmax(0,0.95fr)_minmax(0,1.25fr)] md:gap-0 md:overflow-hidden md:divide-x md:divide-border/70 md:px-0 md:py-0">
            <div class="space-y-4 md:relative md:min-h-0 md:overflow-hidden md:px-5 md:pt-4 md:pb-0">
              <section class="space-y-3">
                <div class="space-y-1">
                  <h3 class="text-sm font-semibold text-foreground">基础信息</h3>
                  <p class="text-xs leading-5 text-muted-foreground">
                    保存时会提交权限组基础信息，并将已选菜单同步分配给当前权限组。
                  </p>
                </div>

                <div class="grid gap-3">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground" for="role-name">权限组名称</label>
                    <Input id="role-name" v-model="roleForm.name" :disabled="roleDetailLoading" placeholder="请输入权限组名称" />
                  </div>

                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground" for="role-remark">备注</label>
                    <Textarea
                      id="role-remark"
                      v-model="roleForm.remark"
                      :disabled="roleDetailLoading"
                      rows="5"
                      placeholder="请输入权限组备注，例如：可查看巡检与工单，但不包含删除操作。"
                    />
                  </div>
                </div>
              </section>

              <Separator class="bg-border/70" />

              <section class="space-y-3">
                <div class="space-y-1">
                  <h3 class="text-sm font-semibold text-foreground">权限概览</h3>
                  <p class="text-xs leading-5 text-muted-foreground">
                    按钮权限由菜单自动派生，右侧仅展示已选菜单下可见的按钮。
                  </p>
                </div>

                <div class="grid gap-2 text-sm">
                  <div class="flex items-center justify-between gap-3 border-b border-border/60 py-2">
                    <span class="text-muted-foreground">已选页面</span>
                    <span class="font-medium text-foreground">{{ selectedMenuCount }} / {{ permissionMenuRows.length }}</span>
                  </div>

                  <div class="flex items-center justify-between gap-3 border-b border-border/60 py-2">
                    <span class="text-muted-foreground">派生按钮</span>
                    <span class="font-medium text-foreground">{{ selectedButtonCount }} / {{ permissionButtonRows.length }}</span>
                  </div>

                  <div class="pt-1">
                    <p class="text-xs leading-5 text-muted-foreground">
                      只需要配置菜单权限。按钮会随菜单自动生效，不再单独勾选。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div class="md:relative md:flex md:min-h-0 md:flex-col md:overflow-hidden md:px-5 md:pt-4 md:pb-0">
              <Alert
                v-if="rolePermissionResourcesErrorMessage"
                variant="destructive"
                class="mb-3 border-destructive/20 bg-destructive/3"
              >
                <i class="ri-error-warning-line text-base" />
                <AlertTitle>权限资源加载失败</AlertTitle>
                <AlertDescription>{{ rolePermissionResourcesErrorMessage }}</AlertDescription>
              </Alert>

              <div class="space-y-2 pb-3">
                <div class="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <h3 class="text-sm font-semibold text-foreground">待选页面</h3>
                  <span class="text-xs text-muted-foreground">勾选后右侧会展示该菜单下自动派生的按钮</span>
                  <span v-if="rolePermissionResourcesLoading" class="text-xs text-muted-foreground">加载中...</span>
                </div>

                <label class="inline-flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    :model-value="menuSelectionState"
                    :disabled="permissionMenuRows.length === 0"
                    @update:model-value="toggleAllMenus($event === true)"
                  />
                  <span>全选页面</span>
                </label>
              </div>

              <Separator class="bg-border/70" />

              <div v-if="roleDetailLoading" class="rounded-xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                正在加载权限组详情并回填表单...
              </div>

              <div v-if="menuPermissionGroups.length === 0 && !rolePermissionResourcesLoading" class="border-b border-border/60 py-4 text-sm text-muted-foreground">
                暂无可配置页面。
              </div>

              <div v-else class="min-h-0 flex-1 overflow-y-auto pr-5 md:mr-[-20px] [scrollbar-gutter:stable]">
                <div class="space-y-4 py-3 md:pr-4">
                  <div
                    v-for="group in menuPermissionGroups"
                    :key="group.key"
                    class="border-b border-dashed border-border/60 pb-2 last:border-b-0"
                  >
                    <div class="mb-1 flex items-center gap-2">
                      <Checkbox
                        :model-value="getPermissionGroupSelectionState(group)"
                        @update:model-value="togglePermissionGroupRows(group, $event === true)"
                      />
                      <button
                        type="button"
                        class="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                        @click="togglePermissionGroup(group.key)"
                      >
                        <span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {{ group.title }}
                          <span class="ml-1 text-[11px] font-normal text-muted-foreground">{{ group.path || "顶级导航分组" }}</span>
                        </span>
                        <span class="text-xs text-muted-foreground">
                          {{ group.visibleRows.filter(item => selectedMenuSet.has(item.uuid)).length }}/{{ group.visibleRows.length }}
                        </span>
                        <i
                          class="ri-arrow-right-s-line shrink-0 text-sm text-muted-foreground transition-transform"
                          :class="isPermissionGroupCollapsed(group.key) ? '' : 'rotate-90'"
                        />
                      </button>
                    </div>

                    <div v-if="!isPermissionGroupCollapsed(group.key)" class="grid gap-1">
                      <label
                        v-for="row in group.visibleRows"
                        :key="row.id"
                        class="flex items-center gap-2 py-1.5"
                        :style="{ paddingLeft: `${row.depth * 18}px` }"
                      >
                        <i
                          v-if="row.depth > 0"
                          class="ri-corner-down-right-line shrink-0 text-[12px] text-muted-foreground"
                        />
                        <span v-else class="w-3 shrink-0" />
                        <Checkbox
                          :model-value="selectedMenuSet.has(row.uuid)"
                          @update:model-value="updateRoleMenuSelection(row.uuid, $event === true)"
                        />
                        <span class="min-w-0 flex flex-1 items-center gap-2 overflow-hidden leading-none">
                          <Tooltip>
                            <TooltipTrigger as-child>
                              <span :class="row.depth === 0 ? 'font-medium text-foreground' : 'text-foreground'" class="truncate text-sm">
                                {{ row.name }}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{{ row.path }}</TooltipContent>
                          </Tooltip>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="md:relative md:flex md:min-h-0 md:flex-col md:overflow-hidden md:px-5 md:pt-4 md:pb-0">
              <div class="space-y-2 pb-3">
                <div class="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <h3 class="text-sm font-semibold text-foreground">已选页面的派生按钮</h3>
                  <span class="text-xs text-muted-foreground">按钮随菜单自动授权，当前仅做预览</span>
                </div>
              </div>

              <Separator class="bg-border/70" />

              <div v-if="selectedMenuPermissionGroups.length === 0" class="py-6 text-sm text-muted-foreground">
                先从中间列选择页面，右侧才会显示对应页面及按钮。
              </div>

              <div v-else class="min-h-0 flex-1 overflow-y-auto pr-5 md:mr-[-20px] [scrollbar-gutter:stable]">
                <div class="space-y-3 py-3 md:pr-4">
                  <div
                    v-for="group in selectedMenuPermissionGroups"
                    :key="group.key"
                    class="border-b border-dashed border-border/70 pb-2 last:border-b-0"
                  >
                    <div class="mb-1 flex items-center gap-2 py-1">
                      <span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {{ group.title }}
                        <span class="ml-1 text-[11px] font-normal text-muted-foreground">{{ group.path || "顶级导航分组" }}</span>
                      </span>
                      <span class="text-xs text-muted-foreground">{{ group.visiblePanels.length }} 页</span>
                    </div>

                    <div class="grid gap-1">
                      <template v-for="menu in group.visiblePanels" :key="menu.uuid || menu.id">
                        <label
                          class="flex items-center gap-2 py-1.5"
                          :style="{ paddingLeft: `${menu.depth * 18}px` }"
                        >
                          <i
                            v-if="menu.depth > 0"
                            class="ri-corner-down-right-line shrink-0 text-[12px] text-muted-foreground"
                          />
                          <span v-else class="w-3 shrink-0" />
                          <span class="w-4 shrink-0" />
                          <span class="min-w-0 flex flex-1 items-center gap-2 overflow-hidden leading-none">
                            <Tooltip>
                              <TooltipTrigger as-child>
                                <span :class="menu.depth === 0 ? 'font-medium text-foreground' : 'text-foreground'" class="truncate text-sm">
                                  {{ menu.name }}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{{ menu.path }}</TooltipContent>
                            </Tooltip>
                          </span>
                          <span class="text-[11px] text-muted-foreground">
                            {{ menu.buttons.length }} 个按钮
                          </span>
                        </label>

                        <div v-if="menu.buttons.length > 0" class="grid gap-1">
                          <label
                            v-for="button in menu.buttons"
                            :key="button.id"
                            class="flex items-center gap-2 py-1.5"
                            :style="{ paddingLeft: `${(menu.depth + 1) * 18}px` }"
                          >
                            <i class="ri-corner-down-right-line shrink-0 text-[12px] text-muted-foreground" />
                            <span class="w-4 shrink-0" />
                            <span class="min-w-0 flex flex-1 items-center gap-2 overflow-hidden leading-none">
                              <Tooltip>
                                <TooltipTrigger as-child>
                                  <span class="truncate text-sm text-foreground">{{ button.name }}</span>
                                </TooltipTrigger>
                                <TooltipContent>{{ button.code }}</TooltipContent>
                              </Tooltip>
                            </span>
                          </label>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator class="bg-border/70" />

          <DialogFooter :class="editingRoleId === null ? 'p-4 justify-end' : 'p-4 sm:justify-between'">
            <Button
              v-if="editingRoleId !== null"
              type="button"
              variant="outline"
              class="font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
              :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting"
              @click="promptDeleteEditingRole"
            >
              {{ roleDeleteSubmitting ? "删除中..." : "删除权限组" }}
            </Button>
            <div class="flex items-center justify-end">
              <Button type="button" variant="outline" :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting" @click="closeRoleDialog">
                取消
              </Button>
              <Button type="submit" :disabled="roleDetailLoading || roleSubmitting || roleDeleteSubmitting || !roleForm.name.trim()">
                {{ roleSubmitting ? "保存中..." : editingRoleId === null ? "添加权限组" : "保存" }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="($event ? (editDialogOpen = true) : closeEditDialog())">
      <DialogContent stack-above-sticky-header class="sm:max-w-[520px]">
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

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground">用户类型</label>
              <Select v-model="editMemberForm.userTypes" multiple :disabled="editDetailLoading">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择用户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in MEMBER_USER_TYPE_OPTIONS"
                    :key="`edit-member-type-${option.value}`"
                    :value="String(option.value)"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-member-role-uuid">权限组</label>
              <Select v-model="editMemberForm.roleUuid" :disabled="editDetailLoading">
                <SelectTrigger id="edit-member-role-uuid" class="w-full">
                  <SelectValue placeholder="选择权限组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="MEMBER_ROLE_UNASSIGNED">
                    不绑定权限组
                  </SelectItem>
                  <SelectItem
                    v-for="option in availableRoleOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              class="font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              @click="promptDeleteEditingMember"
            >
              {{ deleteSubmitting ? "删除中..." : "删除用户" }}
            </Button>
            <div class="flex items-center justify-end">
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
      <AlertDialogContent stack-above-sticky-header>
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
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            :disabled="deleteSubmitting"
            @click="confirmDeleteEditingMember"
          >
            {{ deleteSubmitting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="roleDeleteConfirmOpen" @update:open="roleDeleteConfirmOpen = $event">
      <AlertDialogContent stack-above-sticky-header>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除权限组？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前权限组，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="roleDeleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
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
