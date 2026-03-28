<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue"
import { toast } from "vue-sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
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
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
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
  createMenu as requestMenuCreate,
  fetchMenus,
  type MenuRecord,
} from "@/lib/menus-api"
import {
  fetchSystemApis,
  fetchSystemButtons,
  importSystemApi,
  type SystemResourceRecord,
} from "@/lib/system-resources-api"
import { cn } from "@/lib/utils"

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

type SystemViewKey = "menus" | "buttons" | "apis"

type ButtonRow = {
  id: string
  name: string
  code: string
  menuName: string
  apiName: string
  updatedAt: string
}

type ApiRow = {
  id: string
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
const ROOT_MENU_VALUE = "__root_menu__"
const toolbarIconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:!border-l-0"
const menuStatusMap = {
  启用: { tone: "green", icon: "check" },
  停用: { tone: "gray", icon: "minus" },
  未知: { tone: "gray", icon: "alert" },
} as const

const rows = ref<MenuRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchQuery = ref("")
const searchExpanded = ref(false)
const activeView = ref<SystemViewKey>("menus")
const createDialogOpen = ref(false)
const createSubmitting = ref(false)
const menuForm = ref(createMenuForm())
const buttonRows = ref<ButtonRow[]>([])
const apiRows = ref<ApiRow[]>([])
const importSubmitting = ref(false)
const apiImportInput = useTemplateRef<HTMLInputElement>("apiImportInput")

const parentMenuOptions = computed(() => [...rows.value]
  .sort((left, right) => left.level - right.level || left.sort - right.sort || left.name.localeCompare(right.name, "zh-Hans-CN"))
  .map(row => ({
    uuid: row.uuid,
    label: `${"— ".repeat(Math.max(0, row.level))}${row.name}`,
    level: row.level,
  })))

const columns: TableColumn[] = [
  {
    key: "name",
    label: "菜单名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
    width: "fill",
  },
  {
    key: "path",
    label: "Path",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
    width: "fill",
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
    key: "updatedAt",
    label: "更新时间",
    filterType: "text",
    tone: "muted",
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
    width: "fill",
  },
  {
    key: "code",
    label: "按钮标识",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
    width: "fill",
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
    width: "fill",
  },
  {
    key: "path",
    label: "Path",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
    width: "fill",
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
    width: "fill",
    cellRenderer: { kind: "note" },
  },
  {
    key: "updatedAt",
    label: "更新时间",
    filterType: "text",
    tone: "muted",
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
    return "搜索按钮名称、标识或分组"
  }

  if (activeView.value === "apis") {
    return "搜索 API 名称、标识或分组"
  }

  return "搜索菜单名称、Path、上级菜单或 Uuid"
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
      description: "按钮资源表入口已预留，接入按钮列表接口后会展示在这里。",
      icon: "ri-cursor-line",
    }
  }

  if (activeView.value === "apis") {
    return {
      title: "暂无 API 数据",
      description: "API 资源表入口已预留，接入接口后会展示在这里。",
      icon: "ri-code-box-line",
    }
  }

  return {
    title: "还没有菜单数据",
    description: "接口返回为空时，会在这里显示空状态。",
    icon: "ri-menu-line",
  }
})

onMounted(() => {
  void loadMenus()
})

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
  const parent = rows.value.find(row => row.uuid === (value === ROOT_MENU_VALUE ? "" : value))
  menuForm.value.level = String(parent ? parent.level + 1 : 0)
})

async function loadMenus() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchMenus({
      Name: searchQuery.value.trim(),
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
    loading.value = false
  }
}

async function loadButtons() {
  loading.value = true
  errorMessage.value = ""

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
    loading.value = false
  }
}

