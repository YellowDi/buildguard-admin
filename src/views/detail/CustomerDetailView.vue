<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailAccordionModule from "@/components/detail/DetailAccordionModule.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomerDetail, type CustomerDetailPerson, type CustomerDetailResult } from "@/lib/customers-api"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"

type BuildingRow = {
  key: string
  uuid: string
  parkUuid: string
  name: string
  address: string
  status: "一切正常" | "需重点关注" | "存在风险"
}

type ParkBuildingGroup = {
  key: string
  title: string
  meta: string
  details: DetailFieldSection[]
  buildingModule: DetailRelationModuleSchema<BuildingRow>
  parkUuid: string
  customerUuid: string
}

const route = useRoute()
const router = useRouter()

const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const relationsLoading = ref(false)
const relationErrorMessage = ref("")
const parkBuildingGroups = ref<ParkBuildingGroup[]>([])
let latestRequestId = 0
let latestRelationsRequestId = 0

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

const parkBuildingAccordion = computed(() => ({
  key: "customer-buildings",
  title: "园区 / 建筑列表",
  count: parkBuildingGroups.value.length,
  emptyText: "暂无园区和建筑数据。",
  items: parkBuildingGroups.value,
}))

watch(customer, (current) => {
  detailBreadcrumbTitle.value = current?.CorpName?.trim() || null
})

