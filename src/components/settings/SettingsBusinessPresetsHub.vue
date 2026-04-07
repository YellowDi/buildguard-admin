<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { toast } from "vue-sonner"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import {
  createDictEntry,
  createDictType,
  deleteDictEntry,
  deleteDictType,
  fetchDictEntryDetail,
  fetchDictEntries,
  fetchDictTypeDetail,
  fetchDictTypes,
  type DictEntryItem,
  type DictTypeItem,
  updateDictEntry,
  updateDictType,
} from "@/lib/business-presets-api"

type DictEntryDisplayRow = {
  id: number
  uuid: string
  parentName: string
  name: string
  remark: string
  sort: string
}

type ExposedActions = {
  openCreateDialog: () => void
  openCreateTypeDialog: () => void
  openCreateItemDialog: () => void
  refreshData: () => Promise<void>
}

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

const searchExpanded = ref(false)
const searchQuery = ref("")
const loading = ref(false)

const dictTypes = ref<DictTypeItem[]>([])
const activeTabCode = ref("")
const currentEntries = ref<DictEntryItem[]>([])

const createTypeOpen = ref(false)
const editTypeOpen = ref(false)
const createItemOpen = ref(false)
const editItemOpen = ref(false)
const deleteTypeOpen = ref(false)
const deleteItemOpen = ref(false)

const typeForm = ref({
  code: "",
  name: "",
  remark: "",
})

const itemForm = ref({
  code: "",
  name: "",
  parentUuid: "",
  parentName: "",
  remark: "",
})

const editingItemUuid = ref("")
const deletingItem = ref<DictEntryDisplayRow | null>(null)

const tabs = computed(() => dictTypes.value.map(type => ({
  id: type.Code,
  label: type.Name || type.Code || "未命名类型",
})))

const activeType = computed(() => (
  dictTypes.value.find(type => type.Code === activeTabCode.value) ?? null
))

const canCreateItem = computed(() => Boolean(activeType.value?.Uuid))

const tableColumns: TableColumn[] = [
  {
    key: "name",
    label: "条目名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "parentName",
    label: "父级",
    filterType: "text",
    tone: "default",
  },
  {
    key: "remark",
    label: "备注",
    filterType: "text",
    tone: "default",
  },
  {
    key: "sort",
    label: "排序",
    filterType: "text",
    tone: "default",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    cellClass: "text-right",
  },
]

const filteredEntries = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const rows = [...currentEntries.value].sort((a, b) => {
    const aSort = a.Sort ?? Number.MAX_SAFE_INTEGER
    const bSort = b.Sort ?? Number.MAX_SAFE_INTEGER
    if (aSort !== bSort) {
      return aSort - bSort
    }
    return a.Name.localeCompare(b.Name, "zh-CN")
  })

  const displayRows = rows.map<DictEntryDisplayRow>(row => ({
    id: row.Id,
    uuid: row.Uuid,
    parentName: row.ParentName || "-",
    name: row.Name,
    remark: row.Remark,
    sort: row.Sort === null ? "-" : String(row.Sort),
  }))

  if (!query) {
    return displayRows
  }

  return displayRows.filter(row => (
    [row.name, row.remark, row.parentName]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(query))
  ))
})

