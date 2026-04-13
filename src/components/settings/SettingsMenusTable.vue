<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import {
  createButton as requestButtonCreate,
  deleteButton as requestButtonDelete,
  fetchButtonDetail,
  updateButton as requestButtonUpdate,
} from "@/lib/buttons-api"
import {
  createMenu as requestMenuCreate,
  deleteMenu as requestMenuDelete,
  fetchMenuDetail,
  fetchMenus,
  type MenuRecord,
  updateMenu as requestMenuUpdate,
} from "@/lib/menus-api"
import {
  fetchSystemApis,
  fetchSystemButtons,
  importSystemApi,
  type SystemResourceRecord,
} from "@/lib/system-resources-api"

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

type MenuRow = {
  id: number
  uuid: string
  name: string
  path: string
  icon: string
  parentUuid: string
  parentName: string
  level: number
  sort: number
  status: string
  createdAt: string
  updatedAt: string
}

type MenuForm = {
  name: string
  path: string
  icon: string
  parentUuid: string
  level: string
  sort: string
  status: string
}

type MenuDialogMode = "create" | "edit"

type SystemViewKey = "menus" | "buttons" | "apis"

type ButtonRow = {
  id: string
  uuid: string
  numericId: number | null
  name: string
  code: string
  menuUuid: string
  menuName: string
  apiUuid: string
  apiName: string
  createdAt: string
  updatedAt: string
}

type ButtonForm = {
  name: string
  code: string
  menuUuid: string
  apiUuid: string
}

type ButtonDialogMode = "create" | "edit"

type ApiRow = {
  id: string
  uuid: string
  name: string
  path: string
  method: string
  description: string
  updatedAt: string
}

const MENUS_LOAD_ERROR_MESSAGE = "菜单列表加载失败，请稍后重试。"
const BUTTONS_LOAD_ERROR_MESSAGE = "按钮列表加载失败，请稍后重试。"
const APIS_LOAD_ERROR_MESSAGE = "API 列表加载失败，请稍后重试。"
const MENU_CREATE_ERROR_MESSAGE = "菜单创建失败，请稍后重试。"
const MENU_UPDATE_ERROR_MESSAGE = "菜单更新失败，请稍后重试。"
const MENU_DELETE_ERROR_MESSAGE = "菜单删除失败，请稍后重试。"
const BUTTON_CREATE_ERROR_MESSAGE = "按钮创建失败，请稍后重试。"
const BUTTON_UPDATE_ERROR_MESSAGE = "按钮更新失败，请稍后重试。"
const BUTTON_DELETE_ERROR_MESSAGE = "按钮删除失败，请稍后重试。"
const ROOT_MENU_VALUE = "__root_menu__"
const BUTTON_MENU_UNSET = "__button_menu_unset__"
const BUTTON_API_UNSET = "__button_api_unset__"
const MENU_STATUS_UNSET = "__menu_status_unset__"
const menuStatusMap = {
  启用: { tone: "green", icon: "check" },
  禁用: { tone: "gray", icon: "minus" },
  未知: { tone: "gray", icon: "alert" },
} as const

const rows = ref<MenuRow[]>([])
const menuOptionRows = ref<MenuRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchQuery = ref("")
const searchExpanded = ref(false)
const activeView = ref<SystemViewKey>("menus")
const menuDialogOpen = ref(false)
const menuDialogMode = ref<MenuDialogMode>("create")
const menuSubmitting = ref(false)
const editDetailLoading = ref(false)
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const editingMenuUuid = ref("")
const editingMenuUpdatedAt = ref("-")
const menuForm = ref(createMenuForm())
const buttonRows = ref<ButtonRow[]>([])
const buttonDialogOpen = ref(false)
const buttonDialogMode = ref<ButtonDialogMode>("create")
const buttonSubmitting = ref(false)
const buttonDetailLoading = ref(false)
const buttonDeleteSubmitting = ref(false)
const buttonDeleteConfirmOpen = ref(false)
const editingButtonUuid = ref("")
const editingButtonId = ref<number | null>(null)
const editingButtonUpdatedAt = ref("-")
const buttonForm = ref(createButtonForm())
const apiRows = ref<ApiRow[]>([])
const importSubmitting = ref(false)
const apiImportInput = useTemplateRef<HTMLInputElement>("apiImportInput")

const availableMenuRows = computed(() => (menuOptionRows.value.length > 0 ? menuOptionRows.value : rows.value))

