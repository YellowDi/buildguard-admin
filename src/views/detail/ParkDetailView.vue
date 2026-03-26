<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchParkDetail, type ParkDetailResult } from "@/lib/parks-api"

type BuildingRow = {
  id: string
  name: string
  address: string
}

const route = useRoute()
const router = useRouter()

const park = ref<ParkDetailResult | null>(null)
const buildings = ref<BuildingRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

const parkUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = park.value
  if (!current) {
    return []
  }

  return [
    {
      key: "park-info",
      title: "园区基础信息",
      rows: [
        { key: "name", label: "园区名称", value: toText(current.Name, "未命名园区") },
        { key: "built-time", label: "建成时间", value: toText(current.BuiltTime, "-") },
        { key: "operation-time", label: "投运时间", value: toText(current.OperationTime, "-") },
        { key: "building-area", label: "建筑面积", value: toText(current.BuildArea, "-") },
        { key: "contact", label: "联系人", value: buildContactValue(toText(current.Contact, "未填写"), toText(current.ContactPhone, "-")) },
        { key: "address", label: "地址", value: toText(current.Address, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
  ]
})

const buildingModule = computed<DetailRelationModuleSchema<BuildingRow>>(() => ({
  key: "park-buildings",
  title: "建筑列表",
  count: buildings.value.length,
  rowKey: "id",
  columns: [
    { key: "name", label: "名称", cellClass: "truncate" },
    { key: "address", label: "地址", cellClass: "truncate text-muted-foreground" },
  ],
  groups: [
    {
      key: "buildings",
      title: "园区建筑",
      rows: buildings.value,
    },
  ],
  mobileMinWidth: "32rem",
  columnTemplateMobile: "minmax(10rem,1.2fr) minmax(14rem,1.8fr)",
  columnTemplateDesktop: "minmax(10rem,1.2fr) minmax(14rem,1.8fr)",
}))

watch(park, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch(parkUuid, (nextParkUuid) => {
  void loadParkDetail(nextParkUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  router.back()
}

async function loadParkDetail(nextParkUuid: string) {
  const requestId = ++latestRequestId

  if (!nextParkUuid) {
    park.value = null
    buildings.value = []
    errorMessage.value = "园区详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const [parkResult, buildingsResult] = await Promise.all([
      fetchParkDetail({ Uuid: nextParkUuid }),
      fetchBuildings({ ParkUuid: nextParkUuid }),
    ])

    if (requestId !== latestRequestId) {
      return
    }

    park.value = parkResult
    buildings.value = buildingsResult.list.map((item, index) => ({
      id: toText(item.Uuid, `${nextParkUuid}-${index + 1}`) || `${nextParkUuid}-${index + 1}`,
      name: toText(item.Name, "未命名建筑") || "未命名建筑",
      address: toText(item.Address, "-") || "-",
    }))
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    park.value = null
    buildings.value = []
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function toText(value: unknown, fallback: string | null = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toOptionalText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function buildContactValue(name: string | null, phone?: string | null): DetailContactValue {
  return {
    kind: "contact",
    name: name ?? "未填写",
    phone,
  }
}
</script>

<template>
  <DetailLayout
    :title="toText(park?.Name, '园区详情') || '园区详情'"
    :subtitle="toText(park?.Address, '') || ''"
    :empty="!loading && !park"
    empty-text="未找到该园区信息"
    @back="goBack"
  >
    <template #actions>
      <Button variant="outline" size="sm" class="border-border/80 bg-background font-medium text-foreground shadow-none" @click="goBack">
        返回
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>园区详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
        正在获取园区详情数据。
      </div>

      <DetailFieldSections v-else-if="park" :sections="fieldSections" />
    </template>

    <template #secondary>
      <div v-if="!loading && park" class="pb-5">
        <DetailRelationModule :schema="buildingModule" />
      </div>
    </template>
  </DetailLayout>
</template>
