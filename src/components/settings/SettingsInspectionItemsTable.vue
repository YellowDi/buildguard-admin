<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionCategories } from "@/lib/inspection-categories-api"
import {
  createInspectionItem,
  deleteInspectionItem,
  fetchInspectionItems,
  getInspectionItemDetail,
  updateInspectionItem,
  type InspectionItemRecord,
} from "@/lib/inspection-items-api"

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

type InspectionItemRow = {
  id: number
  uuid: string
  name: string
  categoryId?: number
  categoryUuid: string
  categoryName: string
  content: string
  standard: string
  isForcePhoto: boolean
  isForcePhotoLabel: string
  isMeasureRecord: boolean
  isMeasureRecordLabel: string
  createdAt: string
  updatedAt: string
}

type InspectionItemForm = {
  name: string
  categoryUuid: string
  content: string
  standard: string
  isForcePhoto: boolean
  isMeasureRecord: boolean
}

type InspectionCategoryOption = {
  id?: number
  uuid: string
  name: string
}

const INSPECTION_ITEMS_LOAD_ERROR_MESSAGE = "检测项列表加载失败，请稍后重试。"
const rows = ref<InspectionItemRow[]>([])
const inspectionCategories = ref<InspectionCategoryOption[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchExpanded = ref(false)
const searchQuery = ref("")
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const editingItemId = ref<number | null>(null)
const createSubmitting = ref(false)
const editSubmitting = ref(false)
const editDetailLoading = ref(false)
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const createSubmitArmed = ref(false)
const editSubmitArmed = ref(false)
const createForm = ref(createInspectionItemForm())
const editForm = ref(createInspectionItemForm())
const editMeta = ref({
  createdAt: "",
  updatedAt: "",
})

const columns: TableColumn[] = [
  {
    key: "name",
    label: "检测项名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "categoryName",
    label: "所属分类",
    filterType: "tag",
    tone: "muted",
  },
  {
    key: "isForcePhotoLabel",
    label: "强制拍照",
    filterType: "tag",
    tone: "muted",
    headerClass: "text-center",
    cellClass: "text-center",
  },
  {
    key: "isMeasureRecordLabel",
    label: "记录实测值",
    filterType: "tag",
    tone: "muted",
    headerClass: "text-center",
    cellClass: "text-center",
  },
  {
    key: "createdAt",
    label: "创建时间",
    filterType: "time",
    tone: "muted",
  },
  {
    key: "updatedAt",
    label: "更新时间",
    filterType: "time",
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

const categoryOptions = computed(() => inspectionCategories.value
  .filter(category => category.name && category.uuid)
  .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN")))

const effectiveSearchQuery = computed(() => props.searchQuery ?? searchQuery.value)
const editDialogDescription = computed(() => {
  const parts: string[] = []

  if (editMeta.value.createdAt && editMeta.value.createdAt !== "-") {
    parts.push(`创建时间：${editMeta.value.createdAt}`)
  }

  if (editMeta.value.updatedAt && editMeta.value.updatedAt !== "-") {
    parts.push(`更新时间：${editMeta.value.updatedAt}`)
  }

  return parts.join("  ·  ") || "正在读取检测项时间信息。"
})

const filteredRows = computed(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()
  const scopedRows = rows.value

  if (!query) {
    return scopedRows
  }

  return scopedRows.filter(row => [
    row.name,
    row.categoryName,
    row.content,
    row.standard,
    row.createdAt,
    row.updatedAt,
  ].some(field => field.toLowerCase().includes(query)))
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: "检测项加载中",
      description: "正在同步检测项列表，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的检测项",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "还没有检测项",
    description: "先创建检测项，后续即可在这里统一维护。",
    icon: "ri-file-list-3-line",
  }
})

onMounted(() => {
  void Promise.all([
    loadInspectionItems(),
    loadInspectionCategoryOptions(),
  ])
})

async function loadInspectionItems() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionItems()
    rows.value = result.list.map((item, index) => normalizeInspectionItem(item, index))
    emit("countChange", rows.value.length)
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "检测项接口加载失败",
      fallback: INSPECTION_ITEMS_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    loading.value = false
  }
}

