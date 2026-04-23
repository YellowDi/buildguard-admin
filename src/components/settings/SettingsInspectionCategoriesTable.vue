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
import InspectionCategoryScoreLimitInline from "@/components/inspection/InspectionCategoryScoreLimitInline.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import {
  createInspectionCategory,
  deleteInspectionCategory,
  fetchInspectionCategories,
  getInspectionCategoryDetail,
  type InspectionCategoryRecord,
  updateInspectionCategory,
} from "@/lib/inspection-categories-api"

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

type InspectionCategoryScoreLimit = number | null

type InspectionCategoryRow = {
  id: number
  uuid: string
  name: string
  content: string
  scoreLimit: InspectionCategoryScoreLimit
  scoreLimitSearchText: string
}

type InspectionCategoryForm = {
  name: string
  content: string
  scoreLimit: InspectionCategoryScoreLimit
}

const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"
const CATEGORY_WEIGHT_MIN = 1
const CATEGORY_WEIGHT_MAX = 10
const CATEGORY_WEIGHT_FALLBACK = CATEGORY_WEIGHT_MIN
const CATEGORY_WEIGHT_OPTIONS = Array.from(
  { length: CATEGORY_WEIGHT_MAX - CATEGORY_WEIGHT_MIN + 1 },
  (_, index) => CATEGORY_WEIGHT_MIN + index,
)
const rows = ref<InspectionCategoryRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchExpanded = ref(false)
const searchQuery = ref("")
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const createSubmitting = ref(false)
const editSubmitting = ref(false)
const deleteSubmitting = ref(false)
const editDetailLoading = ref(false)
const deleteConfirmOpen = ref(false)
const createSubmitArmed = ref(false)
const editSubmitArmed = ref(false)
const editFormTouched = ref(false)
const editingCategoryId = ref<number | null>(null)
const createForm = ref(createInspectionCategoryForm())
const editForm = ref(createInspectionCategoryForm())

const createFormValid = computed(() => isInspectionCategoryFormValid(createForm.value))
const editFormValid = computed(() => isInspectionCategoryFormValid(editForm.value))

const columns: TableColumn[] = [
  {
    key: "name",
    label: "分类名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "content",
    label: "分类介绍",
    filterType: "text",
    tone: "muted",
    width: "fill",
    cellClass: "max-w-[24rem] lg:max-w-[32rem]",
  },
  {
    key: "scoreLimitDisplay",
    label: "分类权重",
    filterType: "none",
    tone: "muted",
    slot: "cell-score-limit",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    headerClass: "min-w-[6rem]",
    cellClass: "min-w-[6rem] text-right",
  },
]

const effectiveSearchQuery = computed(() => props.searchQuery ?? searchQuery.value)

const filteredRows = computed(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row => [
    String(row.id),
    row.name,
    row.content,
    row.scoreLimitSearchText,
    row.uuid,
  ].some(field => field.toLowerCase().includes(query)))
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (loading.value) {
    return {
      title: "检测项分类加载中",
      description: "正在同步分类列表，请稍候。",
      icon: "ri-loader-4-line",
    }
  }

  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的分类",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "还没有检测项分类",
    description: "暂时还没有检测项分类，您可以先添加一个分类。",
    icon: "ri-table-line",
  }
})

onMounted(() => {
  void loadInspectionCategories()
})

async function loadInspectionCategories() {
  loading.value = true
  errorMessage.value = ""

  try {
    await syncInspectionCategories()
  } catch (error) {
    errorMessage.value = handleApiError(error, {
      title: "检测项分类接口加载失败",
      fallback: INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE,
      mode: "silent",
    })
  } finally {
    loading.value = false
  }
}

async function syncInspectionCategories() {
  const result = await fetchInspectionCategories()
  rows.value = result.list.map((item, index) => normalizeInspectionCategory(item, index))
  emit("countChange", rows.value.length)
}

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function openCreateDialog() {
  createForm.value = createInspectionCategoryForm()
  createSubmitArmed.value = false
  createDialogOpen.value = true
}