const parentMenuOptions = computed(() => [...availableMenuRows.value]
  .filter(row => row.uuid !== editingMenuUuid.value)
  .sort((left, right) => left.level - right.level || left.sort - right.sort || left.name.localeCompare(right.name, "zh-Hans-CN"))
  .map(row => ({
    uuid: row.uuid,
    label: `${"— ".repeat(Math.max(0, row.level))}${row.name}`,
    level: row.level,
  })))

const buttonMenuOptions = computed(() => [...availableMenuRows.value]
  .sort((left, right) => left.level - right.level || left.sort - right.sort || left.name.localeCompare(right.name, "zh-Hans-CN"))
  .map(row => ({
    uuid: row.uuid,
    label: `${"— ".repeat(Math.max(0, row.level))}${row.name}`,
  })))

const buttonApiOptions = computed(() => [...apiRows.value]
  .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN") || left.path.localeCompare(right.path, "zh-Hans-CN"))
  .map(row => ({
    uuid: row.uuid || row.id,
    label: row.path && row.path !== "-"
      ? `${row.name} · ${row.path}`
      : row.name,
  })))

const columns: TableColumn[] = [
  {
    key: "name",
    label: "菜单名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "path",
    label: "Path",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
  },
  {
    key: "parentName",
    label: "上级菜单",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "level",
    label: "层级",
    filterType: "number",
  },
  {
    key: "sort",
    label: "排序",
    filterType: "number",
  },
  {
    key: "status",
    label: "状态",
    filterType: "tag",
    cellRenderer: {
      kind: "status",
      map: menuStatusMap,
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

const buttonColumns: TableColumn[] = [
  {
    key: "name",
    label: "按钮名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "code",
    label: "按钮标识",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
  },
  {
    key: "menuName",
    label: "所属菜单",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "apiName",
    label: "关联 API",
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
    cellClass: "text-right",
  },
]

const apiColumns: TableColumn[] = [
  {
    key: "name",
    label: "API 名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "path",
    label: "Path",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
  },
  {
    key: "method",
    label: "Method",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "description",
    label: "说明",
    filterType: "text",
    tone: "muted",
    cellRenderer: { kind: "note" },
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
    cellClass: "text-right",
  },
]

const viewTabs = computed(() => [
  {
    id: "menus",
    label: "菜单",
    badge: rows.value.length,
  },
  {
    id: "buttons",
    label: "按钮",
    badge: buttonRows.value.length,
  },
  {
    id: "apis",
    label: "API",
    badge: apiRows.value.length,
  },
])

const currentSearchPlaceholder = computed(() => {
  if (activeView.value === "buttons") {
    return "搜索按钮名称、编码、菜单或 API"
  }

  if (activeView.value === "apis") {
    return "搜索 API 名称、标识或分组"
  }

  return "搜索菜单名称、Path、上级菜单或 Uuid"
})

const primaryActionLabel = computed(() => {
  if (activeView.value === "buttons") {
    return "添加按钮"
  }

  if (activeView.value === "menus") {
    return "添加菜单"
  }

  return ""
})

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row => [
    String(row.id),
    row.uuid,
    row.name,
    row.path,
    row.icon,
    row.parentName,
    String(row.level),
    String(row.sort),
    row.status,
    row.createdAt,
    row.updatedAt,
  ].some(field => field.toLowerCase().includes(query)))
})

const filteredButtonRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return buttonRows.value
  }

  return buttonRows.value.filter(row => [
    row.name,
    row.code,
    row.menuName,
    row.apiName,
    row.updatedAt,
  ].some(field => field.toLowerCase().includes(query)))
})

const filteredApiRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return apiRows.value
  }

  return apiRows.value.filter(row => [
    row.name,
    row.path,
    row.method,
    row.description,
    row.updatedAt,
  ].some(field => field.toLowerCase().includes(query)))
})

const currentColumns = computed(() => {
  if (activeView.value === "buttons") {
    return buttonColumns
  }

  if (activeView.value === "apis") {
    return apiColumns
  }

  return columns
})
const currentRows = computed<Record<string, unknown>[]>(() => {
  if (activeView.value === "buttons") {
    return filteredButtonRows.value
  }

  if (activeView.value === "apis") {
    return filteredApiRows.value
  }

  return filteredRows.value
})
const currentResourceLabel = computed(() => {
  if (activeView.value === "buttons") {
    return "按钮"
  }

  if (activeView.value === "apis") {
    return "API"
  }

  return "菜单"
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: `${currentResourceLabel.value}加载中`,
      description: `正在同步管理员${currentResourceLabel.value}列表，请稍候。`,
      icon: "ri-loader-4-line",
    }
  }

  if (searchQuery.value.trim()) {
    return {
      title: `没有匹配的${currentResourceLabel.value}`,
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  if (activeView.value === "buttons") {
    return {
      title: "暂无按钮数据",
      description: "暂时还没有按钮数据。",
      icon: "ri-cursor-line",
    }
  }

  if (activeView.value === "apis") {
    return {
      title: "暂无 API 数据",
      description: "暂时还没有 API 数据。",
      icon: "ri-code-box-line",
    }
  }

  return {
    title: "还没有菜单数据",
    description: "暂时还没有菜单数据，您可以先添加一个菜单。",
    icon: "ri-menu-line",
  }
})

