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
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { handleApiError } from "@/lib/api-errors"
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
}

type InspectionCategoryForm = {
  name: string
}

const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:!border-l-0 [&_thead_th:last-child]:w-0 [&_thead_th:last-child]:min-w-0 [&_thead_th:last-child]:p-0 [&_tbody_td:last-child]:w-0 [&_tbody_td:last-child]:min-w-0 [&_tbody_td:last-child]:p-0 [&_tbody_tr:hover]:bg-transparent [&_tbody_tr:hover_td]:bg-transparent"

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
    headerClass: "w-[6.5rem]",
    cellClass: "w-[6.5rem] text-right",
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
    description: "接口返回为空时，会在这里显示空状态。",
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

function openEditDialog(row: InspectionCategoryRow) {
  editingCategoryId.value = row.id
  editForm.value = {
    name: row.name,
  }
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

  createSubmitArmed.value = false
  createSubmitting.value = true

  try {
    const response = await createInspectionCategory({
      Name: createForm.value.name.trim(),
    })

    const nextId = Number.isFinite(Number(response.Id)) ? Number(response.Id) : createLocalId()
    const nextRow = normalizeInspectionCategory({
      ...response,
      Id: nextId,
      Name: createForm.value.name.trim(),
      Uuid: toText(response.Uuid, `category-${nextId}`),
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
    closeEditDialog()
    toast.success("检测项分类已更新", {
      description: `${currentRow.name} 的名称已保存。`,
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

function normalizeInspectionCategory(item: InspectionCategoryRecord, index: number): InspectionCategoryRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1

  return {
    id,
    uuid: toText(item.Uuid, `category-${id}`),
    name: toText(item.Name, `分类 ${id}`),
  }
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function createInspectionCategoryForm(): InspectionCategoryForm {
  return {
    name: "",
  }
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
          placeholder="搜索分类名称、ID 或 Uuid"
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
      :columns="columns"
      :rows="filteredRows"
      :table-class="compactTableClass"
      :empty-state="tableEmptyState"
    >
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
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加检测项分类</DialogTitle>
          <DialogDescription>
            新增一个检测项分类，便于后续统一归类和筛选检测项。
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

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="createSubmitting" @click="createDialogOpen = false">
              取消
            </Button>
            <Button
              type="button"
              :disabled="createSubmitting || !createForm.name.trim()"
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
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>修改检测项分类</DialogTitle>
          <DialogDescription>
            更新当前分类名称，调整后会同步应用到分类列表中。
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

          <DialogFooter class="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              class="w-full sm:w-auto"
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
                :disabled="editSubmitting || deleteSubmitting || !editForm.name.trim()"
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