async function openEditDialog(row: InspectionCategoryRow) {
  editingCategoryId.value = row.id
  editForm.value = {
    name: row.name,
    content: row.content,
    scoreLimit: row.scoreLimit,
  }
  editFormTouched.value = false
  editDetailLoading.value = true
  editSubmitArmed.value = false
  editDialogOpen.value = true

  try {
    const detail = await getInspectionCategoryDetail({
      Uuid: row.uuid,
    })
    const detailRow = normalizeInspectionCategory(
      detail,
      rows.value.findIndex(item => item.id === row.id),
      row,
    )

    if (editingCategoryId.value === row.id && !editFormTouched.value) {
      editForm.value = {
        name: detailRow.name,
        content: detailRow.content,
        scoreLimit: detailRow.scoreLimit,
      }
    }
  } catch (error) {
    handleApiError(error, {
      title: "检测项分类详情加载失败",
      fallback: "检测项分类详情加载失败，请稍后重试。",
    })
  } finally {
    if (editingCategoryId.value === row.id) {
      editDetailLoading.value = false
    }
  }
}

function closeEditDialog() {
  editDialogOpen.value = false
  editingCategoryId.value = null
  editDetailLoading.value = false
  editSubmitArmed.value = false
  editFormTouched.value = false
  editForm.value = createInspectionCategoryForm()
}

function promptDeleteEditingCategory() {
  deleteConfirmOpen.value = true
}