onMounted(() => {
  void bootstrapSystemResources()
})

/** 进入系统页时并行拉取菜单 / 按钮 / API，胶囊 badge 才能立刻显示正确数量（否则仅当前 Tab 有数据，其余长期为 0） */
async function bootstrapSystemResources() {
  loading.value = true
  errorMessage.value = ""

  try {
    await Promise.allSettled([
      loadMenus({ manageLoading: false }),
      loadMenuOptions(),
      loadButtons({ manageLoading: false }),
      loadApis({ manageLoading: false }),
    ])
  } finally {
    loading.value = false
  }
}

watch(activeView, (value) => {
  if (value === "buttons" && buttonRows.value.length === 0) {
    void loadButtons()
    return
  }

  if (value === "apis" && apiRows.value.length === 0) {
    void loadApis()
  }
})

watch(() => menuForm.value.parentUuid, (value) => {
  const parent = availableMenuRows.value.find(row => row.uuid === (value === ROOT_MENU_VALUE ? "" : value))
  menuForm.value.level = String(parent ? parent.level + 1 : 0)
})

async function loadMenus(options?: { manageLoading?: boolean, keyword?: string }) {
  const manageLoading = options?.manageLoading !== false
  const keyword = options?.keyword ?? searchQuery.value.trim()

  if (manageLoading) {
    loading.value = true
    errorMessage.value = ""
  }

  try {
    const result = await fetchMenus({
      Name: keyword,
      Status: 0,
      PageNum: 0,
      PageSize: 0,
    })
    rows.value = result.list.map((item, index) => normalizeMenu(item, index))
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "菜单接口加载失败",
      fallback: MENUS_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    if (manageLoading) {
      loading.value = false
    }
  }
}

async function loadMenuOptions() {
  try {
    const result = await fetchMenus({
      Name: "",
      Status: 0,
      PageNum: 0,
      PageSize: 0,
    })
    const normalizedRows = result.list.map((item, index) => normalizeMenu(item, index))
    menuOptionRows.value = normalizedRows.length > 0 ? normalizedRows : rows.value
  } catch {
    menuOptionRows.value = rows.value
  }
}

async function loadButtons(options?: { manageLoading?: boolean }) {
  const manageLoading = options?.manageLoading !== false

  if (manageLoading) {
    loading.value = true
    errorMessage.value = ""
  }

  try {
    const result = await fetchSystemButtons()
    buttonRows.value = result.list.map((item, index) => normalizeButton(item, index))
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "按钮接口加载失败",
      fallback: BUTTONS_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    if (manageLoading) {
      loading.value = false
    }
  }
}

async function loadApis(options?: { manageLoading?: boolean }) {
  const manageLoading = options?.manageLoading !== false

  if (manageLoading) {
    loading.value = true
    errorMessage.value = ""
  }

  try {
    const result = await fetchSystemApis()
    apiRows.value = result.list.map((item, index) => normalizeApi(item, index))
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "API 接口加载失败",
      fallback: APIS_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    if (manageLoading) {
      loading.value = false
    }
  }
}

function handleRefresh() {
  if (activeView.value === "menus") {
    void loadMenus()
    return
  }

  if (activeView.value === "buttons") {
    void loadButtons()
    return
  }

  void loadApis()
}

function handlePrimaryAction() {
  if (activeView.value === "buttons") {
    void openCreateButtonDialog()
    return
  }

  openCreateDialog()
}

function triggerApiImport() {
  if (importSubmitting.value) {
    return
  }

  apiImportInput.value?.click()
}

async function handleApiImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  importSubmitting.value = true

  try {
    await importSystemApi(file)
    toast.success("API 导入成功", {
      description: `${file.name} 已导入并刷新列表。`,
    })
    await loadApis()
  } catch (error) {
    handleApiError(error, {
      title: "API 导入失败",
      fallback: "API 导入失败，请稍后重试。",
    })
  } finally {
    importSubmitting.value = false

    if (input) {
      input.value = ""
    }
  }
}