watch(customerUuid, (uuid) => {
  void loadCustomerDetail(uuid)
  void loadParkBuildings(uuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  router.push({ name: "customers" })
}

function goToParkDetail(parkUuid: string, customerUuid: string) {
  if (!parkUuid || !customerUuid) {
    return
  }

  router.push({
    name: "park-detail",
    params: { id: parkUuid },
    query: { customerUuid },
  })
}

function getGroupParkUuid(group: unknown) {
  if (group && typeof group === "object" && "parkUuid" in group) {
    const value = (group as { parkUuid?: unknown }).parkUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getGroupCustomerUuid(group: unknown) {
  if (group && typeof group === "object" && "customerUuid" in group) {
    const value = (group as { customerUuid?: unknown }).customerUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getItemDetails(item: unknown): DetailFieldSection[] {
  if (item && typeof item === "object" && "details" in item) {
    const value = (item as { details?: unknown }).details
    return Array.isArray(value) ? value as DetailFieldSection[] : []
  }

  return []
}

function getItemBuildingModule(item: unknown): DetailRelationModuleSchema<BuildingRow> | null {
  if (item && typeof item === "object" && "buildingModule" in item) {
    const value = (item as { buildingModule?: unknown }).buildingModule
    return value && typeof value === "object" ? value as DetailRelationModuleSchema<BuildingRow> : null
  }

  return null
}

function getRowUuid(row: unknown) {
  if (row && typeof row === "object" && "uuid" in row) {
    const value = (row as { uuid?: unknown }).uuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getRowParkUuid(row: unknown) {
  if (row && typeof row === "object" && "parkUuid" in row) {
    const value = (row as { parkUuid?: unknown }).parkUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function goToBuildingDetail(buildingUuid: string, parkUuid: string) {
  if (!buildingUuid || !parkUuid) {
    return
  }

  router.push({
    name: "building-detail",
    params: { id: buildingUuid },
    query: { parkUuid },
  })
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

async function loadParkBuildings(uuid: string) {
  const requestId = ++latestRelationsRequestId

  if (!uuid) {
    parkBuildingGroups.value = []
    relationErrorMessage.value = "客户 Uuid 缺失，无法加载园区和建筑列表。"
    return
  }

  relationsLoading.value = true
  relationErrorMessage.value = ""

  try {
    const parksResult = await fetchParks({ CustomerUuid: uuid })

    if (requestId !== latestRelationsRequestId) {
      return
    }

    const groups = await Promise.all(
      parksResult.list.map(async (park, parkIndex) => {
        const parkUuid = toDisplayText(park.Uuid, "")
        const buildingsResult = parkUuid
          ? await fetchBuildings({ ParkUuid: parkUuid })
          : { list: [], total: 0 }

        return {
          key: parkUuid || `park-${parkIndex + 1}`,
          title: toDisplayText(park.Name, "未命名园区"),
          meta: "",
          details: buildParkFieldSections(park),
          buildingModule: buildParkBuildingModule(park, buildingsResult.list),
          parkUuid,
          customerUuid: uuid,
        }
      }),
    )

    if (requestId !== latestRelationsRequestId) {
      return
    }

    parkBuildingGroups.value = groups
  } catch (error) {
    if (requestId !== latestRelationsRequestId) {
      return
    }

    parkBuildingGroups.value = []
    relationErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区和建筑列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRelationsRequestId) {
      relationsLoading.value = false
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

function normalizeBuildingRow(building: BuildingListItem, park: ParkListItem, index: number): BuildingRow {
  const parkUuid = toDisplayText(park.Uuid, "park")

  return {
    key: toDisplayText(building.Uuid, `${parkUuid}-${index + 1}`),
    uuid: toDisplayText(building.Uuid, `${parkUuid}-${index + 1}`),
    parkUuid,
    name: toDisplayText(building.Name, "未命名建筑"),
    address: toDisplayText(building.Address, "-"),
    // 接口暂未返回检测状态，先用默认值占位，后续可直接替换成真实字段映射。
    status: "一切正常",
  }
}

function buildBuildingStatusGroups(buildings: BuildingListItem[], park: ParkListItem) {
  const rows = buildings.map((building, index) => normalizeBuildingRow(building, park, index))

  return [
    {
      key: "normal",
      title: "一切正常",
      rows: rows.filter(row => row.status === "一切正常"),
    },
    {
      key: "attention",
      title: "需重点关注",
      rows: rows.filter(row => row.status === "需重点关注"),
    },
    {
      key: "risk",
      title: "存在风险",
      rows: rows.filter(row => row.status === "存在风险"),
    },
  ].filter(group => group.rows.length)
}

function buildParkFieldSections(park: ParkListItem): DetailFieldSection[] {
  return [
    {
      key: "park-fields",
      title: "",
      rows: [
        { key: "address", label: "地址", value: toDisplayText(park.Address, "-"), truncate: false, valueClass: "leading-6" },
        { key: "created-at", label: "创建时间", value: toDisplayText(park.CreatedAt, "-") },
        { key: "updated-at", label: "更新时间", value: toDisplayText(park.UpdatedAt, "-") },
      ],
    },
  ]
}

function buildParkBuildingModule(park: ParkListItem, buildings: BuildingListItem[]): DetailRelationModuleSchema<BuildingRow> {
  const groups = buildBuildingStatusGroups(buildings, park)

  return {
    key: `park-buildings-${toDisplayText(park.Uuid, "park")}`,
    title: "建筑列表",
    count: groups.reduce((sum, group) => sum + group.rows.length, 0),
    rowKey: "key",
    columns: [
      { key: "name", label: "名称", slot: "building-status-cell" },
      { key: "address", label: "地址", cellClass: "truncate text-muted-foreground" },
      { key: "actions", label: "", slot: "building-action-cell", cellClass: "flex justify-end" },
    ],
    groups,
    mobileMinWidth: "40rem",
    columnTemplateMobile: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
    columnTemplateDesktop: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
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
          <Alert v-if="relationErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>园区/建筑接口加载失败</AlertTitle>
            <AlertDescription>{{ relationErrorMessage }}</AlertDescription>
          </Alert>

          <div
            v-if="relationsLoading"
            class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
          >
            正在获取园区和建筑列表数据。
          </div>

          <template v-else-if="parkBuildingGroups.length">
            <DetailAccordionModule :schema="parkBuildingAccordion">
              <template #item-actions="{ item }">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-8 rounded-md"
                  @click="goToParkDetail(getGroupParkUuid(item), getGroupCustomerUuid(item))"
                >
                  查看详情
                </Button>
              </template>

              <template #expanded-content="{ item }">
                <DetailFieldSections :sections="getItemDetails(item)" compact />

                <div v-if="getItemBuildingModule(item)">
                  <DetailRelationModule :schema="getItemBuildingModule(item)!">
                    <template #building-status-cell="{ row }">
                      <div class="flex min-w-0 items-center gap-2 text-foreground">
                        <i
                          :class="[
                            'text-[18px]',
                            row.status === '存在风险'
                              ? 'ri-close-circle-fill text-[#EF4444]'
                              : row.status === '需重点关注'
                                ? 'ri-time-fill text-[#F97316]'
                                : 'ri-checkbox-circle-fill text-[#22C55E]',
                          ]"
                        />
                        <span class="truncate">{{ row.name }}</span>
                      </div>
                    </template>

                    <template #building-action-cell="{ row }">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 rounded-md"
                        @click="goToBuildingDetail(getRowUuid(row), getRowParkUuid(row))"
                      >
                        查看详情
                      </Button>
                    </template>
                  </DetailRelationModule>
                </div>
              </template>
            </DetailAccordionModule>
          </template>

          <div
            v-else
            class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
          >
            暂无园区和建筑数据。
          </div>
        </div>
      </template>
    </template>
  </DetailLayout>
</template>
