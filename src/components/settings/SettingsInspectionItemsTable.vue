<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { toast } from "vue-sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import {
  createInspectionItem,
  deleteInspectionItem,
  fetchInspectionItems,
  getInspectionItemDetail,
  updateInspectionItem,
  type InspectionItemRecord,
} from "@/lib/inspection-items-api"
import { cn } from "@/lib/utils"

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
  isMeasureRecord: boolean
  createdAt: string
  updatedAt: string
}

type InspectionItemForm = {
  name: string
  categoryName: string
  content: string
  standard: string
  isForcePhoto: boolean
  isMeasureRecord: boolean
}

const INSPECTION_ITEMS_LOAD_ERROR_MESSAGE = "检测项列表加载失败，请稍后重试。"
const toolbarIconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
const compactTableClass =
  "text-[13px] [&_thead_th]:px-2.5 [&_thead_th]:py-1.5 [&_tbody_td]:px-2.5 [&_tbody_td]:py-2 [&_tbody_td]:align-middle [&_tbody_td]:!border-l-0 [&_thead_th:last-child]:w-0 [&_thead_th:last-child]:min-w-0 [&_thead_th:last-child]:p-0 [&_tbody_td:last-child]:w-0 [&_tbody_td:last-child]:min-w-0 [&_tbody_td:last-child]:p-0 [&_tbody_tr:hover]:bg-transparent [&_tbody_tr:hover_td]:bg-transparent"

const rows = ref<InspectionItemRow[]>([])
const loading = ref(false)
const errorMessage = ref("")
const searchExpanded = ref(false)
const searchQuery = ref("")
const activeCategoryTab = ref("all")
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const editingItemId = ref<number | null>(null)
const createSubmitting = ref(false)
const editSubmitting = ref(false)
const editDetailLoading = ref(false)
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const createForm = ref(createInspectionItemForm())
const editForm = ref(createInspectionItemForm())

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
    key: "createdAt",
    label: "创建时间",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "updatedAt",
    label: "更新时间",
    filterType: "text",
    tone: "muted",
    width: "fill",
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