function normalizeMenu(item: MenuRecord, index: number): MenuRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1

  return {
    id,
    uuid: toText(item.Uuid, `menu-${id}`),
    name: toText(item.Name, `菜单 ${id}`),
    path: toText(item.Path, "-"),
    icon: toText(item.Icon, "-"),
    parentUuid: toText(item.ParentUuid),
    parentName: toText(item.ParentName, "顶级菜单"),
    level: toNumber(item.Level),
    sort: toNumber(item.Sort),
    status: normalizeStatus(item.Status),
    createdAt: formatDateTime(item.CreatedAt),
    updatedAt: formatDateTime(item.UpdatedAt),
  }
}

function normalizeButton(item: SystemResourceRecord, index: number): ButtonRow {
  const uuid = toText(item.Uuid)
  const numericId = toOptionalNumber(item.Id) ?? null

  return {
    id: toText(uuid, numericId, `button-${index + 1}`),
    uuid,
    numericId,
    name: toText(item.Name, `按钮 ${index + 1}`),
    code: toText(item.Code, "-"),
    menuUuid: toText(item.MenuUuid),
    menuName: toText(item.MenuName, "未绑定菜单"),
    apiUuid: toText(item.ApiUuid),
    apiName: toText(item.ApiName, "未绑定 API"),
    createdAt: formatDateTime(item.CreatedAt),
    updatedAt: formatDateTime(item.UpdatedAt, item.CreatedAt),
  }
}

function normalizeApi(item: SystemResourceRecord, index: number): ApiRow {
  const uuid = toText(item.Uuid)

  return {
    id: toText(uuid, item.Id, `api-${index + 1}`),
    uuid,
    name: toText(item.Name, `API ${index + 1}`),
    path: toText(item.Path, "-"),
    method: toText(item.Method, "-"),
    description: toText(item.Description, "-"),
    updatedAt: formatDateTime(item.UpdatedAt, item.CreatedAt),
  }
}

function createMenuForm(): MenuForm {
  return {
    name: "",
    path: "",
    icon: "",
    parentUuid: ROOT_MENU_VALUE,
    level: "",
    sort: "",
    status: MENU_STATUS_UNSET,
  }
}

function createButtonForm(): ButtonForm {
  return {
    name: "",
    code: "",
    menuUuid: BUTTON_MENU_UNSET,
    apiUuid: BUTTON_API_UNSET,
  }
}

async function openCreateDialog() {
  await loadMenuOptions()
  menuDialogMode.value = "create"
  editDetailLoading.value = false
  editingMenuUuid.value = ""
  editingMenuUpdatedAt.value = "-"
  menuForm.value = createMenuForm()
  menuDialogOpen.value = true
}

async function ensureButtonDialogDependencies() {
  const tasks: Promise<unknown>[] = []

  if (menuOptionRows.value.length === 0) {
    tasks.push(loadMenuOptions())
  } else {
    tasks.push(loadMenuOptions())
  }

  if (apiRows.value.length === 0) {
    tasks.push(loadApis({ manageLoading: false }))
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }
}

async function openCreateButtonDialog() {
  await ensureButtonDialogDependencies()
  buttonDialogMode.value = "create"
  buttonDetailLoading.value = false
  editingButtonUuid.value = ""
  editingButtonId.value = null
  editingButtonUpdatedAt.value = "-"
  buttonForm.value = createButtonForm()
  buttonDialogOpen.value = true
}

