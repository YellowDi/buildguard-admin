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
import { API_PATHS, buildApiUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import { practitionerStatusMap } from "@/components/table-page/statusPresets"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"

type MemberViewKey = "members" | "departments" | "permission-groups"

type MemberRow = {
  id: number
  name: string
  phone: string
  departmentName: string
  position: string
  permissionGroup: string
  permissionOptions: string[]
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

const DEFAULT_PERMISSION_GROUPS = ["超级管理员", "管理员", "审核员", "成员", "观察者"]
const MEMBERS_API_URL = buildApiUrl(API_PATHS.membersList)
const toolbarIconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_thead_th:last-child]:w-0 [&_thead_th:last-child]:min-w-0 [&_thead_th:last-child]:p-0 [&_tbody_td:last-child]:w-0 [&_tbody_td:last-child]:min-w-0 [&_tbody_td:last-child]:p-0 [&_tbody_tr:hover]:bg-transparent [&_tbody_tr:hover_td]:bg-transparent"

const rows = ref<MemberRow[]>([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref("")
const activeView = ref<MemberViewKey>("members")
const searchExpanded = ref(false)
const searchQuery = ref("")

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
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "position",
    label: "职位",
    filterType: "text",
    tone: "muted",
    width: "fill",
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
      map: practitionerStatusMap,
      fallback: { tone: "gray", icon: "dot" },
    },
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    headerClass: "w-[4.5rem]",
    cellClass: "w-[4.5rem] text-right",
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
      description: "请检查接口地址、请求方式或重新加载当前页面。",
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

    if (!response.ok) {
      throw new Error(`接口请求失败（${response.status}）`)
    }

    const payload = await response.json() as ApiEnvelope | unknown[]
    const list = extractList(payload)

    rows.value = list.map((item, index) => normalizeMemberRow(item, index))
    total.value = extractTotal(payload, rows.value.length)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "成员接口请求失败"
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
  const roleNames = extractRoleNames(record.Roles)
  const permissionOptions = buildPermissionOptions(roleNames)
  const initialPermissionGroup = roleNames[0] ?? "成员"

  return {
    id: toNumber(record.Id, index + 1),
    name: toText(record.Name, `成员 ${index + 1}`),
    phone: toText(record.Phone, "-"),
    departmentName: toText(record.DepartmentName, "未分组"),
    position: toText(record.Position, "未设置职位"),
    permissionGroup: initialPermissionGroup,
    permissionOptions,
    status: normalizeStatus(record.Status),
  }
}

function extractRoleNames(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const roleRecord = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
      return toText(roleRecord.RoleName)
    })
    .filter(Boolean)
}

function buildPermissionOptions(roleNames: string[]) {
  return Array.from(new Set([...roleNames, ...DEFAULT_PERMISSION_GROUPS]))
}

function normalizeStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) {
      return "正常"
    }

    if (value === 2) {
      return "离职"
    }

    if (value === 0) {
      return "待复核"
    }
  }

  const text = toText(value).trim()

  if (!text) {
    return "待复核"
  }

  if (["启用", "正常", "active", "enabled", "1"].includes(text)) {
    return "正常"
  }

  if (["离职", "inactive", "disabled", "2"].includes(text)) {
    return "离职"
  }

  if (["待复核", "0"].includes(text)) {
    return "待复核"
  }

  return text
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

function toggleSearch() {
  if (searchExpanded.value) {
    searchQuery.value = ""
    searchExpanded.value = false
    return
  }

  searchExpanded.value = true
}

function updatePermissionGroup(memberId: number, nextGroup: string) {
  const member = rows.value.find(row => row.id === memberId)

  if (!member || member.permissionGroup === nextGroup) {
    return
  }

  member.permissionGroup = nextGroup
  toast.success("权限组已更新", {
    description: `${member.name} 已切换到 ${nextGroup}。`,
  })
}

function handleMemberAction(actionKey: MemberActionKey, member?: MemberRow) {
  if (actionKey === "manual") {
    toast("成员创建入口待接入", {
      description: "当前先保留添加成员的入口，后续可接表单或抽屉。",
    })
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

  toast.error("停用成员未开放", {
    description: `${member.name} 的停用确认流尚未接入。`,
  })
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

          <DropdownMenu v-if="activeView === 'members'">
            <DropdownMenuTrigger as-child>
              <Button class="h-8 gap-1 rounded-md px-3 text-[14px]">
                <i class="ri-user-add-line text-base" />
                <span>添加成员</span>
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
              class="inline-flex h-7 max-w-[9rem] items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground focus-visible:bg-surface-tertiary focus-visible:text-foreground focus-visible:outline-none"
            >
              <span class="truncate">{{ asMemberRow(rawRow).permissionGroup }}</span>
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
              <DropdownMenuRadioItem
                v-for="option in asMemberRow(rawRow).permissionOptions"
                :key="`${asMemberRow(rawRow).id}-${option}`"
                :value="option"
                class="rounded-lg py-2 pr-2 pl-8"
              >
                {{ option }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>

      <template #cell-actions="{ row: rawRow }">
        <DropdownMenu v-if="activeView === 'members'">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="ml-auto size-7 rounded-full">
              <i class="ri-more-2-fill text-base" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-[180px] rounded-xl p-1.5">
            <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleMemberAction('view', asMemberRow(rawRow))">
              查看成员资料
            </DropdownMenuItem>
            <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleMemberAction('invite', asMemberRow(rawRow))">
              重新发送邀请
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1" />
            <DropdownMenuItem
              class="rounded-lg px-2.5 py-2 text-destructive focus:text-destructive"
              @select="handleMemberAction('disable', asMemberRow(rawRow))"
            >
              停用成员
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </TablePageTable>
  </section>
</template>
