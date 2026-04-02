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
import InspectionCategoryScorePresetInline from "@/components/inspection/InspectionCategoryScorePresetInline.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Input } from "@/components/ui/input"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
import {
  readInspectionCategoryScorePresets,
  removeInspectionCategoryScorePreset,
  writeInspectionCategoryScorePreset,
  type InspectionCategoryScorePreset,
} from "@/lib/inspection-category-score-presets"
import {
  createInspectionCategory,
  deleteInspectionCategory,
  fetchInspectionCategories,
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

type InspectionCategoryRow = {
  id: number
  uuid: string
  name: string
  scorePreset: InspectionCategoryScorePreset
  scorePresetSearchText: string
}

type InspectionCategoryForm = {
  name: string
  normalScore: string
  attentionScore: string
  riskScore: string
}

type InspectionCategoryScorePresetFormKey = "normalScore" | "attentionScore" | "riskScore"

const SCORE_PRESET_FIELDS: Array<{
  key: InspectionCategoryScorePresetFormKey
  label: string
  placeholder: string
  readonly?: boolean
}> = [
  {
    key: "normalScore",
    label: "一切正常",
    placeholder: "例如 0",
  },
  {
    key: "attentionScore",
    label: "需重点关注",
    placeholder: "例如 10",
  },
  {
    key: "riskScore",
    label: "存在风险",
    placeholder: "固定扣 20 分",
    readonly: true,
  },
]

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
    key: "scorePresetDisplay",
    label: "计分预设",
    filterType: "none",
    tone: "muted",
    slot: "cell-score-preset",
    width: "fill",
  },
  {
    key: "uuid",
    label: "Uuid",
    filterType: "text",
    tone: "muted",
    cellClass: "font-mono text-[12px] text-muted-foreground",
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
    row.scorePresetSearchText,
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
    const scorePresets = readInspectionCategoryScorePresets()
    rows.value = result.list.map((item, index) => normalizeInspectionCategory(item, index, scorePresets))
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

function openEditDialog(row: InspectionCategoryRow) {
  editingCategoryId.value = row.id
  editForm.value = {
    name: row.name,
    normalScore: String(row.scorePreset.normal),
    attentionScore: String(row.scorePreset.attention),
    riskScore: String(row.scorePreset.risk),
  }
  editSubmitArmed.value = false
  editDialogOpen.value = true
}

function closeEditDialog() {
  editDialogOpen.value = false
  editingCategoryId.value = null
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

  const nextPreset = parseInspectionCategoryScorePresetForm(createForm.value)

  if (!nextPreset) {
    createSubmitArmed.value = false
    return
  }

  createSubmitArmed.value = false
  createSubmitting.value = true

  try {
    const response = await createInspectionCategory({
      Name: createForm.value.name.trim(),
    })

    const nextId = Number.isFinite(Number(response.Id)) ? Number(response.Id) : createLocalId()
    const nextUuid = toText(response.Uuid, `category-${nextId}`)
    const nextRow = normalizeInspectionCategory({
      ...response,
      Id: nextId,
      Name: createForm.value.name.trim(),
      Uuid: nextUuid,
    }, rows.value.length, {
      [nextUuid]: nextPreset,
    })

    writeInspectionCategoryScorePreset(nextRow.uuid, nextPreset)
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

  const nextPreset = parseInspectionCategoryScorePresetForm(editForm.value)

  if (!nextPreset) {
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
    })

    currentRow.name = editForm.value.name.trim()
    currentRow.scorePreset = nextPreset
    currentRow.scorePresetSearchText = buildScorePresetSearchText(nextPreset)
    writeInspectionCategoryScorePreset(currentRow.uuid, nextPreset)
    closeEditDialog()
    toast.success("检测项分类已更新", {
      description: `${currentRow.name} 的名称与计分预设已保存。`,
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
    removeInspectionCategoryScorePreset(currentRow.uuid)
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
  scorePresets: Record<string, InspectionCategoryScorePreset>,
): InspectionCategoryRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1
  const uuid = toText(item.Uuid, `category-${id}`)
  const scorePreset = scorePresets[uuid] ?? createDefaultScorePreset()

  return {
    id,
    uuid,
    name: toText(item.Name, `分类 ${id}`),
    scorePreset,
    scorePresetSearchText: buildScorePresetSearchText(scorePreset),
  }
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function createInspectionCategoryForm(): InspectionCategoryForm {
  const defaultScorePreset = createDefaultScorePreset()

  return {
    name: "",
    normalScore: String(defaultScorePreset.normal),
    attentionScore: String(defaultScorePreset.attention),
    riskScore: String(defaultScorePreset.risk),
  }
}

function createDefaultScorePreset(): InspectionCategoryScorePreset {
  return {
    normal: 0,
    attention: 10,
    risk: 20,
  }
}

function parseInspectionCategoryScorePresetForm(form: InspectionCategoryForm): InspectionCategoryScorePreset | null {
  const normal = parseScoreFieldValue(form.normalScore)
  const attention = parseScoreFieldValue(form.attentionScore)
  const risk = 20

  if (normal === null || attention === null) {
    return null
  }

  return {
    normal,
    attention,
    risk,
  }
}

function parseScoreFieldValue(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 20) {
    return null
  }

  return parsed
}

function isInspectionCategoryFormValid(form: InspectionCategoryForm) {
  return Boolean(form.name.trim()) && parseInspectionCategoryScorePresetForm(form) !== null
}

function buildScorePresetSearchText(scorePreset: InspectionCategoryScorePreset) {
  return [
    "一切正常",
    String(scorePreset.normal),
    "需重点关注",
    String(scorePreset.attention),
    "存在风险",
    String(scorePreset.risk),
  ].join(" ")
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
          placeholder="搜索分类名称、ID、Uuid 或计分预设"
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
      <template #cell-score-preset="{ row: rawRow }">
        <InspectionCategoryScorePresetInline :preset="asInspectionCategoryRow(rawRow).scorePreset" />
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
          <DialogDescription>
            添加一个检测项分类，并为不同结果状态设置默认扣分值。
          </DialogDescription>
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
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-foreground">计分预设</label>
              <span class="text-xs text-muted-foreground">扣分范围 0-20，存在风险固定扣 20 分</span>
            </div>
            <div class="min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md border border-border">
              <table class="w-full min-w-[420px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      v-for="(field, index) in SCORE_PRESET_FIELDS"
                      :key="`create-score-header-${field.key}`"
                      :class="[
                        'bg-muted px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground',
                        index === 0 ? 'rounded-tl-md rounded-bl-md' : '',
                        index === SCORE_PRESET_FIELDS.length - 1 ? 'rounded-tr-md rounded-br-md' : '',
                      ]"
                    >
                      {{ field.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      v-for="field in SCORE_PRESET_FIELDS"
                      :key="`create-score-input-${field.key}`"
                      class="px-3 py-3 sm:px-4"
                    >
                      <Input
                        v-model="createForm[field.key]"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        max="20"
                        step="1"
                        :placeholder="field.placeholder"
                        :disabled="field.readonly"
                        class="h-9 min-w-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
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
            更新当前分类名称和默认扣分值，调整后会同步应用到分类列表中。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-inspection-category-name">分类名称</label>
            <Input
              id="edit-inspection-category-name"
              v-model="editForm.name"
              placeholder="例如：消防设施"
            />
          </div>

          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-foreground">计分预设</label>
              <span class="text-xs text-muted-foreground">扣分范围 0-20，存在风险固定扣 20 分</span>
            </div>
            <div class="min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md border border-border">
              <table class="w-full min-w-[420px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      v-for="(field, index) in SCORE_PRESET_FIELDS"
                      :key="`edit-score-header-${field.key}`"
                      :class="[
                        'bg-muted px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground',
                        index === 0 ? 'rounded-tl-md rounded-bl-md' : '',
                        index === SCORE_PRESET_FIELDS.length - 1 ? 'rounded-tr-md rounded-br-md' : '',
                      ]"
                    >
                      {{ field.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      v-for="field in SCORE_PRESET_FIELDS"
                      :key="`edit-score-input-${field.key}`"
                      class="px-3 py-3 sm:px-4"
                    >
                      <Input
                        v-model="editForm[field.key]"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        max="20"
                        step="1"
                        :placeholder="field.placeholder"
                        :disabled="field.readonly"
                        class="h-9 min-w-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
                :disabled="editSubmitting || deleteSubmitting || !editFormValid"
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