const emptyState = computed<TablePageEmptyState>(() => {
  if (!dictTypes.value.length) {
    return {
      title: "暂无字典类型",
      description: "请先添加类型，再维护该类型下的业务条目。",
      icon: "ri-layout-grid-line",
    }
  }

  if (searchQuery.value.trim()) {
    return {
      title: "没有匹配的条目",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "暂无字典条目",
    description: "当前分页下还没有条目，请点击右上角添加。",
    icon: "ri-list-check-3",
  }
})

watch(activeTabCode, async (code, previousCode) => {
  if (!code || code === previousCode) {
    return
  }

  await loadEntries()
})

onMounted(async () => {
  await loadTypes()
})

function toggleSearch() {
  if (searchExpanded.value && searchQuery.value) {
    searchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function openCreateTypeDialog() {
  typeForm.value = {
    code: "",
    name: "",
    remark: "",
  }
  createTypeOpen.value = true
}

async function openEditTypeDialog() {
  const currentType = activeType.value

  if (!currentType?.Uuid) {
    toast.error("请先选择一个字典类型")
    return
  }

  try {
    const detail = await fetchDictTypeDetail({
      Uuid: currentType.Uuid,
    })

    typeForm.value = {
      code: detail.Code,
      name: detail.Name,
      remark: detail.Remark,
    }
    editTypeOpen.value = true
  } catch (error) {
    toast.error(resolveErrorMessage(error, "加载字典类型详情失败"))
  }
}

function openCreateItemDialog() {
  const code = activeType.value?.Code?.trim() ?? ""
  const uuid = activeType.value?.Uuid?.trim() ?? ""
  if (!uuid) {
    toast.error("请先添加并选择字典类型")
    return
  }

  itemForm.value = {
    code,
    name: "",
    parentUuid: "",
    parentName: "",
    remark: "",
  }
  createItemOpen.value = true
}

async function openEditItemDialog(row: DictEntryDisplayRow) {
  try {
    const detail = await fetchDictEntryDetail({
      Uuid: row.uuid,
    })

    editingItemUuid.value = detail.Uuid
    itemForm.value = {
      code: activeType.value?.Code ?? "",
      name: detail.Name,
      parentUuid: detail.ParentUuid,
      parentName: detail.ParentName,
      remark: detail.Remark,
    }
    editItemOpen.value = true
  } catch (error) {
    toast.error(resolveErrorMessage(error, "加载字典条目详情失败"))
  }
}

async function refreshData() {
  await loadTypes()
}

async function submitCreateType() {
  const code = typeForm.value.code.trim()
  const name = typeForm.value.name.trim()
  const remark = typeForm.value.remark.trim()

  if (!code || !name) {
    toast.error("请填写类型代码和类型名称")
    return
  }

  try {
    await createDictType({
      Code: code,
      Name: name,
      Remark: remark,
    })
    createTypeOpen.value = false
    await loadTypes(code)
    toast.success("已添加字典类型")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "添加字典类型失败"))
  }
}

async function submitEditType() {
  const currentType = activeType.value
  const code = typeForm.value.code.trim()
  const name = typeForm.value.name.trim()
  const remark = typeForm.value.remark.trim()

  if (!currentType?.Uuid) {
    toast.error("当前字典类型缺少标识，无法编辑")
    return
  }

  if (!code || !name) {
    toast.error("请填写类型代码和类型名称")
    return
  }

  try {
    await updateDictType({
      Uuid: currentType.Uuid,
      Code: code,
      Name: name,
      Remark: remark,
    })
    editTypeOpen.value = false
    await loadTypes(code)
    toast.success("已更新字典类型")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "更新字典类型失败"))
  }
}

async function submitCreateItem() {
  const name = itemForm.value.name.trim()
  const remark = itemForm.value.remark.trim()
  const dictTypeUuid = activeType.value?.Uuid?.trim() ?? ""

  if (!dictTypeUuid || !name) {
    toast.error("请填写条目名称")
    return
  }

  try {
    await createDictEntry({
      DictTypeUuid: dictTypeUuid,
      Name: name,
      ParentUuid: itemForm.value.parentUuid.trim(),
      Remark: remark,
    })
    createItemOpen.value = false
    await loadEntries()
    toast.success("已添加字典条目")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "添加字典条目失败"))
  }
}

async function submitEditItem() {
  const dictTypeUuid = activeType.value?.Uuid?.trim() ?? ""
  const name = itemForm.value.name.trim()
  const remark = itemForm.value.remark.trim()
  const parentUuid = itemForm.value.parentUuid.trim()

  if (!editingItemUuid.value || !dictTypeUuid || !name) {
    toast.error("请填写条目名称")
    return
  }

  try {
    await updateDictEntry({
      Uuid: editingItemUuid.value,
      DictTypeUuid: dictTypeUuid,
      Name: name,
      ParentUuid: parentUuid,
      Remark: remark,
    })
    editItemOpen.value = false
    editingItemUuid.value = ""
    await loadEntries()
    toast.success("已更新字典条目")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "更新字典条目失败"))
  }
}

async function confirmDeleteItem() {
  if (!deletingItem.value?.uuid) {
    toast.error("当前条目缺少标识，无法删除")
    return
  }

  try {
    await deleteDictEntry({
      Uuid: deletingItem.value.uuid,
    })
    deleteItemOpen.value = false
    deletingItem.value = null
    await loadEntries()
    toast.success("已删除字典条目")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "删除字典条目失败"))
  }
}

async function confirmDeleteType() {
  const currentType = activeType.value

  if (!currentType?.Uuid) {
    toast.error("当前字典类型缺少标识，无法删除")
    return
  }

  try {
    await deleteDictType({
      Uuid: currentType.Uuid,
      Code: currentType.Code,
    })
    deleteTypeOpen.value = false
    await loadTypes()
    toast.success("已删除字典类型")
  } catch (error) {
    toast.error(resolveErrorMessage(error, "删除字典类型失败"))
  }
}

