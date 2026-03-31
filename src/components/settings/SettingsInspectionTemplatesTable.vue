<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { toast } from "vue-sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import {
  createInspectionServiceTemplate,
  fetchInspectionServiceTemplates,
  type InspectionServiceTemplateRecord,
} from "@/lib/inspection-service-templates-api"
import { fetchInspectionItems, type InspectionItemRecord } from "@/lib/inspection-items-api"

const props = withDefaults(defineProps<{
  hideCreateButton?: boolean
  hideToolbar?: boolean
  searchQuery?: string
}>(), {
  hideCreateButton: false,
  hideToolbar: false,
  searchQuery: undefined,
})

const emit = defineEmits<{
  countChange: [count: number]
}>()

type TemplateRow = {
  id: number
  uuid: string
  name: string
  inspectionCount: number
  inspectionSummary: string
}

type InspectionItemOption = {
  id: number
  uuid: string
  name: string
  categoryName: string
}

const TEMPLATE_LOAD_ERROR_MESSAGE = "检测模板列表加载失败，请稍后重试。"
const rows = ref<TemplateRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchExpanded = ref(false)
const searchQuery = ref("")
const createDialogOpen = ref(false)
const createSubmitting = ref(false)
const createLoading = ref(false)
const createErrorMessage = ref("")
const createTemplateName = ref("")
const createItemSearchQuery = ref("")
const createSelectedInspectionUuids = ref<string[]>([])
const inspectionItemOptions = ref<InspectionItemOption[]>([])

const columns: TableColumn[] = [
  {
    key: "name",
    label: "模板名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "inspectionCount",
    label: "检测项数量",
    filterType: "tag",
    tone: "muted",
  },
  {
    key: "inspectionSummary",
    label: "检测项预览",
    filterType: "text",
    tone: "muted",
    width: "fill",
  },
]

const effectiveSearchQuery = computed(() => props.searchQuery ?? searchQuery.value)
const filteredRows = computed(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row => [
    row.name,
    row.uuid,
    row.inspectionSummary,
  ].some(field => field.toLowerCase().includes(query)))
})

const filteredInspectionItemOptions = computed(() => {
  const query = createItemSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return inspectionItemOptions.value
  }

  return inspectionItemOptions.value.filter(item => [
    item.name,
    item.uuid,
    item.categoryName,
  ].some(field => field.toLowerCase().includes(query)))
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: "模板加载中",
      description: "正在同步模板列表，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的模板",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "还没有模板",
    description: "先创建模板，后续即可在这里统一维护。",
    icon: "ri-layout-grid-line",
  }
})

onMounted(() => {
  void loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchAllTemplates()
    rows.value = result.map(normalizeTemplateRow)
    emit("countChange", rows.value.length)
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "模板接口加载失败",
      fallback: TEMPLATE_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    loading.value = false
  }
}

