<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
  deleteInspectionServiceTemplate,
  fetchInspectionServiceTemplates,
  getInspectionServiceTemplateDetail,
  updateInspectionServiceTemplate,
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

type InspectionItemCategoryGroup = {
  key: string
  categoryName: string
  selectedCount: number
  items: InspectionItemOption[]
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
const editDetailLoading = ref(false)
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const editingTemplateUuid = ref("")
const createErrorMessage = ref("")
const createTemplateName = ref("")
const createItemSearchQuery = ref("")
const createSelectedInspectionUuids = ref<string[]>([])
const inspectionItemOptions = ref<InspectionItemOption[]>([])
const createExpandedCategoryKey = ref("")

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
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    cellClass: "text-right",
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

const groupedInspectionItemOptions = computed<InspectionItemCategoryGroup[]>(() => {
  const bucket = new Map<string, InspectionItemOption[]>()

  filteredInspectionItemOptions.value.forEach((item) => {
    const categoryName = item.categoryName || "未分类"

    if (!bucket.has(categoryName)) {
      bucket.set(categoryName, [])
    }

    bucket.get(categoryName)?.push(item)
  })

  return Array.from(bucket.entries())
    .sort((left, right) => left[0].localeCompare(right[0], "zh-Hans-CN"))
    .map(([categoryName, items]) => ({
      key: `category-${categoryName}`,
      categoryName,
      selectedCount: items.reduce((count, item) => (
        createSelectedInspectionUuids.value.includes(item.uuid) ? count + 1 : count
      ), 0),
      items,
    }))
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
  closeDialog()
  createDialogOpen.value = true

  if (!inspectionItemOptions.value.length) {
    await loadInspectionItemOptions()
  }

  createExpandedCategoryKey.value = groupedInspectionItemOptions.value[0]?.key ?? ""
}

async function openEditDialog(row: TemplateRow) {
  closeDialog()
  editingTemplateUuid.value = row.uuid
  createDialogOpen.value = true
  editDetailLoading.value = true

  try {
    if (!inspectionItemOptions.value.length) {
      await loadInspectionItemOptions()
    }

    const detail = await getInspectionServiceTemplateDetail({
      Uuid: row.uuid,
    })

    createTemplateName.value = toText(detail.Name, row.name)
    createSelectedInspectionUuids.value = (Array.isArray(detail.Inspections) ? detail.Inspections : [])
      .map(inspection => toText(inspection.InspectionUuid))
      .filter(Boolean)
    createExpandedCategoryKey.value = groupedInspectionItemOptions.value[0]?.key ?? ""
  } catch (error) {
    createErrorMessage.value = handleApiError(error, {
      title: "模板详情加载失败",
      fallback: "检测模板详情加载失败，请稍后重试。",
      mode: "silent",
    })
  } finally {
    editDetailLoading.value = false
  }
}

function resetCreateDialog() {
  editingTemplateUuid.value = ""
  createTemplateName.value = ""
  createItemSearchQuery.value = ""
  createSelectedInspectionUuids.value = []
  createExpandedCategoryKey.value = ""
  createErrorMessage.value = ""
  editDetailLoading.value = false
  deleteConfirmOpen.value = false
}

watch(createItemSearchQuery, () => {
  if (!createDialogOpen.value) {
    return
  }

  const groups = groupedInspectionItemOptions.value
  if (!groups.length) {
    createExpandedCategoryKey.value = ""
    return
  }

  const hasCurrent = groups.some(group => group.key === createExpandedCategoryKey.value)
  createExpandedCategoryKey.value = hasCurrent ? createExpandedCategoryKey.value : groups[0].key
})

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

function closeDialog() {
  createDialogOpen.value = false
  resetCreateDialog()
}

async function submitCreate() {
  const name = createTemplateName.value.trim()
  const isEditing = Boolean(editingTemplateUuid.value)

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
    if (editingTemplateUuid.value) {
      await updateInspectionServiceTemplate({
        Uuid: editingTemplateUuid.value,
        Name: name,
        InspectionUuids: createSelectedInspectionUuids.value,
      })
    } else {
      await createInspectionServiceTemplate({
        Name: name,
        InspectionUuids: createSelectedInspectionUuids.value,
      })
    }

    closeDialog()
    await loadTemplates()
    toast.success(isEditing ? "模板已更新" : "模板已创建", {
      description: `${name} 已加入当前列表。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: isEditing ? "模板更新失败" : "模板创建失败",
      fallback: isEditing ? "检测模板更新失败，请稍后重试。" : "检测模板创建失败，请稍后重试。",
    })
  } finally {
    createSubmitting.value = false
  }
}

function promptDelete() {
  deleteConfirmOpen.value = true
}

async function confirmDelete() {
  if (!editingTemplateUuid.value || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionServiceTemplate({
      Uuid: editingTemplateUuid.value,
    })

    deleteConfirmOpen.value = false
    closeDialog()
    await loadTemplates()
    toast.success("模板已删除")
  } catch (error) {
    handleApiError(error, {
      title: "模板删除失败",
      fallback: "检测模板删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
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
    >
      <template #cell-actions="{ row }">
        <Button
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click="openEditDialog(row as TemplateRow)"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="createDialogOpen" @update:open="($event ? (createDialogOpen = true) : closeDialog())">
      <DialogContent class="max-w-4xl gap-0 p-0">
        <DialogHeader class="p-4">
          <DialogTitle>{{ editingTemplateUuid ? "编辑检测模板" : "添加检测模板" }}</DialogTitle>
          <DialogDescription>
            {{
              editingTemplateUuid
                ? `已根据模板详情自动回填内容，可直接修改并保存。已选择 ${createSelectedInspectionUuids.length} 个检测项。`
                : `输入模板名称后，从检测项列表中选择多条检测项并保存。已选择 ${createSelectedInspectionUuids.length} 个检测项。`
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[75vh] flex-col overflow-hidden">
          <div class="space-y-4 border-b border-border/60 px-4 pb-4 pt-0">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground" for="settings-inspection-template-name">模板名称</label>
              <Input
                id="settings-inspection-template-name"
                v-model="createTemplateName"
                placeholder="请输入模板名称"
                :disabled="createSubmitting || editDetailLoading"
              />
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-4">
            <div class="mb-4">
              <Input
                id="settings-inspection-template-search"
                v-model="createItemSearchQuery"
                placeholder="搜索检测项名称、分类"
                :disabled="createLoading || createSubmitting || editDetailLoading"
              />
            </div>

            <div v-if="editDetailLoading" class="space-y-3">
              <div v-for="slot in 4" :key="`template-detail-skeleton-${slot}`" class="h-20 rounded-2xl border border-border/60 bg-muted/15" />
            </div>

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

            <Accordion
              v-else
              v-model="createExpandedCategoryKey"
              type="single"
              collapsible
              class="space-y-3"
            >
              <AccordionItem
                v-for="group in groupedInspectionItemOptions"
                :key="group.key"
                :value="group.key"
                class="overflow-hidden rounded-md border border-border/55 bg-background/95 shadow-xs"
              >
                <AccordionTrigger class="px-3.5 py-3 text-left hover:no-underline">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate text-sm font-semibold text-foreground">{{ group.categoryName }}</span>
                    <span class="shrink-0 text-xs text-muted-foreground">已选 {{ group.selectedCount }} / {{ group.items.length }} 项</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent class="px-3.5">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <label
                      v-for="item in group.items"
                      :key="item.uuid"
                      class="relative flex cursor-pointer items-start gap-3 rounded-md border border-border/55 bg-background/95 px-3.5 py-3.5 shadow-xs transition-all duration-200 hover:border-[color:var(--theme-primary)]/35 hover:bg-muted/45 hover:shadow-sm"
                      :class="isInspectionSelected(item.uuid) ? 'border-[color:var(--theme-primary)]/50 bg-[color:var(--theme-primary)]/10 shadow-sm ring-1 ring-[color:var(--theme-primary)]/15' : ''"
                    >
                      <Checkbox
                        :model-value="isInspectionSelected(item.uuid)"
                        :disabled="createSubmitting || editDetailLoading"
                        class="mt-0.5"
                        @update:model-value="updateInspectionSelected(item.uuid, $event)"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {{ item.name }}
                        </div>
                      </div>
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <DialogFooter
          class="border-t border-border/60 p-4"
          :class="editingTemplateUuid ? 'sm:justify-between' : 'sm:justify-end'"
        >
          <Button
            v-if="editingTemplateUuid"
            type="button"
            variant="outline"
            class="border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
            :disabled="createSubmitting || deleteSubmitting || editDetailLoading"
            @click="promptDelete"
          >
            {{ deleteSubmitting ? "删除中..." : "删除检测项模板" }}
          </Button>
          <div class="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" :disabled="createSubmitting || deleteSubmitting" @click="closeDialog">
              取消
            </Button>
            <Button type="button" :disabled="createSubmitting || createLoading || editDetailLoading || deleteSubmitting" @click="submitCreate">
              {{ createSubmitting ? (editingTemplateUuid ? "保存中..." : "创建中...") : (editingTemplateUuid ? "保存" : "创建模板") }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除检测项模板？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前模板，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
            :disabled="deleteSubmitting"
            @click="confirmDelete"
          >
            {{ deleteSubmitting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