async function openEditDialog(row: MenuRow) {
  await loadMenuOptions()
  menuDialogMode.value = "edit"
  editDetailLoading.value = true
  editingMenuUuid.value = row.uuid
  editingMenuUpdatedAt.value = row.updatedAt || "-"
  menuForm.value = {
    name: row.name,
    path: row.path === "-" ? "" : row.path,
    icon: row.icon === "-" ? "" : row.icon,
    parentUuid: row.parentUuid || ROOT_MENU_VALUE,
    level: String(row.level),
    sort: String(row.sort),
    status: row.status === "禁用" ? "2" : "1",
  }
  menuDialogOpen.value = true

  try {
    const detail = await fetchMenuDetail({
      Uuid: row.uuid,
    })

    if (editingMenuUuid.value !== row.uuid) {
      return
    }

    menuForm.value = {
      name: toText(detail.Name, row.name),
      path: toText(detail.Path),
      icon: toText(detail.Icon),
      parentUuid: toText(detail.ParentUuid) || ROOT_MENU_VALUE,
      level: String(toNumber(detail.Level, row.level)),
      sort: String(toNumber(detail.Sort, row.sort)),
      status: detail.Status === undefined || detail.Status === null
        ? MENU_STATUS_UNSET
        : String(toNumber(detail.Status)),
    }
    editingMenuUpdatedAt.value = formatDateTime(detail.UpdatedAt, row.updatedAt)
  } catch (error) {
    handleApiError(error, {
      title: "菜单详情加载失败",
      fallback: "菜单详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingMenuUuid.value === row.uuid) {
      editDetailLoading.value = false
    }
  }
}

async function openEditButtonDialog(row: ButtonRow) {
  await ensureButtonDialogDependencies()
  buttonDialogMode.value = "edit"
  buttonDetailLoading.value = true
  editingButtonUuid.value = row.uuid
  editingButtonId.value = row.numericId
  editingButtonUpdatedAt.value = row.updatedAt || "-"
  buttonForm.value = {
    name: row.name,
    code: row.code === "-" ? "" : row.code,
    menuUuid: row.menuUuid || BUTTON_MENU_UNSET,
    apiUuid: row.apiUuid || BUTTON_API_UNSET,
  }
  buttonDialogOpen.value = true

  try {
    const detail = await fetchButtonDetail({
      Uuid: row.uuid || undefined,
      Id: row.numericId ?? undefined,
    })

    const detailUuid = toText(detail.Uuid, row.uuid)
    const detailId = toOptionalNumber(detail.Id) ?? row.numericId

    if (editingButtonUuid.value !== row.uuid && editingButtonId.value !== row.numericId) {
      return
    }

    editingButtonUuid.value = detailUuid
    editingButtonId.value = detailId ?? null
    buttonForm.value = {
      name: toText(detail.Name, row.name),
      code: toText(detail.Code, row.code === "-" ? "" : row.code),
      menuUuid: toText(detail.MenuUuid) || BUTTON_MENU_UNSET,
      apiUuid: toText(detail.ApiUuid) || BUTTON_API_UNSET,
    }
    editingButtonUpdatedAt.value = formatDateTime(detail.UpdatedAt, row.updatedAt)
  } catch (error) {
    handleApiError(error, {
      title: "按钮详情加载失败",
      fallback: "按钮详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingButtonUuid.value === row.uuid || editingButtonId.value === row.numericId) {
      buttonDetailLoading.value = false
    }
  }
}

function toggleSearch() {
  if (searchExpanded.value) {
    searchQuery.value = ""
    searchExpanded.value = false
    if (activeView.value === "menus") {
      void loadMenus()
    }
    return
  }

  searchExpanded.value = true
}

function closeMenuDialog() {
  menuDialogOpen.value = false
  deleteConfirmOpen.value = false
  editDetailLoading.value = false
  editingMenuUuid.value = ""
  editingMenuUpdatedAt.value = "-"
  menuForm.value = createMenuForm()
}

function closeButtonDialog() {
  buttonDialogOpen.value = false
  buttonDeleteConfirmOpen.value = false
  buttonDetailLoading.value = false
  editingButtonUuid.value = ""
  editingButtonId.value = null
  editingButtonUpdatedAt.value = "-"
  buttonForm.value = createButtonForm()
}

function promptDeleteMenu() {
  deleteConfirmOpen.value = true
}

function promptDeleteButton() {
  buttonDeleteConfirmOpen.value = true
}

async function submitMenu() {
  const level = toOptionalNumber(menuForm.value.level)
  const sort = toOptionalNumber(menuForm.value.sort)
  const status = menuForm.value.status === MENU_STATUS_UNSET ? undefined : toOptionalNumber(menuForm.value.status)

  menuSubmitting.value = true

  try {
    const payload = {
      Name: menuForm.value.name.trim(),
      Path: menuForm.value.path.trim(),
      Icon: menuForm.value.icon.trim(),
      ParentUuid: menuForm.value.parentUuid === ROOT_MENU_VALUE ? "" : menuForm.value.parentUuid.trim(),
      Level: level,
      Sort: sort,
      Status: status,
    }

    if (menuDialogMode.value === "edit") {
      if (!editingMenuUuid.value) {
        toast.error("缺少菜单 Uuid，无法保存修改")
        return
      }

      const result = await requestMenuUpdate({
        Uuid: editingMenuUuid.value,
        ...payload,
      })

      closeMenuDialog()
      toast.success("菜单已更新", {
        description: `${menuForm.value.name.trim() || "当前菜单"} 已更新${toText(result.Uuid) ? `，Uuid：${toText(result.Uuid)}` : ""}。`,
      })
    } else {
      const result = await requestMenuCreate(payload)

      closeMenuDialog()
      toast.success("菜单已创建", {
        description: `${menuForm.value.name.trim() || "菜单"} 已创建${toText(result.Uuid) ? `，Uuid：${toText(result.Uuid)}` : ""}。`,
      })
    }

    await Promise.allSettled([
      loadMenus(),
      loadMenuOptions(),
    ])
  } catch (error) {
    handleApiError(error, {
      title: menuDialogMode.value === "edit" ? "菜单更新失败" : "菜单创建失败",
      fallback: menuDialogMode.value === "edit" ? MENU_UPDATE_ERROR_MESSAGE : MENU_CREATE_ERROR_MESSAGE,
    })
  } finally {
    menuSubmitting.value = false
  }
}

async function confirmDeleteMenu() {
  if (!editingMenuUuid.value) {
    toast.error("缺少菜单 Uuid，无法删除")
    return
  }

  const target = rows.value.find(row => row.uuid === editingMenuUuid.value)

  deleteSubmitting.value = true

  try {
    await requestMenuDelete({
      Uuid: editingMenuUuid.value,
    })
    deleteConfirmOpen.value = false
    closeMenuDialog()
    toast.success("菜单已删除", {
      description: `${target?.name ?? "当前菜单"} 已从列表移除。`,
    })
    await Promise.allSettled([
      loadMenus(),
      loadMenuOptions(),
    ])
  } catch (error) {
    handleApiError(error, {
      title: "菜单删除失败",
      fallback: MENU_DELETE_ERROR_MESSAGE,
    })
  } finally {
    deleteSubmitting.value = false
  }
}

async function submitButton() {
  buttonSubmitting.value = true

  try {
    const payload = {
      Name: buttonForm.value.name.trim(),
      Code: buttonForm.value.code.trim(),
      MenuUuid: buttonForm.value.menuUuid === BUTTON_MENU_UNSET ? "" : buttonForm.value.menuUuid.trim(),
      ApiUuid: buttonForm.value.apiUuid === BUTTON_API_UNSET ? "" : buttonForm.value.apiUuid.trim(),
    }

    if (buttonDialogMode.value === "edit") {
      const result = await requestButtonUpdate({
        Uuid: editingButtonUuid.value || undefined,
        Id: editingButtonId.value ?? undefined,
        ...payload,
      })

      closeButtonDialog()
      toast.success("按钮已更新", {
        description: `${buttonForm.value.name.trim() || "当前按钮"} 已更新${toText(result.Uuid) ? `，Uuid：${toText(result.Uuid)}` : ""}。`,
      })
    } else {
      const result = await requestButtonCreate(payload)

      closeButtonDialog()
      toast.success("按钮已创建", {
        description: `${buttonForm.value.name.trim() || "按钮"} 已创建${toText(result.Uuid) ? `，Uuid：${toText(result.Uuid)}` : ""}。`,
      })
    }

    await loadButtons()
  } catch (error) {
    handleApiError(error, {
      title: buttonDialogMode.value === "edit" ? "按钮更新失败" : "按钮创建失败",
      fallback: buttonDialogMode.value === "edit" ? BUTTON_UPDATE_ERROR_MESSAGE : BUTTON_CREATE_ERROR_MESSAGE,
    })
  } finally {
    buttonSubmitting.value = false
  }
}

async function confirmDeleteButton() {
  if (!editingButtonUuid.value && editingButtonId.value === null) {
    toast.error("缺少按钮标识，无法删除")
    return
  }

  const target = buttonRows.value.find(row =>
    (editingButtonUuid.value && row.uuid === editingButtonUuid.value)
    || (editingButtonId.value !== null && row.numericId === editingButtonId.value))

  buttonDeleteSubmitting.value = true

  try {
    await requestButtonDelete({
      Uuid: editingButtonUuid.value || undefined,
      Id: editingButtonId.value ?? undefined,
    })
    buttonDeleteConfirmOpen.value = false
    closeButtonDialog()
    toast.success("按钮已删除", {
      description: `${target?.name ?? "当前按钮"} 已从列表移除。`,
    })
    await loadButtons()
  } catch (error) {
    handleApiError(error, {
      title: "按钮删除失败",
      fallback: BUTTON_DELETE_ERROR_MESSAGE,
    })
  } finally {
    buttonDeleteSubmitting.value = false
  }
}

function asMenuRow(row: Record<string, unknown>) {
  return row as MenuRow
}

function asButtonRow(row: Record<string, unknown>) {
  return row as ButtonRow
}

function handleMenuRowClick(row: Record<string, unknown>) {
  openEditDialog(asMenuRow(row))
}

function handleButtonRowClick(row: Record<string, unknown>) {
  void openEditButtonDialog(asButtonRow(row))
}

function normalizeStatus(value: unknown) {
  if (value === 1 || value === "1" || value === "启用") {
    return "启用"
  }

  if (value === 2 || value === "2" || value === "禁用" || value === 0 || value === "0" || value === "停用") {
    return "禁用"
  }

  return "未知"
}

function toText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ""
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatDateTime(...values: unknown[]) {
  const text = toText(...values)

  if (!text) {
    return "-"
  }

  return text.replace("T", " ").slice(0, 19)
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
          aria-label="开发者资源视图切换"
          @update:model-value="activeView = $event as SystemViewKey"
        />
        </template>

        <div class="flex flex-nowrap items-center justify-end gap-2">
          <input
            ref="apiImportInput"
            type="file"
            class="hidden"
            accept=".yaml,.yml,.json"
            @change="handleApiImportFileChange"
          />

          <SettingsToolbarSearchInput
            v-model="searchQuery"
            :expanded="searchExpanded"
            :placeholder="currentSearchPlaceholder"
            @toggle="toggleSearch"
          />

          <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
            <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" :disabled="loading" @click="handleRefresh">
              <i :class="loading ? 'ri-loader-4-line animate-spin text-sm' : 'ri-refresh-line text-sm'" />
              <span>刷新列表</span>
            </Button>
          </SettingsToolbarRefreshSlot>

          <Button
            v-if="activeView === 'apis'"
            variant="outline"
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            :disabled="importSubmitting"
            @click="triggerApiImport"
          >
            <i :class="importSubmitting ? 'ri-loader-4-line animate-spin text-base' : 'ri-upload-2-line text-base'" />
            <span>{{ importSubmitting ? "导入中..." : "导入 API" }}</span>
          </Button>

          <Button
            v-if="activeView === 'menus' || activeView === 'buttons'"
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            @click="handlePrimaryAction"
          >
            <i class="ri-add-line text-base" />
            <span>{{ primaryActionLabel }}</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </template>

    <section class="space-y-4">
    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/[0.03]"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>{{ currentResourceLabel }}列表加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePageTable
      row-key="id"
      show-index
      sticky-header
      :end-spacer="false"
      :show-index-checkbox="false"
      :edge-gutter="false"
      :show-row-action-icons="true"
      :columns="currentColumns"
      :rows="currentRows"
      :on-row-click="activeView === 'menus' ? handleMenuRowClick : (activeView === 'buttons' ? handleButtonRowClick : undefined)"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-actions="{ row: rawRow }">
        <Button
          v-if="activeView === 'menus'"
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click.stop="openEditDialog(asMenuRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
        <Button
          v-else-if="activeView === 'buttons'"
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click.stop="openEditButtonDialog(asButtonRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="menuDialogOpen" @update:open="($event ? (menuDialogOpen = true) : closeMenuDialog())">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ menuDialogMode === "edit" ? "编辑菜单" : "添加菜单" }}</DialogTitle>
          <DialogDescription>
            {{
              menuDialogMode === "edit"
                ? `更新时间：${editingMenuUpdatedAt}`
                : "填写菜单基础信息后会调用菜单新建接口。"
            }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitMenu">
          <fieldset :disabled="menuDialogMode === 'edit' && editDetailLoading" class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-name">菜单名称</label>
                <Input id="menu-name" v-model="menuForm.name" placeholder="例如：系统设置" />
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-path">菜单 Path</label>
                <Input id="menu-path" v-model="menuForm.path" placeholder="例如：/settings/system" />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-icon">图标</label>
                <Input id="menu-icon" v-model="menuForm.icon" placeholder="例如：ri-settings-3-line" />
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-parent">上级菜单</label>
                <Select v-model="menuForm.parentUuid">
                  <SelectTrigger id="menu-parent" class="w-full">
                    <SelectValue placeholder="选择上级菜单，留空则为顶级菜单" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="ROOT_MENU_VALUE">
                      顶级菜单
                    </SelectItem>
                    <SelectItem
                      v-for="option in parentMenuOptions"
                      :key="option.uuid"
                      :value="option.uuid"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-level">层级</label>
                <Input id="menu-level" v-model="menuForm.level" placeholder="0" />
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-sort">排序</label>
                <Input id="menu-sort" v-model="menuForm.sort" placeholder="0" />
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="menu-status">状态</label>
                <Select v-model="menuForm.status">
                  <SelectTrigger id="menu-status" class="w-full">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="MENU_STATUS_UNSET">
                      未设置
                    </SelectItem>
                    <SelectItem value="1">
                      启用
                    </SelectItem>
                    <SelectItem value="2">
                      禁用
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <DialogFooter
            :class="[
              'pt-2 flex-col-reverse gap-2 sm:flex-row sm:items-center',
              menuDialogMode === 'edit' ? 'sm:justify-between' : 'sm:justify-end',
            ]"
          >
            <Button
              v-if="menuDialogMode === 'edit'"
              type="button"
              variant="outline"
              class="w-full gap-1 border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive sm:w-auto"
              :disabled="menuSubmitting || deleteSubmitting || editDetailLoading"
              @click="promptDeleteMenu"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除菜单</span>
            </Button>

            <div class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" :disabled="menuSubmitting || deleteSubmitting" @click="closeMenuDialog">
                取消
              </Button>
              <Button type="submit" :disabled="menuSubmitting || deleteSubmitting || editDetailLoading">
                {{ menuSubmitting ? (menuDialogMode === "edit" ? "保存中..." : "创建中...") : (menuDialogMode === "edit" ? "保存修改" : "创建菜单") }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="buttonDialogOpen" @update:open="($event ? (buttonDialogOpen = true) : closeButtonDialog())">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ buttonDialogMode === "edit" ? "编辑按钮" : "添加按钮" }}</DialogTitle>
          <DialogDescription>
            {{
              buttonDialogMode === "edit"
                ? `更新时间：${editingButtonUpdatedAt}`
                : "填写按钮信息后会调用按钮新建接口。"
            }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitButton">
          <fieldset :disabled="buttonDialogMode === 'edit' && buttonDetailLoading" class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="button-name">按钮名称</label>
                <Input id="button-name" v-model="buttonForm.name" placeholder="例如：新增成员" />
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="button-code">按钮编码</label>
                <Input id="button-code" v-model="buttonForm.code" placeholder="例如：member:add" />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="button-menu">所属菜单</label>
                <Select v-model="buttonForm.menuUuid">
                  <SelectTrigger id="button-menu" class="w-full">
                    <SelectValue placeholder="选择所属菜单" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="BUTTON_MENU_UNSET">
                      不绑定菜单
                    </SelectItem>
                    <SelectItem
                      v-for="option in buttonMenuOptions"
                      :key="option.uuid"
                      :value="option.uuid"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground" for="button-api">关联 API</label>
                <Select v-model="buttonForm.apiUuid">
                  <SelectTrigger id="button-api" class="w-full">
                    <SelectValue placeholder="选择关联 API" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="BUTTON_API_UNSET">
                      不绑定 API
                    </SelectItem>
                    <SelectItem
                      v-for="option in buttonApiOptions"
                      :key="option.uuid"
                      :value="option.uuid"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <DialogFooter
            :class="[
              'pt-2 flex-col-reverse gap-2 sm:flex-row sm:items-center',
              buttonDialogMode === 'edit' ? 'sm:justify-between' : 'sm:justify-end',
            ]"
          >
            <Button
              v-if="buttonDialogMode === 'edit'"
              type="button"
              variant="outline"
              class="w-full gap-1 border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive sm:w-auto"
              :disabled="buttonSubmitting || buttonDeleteSubmitting || buttonDetailLoading"
              @click="promptDeleteButton"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除按钮</span>
            </Button>

            <div class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" :disabled="buttonSubmitting || buttonDeleteSubmitting" @click="closeButtonDialog">
                取消
              </Button>
              <Button type="submit" :disabled="buttonSubmitting || buttonDeleteSubmitting || buttonDetailLoading">
                {{ buttonSubmitting ? (buttonDialogMode === "edit" ? "保存中..." : "创建中...") : (buttonDialogMode === "edit" ? "保存修改" : "创建按钮") }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除菜单？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前菜单，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction :disabled="deleteSubmitting" @click="confirmDeleteMenu">
            <i v-if="deleteSubmitting" class="ri-loader-4-line animate-spin text-base" />
            <span>{{ deleteSubmitting ? "删除中..." : "确认删除" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="buttonDeleteConfirmOpen" @update:open="buttonDeleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除按钮？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前按钮，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="buttonDeleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction :disabled="buttonDeleteSubmitting" @click="confirmDeleteButton">
            <i v-if="buttonDeleteSubmitting" class="ri-loader-4-line animate-spin text-base" />
            <span>{{ buttonDeleteSubmitting ? "删除中..." : "确认删除" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
  </SettingsRightPanelLayout>
</template>