async function fetchAllTemplates() {
  const pageSize = 200
  const allItems: InspectionServiceTemplateRecord[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionServiceTemplates({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeTemplates(allItems)
}

async function loadInspectionItemOptions() {
  createLoading.value = true
  createErrorMessage.value = ""

  const pageSize = 200
  const allItems: InspectionItemRecord[] = []
  let pageNum = 1
  let total = 0

  try {
    while (pageNum <= 20) {
      const result = await fetchInspectionItems({
        PageNum: pageNum,
        PageSize: pageSize,
      })

      if (pageNum === 1) {
        total = result.total
      }

      allItems.push(...result.list)

      if (!result.list.length || (total > 0 && allItems.length >= total)) {
        break
      }

      pageNum += 1
    }

    inspectionItemOptions.value = dedupeInspectionItems(allItems).map(normalizeInspectionItemOption)
  } catch (error) {
    createErrorMessage.value = handleApiError(error, {
      title: "检测项接口加载失败",
      fallback: "检测项列表加载失败，请稍后重试。",
      mode: "silent",
    })
  } finally {
    createLoading.value = false
  }
}

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

async function refreshData() {
  await loadTemplates()
}

async function openCreateDialog() {
  resetCreateDialog()
  createDialogOpen.value = true

  if (!inspectionItemOptions.value.length) {
    await loadInspectionItemOptions()
  }
}

function resetCreateDialog() {
  createTemplateName.value = ""
  createItemSearchQuery.value = ""
  createSelectedInspectionUuids.value = []
  createErrorMessage.value = ""
}

function isInspectionSelected(uuid: string) {
  return createSelectedInspectionUuids.value.includes(uuid)
}

function updateInspectionSelected(uuid: string, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (checked) {
    createSelectedInspectionUuids.value = Array.from(new Set([...createSelectedInspectionUuids.value, uuid]))
    return
  }

  createSelectedInspectionUuids.value = createSelectedInspectionUuids.value.filter(item => item !== uuid)
}

async function submitCreate() {
  const name = createTemplateName.value.trim()

  if (!name) {
    toast.error("请填写模板名称")
    return
  }

  if (!createSelectedInspectionUuids.value.length) {
    toast.error("请至少选择一个检测项")
    return
  }

  createSubmitting.value = true

  try {
    await createInspectionServiceTemplate({
      Name: name,
      InspectionUuids: createSelectedInspectionUuids.value,
    })

    createDialogOpen.value = false
    await loadTemplates()
    toast.success("模板已创建", {
      description: `${name} 已加入当前列表。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "模板创建失败",
      fallback: "检测模板创建失败，请稍后重试。",
    })
  } finally {
    createSubmitting.value = false
  }
}

function normalizeTemplateRow(item: InspectionServiceTemplateRecord, index: number): TemplateRow {
  const id = toNumber(item.Id) ?? index + 1
  const uuid = toText(item.Uuid, `template-${id}`)
  const inspections = Array.isArray(item.Inspections) ? item.Inspections : []
  const inspectionNames = inspections
    .map(inspection => toText(inspection.InspectionName))
    .filter(Boolean)

  return {
    id,
    uuid,
    name: toText(item.Name, `模板 ${id}`),
    inspectionCount: inspections.length,
    inspectionSummary: inspectionNames.length
      ? inspectionNames.slice(0, 3).join("、") + (inspectionNames.length > 3 ? ` 等 ${inspectionNames.length} 项` : "")
      : "暂无检测项",
  }
}

function normalizeInspectionItemOption(item: InspectionItemRecord): InspectionItemOption {
  return {
    id: toNumber(item.Id) ?? 0,
    uuid: toText(item.Uuid),
    name: toText(item.Name, `检测项 ${toNumber(item.Id) ?? "-"}`),
    categoryName: toText(item.CategoryName, "未分类"),
  }
}

function dedupeTemplates(items: InspectionServiceTemplateRecord[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = toText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function dedupeInspectionItems(items: InspectionItemRecord[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = toText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

defineExpose({
  openCreateDialog,
  refreshData,
})
</script>

<template>
  <section class="space-y-5">
    <SettingsToolbarRow v-if="!props.hideToolbar">
      <div class="flex flex-nowrap items-center justify-end gap-2">
        <SettingsToolbarSearchInput
          v-model="searchQuery"
          :expanded="searchExpanded"
          placeholder="搜索模板名称、UUID、检测项"
          @toggle="toggleSearch"
        />

        <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
          <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" @click="refreshData">
            <i class="ri-refresh-line text-sm" />
            <span>刷新列表</span>
          </Button>
        </SettingsToolbarRefreshSlot>

        <Button v-if="!props.hideCreateButton" class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="openCreateDialog">
          <i class="ri-add-line text-base" />
          <span>添加模板</span>
        </Button>
      </div>
    </SettingsToolbarRow>

    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/3"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>模板接口加载失败</AlertTitle>
      <AlertDescription>
        {{ errorMessage }}
      </AlertDescription>
    </Alert>

    <TablePageTable
      sticky-header
      :end-spacer="false"
      :columns="columns"
      :rows="filteredRows"
      row-key="id"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    />

    <Dialog :open="createDialogOpen" @update:open="($event ? (createDialogOpen = true) : (createDialogOpen = false))">
      <DialogContent class="max-w-4xl gap-0 p-0">
        <DialogHeader class="border-b border-border/60 px-6 pt-6 pb-4">
          <DialogTitle>添加检测模板</DialogTitle>
          <DialogDescription>
            输入模板名称后，从检测项列表中选择多条检测项并保存。
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[75vh] flex-col overflow-hidden">
          <div class="space-y-4 border-b border-border/60 px-6 pt-0 pb-3">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground" for="settings-inspection-template-name">模板名称</label>
              <Input
                id="settings-inspection-template-name"
                v-model="createTemplateName"
                placeholder="请输入模板名称"
                :disabled="createSubmitting"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground" for="settings-inspection-template-search">检测项</label>
              <Input
                id="settings-inspection-template-search"
                v-model="createItemSearchQuery"
                placeholder="搜索检测项名称、分类"
                :disabled="createLoading || createSubmitting"
              />
              <p class="text-xs text-muted-foreground">
                已选择 {{ createSelectedInspectionUuids.length }} 个检测项
              </p>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div v-if="createErrorMessage" class="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p class="text-sm font-medium text-destructive">
                检测项加载失败
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ createErrorMessage }}
              </p>
            </div>

            <div v-else-if="createLoading" class="space-y-3">
              <div v-for="slot in 5" :key="`template-create-skeleton-${slot}`" class="h-20 rounded-2xl border border-border/60 bg-muted/15" />
            </div>

            <div v-else-if="!filteredInspectionItemOptions.length" class="rounded-xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              没有匹配的检测项。
            </div>

            <div v-else class="grid gap-3 sm:grid-cols-2">
              <label
                v-for="item in filteredInspectionItemOptions"
                :key="item.uuid"
                class="relative flex cursor-pointer items-start gap-3 rounded-xl border border-border/55 bg-background/95 px-3.5 py-3.5 shadow-xs transition-all duration-200 hover:border-[color:var(--theme-primary)]/35 hover:bg-muted/45 hover:shadow-sm"
                :class="isInspectionSelected(item.uuid) ? 'border-[color:var(--theme-primary)]/50 bg-[color:var(--theme-primary)]/10 shadow-sm ring-1 ring-[color:var(--theme-primary)]/15' : ''"
              >
                <Checkbox
                  :model-value="isInspectionSelected(item.uuid)"
                  :disabled="createSubmitting"
                  class="mt-0.5"
                  @update:model-value="updateInspectionSelected(item.uuid, $event)"
                />
                <div class="min-w-0 flex-1">
                  <div class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {{ item.name }}
                  </div>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ item.categoryName }}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 px-6 py-4">
          <Button type="button" variant="outline" :disabled="createSubmitting" @click="createDialogOpen = false">
            取消
          </Button>
          <Button type="button" :disabled="createSubmitting || createLoading" @click="submitCreate">
            {{ createSubmitting ? "创建中..." : "创建模板" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