async function loadTypes(preferredCode?: string) {
  loading.value = true

  try {
    const types = await fetchDictTypes()
    dictTypes.value = types.filter(type => type.Code)

    const nextCode = resolveNextActiveCode(preferredCode)
    const changed = nextCode !== activeTabCode.value
    activeTabCode.value = nextCode

    if (!changed && nextCode) {
      await loadEntries()
      return
    }

    if (!nextCode) {
      currentEntries.value = []
    }
  } catch (error) {
    dictTypes.value = []
    currentEntries.value = []
    activeTabCode.value = ""
    toast.error(resolveErrorMessage(error, "加载字典类型失败"))
  } finally {
    loading.value = false
  }
}

async function loadEntries() {
  const dictTypeUuid = activeType.value?.Uuid?.trim() ?? ""

  if (!dictTypeUuid) {
    currentEntries.value = []
    return
  }

  loading.value = true

  try {
    currentEntries.value = await fetchDictEntries({
      DictTypeUuid: dictTypeUuid,
      Name: searchQuery.value.trim(),
      PageNum: 1,
      PageSize: 200,
      ParentUuid: "",
    })
  } catch (error) {
    currentEntries.value = []
    toast.error(resolveErrorMessage(error, "加载字典条目失败"))
  } finally {
    loading.value = false
  }
}