async function loadApis() {
  loading.value = true
  errorMessage.value = ""

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
    loading.value = false
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
  return {
    id: toText(item.Uuid, item.Id, `button-${index + 1}`),
    name: toText(item.Name, `按钮 ${index + 1}`),
    code: toText(item.Code, "-"),
    menuName: toText(item.MenuName, "未绑定菜单"),
    apiName: toText(item.ApiName, "未绑定 API"),
    updatedAt: formatDateTime(item.UpdatedAt, item.CreatedAt),
  }
}

function normalizeApi(item: SystemResourceRecord, index: number): ApiRow {
  return {
    id: toText(item.Uuid, item.Id, `api-${index + 1}`),
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
    level: "0",
    sort: "0",
    status: "1",
  }
}

function openCreateDialog() {
  menuForm.value = createMenuForm()
  createDialogOpen.value = true
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

function closeCreateDialog() {
  createDialogOpen.value = false
}

async function submitCreateMenu() {
  const name = menuForm.value.name.trim()
  const path = menuForm.value.path.trim()

  if (!name) {
    toast.error("请填写菜单名称")
    return
  }

  if (!path) {
    toast.error("请填写菜单 Path")
    return
  }

  const level = toNumber(menuForm.value.level, 0)
  const sort = toNumber(menuForm.value.sort, 0)
  const status = toNumber(menuForm.value.status, 1)

  createSubmitting.value = true

  try {
    const result = await requestMenuCreate({
      Name: name,
      Path: path,
      Icon: menuForm.value.icon.trim(),
      ParentUuid: menuForm.value.parentUuid === ROOT_MENU_VALUE ? "" : menuForm.value.parentUuid.trim(),
      Level: level,
      Sort: sort,
      Status: status,
    })

    closeCreateDialog()
    toast.success("菜单已创建", {
      description: `${name} 已创建${toText(result.Uuid) ? `，Uuid：${toText(result.Uuid)}` : ""}。`,
    })
    await loadMenus()
  } catch (error) {
    handleApiError(error, {
      title: "菜单创建失败",
      fallback: MENU_CREATE_ERROR_MESSAGE,
    })
  } finally {
    createSubmitting.value = false
  }
}

function normalizeStatus(value: unknown) {
  if (value === 1 || value === "1" || value === "启用") {
    return "启用"
  }

  if (value === 0 || value === "0" || value === "停用") {
    return "停用"
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

function formatDateTime(...values: unknown[]) {
  const text = toText(...values)

  if (!text) {
    return "-"
  }

  return text.replace("T", " ").slice(0, 19)
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-4">
      <SettingsToolbarRow>
        <template #leading>
        <TopTabSwitch
          :tabs="viewTabs"
          :model-value="activeView"
          :collapse-inactive="false"
          tone="default"
          aria-label="系统资源视图切换"
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

          <Button v-if="!searchExpanded" variant="ghost" size="sm" class="h-8 rounded-md px-3" :disabled="loading" @click="handleRefresh">
            <i :class="loading ? 'ri-loader-4-line animate-spin text-sm' : 'ri-refresh-line text-sm'" />
            <span>刷新列表</span>
          </Button>

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
            v-if="activeView === 'menus'"
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            @click="openCreateDialog"
          >
            <i class="ri-add-line text-base" />
            <span>新增菜单</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </div>

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
      :columns="currentColumns"
      :rows="currentRows"
      :table-class="compactTableClass"
      :empty-state="tableEmptyState"
    />

    <Dialog :open="createDialogOpen" @update:open="($event ? (createDialogOpen = true) : closeCreateDialog())">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新增菜单</DialogTitle>
          <DialogDescription>
            填写菜单基础信息后会调用菜单新建接口。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitCreateMenu">
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
                  <SelectItem value="1">
                    启用
                  </SelectItem>
                  <SelectItem value="0">
                    停用
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" :disabled="createSubmitting" @click="closeCreateDialog">
              取消
            </Button>
            <Button type="submit" :disabled="createSubmitting">
              {{ createSubmitting ? "创建中..." : "创建菜单" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
</template>
