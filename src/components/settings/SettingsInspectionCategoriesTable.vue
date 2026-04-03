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
  scoreLimit: InspectionCategoryScoreLimit
  scoreLimitSearchText: string
}

type InspectionCategoryForm = {
  name: string
  scoreLimit: string
}

const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"
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
const editingCategoryId = ref<number | null>(null)
const createForm = ref(createInspectionCategoryForm())
const editForm = ref(createInspectionCategoryForm())

const createFormValid = computed(() => isInspectionCategoryFormValid(createForm.value))
const editFormValid = computed(() => isInspectionCategoryFormValid(editForm.value))

const columns: TableColumn[] = [
  {
    key: "id",
    label: "ID",
    filterType: "number",
    tone: "muted",
  },
  {
    key: "name",
    label: "分类名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "scoreLimitDisplay",
    label: "分数上限",
    filterType: "none",
    tone: "muted",
    slot: "cell-score-limit",
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
    String(row.id),
    row.name,
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
    const result = await fetchInspectionCategories()
    rows.value = result.list.map((item, index) => normalizeInspectionCategory(item, index))
    emit("countChange", rows.value.length)
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
    scoreLimit: formatScoreLimitFieldValue(row.scoreLimit),
  }
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

    if (editingCategoryId.value === row.id) {
      editForm.value = {
        name: detailRow.name,
        scoreLimit: formatScoreLimitFieldValue(detailRow.scoreLimit),
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

  try {
    const response = await createInspectionCategory({
      Name: createForm.value.name.trim(),
      Score: nextScoreLimit,
    })

    const nextId = Number.isFinite(Number(response.Id)) ? Number(response.Id) : createLocalId()
    const nextUuid = toText(response.Uuid, `category-${nextId}`)
    const nextRow = normalizeInspectionCategory({
      ...response,
      Id: nextId,
      Name: createForm.value.name.trim(),
      Score: nextScoreLimit,
      Uuid: nextUuid,
    }, rows.value.length)

    rows.value = [nextRow, ...rows.value]
    emit("countChange", rows.value.length)
    createDialogOpen.value = false
    createForm.value = createInspectionCategoryForm()
    toast.success("检测项分类已创建", {
      description: `${nextRow.name} 已加入当前列表。`,
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

  if (!currentRow) {
    return
  }

  editSubmitting.value = true

  try {
    await updateInspectionCategory({
      Uuid: currentRow.uuid,
      Name: editForm.value.name.trim(),
      Score: nextScoreLimit,
    })

    currentRow.name = editForm.value.name.trim()
    currentRow.scoreLimit = nextScoreLimit
    currentRow.scoreLimitSearchText = buildScoreLimitSearchText(nextScoreLimit)
    closeEditDialog()
    toast.success("检测项分类已更新", {
      description: `${currentRow.name} 的名称和分数上限已保存。`,
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

    rows.value = rows.value.filter(row => row.id !== currentRow.id)
    emit("countChange", rows.value.length)
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
    scoreLimit,
    scoreLimitSearchText: buildScoreLimitSearchText(scoreLimit),
  }
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function createInspectionCategoryForm(): InspectionCategoryForm {
  return {
    name: "",
    scoreLimit: "",
  }
}

function toScoreLimit(value: unknown, fallback: InspectionCategoryScoreLimit) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return Math.round(parsed)
}

function parseInspectionCategoryScoreLimitForm(form: InspectionCategoryForm): InspectionCategoryScoreLimit | null {
  return parseScoreFieldValue(form.scoreLimit)
}

function parseScoreFieldValue(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function isInspectionCategoryFormValid(form: InspectionCategoryForm) {
  return Boolean(form.name.trim()) && parseInspectionCategoryScoreLimitForm(form) !== null
}

function buildScoreLimitSearchText(scoreLimit: InspectionCategoryScoreLimit) {
  return scoreLimit === null
    ? "分数上限 未设置"
    : ["分数上限", String(scoreLimit)].join(" ")
}

function formatScoreLimitFieldValue(scoreLimit: InspectionCategoryScoreLimit) {
  return scoreLimit === null ? "" : String(scoreLimit)
}

function createLocalId() {
  const maxId = rows.value.reduce((max, row) => Math.max(max, row.id), 0)
  return maxId + 1
}

function asInspectionCategoryRow(row: Record<string, unknown>) {
  return row as InspectionCategoryRow
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
          placeholder="搜索分类名称、ID 或分数上限"
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
      sticky-header
      :end-spacer="false"
      :columns="columns"
      :rows="filteredRows"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    >
      <template #cell-score-limit="{ row: rawRow }">
        <InspectionCategoryScoreLimitInline :limit="asInspectionCategoryRow(rawRow).scoreLimit" />
      </template>

      <template #cell-actions="{ row: rawRow }">
        <Button
          variant="outline"
          size="sm"
          class="ml-auto h-8 gap-1 rounded-md px-2.5 text-[13px]"
          @click="openEditDialog(asInspectionCategoryRow(rawRow))"
        >
          <i class="ri-edit-line text-base" />
          <span>编辑</span>
        </Button>
      </template>
    </TablePageTable>

    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>添加检测项分类</DialogTitle>
          <DialogDescription>添加一个检测项分类，并填写该分类的分数上限。</DialogDescription>
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
            <label class="text-sm font-medium text-foreground" for="create-inspection-category-score-limit">分数上限</label>
            <Input
              id="create-inspection-category-score-limit"
              v-model="createForm.scoreLimit"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              placeholder="例如：20"
              class="h-9 min-w-0"
            />
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
              <i v-if="createSubmitting" class="ri-loader-4-line animate-spin text-base" />
              <span>{{ createSubmitting ? "保存中" : "保存分类" }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="$event ? (editDialogOpen = true) : closeEditDialog()">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>修改检测项分类</DialogTitle>
          <DialogDescription>
            {{ editDetailLoading ? "正在同步分类详情..." : "更新当前分类名称和分数上限，调整后会同步应用到分类列表中。" }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-category-name">分类名称</label>
            <Input
              id="edit-inspection-category-name"
              v-model="editForm.name"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              placeholder="例如：消防设施"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-category-score-limit">分数上限</label>
            <Input
              id="edit-inspection-category-score-limit"
              v-model="editForm.scoreLimit"
              :disabled="editDetailLoading || editSubmitting || deleteSubmitting"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              placeholder="例如：20"
              class="h-9 min-w-0"
            />
          </div>

          <DialogFooter class="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              class="w-full gap-1 border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive sm:w-auto"
              :disabled="editSubmitting || deleteSubmitting"
              @click="promptDeleteEditingCategory"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除分类</span>
            </Button>

            <div class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" :disabled="editSubmitting || deleteSubmitting" @click="closeEditDialog">
                取消
              </Button>
              <Button
                type="button"
                :disabled="editDetailLoading || editSubmitting || deleteSubmitting || !editFormValid"
                @click.stop.prevent="requestEditSubmit"
              >
                <i v-if="editSubmitting" class="ri-loader-4-line animate-spin text-base" />
                <span>{{ editSubmitting ? "保存中" : "保存修改" }}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
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
            <i v-if="deleteSubmitting" class="ri-loader-4-line animate-spin text-base" />
            <span>{{ deleteSubmitting ? "删除中" : "确认删除" }}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