async function loadInspectionCategoryOptions() {
  try {
    const result = await fetchInspectionCategories()
    inspectionCategories.value = result.list
      .map(normalizeInspectionCategoryOption)
      .filter(category => category.name)
      .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

    if (editDialogOpen.value && editingItemId.value !== null && !editForm.value.categoryUuid) {
      const currentRow = rows.value.find(row => row.id === editingItemId.value)

      if (currentRow) {
        editForm.value = {
          ...editForm.value,
          categoryUuid: resolveInspectionCategoryUuid(currentRow),
        }
      }
    }
  } catch (error) {
    handleApiError(error, {
      title: "检测项分类加载失败",
      fallback: "检测项分类加载失败，请稍后重试。",
      mode: "silent",
    })
  }
}

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

async function refreshInspectionItemsPage() {
  await Promise.all([
    loadInspectionItems(),
    loadInspectionCategoryOptions(),
  ])
}

function openCreateDialog() {
  createForm.value = createInspectionItemForm()
  createSubmitArmed.value = false
  createDialogOpen.value = true
}

function closeEditDialog() {
  editDialogOpen.value = false
  editingItemId.value = null
  editDetailLoading.value = false
  editSubmitArmed.value = false
  editForm.value = createInspectionItemForm()
  editMeta.value = {
    createdAt: "",
    updatedAt: "",
  }
}

async function submitCreate() {
  if (!createSubmitArmed.value) {
    return
  }

  createSubmitArmed.value = false
  const nextPayload = buildInspectionItemPayload(createForm.value)

  createSubmitting.value = true

  try {
    const response = await createInspectionItem(nextPayload)
    const nextUuid = typeof response.Uuid === "string" && response.Uuid.trim()
      ? response.Uuid.trim()
      : `local-${Date.now()}`
    const nextId = Number.isFinite(Number(response.Id)) ? Number(response.Id) : createLocalId()
    const nextRow = normalizeInspectionItem({
      ...response,
      ...nextPayload,
      Uuid: nextUuid,
      Id: nextId,
      CreatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      UpdatedAt: new Date().toISOString().slice(0, 10),
    }, rows.value.length)

    rows.value = [nextRow, ...rows.value]
    emit("countChange", rows.value.length)
    createDialogOpen.value = false
    toast.success("检测项已创建", {
      description: `${nextRow.name} 已加入当前列表。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项创建失败",
      fallback: "检测项创建失败，请稍后重试。",
    })
  } finally {
    createSubmitting.value = false
  }
}

async function openEditDialog(row: InspectionItemRow) {
  editingItemId.value = row.id
  editDialogOpen.value = true
  editDetailLoading.value = true
  editForm.value = buildFormFromRow(row)
  editMeta.value = {
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  try {
    const detail = await getInspectionItemDetail({
      Uuid: row.uuid,
    })
    const detailRow = normalizeInspectionItem(
      detail,
      rows.value.findIndex(item => item.id === row.id),
      row,
    )

    if (editingItemId.value === row.id) {
      editForm.value = buildFormFromRow(detailRow)
      editMeta.value = {
        createdAt: detailRow.createdAt,
        updatedAt: detailRow.updatedAt,
      }
    }
  } catch (error) {
    handleApiError(error, {
      title: "检测项详情加载失败",
      fallback: "检测项详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingItemId.value === row.id) {
      editDetailLoading.value = false
    }
  }
}

async function submitEdit() {
  if (!editSubmitArmed.value) {
    return
  }

  editSubmitArmed.value = false
  const itemId = editingItemId.value
  const currentRow = rows.value.find(row => row.id === itemId)

  if (!currentRow) {
    return
  }

  editSubmitting.value = true

  try {
    const nextPayload = buildInspectionItemPayload(editForm.value, currentRow)
    await updateInspectionItem({
      Uuid: currentRow.uuid,
      ...nextPayload,
    })

    Object.assign(currentRow, {
      ...currentRow,
      name: nextPayload.Name,
      categoryId: nextPayload.CategoryId,
      categoryUuid: nextPayload.CategoryUuid ?? "",
      categoryName: nextPayload.CategoryName ?? "",
      content: nextPayload.Content ?? "",
      standard: nextPayload.Standard ?? "",
      isForcePhoto: nextPayload.IsForcePhoto === 1,
      isForcePhotoLabel: formatBooleanLabel(nextPayload.IsForcePhoto === 1),
      isMeasureRecord: nextPayload.IsMeasureRecord === 1,
      isMeasureRecordLabel: formatBooleanLabel(nextPayload.IsMeasureRecord === 1),
      updatedAt: formatTimestamp(new Date().toISOString().slice(0, 19).replace("T", " ")),
    })
    editMeta.value = {
      createdAt: currentRow.createdAt,
      updatedAt: currentRow.updatedAt,
    }

    closeEditDialog()
    toast.success("检测项已更新", {
      description: `${currentRow.name} 的内容已保存。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项更新失败",
      fallback: "检测项更新失败，请稍后重试。",
    })
  } finally {
    editSubmitting.value = false
  }
}

