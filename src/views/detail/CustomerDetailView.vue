<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailPerson, type CustomerDetailResult } from "@/lib/customers-api"

type BuildingRow = {
  id: string
  name: string
  completedAt: string
  area: string
  riskLevel: string
}

const route = useRoute()
const router = useRouter()

const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

const customerUuid = computed(() => {
  const value = route.params.id
  return typeof value === "string" ? value.trim() : ""
})

const pageTitle = computed(() => customer.value?.CorpName?.trim() || "客户详情")
const pageSubtitle = computed(() => customer.value?.Business?.trim() || "")
const isEmpty = computed(() => !loading.value && !customer.value)

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = customer.value

  if (!current) {
    return []
  }

  return [
    {
      key: "base-info",
      title: "基础信息",
      rows: [
        { key: "corp-name", label: "企业名称", value: toDisplayText(current.CorpName) },
        { key: "business", label: "所属行业", value: toDisplayText(current.Business) },
        { key: "level", label: "客户等级", value: formatLevel(current.Level) },
        { key: "address", label: "详细地址", value: toDisplayText(current.Address), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "qualification-info",
      title: "资质与开票",
      rows: [
        { key: "usci", label: "统一社会信用代码", value: toDisplayText(current.Usci) },
        { key: "usci-file", label: "信用代码附件", value: toDisplayText(current.UsciFile), truncate: false, valueClass: "leading-6" },
        { key: "invoice", label: "开票资料", value: toDisplayText(current.Invoice), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "contacts",
      title: "客户联系人",
      rows: buildContactFieldRows(current.People),
    },
  ]
})

const buildingModule = computed<DetailRelationModuleSchema<BuildingRow>>(() => ({
  key: "customer-buildings",
  title: "建筑列表",
  count: 0,
  rowKey: "id",
  columns: [
    { key: "name", label: "名称", cellClass: "truncate" },
    { key: "completedAt", label: "建成时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "area", label: "建筑面积", cellClass: "whitespace-nowrap" },
    { key: "riskLevel", label: "风险等级", cellClass: "whitespace-nowrap" },
  ],
  groups: [
    {
      key: "buildings-placeholder",
      title: "待接入",
      rows: [],
    },
  ],
  mobileMinWidth: "38rem",
  columnTemplateMobile: "minmax(10rem,1.4fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(6rem,0.8fr)",
  columnTemplateDesktop: "minmax(10rem,1.5fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(6rem,0.8fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

watch(customer, (current) => {
  detailBreadcrumbTitle.value = current?.CorpName?.trim() || null
})

watch(customerUuid, (uuid) => {
  void loadCustomerDetail(uuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  router.push({ name: "customers" })
}

async function loadCustomerDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    customer.value = null
    errorMessage.value = "客户 Uuid 缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomerDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    customer.value = result
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    customer.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function resolveContactRole(isMain: unknown, index: number) {
  if (Number(isMain) === 1) {
    return "主要责任人"
  }

  return index === 0 ? "责任人" : "协同联系人"
}

function buildContactFieldRows(people: CustomerDetailResult["People"]) {
  if (!Array.isArray(people) || !people.length) {
    return [
      { key: "contact-empty", label: "联系人", value: "未填写" },
    ]
  }

  return people.map((person, index) => createContactFieldRow(person, index))
}

function createContactFieldRow(person: CustomerDetailPerson, index: number) {
  const name = toDisplayText(person.Name)
  const phone = toDisplayText(person.Phone, "-")

  return {
    key: `contact-${index + 1}`,
    label: resolveContactRole(person.IsMain, index),
    value: `${name} ${phone}`,
  }
}

function formatLevel(level: unknown) {
  return typeof level === "number" && Number.isFinite(level) ? `等级 ${level}` : "未评级"
}

function toDisplayText(value: unknown, fallback = "未填写") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
</script>

<template>
  <DetailLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :empty="isEmpty"
    empty-text="未找到该客户信息"
    @back="goBack"
  >
    <template #actions>
      <Button
        variant="outline"
        size="sm"
        class="border-border/80 bg-background font-medium text-foreground shadow-none"
        @click="goBack"
      >
        返回客户列表
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>客户详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
        正在获取客户详情数据。
      </div>

      <template v-else-if="customer">
        <DetailFieldSections :sections="fieldSections" />
      </template>
    </template>

    <template #secondary>
      <template v-if="!loading && customer">
        <div class="pb-5">
          <DetailRelationModule :schema="buildingModule" />
        </div>
      </template>
    </template>
  </DetailLayout>
</template>
