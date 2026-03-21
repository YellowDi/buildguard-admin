<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailPerson, type CustomerDetailResult } from "@/lib/customers-api"

type CustomerContactRow = {
  id: string
  name: string
  phone: string
  role: string
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
        { key: "uuid", label: "Uuid", value: toDisplayText(current.Uuid) },
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
  ]
})

const peopleModule = computed<DetailRelationModuleSchema<CustomerContactRow>>(() => ({
  key: "customer-contacts",
  title: "联系人",
  count: contactRows.value.length,
  rowKey: "id",
  columns: [
    { key: "name", label: "姓名", cellClass: "truncate" },
    { key: "phone", label: "手机号", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "role", label: "角色", cellClass: "whitespace-nowrap" },
  ],
  groups: [
    {
      key: "contacts",
      title: "责任人列表",
      rows: contactRows.value,
    },
  ],
  columnTemplateMobile: "minmax(10rem,1.2fr) minmax(10rem,1fr) minmax(8rem,0.8fr)",
  columnTemplateDesktop: "minmax(10rem,1.3fr) minmax(10rem,1fr) minmax(8rem,0.8fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

const contactRows = computed<CustomerContactRow[]>(() => {
  const people = customer.value?.People

  if (!Array.isArray(people)) {
    return []
  }

  return people.map((person, index) => normalizeContactRow(person, index))
})

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

function normalizeContactRow(person: CustomerDetailPerson, index: number): CustomerContactRow {
  return {
    id: `${person.Name ?? "contact"}-${index + 1}`,
    name: toDisplayText(person.Name),
    phone: toDisplayText(person.Phone),
    role: resolveContactRole(person.IsMain, index),
  }
}

function resolveContactRole(isMain: unknown, index: number) {
  if (Number(isMain) === 1) {
    return "主要责任人"
  }

  return index === 0 ? "责任人" : "协同联系人"
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

      <Card v-if="loading" class="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle>加载中</CardTitle>
          <CardDescription>正在获取客户详情数据。</CardDescription>
        </CardHeader>
      </Card>

      <template v-else-if="customer">
        <Card class="gap-0 border-border/70 shadow-none">
          <CardHeader class="gap-2 pb-4">
            <CardDescription>客户概览</CardDescription>
            <CardTitle class="text-[20px] leading-tight">{{ toDisplayText(customer.CorpName) }}</CardTitle>
            <CardDescription>{{ toDisplayText(customer.Business) }} · {{ formatLevel(customer.Level) }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg bg-surface-tertiary px-4 py-3">
              <div class="text-xs text-muted-foreground">Uuid</div>
              <div class="mt-1 break-all text-sm font-medium text-foreground">{{ toDisplayText(customer.Uuid) }}</div>
            </div>
            <div class="rounded-lg bg-surface-tertiary px-4 py-3">
              <div class="text-xs text-muted-foreground">联系人数量</div>
              <div class="mt-1 text-xl font-semibold text-foreground">{{ contactRows.length }}</div>
            </div>
          </CardContent>
        </Card>

        <Separator class="my-5 bg-border/80" />

        <DetailFieldSections :sections="fieldSections" />

        <Separator class="my-5 bg-border/80" />

        <DetailRelationModule :schema="peopleModule" />
      </template>
    </template>
  </DetailLayout>
</template>