function requestCreateSubmit() {
  createSubmitArmed.value = true
  void submitCreate()
}

function requestEditSubmit() {
  editSubmitArmed.value = true
  void submitEdit()
}

function promptDeleteEditingItem() {
  deleteConfirmOpen.value = true
}

async function confirmDeleteEditingItem() {
  const itemId = editingItemId.value
  const currentRow = rows.value.find(row => row.id === itemId)

  if (!currentRow || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionItem({
      Uuid: currentRow.uuid,
    })
    rows.value = rows.value.filter(row => row.id !== currentRow.id)
    emit("countChange", rows.value.length)
    deleteConfirmOpen.value = false
    closeEditDialog()
    toast.success("检测项已删除", {
      description: `${currentRow.name} 已从当前列表移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项删除失败",
      fallback: "检测项删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function buildInspectionItemPayload(form: InspectionItemForm, currentRow?: InspectionItemRow) {
  const selectedCategory = resolveInspectionCategory(form.categoryUuid)
  const categoryName = selectedCategory?.name || undefined

  return {
    Name: form.name.trim(),
    CategoryId: selectedCategory?.id ?? currentRow?.categoryId,
    CategoryUuid: selectedCategory?.uuid || currentRow?.categoryUuid || undefined,
    CategoryName: categoryName,
    Content: form.content.trim(),
    Standard: form.standard.trim(),
    IsForcePhoto: form.isForcePhoto ? 1 : 2,
    IsMeasureRecord: form.isMeasureRecord ? 1 : 2,
  }
}

function normalizeInspectionItem(
  item: InspectionItemRecord,
  index: number,
  fallbackRow?: InspectionItemRow,
): InspectionItemRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1
  const uuid = toText(item.Uuid, `inspection-item-${id}`)
  const isForcePhoto = resolveFlag(item.IsForcePhoto, fallbackRow?.isForcePhoto ?? false)
  const isMeasureRecord = resolveFlag(item.IsMeasureRecord, fallbackRow?.isMeasureRecord ?? false)

  return {
    id,
    uuid,
    name: toText(item.Name, fallbackRow?.name || `检测项 ${id}`),
    categoryId: toOptionalNumber(item.CategoryId) ?? fallbackRow?.categoryId,
    categoryUuid: toText(item.CategoryUuid, fallbackRow?.categoryUuid || ""),
    categoryName: toText(item.CategoryName, fallbackRow?.categoryName || "未分类"),
    content: toText(item.Content, fallbackRow?.content || "-"),
    standard: toText(item.Standard, fallbackRow?.standard || "-"),
    isForcePhoto,
    isForcePhotoLabel: formatBooleanLabel(isForcePhoto),
    isMeasureRecord,
    isMeasureRecordLabel: formatBooleanLabel(isMeasureRecord),
    createdAt: formatTimestamp(toText(item.CreatedAt, fallbackRow?.createdAt || "")),
    updatedAt: formatTimestamp(toText(item.UpdatedAt, fallbackRow?.updatedAt || "")),
  }
}

function buildFormFromRow(row: InspectionItemRow): InspectionItemForm {
  return {
    name: row.name,
    categoryUuid: resolveInspectionCategoryUuid(row),
    content: row.content === "-" ? "" : row.content,
    standard: row.standard === "-" ? "" : row.standard,
    isForcePhoto: row.isForcePhoto,
    isMeasureRecord: row.isMeasureRecord,
  }
}

function createInspectionItemForm(): InspectionItemForm {
  return {
    name: "",
    categoryUuid: "",
    content: "",
    standard: "",
    isForcePhoto: false,
    isMeasureRecord: false,
  }
}

function normalizeInspectionCategoryOption(item: { Id?: number, Uuid?: string, Name?: string }) {
  return {
    id: toOptionalNumber(item.Id),
    uuid: toText(item.Uuid),
    name: toText(item.Name),
  }
}

function resolveInspectionCategory(categoryUuid: string) {
  const normalizedUuid = categoryUuid.trim()

  if (!normalizedUuid) {
    return undefined
  }

  return inspectionCategories.value.find(category => category.uuid === normalizedUuid)
}

function resolveInspectionCategoryUuid(row: InspectionItemRow) {
  if (row.categoryUuid) {
    return row.categoryUuid
  }

  const matchedCategory = inspectionCategories.value.find(category => category.name === row.categoryName)
  return matchedCategory?.uuid || ""
}

function createLocalId() {
  const maxId = rows.value.reduce((max, row) => Math.max(max, row.id), 0)
  return maxId + 1
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function toOptionalNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function resolveFlag(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()

    if (!normalized) {
      return fallback
    }

    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "是") {
      return true
    }

    if (normalized === "2" || normalized === "0" || normalized === "false" || normalized === "no" || normalized === "否") {
      return false
    }
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  if (parsed === 1) {
    return true
  }

  if (parsed === 0 || parsed === 2) {
    return false
  }

  return fallback
}

function formatBooleanLabel(value: boolean) {
  return value ? "是" : "否"
}

function formatTimestamp(value: string) {
  return value || "-"
}

function asInspectionItemRow(row: Record<string, unknown>) {
  return row as InspectionItemRow
}

defineExpose({
  openCreateDialog,
  refreshData: refreshInspectionItemsPage,
})
</script>

<template>
  <section class="space-y-5">
    <SettingsToolbarRow v-if="!props.hideToolbar">
      <div class="flex flex-nowrap items-center justify-end gap-2">
        <SettingsToolbarSearchInput
          v-model="searchQuery"
          :expanded="searchExpanded"
          placeholder="搜索检测项、分类、内容"
          @toggle="toggleSearch"
        />

        <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
          <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" @click="refreshInspectionItemsPage">
            <i class="ri-refresh-line text-sm" />
            <span>刷新列表</span>
          </Button>
        </SettingsToolbarRefreshSlot>

        <Button v-if="!props.hideCreateButton" class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="openCreateDialog">
          <i class="ri-add-line text-base" />
          <span>添加检测项</span>
        </Button>
      </div>
    </SettingsToolbarRow>

    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/3"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>检测项接口加载失败</AlertTitle>
      <AlertDescription>
        {{ errorMessage }}
      </AlertDescription>
    </Alert>

    <TablePageTable
      sticky-header
      :end-spacer="false"
      :show-row-action-icons="true"
      :columns="columns"
      :rows="filteredRows"
      row-key="id"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-isForcePhotoLabel="{ row: rawRow }">
        <span
          class="inline-flex items-center justify-center"
          :aria-label="asInspectionItemRow(rawRow).isForcePhoto ? '是' : '否'"
        >
          <i
            :class="asInspectionItemRow(rawRow).isForcePhoto ? 'ri-check-line' : 'ri-close-line'"
            class="text-[17px] leading-none text-muted-foreground"
          />
        </span>
      </template>
      <template #cell-isMeasureRecordLabel="{ row: rawRow }">
        <span
          class="inline-flex items-center justify-center"
          :aria-label="asInspectionItemRow(rawRow).isMeasureRecord ? '是' : '否'"
        >
          <i
            :class="asInspectionItemRow(rawRow).isMeasureRecord ? 'ri-check-line' : 'ri-close-line'"
            class="text-[17px] leading-none text-muted-foreground"
          />
        </span>
      </template>
      <template #cell-actions="{ row: rawRow }">
        <Button
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click="openEditDialog(asInspectionItemRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>添加检测项</DialogTitle>
          <DialogDescription>
            填写检测项基础信息后，将调用检测项新建接口保存。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="create-inspection-name">检测项名称</label>
              <Input id="create-inspection-name" v-model="createForm.name" placeholder="例如：消防栓外观" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="create-inspection-category">所属分类</label>
              <Select v-model="createForm.categoryUuid">
                <SelectTrigger id="create-inspection-category" class="w-full">
                  <SelectValue placeholder="选择所属分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in categoryOptions"
                    :key="option.uuid"
                    :value="option.uuid"
                  >
                    {{ option.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-inspection-content">检测内容</label>
            <Textarea id="create-inspection-content" v-model="createForm.content" rows="4" placeholder="请输入检测内容" />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-inspection-standard">判定标准</label>
            <Textarea id="create-inspection-standard" v-model="createForm.standard" rows="4" placeholder="请输入判定标准" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
              <Checkbox
                :model-value="createForm.isForcePhoto"
                @update:model-value="createForm.isForcePhoto = Boolean($event)"
              />
              <span class="text-sm font-medium text-foreground">是否强制拍照</span>
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
              <Checkbox
                :model-value="createForm.isMeasureRecord"
                @update:model-value="createForm.isMeasureRecord = Boolean($event)"
              />
              <span class="text-sm font-medium text-foreground">是否记录实测值</span>
            </label>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" :disabled="createSubmitting" @click="createDialogOpen = false">
              取消
            </Button>
            <Button type="button" :disabled="createSubmitting" @click.stop.prevent="requestCreateSubmit">
              {{ createSubmitting ? "创建中..." : "创建检测项" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="($event ? (editDialogOpen = true) : closeEditDialog())">
      <DialogContent stack-above-sticky-header class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>编辑检测项</DialogTitle>
          <DialogDescription>
            {{ editDialogDescription }}
          </DialogDescription>
          <p v-if="editDetailLoading" class="text-sm text-muted-foreground">
            正在同步检测项详情...
          </p>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-inspection-name">检测项名称</label>
              <Input id="edit-inspection-name" v-model="editForm.name" :disabled="editDetailLoading" placeholder="例如：消防栓外观" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-inspection-category">所属分类</label>
              <Select v-model="editForm.categoryUuid" :disabled="editDetailLoading">
                <SelectTrigger id="edit-inspection-category" class="w-full">
                  <SelectValue placeholder="选择所属分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in categoryOptions"
                    :key="option.uuid"
                    :value="option.uuid"
                  >
                    {{ option.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-content">检测内容</label>
            <Textarea id="edit-inspection-content" v-model="editForm.content" :disabled="editDetailLoading" rows="4" placeholder="请输入检测内容" />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-standard">判定标准</label>
            <Textarea id="edit-inspection-standard" v-model="editForm.standard" :disabled="editDetailLoading" rows="4" placeholder="请输入判定标准" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
              <Checkbox
                :model-value="editForm.isForcePhoto"
                :disabled="editDetailLoading"
                @update:model-value="editForm.isForcePhoto = Boolean($event)"
              />
              <span class="text-sm font-medium text-foreground">是否强制拍照</span>
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
              <Checkbox
                :model-value="editForm.isMeasureRecord"
                :disabled="editDetailLoading"
                @update:model-value="editForm.isMeasureRecord = Boolean($event)"
              />
              <span class="text-sm font-medium text-foreground">是否记录实测值</span>
            </label>
          </div>

          <DialogFooter class="pt-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              class="border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              @click="promptDeleteEditingItem"
            >
              {{ deleteSubmitting ? "删除中..." : "删除检测项" }}
            </Button>
            <div class="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" :disabled="editDetailLoading || editSubmitting || deleteSubmitting" @click="closeEditDialog">
                取消
              </Button>
              <Button
                type="button"
                :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
                @click.stop.prevent="requestEditSubmit"
              >
                {{ editSubmitting ? "保存中..." : "保存" }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent stack-above-sticky-header>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除检测项？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会删除当前检测项，且不可撤销。确认后将立即提交删除请求。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
            :disabled="deleteSubmitting"
            @click="confirmDeleteEditingItem"
          >
            {{ deleteSubmitting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