function resolveNextActiveCode(preferredCode?: string) {
  if (preferredCode && dictTypes.value.some(type => type.Code === preferredCode)) {
    return preferredCode
  }

  if (activeTabCode.value && dictTypes.value.some(type => type.Code === activeTabCode.value)) {
    return activeTabCode.value
  }

  return dictTypes.value[0]?.Code ?? ""
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

defineExpose<ExposedActions>({
  openCreateDialog: openCreateItemDialog,
  openCreateTypeDialog,
  openCreateItemDialog,
  refreshData,
})
</script>

<template>
  <SettingsRightPanelLayout
    variant="with-tabs"
    :title="props.pageTitle"
    :description="props.pageDescription"
  >
    <template #toolbar>
      <SettingsToolbarRow>
        <template #leading>
          <div v-if="tabs.length" class="min-w-0">
            <TopTabSwitch
              :tabs="tabs"
              :model-value="activeTabCode"
              :collapse-inactive="false"
              tone="default"
              aria-label="业务预设页签切换"
              @update:model-value="activeTabCode = String($event)"
            />
          </div>
          <div v-else class="flex h-8 items-center text-sm text-muted-foreground">
            暂无字典类型
          </div>
        </template>

        <div class="flex flex-nowrap items-center justify-end gap-2">
          <SettingsToolbarSearchInput
            v-model="searchQuery"
            :expanded="searchExpanded"
            placeholder="搜索条目名称、备注或类型代码"
            @toggle="toggleSearch"
          />

          <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-md px-3"
              :disabled="loading"
              @click="refreshData"
            >
              <i class="ri-refresh-line text-sm" />
              <span>刷新列表</span>
            </Button>
          </SettingsToolbarRefreshSlot>

          <div class="inline-flex items-center">
            <Button
              class="h-8 gap-1 rounded-r-none pr-2.5 pl-3 text-[14px]"
              :disabled="!canCreateItem"
              @click="openCreateItemDialog"
            >
              <i class="ri-add-line text-base" />
              <span>添加条目</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  class="h-8 w-8 rounded-l-none border-l border-white/15 px-0 text-[14px]"
                  aria-label="打开业务预设操作菜单"
                >
                  <i class="ri-arrow-down-s-line text-base" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" class="w-[220px] rounded-xl p-1.5">
                <DropdownMenuLabel class="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  类型操作
                </DropdownMenuLabel>
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="openCreateTypeDialog">
                  新增类型
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="rounded-lg px-2.5 py-2"
                  :disabled="!activeType"
                  @select="openEditTypeDialog"
                >
                  编辑当前类型
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="rounded-lg px-2.5 py-2 text-destructive focus:text-destructive"
                  :disabled="!activeType"
                  @select="deleteTypeOpen = true"
                >
                  删除当前类型
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SettingsToolbarRow>
    </template>

    <section class="space-y-4">
      <Alert class="border-border/60 bg-muted/25">
        <i class="ri-information-line text-base text-muted-foreground" />
        <AlertTitle>{{ activeType?.Name || "业务预设" }}</AlertTitle>
        <AlertDescription>
          <template v-if="activeType?.Code">
            当前分页条目会自动绑定类型代码 <code>{{ activeType.Code }}</code>，新增条目时无需重复选择。
          </template>
          <template v-else>
            请先添加字典类型。新增条目时，系统会自动根据当前分页填充对应的类型代码。
          </template>
        </AlertDescription>
      </Alert>

      <TablePageTable
        row-key="id"
        show-index
        sticky-header
        :end-spacer="false"
        :show-index-checkbox="false"
        :edge-gutter="false"
        :show-row-action-icons="true"
        :columns="tableColumns"
        :rows="filteredEntries"
        :table-class="SETTINGS_TABLE_PAGE_CLASS"
        :empty-state="emptyState"
      >
        <template #cell-actions="{ row: rawRow }">
          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
              @click.stop="openEditItemDialog(rawRow as DictEntryDisplayRow)"
            >
              <i class="ri-edit-line text-base" />
              <span>编辑</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px] text-destructive hover:text-destructive"
              @click.stop="deletingItem = rawRow as DictEntryDisplayRow; deleteItemOpen = true"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除</span>
            </Button>
          </div>
        </template>
      </TablePageTable>
    </section>

    <Dialog :open="createTypeOpen" @update:open="createTypeOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加字典类型</DialogTitle>
          <DialogDescription>
            新增后会自动生成一个新的分页，用户可在该分页下维护业务条目。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-type-code">类型代码</label>
            <Input
              id="dict-type-code"
              v-model="typeForm.code"
              placeholder="例如 industry_category"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-type-name">类型名称</label>
            <Input
              id="dict-type-name"
              v-model="typeForm.name"
              placeholder="例如 行业分类"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-type-remark">备注</label>
            <Textarea
              id="dict-type-remark"
              v-model="typeForm.remark"
              rows="3"
              placeholder="可选，补充该类型的用途说明"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="createTypeOpen = false">
            取消
          </Button>
          <Button @click="submitCreateType">
            保存类型
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="editTypeOpen" @update:open="editTypeOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑字典类型</DialogTitle>
          <DialogDescription>
            当前正在编辑分页 {{ activeType?.Name || activeType?.Code || "-" }} 的类型信息。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-type-code">类型代码</label>
            <Input
              id="edit-dict-type-code"
              v-model="typeForm.code"
              placeholder="例如 industry_category"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-type-name">类型名称</label>
            <Input
              id="edit-dict-type-name"
              v-model="typeForm.name"
              placeholder="例如 行业分类"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-type-remark">备注</label>
            <Textarea
              id="edit-dict-type-remark"
              v-model="typeForm.remark"
              rows="3"
              placeholder="可选，补充该类型的用途说明"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="editTypeOpen = false">
            取消
          </Button>
          <Button @click="submitEditType">
            保存修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="createItemOpen" @update:open="createItemOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加字典条目</DialogTitle>
          <DialogDescription>
            条目会自动添加到当前分页下，并使用当前分页的类型代码。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-entry-code">类型代码</label>
            <Input
              id="dict-entry-code"
              :model-value="itemForm.code"
              disabled
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-entry-name">条目名称</label>
            <Input
              id="dict-entry-name"
              v-model="itemForm.name"
              placeholder="请输入条目名称"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-entry-parent-uuid">父级 UUID</label>
            <Input
              id="dict-entry-parent-uuid"
              v-model="itemForm.parentUuid"
              placeholder="可选，空表示顶级"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="dict-entry-remark">备注</label>
            <Textarea
              id="dict-entry-remark"
              v-model="itemForm.remark"
              rows="3"
              placeholder="可选，补充该条目说明"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="createItemOpen = false">
            取消
          </Button>
          <Button @click="submitCreateItem">
            保存条目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="editItemOpen" @update:open="editItemOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑字典条目</DialogTitle>
          <DialogDescription>
            当前正在编辑 {{ itemForm.name || "字典条目" }}。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-entry-code">类型代码</label>
            <Input
              id="edit-dict-entry-code"
              :model-value="itemForm.code"
              disabled
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-entry-name">条目名称</label>
            <Input
              id="edit-dict-entry-name"
              v-model="itemForm.name"
              placeholder="请输入条目名称"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-entry-parent-uuid">父级 UUID</label>
            <Input
              id="edit-dict-entry-parent-uuid"
              v-model="itemForm.parentUuid"
              placeholder="可选，空表示顶级"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-dict-entry-remark">备注</label>
            <Textarea
              id="edit-dict-entry-remark"
              v-model="itemForm.remark"
              rows="3"
              placeholder="可选，补充该条目说明"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="editItemOpen = false">
            取消
          </Button>
          <Button @click="submitEditItem">
            保存修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteTypeOpen" @update:open="deleteTypeOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除当前字典类型？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除当前分页 {{ activeType?.Name || activeType?.Code || "-" }} 对应的字典类型。该操作不可撤销，请确认后再继续。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteType">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="deleteItemOpen" @update:open="deleteItemOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除当前字典条目？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除条目 {{ deletingItem?.name || "-" }}。该操作不可撤销，请确认后再继续。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteItem">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsRightPanelLayout>
</template>
