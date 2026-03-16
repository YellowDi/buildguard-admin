<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { API_PATHS, buildApiUrl } from "@/lib/api"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import { practitionerStatusMap } from "@/components/table-page/statusPresets"
import type { TableColumn } from "@/components/table-page/types"

type MemberRow = {
  id: number
  name: string
  phone: string
  company: string
  role: string
  joinedAt: string
  status: string
}

type ApiEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

const MEMBERS_API_URL = buildApiUrl(API_PATHS.membersList)

const rows = ref<MemberRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const total = ref(0)

const summary = computed(() => (
  total.value > 0
    ? `当前共 ${total.value} 名成员`
    : rows.value.length > 0
      ? `当前共 ${rows.value.length} 名成员`
    : ""
))

const columns: TableColumn[] = [
  {
    key: "name",
    label: "成员",
    filterType: "contact",
    variant: "contact",
    cellRenderer: {
      kind: "dual-stack",
      primaryKey: "name",
      secondaryKey: "phone",
      primaryClass: "text-foreground",
      secondaryClass: "text-muted-foreground",
    },
  },
  {
    key: "company",
    label: "所属企业",
    filterType: "text",
    emphasis: "strong",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "role",
    label: "角色",
    filterType: "tag",
  },
  {
    key: "joinedAt",
    label: "加入时间",
    filterType: "time",
    format: "numeric",
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
]

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
    total.value = extractTotal(payload, list.length)

    rows.value = list.map((item, index) => normalizeMemberRow(item, index))
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : "成员接口请求失败"
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

    if (Array.isArray(nested.list)) {
      return nested.list
    }

    if (Array.isArray(nested.List)) {
      return nested.List
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
  const roles = Array.isArray(record.Roles) ? record.Roles : []

  return {
    id: toNumber(record.Id, index + 1),
    name: toText(record.Name, `成员 ${index + 1}`),
    phone: toText(record.Phone),
    company: toText(record.DepartmentName, "-"),
    role: resolveRole(record.Position, roles),
    joinedAt: "-",
    status: normalizeStatus(record.Status),
  }
}

function resolveRole(position: unknown, roles: unknown[]) {
  const positionText = toText(position)
  if (positionText) {
    return positionText
  }

  const roleNames = roles
    .map((role) => {
      const roleRecord = (role && typeof role === "object" ? role : {}) as Record<string, unknown>
      return toText(roleRecord.RoleName)
    })
    .filter(Boolean)

  if (roleNames.length > 0) {
    return roleNames.join("、")
  }

  return "成员"
}

function normalizeStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) {
      return "在岗"
    }

    if (value === 0) {
      return "停用"
    }

    return String(value)
  }

  const text = toText(value).trim()

  if (!text) {
    return "待复核"
  }

  if (["启用", "正常", "active", "enabled", "1"].includes(text)) {
    return "在岗"
  }

  if (["禁用", "inactive", "disabled", "0"].includes(text)) {
    return "停用"
  }

  return text
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

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
</script>

<template>
  <section class="space-y-3">
    <div class="space-y-1">
      <h3 class="text-base font-semibold tracking-tight text-foreground">
        成员列表
      </h3>
      <p class="text-sm leading-6 text-muted-foreground">
        直接复用现有表格样式展示当前工作区成员，不包含筛选和排序操作。
      </p>
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
      :columns="columns"
      :rows="rows"
      row-key="id"
      :summary="summary"
      :empty-state="loading ? { title: '成员加载中', description: '正在获取成员列表，请稍候。', icon: 'ri-loader-4-line' } : { title: '暂无成员数据', description: '接口暂未返回可展示的成员列表。', icon: 'ri-team-line' }"
    />
  </section>
</template>
