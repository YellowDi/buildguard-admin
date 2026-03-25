<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"

type InspectionServiceDetailRecord = {
  uuid: string
  Name: string
  Level: string
  CustomerName: string
  ParkName: string
  BuildName: string
  CreatedAt: string
  UpdatedAt: string
  raw?: {
    customerUuid?: string
    managerName?: string
    managerPhone?: string
    templateName?: string
    remark?: string
  }
}

const INSPECTION_SERVICE_DETAIL_STORAGE_KEY = "inspection-service-detail:"

const route = useRoute()
const router = useRouter()
const detail = ref<InspectionServiceDetailRecord | null>(null)
const errorMessage = ref("")

const inspectionServiceUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")

const fieldSections = computed<DetailFieldSection[]>(() => {
  if (!detail.value) {
    return []
  }

  return [
    {
      key: "inspection-service-base",
      title: "检测服务信息",
      rows: [
        { key: "name", label: "服务名称", value: detail.value.Name },
        { key: "level", label: "服务等级", value: detail.value.Level },
        { key: "customer-name", label: "所属客户", value: detail.value.CustomerName },
        { key: "park-name", label: "园区名称", value: detail.value.ParkName, truncate: false },
        { key: "build-name", label: "建筑名称", value: detail.value.BuildName, truncate: false },
        { key: "created-at", label: "创建时间", value: detail.value.CreatedAt },
        { key: "updated-at", label: "更新时间", value: detail.value.UpdatedAt },
      ],
    },
    {
      key: "inspection-service-extra",
      title: "补充信息",
      rows: [
        { key: "manager", label: "负责人", value: `${toText(detail.value.raw?.managerName, "未填写")} ${toText(detail.value.raw?.managerPhone, "-")}` },
        { key: "template", label: "检测模板", value: toText(detail.value.raw?.templateName, "未配置模板") },
        { key: "remark", label: "备注", value: toText(detail.value.raw?.remark, "-"), truncate: false },
      ],
    },
  ]
})

watch(inspectionServiceUuid, (uuid) => {
  loadInspectionServiceDetail(uuid)
}, { immediate: true })

watch(detail, (current) => {
  detailBreadcrumbTitle.value = current?.Name ?? null
})

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function loadInspectionServiceDetail(uuid: string) {
  if (!uuid) {
    detail.value = null
    errorMessage.value = "检测服务详情参数缺失，无法加载详情。"
    return
  }

  if (typeof window === "undefined") {
    detail.value = null
    errorMessage.value = "当前环境不支持读取检测服务详情缓存。"
    return
  }

  const raw = window.sessionStorage.getItem(`${INSPECTION_SERVICE_DETAIL_STORAGE_KEY}${uuid}`)

  if (!raw) {
    detail.value = null
    errorMessage.value = "未找到检测服务详情缓存，请从列表页重新进入。"
    return
  }

  try {
    detail.value = JSON.parse(raw) as InspectionServiceDetailRecord
    errorMessage.value = ""
  } catch {
    detail.value = null
    errorMessage.value = "检测服务详情缓存已损坏，请从列表页重新进入。"
  }
}

function goBack() {
  router.back()
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
</script>

<template>
  <DetailLayout
    :title="detail?.Name || '检测服务详情'"
    :subtitle="detail?.CustomerName || ''"
    :empty="!detail"
    empty-text="未找到该检测服务信息"
    @back="goBack"
  >
    <template #actions>
      <Button variant="outline" size="sm" class="border-border/80 bg-background font-medium text-foreground shadow-none" @click="goBack">
        返回
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测服务详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldSections v-if="detail" :sections="fieldSections" />
    </template>
  </DetailLayout>
</template>