const categoryTabs = computed(() => {
  const grouped = new Map<string, number>()

  for (const row of rows.value) {
    const key = row.categoryName || "未分类"
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }

  return [
    {
      id: "all",
      label: "全部",
      badge: rows.value.length,
    },
    ...Array.from(grouped.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hans-CN"))
      .map(([categoryName, count]) => ({
        id: categoryName,
        label: categoryName,
        badge: count,
      })),
  ]
})

const categoryOptions = computed(() => categoryTabs.value
  .filter(tab => tab.id !== "all")
  .map(tab => tab.label))

const categoryFilteredRows = computed(() => {
  if (activeCategoryTab.value === "all") {
    return rows.value
  }

  return rows.value.filter(row => row.categoryName === activeCategoryTab.value)
})

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const scopedRows = categoryFilteredRows.value

  if (!query) {
    return scopedRows
  }

  return scopedRows.filter(row => [
    row.name,
    row.categoryName,
    row.content,
    row.standard,
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

  if (searchQuery.value.trim()) {
    return {
      title: "没有匹配的检测项",
      description: "换个关键词试试，或切换其他分类胶囊。",
      icon: "ri-search-line",
    }
  }

  if (activeCategoryTab.value !== "all") {
    return {
      title: "当前分类下还没有检测项",
      description: "切换其他分类，或在当前分类下新增检测项。",
      icon: "ri-file-list-3-line",
    }
  }

  return {
    title: "还没有检测项",
    description: "先创建检测项，后续即可在这里统一维护。",
    icon: "ri-file-list-3-line",
  }
})

onMounted(() => {
  void loadInspectionItems()
})

async function loadInspectionItems() {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionItems()
    rows.value = result.list.map((item, index) => normalizeInspectionItem(item, index))
    ensureActiveCategoryTab()
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

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function ensureActiveCategoryTab() {
  if (categoryTabs.value.some(tab => tab.id === activeCategoryTab.value)) {
    return
  }

  activeCategoryTab.value = "all"
}

function openCreateDialog() {
  createForm.value = createInspectionItemForm()
  createDialogOpen.value = true
}

function closeEditDialog() {
  editDialogOpen.value = false
  editingItemId.value = null
  editDetailLoading.value = false
  editForm.value = createInspectionItemForm()
}

async function submitCreate() {
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
    activeCategoryTab.value = nextRow.categoryName || "all"
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

  try {
    const detail = await getInspectionItemDetail({
      Uuid: row.uuid,
    })
    const nextRow = normalizeInspectionItem(detail, rows.value.findIndex(item => item.id === row.id))
    const currentRow = rows.value.find(item => item.id === row.id)

    if (currentRow) {
      Object.assign(currentRow, {
        ...currentRow,
        ...nextRow,
        id: currentRow.id,
      })
      editForm.value = buildFormFromRow(currentRow)
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
      categoryName: nextPayload.CategoryName ?? "",
      content: nextPayload.Content ?? "",
      standard: nextPayload.Standard ?? "",
      isForcePhoto: nextPayload.IsForcePhoto === 1,
      isMeasureRecord: nextPayload.IsMeasureRecord === 1,
      updatedAt: formatTimestamp(new Date().toISOString().slice(0, 19).replace("T", " ")),
    })

    activeCategoryTab.value = currentRow.categoryName || "all"
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
    ensureActiveCategoryTab()
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
  return {
    Name: form.name.trim(),
    CategoryId: currentRow?.categoryId,
    CategoryUuid: currentRow?.categoryUuid || undefined,
    CategoryName: form.categoryName.trim() || undefined,
    Content: form.content.trim(),
    Standard: form.standard.trim(),
    IsForcePhoto: form.isForcePhoto ? 1 : 0,
    IsMeasureRecord: form.isMeasureRecord ? 1 : 0,
  }
}

function normalizeInspectionItem(item: InspectionItemRecord, index: number): InspectionItemRow {
  const id = Number.isFinite(Number(item.Id)) ? Number(item.Id) : index + 1
  const uuid = toText(item.Uuid, `inspection-item-${id}`)

  return {
    id,
    uuid,
    name: toText(item.Name, `检测项 ${id}`),
    categoryId: toOptionalNumber(item.CategoryId),
    categoryUuid: toText(item.CategoryUuid),
    categoryName: toText(item.CategoryName, "未分类"),
    content: toText(item.Content, "-"),
    standard: toText(item.Standard, "-"),
    isForcePhoto: toFlag(item.IsForcePhoto),
    isMeasureRecord: toFlag(item.IsMeasureRecord),
    createdAt: formatTimestamp(toText(item.CreatedAt)),
    updatedAt: formatTimestamp(toText(item.UpdatedAt)),
  }
}

function buildFormFromRow(row: InspectionItemRow): InspectionItemForm {
  return {
    name: row.name,
    categoryName: row.categoryName === "未分类" ? "" : row.categoryName,
    content: row.content === "-" ? "" : row.content,
    standard: row.standard === "-" ? "" : row.standard,
    isForcePhoto: row.isForcePhoto,
    isMeasureRecord: row.isMeasureRecord,
  }
}

function createInspectionItemForm(): InspectionItemForm {
  return {
    name: "",
    categoryName: "",
    content: "",
    standard: "",
    isForcePhoto: false,
    isMeasureRecord: false,
  }
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

function toFlag(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed > 0 : false
}

function formatTimestamp(value: string) {
  return value || "-"
}

function asInspectionItemRow(row: Record<string, unknown>) {
  return row as InspectionItemRow
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <TopTabSwitch
        :tabs="categoryTabs"
        :model-value="activeCategoryTab"
        :collapse-inactive="false"
        tone="default"
        aria-label="检测项分类切换"
        @update:model-value="activeCategoryTab = $event"
      />

      <div class="flex flex-wrap items-center justify-end gap-2">
        <div
          :class="
            cn(
              'flex h-8 items-center overflow-hidden rounded-full border border-input bg-background transition-[width,padding] duration-200 ease-out',
              searchExpanded ? 'w-[260px] px-1.5' : 'w-8 justify-center border-transparent px-0',
            )
          "
        >
          <button
            type="button"
            :class="toolbarIconButtonClass"
            @click="toggleSearch"
          >
            <i :class="searchExpanded ? 'ri-close-line text-[17px]' : 'ri-search-line text-[17px]'" />
          </button>
          <Input
            v-if="searchExpanded"
            v-model="searchQuery"
            :placeholder="activeCategoryTab === 'all' ? '搜索检测项、分类、内容' : `搜索${activeCategoryTab}下的检测项`"
            class="h-8 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>

        <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" @click="loadInspectionItems">
          <i class="ri-refresh-line text-sm" />
          <span>刷新列表</span>
        </Button>

        <Button class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="openCreateDialog">
          <i class="ri-add-line text-base" />
          <span>新增检测项</span>
        </Button>
      </div>
    </div>

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
      :columns="columns"
      :rows="filteredRows"
      row-key="id"
      :empty-state="tableEmptyState"
      :table-class="compactTableClass"
    >
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
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>新增检测项</DialogTitle>
          <DialogDescription>
            填写检测项基础信息后，将调用检测项新建接口保存。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitCreate">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="create-inspection-name">检测项名称</label>
              <Input id="create-inspection-name" v-model="createForm.name" placeholder="例如：消防栓外观" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="create-inspection-category">所属分类</label>
              <Select v-model="createForm.categoryName">
                <SelectTrigger id="create-inspection-category" class="w-full">
                  <SelectValue placeholder="选择所属分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in categoryOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
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
            <label class="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
              <span class="text-sm font-medium text-foreground">是否强制拍照</span>
              <Switch v-model:checked="createForm.isForcePhoto" />
            </label>

            <label class="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
              <span class="text-sm font-medium text-foreground">是否记录实测值</span>
              <Switch v-model:checked="createForm.isMeasureRecord" />
            </label>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" variant="outline" :disabled="createSubmitting" @click="createDialogOpen = false">
              取消
            </Button>
            <Button type="submit" :disabled="createSubmitting">
              {{ createSubmitting ? "创建中..." : "创建检测项" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="($event ? (editDialogOpen = true) : closeEditDialog())">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>编辑检测项</DialogTitle>
          <DialogDescription>
            修改后会调用检测项更新接口保存。
          </DialogDescription>
          <p v-if="editDetailLoading" class="text-sm text-muted-foreground">
            正在同步检测项详情...
          </p>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitEdit">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-inspection-name">检测项名称</label>
              <Input id="edit-inspection-name" v-model="editForm.name" :disabled="editDetailLoading" placeholder="例如：消防栓外观" />
            </div>

            <div class="grid gap-2">
              <label class="text-sm font-medium text-foreground" for="edit-inspection-category">所属分类</label>
              <Select v-model="editForm.categoryName" :disabled="editDetailLoading">
                <SelectTrigger id="edit-inspection-category" class="w-full">
                  <SelectValue placeholder="选择所属分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in categoryOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
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
            <label class="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
              <span class="text-sm font-medium text-foreground">是否强制拍照</span>
              <Switch v-model:checked="editForm.isForcePhoto" :disabled="editDetailLoading" />
            </label>

            <label class="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
              <span class="text-sm font-medium text-foreground">是否记录实测值</span>
              <Switch v-model:checked="editForm.isMeasureRecord" :disabled="editDetailLoading" />
            </label>
          </div>

          <DialogFooter class="pt-2 sm:justify-between">
            <Button type="button" variant="destructive" :disabled="editDetailLoading || editSubmitting || deleteSubmitting" @click="promptDeleteEditingItem">
              {{ deleteSubmitting ? "删除中..." : "删除检测项" }}
            </Button>
            <div class="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" :disabled="editDetailLoading || editSubmitting || deleteSubmitting" @click="closeEditDialog">
                取消
              </Button>
              <Button type="submit" :disabled="editDetailLoading || editSubmitting || deleteSubmitting">
                {{ editSubmitting ? "保存中..." : "保存" }}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
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