async function submitCreate() {
  if (!createSubmitArmed.value) {
    return
  }

  const nextScoreLimit = parseInspectionCategoryScoreLimitForm(createForm.value)

  if (nextScoreLimit === null) {
    createSubmitArmed.value = false
    return
  }

  createSubmitArmed.value = false
  createSubmitting.value = true
  const nextName = createForm.value.name.trim()

  try {
    await createInspectionCategory({
      Name: nextName,
      Content: createForm.value.content.trim(),
      Score: nextScoreLimit,
    })
    await syncInspectionCategories()
    createDialogOpen.value = false
    createSubmitArmed.value = false
    createForm.value = createInspectionCategoryForm()
    toast.success("检测项分类已创建", {
      description: `${nextName} 已加入当前列表。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项分类创建失败",
      fallback: "检测项分类创建失败，请稍后重试。",
    })
  } finally {
    createSubmitting.value = false
  }
}

async function submitEdit() {
  if (!editSubmitArmed.value) {
    return
  }

  const nextScoreLimit = parseInspectionCategoryScoreLimitForm(editForm.value)

  if (nextScoreLimit === null) {
    editSubmitArmed.value = false
    return
  }

  editSubmitArmed.value = false
  const currentRow = rows.value.find(row => row.id === editingCategoryId.value)
  const nextName = editForm.value.name.trim()

  if (!currentRow) {
    return
  }

  editSubmitting.value = true

  try {
    await updateInspectionCategory({
      Uuid: currentRow.uuid,
      Name: nextName,
      Content: editForm.value.content.trim(),
      Score: nextScoreLimit,
    })
    await syncInspectionCategories()
    closeEditDialog()
    toast.success("检测项分类已更新", {
      description: `${nextName} 的名称和权重已保存。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项分类更新失败",
      fallback: "检测项分类更新失败，请稍后重试。",
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

function updateEditForm<K extends keyof InspectionCategoryForm>(field: K, value: InspectionCategoryForm[K]) {
  editFormTouched.value = true
  editForm.value = {
    ...editForm.value,
    [field]: value,
  }
}

function updateCreateScoreLimit(value: number[] | number | undefined) {
  const nextScoreLimit = normalizeOptionalScoreLimitValue(Array.isArray(value) ? value[0] : value)

  if (nextScoreLimit === null) {
    return
  }

  createForm.value = {
    ...createForm.value,
    scoreLimit: nextScoreLimit,
  }
}

function updateEditScoreLimit(value: number[] | number | undefined) {
  const nextScoreLimit = normalizeOptionalScoreLimitValue(Array.isArray(value) ? value[0] : value)

  if (nextScoreLimit === null) {
    return
  }

  updateEditForm("scoreLimit", nextScoreLimit)
}

function clearCreateScoreLimit() {
  createForm.value = {
    ...createForm.value,
    scoreLimit: null,
  }
}

function clearEditScoreLimit() {
  updateEditForm("scoreLimit", null)
}

async function confirmDeleteEditingCategory() {
  const currentRow = rows.value.find(row => row.id === editingCategoryId.value)

  if (!currentRow || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionCategory({
      Uuid: currentRow.uuid,
    })
    await syncInspectionCategories()
    deleteConfirmOpen.value = false
    closeEditDialog()
    toast.success("检测项分类已删除", {
      description: `${currentRow.name} 已从当前列表移除。`,
    })
  } catch (error) {
    handleApiError(error, {
      title: "检测项分类删除失败",
      fallback: "检测项分类删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function normalizeInspectionCategory(
  item: InspectionCategoryRecord,
  index: number,
  fallbackRow?: InspectionCategoryRow,
): InspectionCategoryRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1
  const uuid = toText(item.Uuid, `category-${id}`)
  const scoreLimit = toScoreLimit(item.Score, fallbackRow?.scoreLimit ?? null)

  return {
    id,
    uuid,
    name: toText(item.Name, fallbackRow?.name || `分类 ${id}`),
    content: toOptionalText(item.Content, fallbackRow?.content || ""),
    scoreLimit,
    scoreLimitSearchText: buildScoreLimitSearchText(scoreLimit),
  }
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function toOptionalText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback
}

function createInspectionCategoryForm(): InspectionCategoryForm {
  return {
    name: "",
    content: "",
    scoreLimit: null,
  }
}

function toScoreLimit(value: unknown, fallback: InspectionCategoryScoreLimit) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clampCategoryWeight(Math.round(parsed))
}

function parseInspectionCategoryScoreLimitForm(form: InspectionCategoryForm): number | undefined | null {
  return parseOptionalScoreFieldValue(form.scoreLimit)
}

function parseOptionalScoreFieldValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < CATEGORY_WEIGHT_MIN || value > CATEGORY_WEIGHT_MAX) {
      return null
    }

    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed < CATEGORY_WEIGHT_MIN || parsed > CATEGORY_WEIGHT_MAX) {
    return null
  }

  return parsed
}

function isInspectionCategoryFormValid(form: InspectionCategoryForm) {
  return Boolean(form.name.trim()) && parseOptionalScoreFieldValue(form.scoreLimit) !== null
}

function buildScoreLimitSearchText(scoreLimit: InspectionCategoryScoreLimit) {
  return scoreLimit === null
    ? "分类权重 未设置"
    : ["分类权重", String(scoreLimit)].join(" ")
}

function normalizeOptionalScoreLimitValue(value: unknown): InspectionCategoryScoreLimit | null {
  if (value === undefined || value === null || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN

  if (!Number.isFinite(parsed)) {
    return null
  }

  return clampCategoryWeight(Math.round(parsed))
}

function clampCategoryWeight(value: number) {
  return Math.min(CATEGORY_WEIGHT_MAX, Math.max(CATEGORY_WEIGHT_MIN, value))
}

function getFormScoreLimitValue(scoreLimit: InspectionCategoryScoreLimit) {
  return [scoreLimit ?? CATEGORY_WEIGHT_FALLBACK]
}

function getCategoryWeightMarkStyle(mark: number) {
  const ratio = (mark - CATEGORY_WEIGHT_MIN) / (CATEGORY_WEIGHT_MAX - CATEGORY_WEIGHT_MIN)

  return {
    left: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
  }
}

function asInspectionCategoryRow(row: Record<string, unknown>) {
  return row as InspectionCategoryRow
}

function handleRowClick(row: Record<string, unknown>) {
  void openEditDialog(asInspectionCategoryRow(row))
}

defineExpose({
  openCreateDialog,
  refreshData: loadInspectionCategories,
})
</script>

<template>
  <section class="space-y-5">
    <SettingsToolbarRow v-if="!props.hideToolbar">
      <div class="flex flex-nowrap items-center justify-end gap-2">
        <SettingsToolbarSearchInput
          v-model="searchQuery"
          :expanded="searchExpanded"
          placeholder="搜索分类名称、ID、内容或分类权重"
          @toggle="toggleSearch"
        />

        <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 rounded-md px-3"
            :disabled="loading"
            @click="loadInspectionCategories"
          >
            <i :class="loading ? 'ri-loader-4-line animate-spin text-sm' : 'ri-refresh-line text-sm'" />
            <span>刷新列表</span>
          </Button>
        </SettingsToolbarRefreshSlot>

        <Button v-if="!props.hideCreateButton" class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="openCreateDialog">
          <i class="ri-add-line text-base" />
          <span>添加分类</span>
        </Button>
      </div>
    </SettingsToolbarRow>

    <Alert
      v-if="errorMessage"
      variant="destructive"
      class="border-destructive/20 bg-destructive/[0.03]"
    >
      <i class="ri-error-warning-line text-base" />
      <AlertTitle>分类列表加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePageTable
      row-key="uuid"
      show-index
      sticky-header
      :end-spacer="false"
      :show-index-checkbox="false"
      :edge-gutter="false"
      :show-row-action-icons="true"
      :columns="columns"
      :rows="filteredRows"
      :on-row-click="handleRowClick"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-content="{ row: rawRow }">
        <span class="block truncate text-sm leading-6 text-muted-foreground">
          {{ asInspectionCategoryRow(rawRow).content || "-" }}
        </span>
      </template>

      <template #cell-score-limit="{ row: rawRow }">
        <InspectionCategoryScoreLimitInline :limit="asInspectionCategoryRow(rawRow).scoreLimit" />
      </template>

      <template #cell-actions="{ row: rawRow }">
        <Button
          variant="outline"
          size="sm"
          class="ml-auto h-7 shrink-0 gap-1.5 rounded-md px-2.5 text-[13px]"
          @click.stop="openEditDialog(asInspectionCategoryRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>添加检测项分类</DialogTitle>
          <DialogDescription>添加一个检测项分类，分类介绍可选填写；分类权重可按需设置为 1-10。</DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-inspection-category-name">分类名称</label>
            <Input
              id="create-inspection-category-name"
              v-model="createForm.name"
              placeholder="例如：消防设施"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-inspection-category-content">分类介绍</label>
            <Textarea
              id="create-inspection-category-content"
              v-model="createForm.content"
              rows="4"
              placeholder="请输入内容"
            />
          </div>

          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-foreground" for="create-inspection-category-score-limit">分类权重（可选）</label>
              <div class="flex items-center gap-2">
                <span class="inline-flex min-w-11 items-center justify-center rounded-md bg-muted px-2 py-1 text-sm font-semibold text-foreground tabular-nums">
                  {{ createForm.scoreLimit ?? "未设" }}
                </span>
                <Button type="button" variant="outline" size="sm" class="h-8 px-2 text-xs" @click="clearCreateScoreLimit">
                  清空
                </Button>
              </div>
            </div>
            <Slider
              id="create-inspection-category-score-limit"
              :model-value="getFormScoreLimitValue(createForm.scoreLimit)"
              :min="CATEGORY_WEIGHT_MIN"
              :max="CATEGORY_WEIGHT_MAX"
              :step="1"
              class="w-full"
              @update:model-value="updateCreateScoreLimit"
            />
            <div class="relative h-4 text-[11px] text-muted-foreground">
              <span
                v-for="mark in CATEGORY_WEIGHT_OPTIONS"
                :key="`create-category-weight-mark-${mark}`"
                :style="getCategoryWeightMarkStyle(mark)"
                class="absolute top-0 -translate-x-1/2 tabular-nums leading-none"
              >
                {{ mark }}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="createSubmitting" @click="createDialogOpen = false">
              取消
            </Button>
            <Button
              type="button"
              :disabled="createSubmitting || !createFormValid"
              @click.stop.prevent="requestCreateSubmit"
            >
              <span>{{ createSubmitting ? "保存中" : "保存分类" }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="$event ? (editDialogOpen = true) : closeEditDialog()">
      <DialogContent stack-above-sticky-header class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>修改检测项分类</DialogTitle>
          <DialogDescription>
            {{ editDetailLoading ? "正在同步分类详情..." : "更新当前分类名称、内容和分类权重；权重可留空，设置后范围为 1-10。" }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-category-name">分类名称</label>
            <Input
              id="edit-inspection-category-name"
              :model-value="editForm.name"
              :disabled="editSubmitting || deleteSubmitting"
              placeholder="例如：消防设施"
              @update:model-value="updateEditForm('name', String($event))"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-category-content">分类介绍</label>
            <Textarea
              id="edit-inspection-category-content"
              :model-value="editForm.content"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              rows="4"
              placeholder="请输入内容"
              @update:model-value="updateEditForm('content', String($event))"
            />
          </div>

          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-foreground" for="edit-inspection-category-score-limit">分类权重（可选）</label>
              <div class="flex items-center gap-2">
                <span class="inline-flex min-w-11 items-center justify-center rounded-md bg-muted px-2 py-1 text-sm font-semibold text-foreground tabular-nums">
                  {{ editForm.scoreLimit ?? "未设" }}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 px-2 text-xs"
                  :disabled="editSubmitting || deleteSubmitting"
                  @click="clearEditScoreLimit"
                >
                  清空
                </Button>
              </div>
            </div>
            <Slider
              id="edit-inspection-category-score-limit"
              :model-value="getFormScoreLimitValue(editForm.scoreLimit)"
              :disabled="editSubmitting || deleteSubmitting"
              :min="CATEGORY_WEIGHT_MIN"
              :max="CATEGORY_WEIGHT_MAX"
              :step="1"
              class="w-full"
              @update:model-value="updateEditScoreLimit"
            />
            <div class="relative h-4 text-[11px] text-muted-foreground">
              <span
                v-for="mark in CATEGORY_WEIGHT_OPTIONS"
                :key="`edit-category-weight-mark-${mark}`"
                :style="getCategoryWeightMarkStyle(mark)"
                class="absolute top-0 -translate-x-1/2 tabular-nums leading-none"
              >
                {{ mark }}
              </span>
            </div>
          </div>

          <DialogFooter class="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              class="w-full font-medium text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
              :disabled="editSubmitting || deleteSubmitting"
              @click="promptDeleteEditingCategory"
            >
              <span>删除分类</span>
            </Button>

            <div class="flex w-full flex-col-reverse sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" :disabled="deleteSubmitting" @click="closeEditDialog">
                取消
              </Button>
              <Button
                type="button"
                :disabled="editSubmitting || deleteSubmitting || !editFormValid"
                @click.stop.prevent="requestEditSubmit"
              >
                <span>{{ editSubmitting ? "保存中" : "保存修改" }}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent stack-above-sticky-header>
        <AlertDialogHeader>
          <AlertDialogTitle>删除检测项分类？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后将无法恢复。请先确认该分类下的检测项是否已经完成调整。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteSubmitting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction :disabled="deleteSubmitting" @click="confirmDeleteEditingCategory">
            <span>{{ deleteSubmitting ? "删除中" : "确认删除" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
