<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { toast } from "vue-sonner"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Input } from "@/components/ui/input"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"
import { buildIndustryPresetsFromMock } from "@/lib/industry-presets-mock"

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

type MajorRow = {
  id: number
  code: string
  name: string
}

type CategoryRow = {
  id: number
  majorCategoryId: number
  name: string
}

type CategoryDisplayRow = CategoryRow & {
  majorCode: string
  majorName: string
}

const seed = buildIndustryPresetsFromMock()
const majorRows = ref<MajorRow[]>([...seed.majors])
const categoryRows = ref<CategoryRow[]>([...seed.categories])
const nextMajorId = ref(seed.nextMajorId)
const nextCategoryId = ref(seed.nextCategoryId)

const searchExpanded = ref(false)
const localSearchQuery = ref("")

const createMajorOpen = ref(false)
const editMajorOpen = ref(false)
const deleteMajorOpen = ref(false)
const createCategoryOpen = ref(false)
const editCategoryOpen = ref(false)
const deleteCategoryOpen = ref(false)

const majorForm = ref({ code: "", name: "" })
const editingMajorId = ref<number | null>(null)
const deletingMajorId = ref<number | null>(null)

const categoryForm = ref({ majorCategoryId: "" as string, name: "" })
const editingCategoryId = ref<number | null>(null)
const deletingCategoryId = ref<number | null>(null)

/** 从分类弹窗跳转添加大类时，关闭大类弹窗后恢复分类弹窗 */
const resumeCategoryDialog = ref<null | "create" | "edit">(null)

const majorById = computed(() => new Map(majorRows.value.map(m => [m.id, m])))

function compareMajorByCode(a: MajorRow, b: MajorRow) {
  return a.code.localeCompare(b.code, undefined, { numeric: true })
}

const majorsOrdered = computed(() => [...majorRows.value].sort(compareMajorByCode))

const majorColumns: TableColumn[] = [
  {
    key: "name",
    label: "行业大类",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-major-actions",
    cellClass: "text-right",
  },
]

const categoryColumns: TableColumn[] = [
  {
    key: "name",
    label: "行业名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
  {
    key: "majorName",
    label: "归属行业大类",
    filterType: "text",
    tone: "default",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-category-actions",
    cellClass: "text-right",
  },
]

const effectiveSearchQuery = computed(() => props.searchQuery ?? localSearchQuery.value)

const filteredMajorRows = computed(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()
  const list = majorsOrdered.value
  if (!query) {
    return list
  }
  return list.filter(row =>
    [row.code, row.name].some(f => f.toLowerCase().includes(query)),
  )
})

const orderedCategoryRows = computed(() => {
  const majors = majorById.value
  return [...categoryRows.value].sort((a, b) => {
    const ca = majors.get(a.majorCategoryId)?.code ?? "\uFFFF"
    const cb = majors.get(b.majorCategoryId)?.code ?? "\uFFFF"
    const byCode = ca.localeCompare(cb, undefined, { numeric: true })
    if (byCode !== 0) {
      return byCode
    }
    return a.name.localeCompare(b.name, "zh-CN")
  })
})

const categoryDisplayRows = computed<CategoryDisplayRow[]>(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()
  const base = orderedCategoryRows.value.map((row) => {
    const major = majorById.value.get(row.majorCategoryId)
    return {
      ...row,
      majorCode: major?.code ?? "—",
      majorName: major?.name ?? "—",
    }
  })
  if (!query) {
    return base
  }
  return base.filter(row =>
    [row.majorCode, row.majorName, row.name].some(f => f.toLowerCase().includes(query)),
  )
})

const majorEmptyState = computed<TablePageEmptyState>(() => {
  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的行业大类",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }
  return {
    title: "暂无行业大类",
    description: "请先添加行业大类，再维护下属行业分类。",
    icon: "ri-folder-line",
  }
})

const categoryEmptyState = computed<TablePageEmptyState>(() => {
  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的行业分类",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }
  return {
    title: "暂无行业分类",
    description: "请选择归属行业大类后添加具体行业名称。",
    icon: "ri-building-2-line",
  }
})

function emitCategoryCount() {
  emit("countChange", categoryRows.value.length)
}

onMounted(() => {
  emitCategoryCount()
})

watch(createMajorOpen, (open) => {
  if (open) {
    return
  }
  const mode = resumeCategoryDialog.value
  if (!mode) {
    return
  }
  resumeCategoryDialog.value = null
  void nextTick(() => {
    if (mode === "create") {
      createCategoryOpen.value = true
    } else if (mode === "edit") {
      editCategoryOpen.value = true
    }
  })
})

function toggleSearch() {
  if (searchExpanded.value && localSearchQuery.value) {
    localSearchQuery.value = ""
    return
  }
  searchExpanded.value = !searchExpanded.value
}

function openCreateMajorDialog() {
  editingMajorId.value = null
  majorForm.value = {
    code: "",
    name: "",
  }
  createMajorOpen.value = true
}

function openCreateMajorBesideCategoryForm() {
  if (createCategoryOpen.value) {
    resumeCategoryDialog.value = "create"
    createCategoryOpen.value = false
  } else if (editCategoryOpen.value) {
    resumeCategoryDialog.value = "edit"
    editCategoryOpen.value = false
  }
  openCreateMajorDialog()
}

function openEditMajor(row: MajorRow) {
  editingMajorId.value = row.id
  majorForm.value = {
    code: row.code,
    name: row.name,
  }
  editMajorOpen.value = true
}

function submitMajorCreate() {
  const code = majorForm.value.code.trim()
  const name = majorForm.value.name.trim()
  if (!code || !name) {
    toast.error("请填写大类代码与行业大类名称")
    return
  }
  if (majorRows.value.some(m => m.code === code)) {
    toast.error("大类代码已存在")
    return
  }
  const id = nextMajorId.value++
  majorRows.value = [...majorRows.value, {
    id,
    code,
    name,
  }]
  if (resumeCategoryDialog.value) {
    categoryForm.value.majorCategoryId = String(id)
  }
  createMajorOpen.value = false
  toast.success("已添加行业大类")
}

function submitMajorEdit() {
  if (editingMajorId.value === null) {
    return
  }
  const name = majorForm.value.name.trim()
  if (!name) {
    toast.error("请填写行业大类名称")
    return
  }
  const id = editingMajorId.value
  majorRows.value = majorRows.value.map((m) => {
    if (m.id !== id) {
      return m
    }
    return {
      ...m,
      name,
    }
  })
  editMajorOpen.value = false
  toast.success("已保存行业大类")
}

function promptDeleteMajor(row: MajorRow) {
  const children = categoryRows.value.filter(c => c.majorCategoryId === row.id).length
  if (children > 0) {
    toast.error(`该大类下仍有 ${children} 条行业分类，请先删除或迁移后再删除大类。`)
    return
  }
  deletingMajorId.value = row.id
  deleteMajorOpen.value = true
}

function confirmDeleteMajor() {
  const id = deletingMajorId.value
  if (id === null) {
    return
  }
  majorRows.value = majorRows.value.filter(m => m.id !== id)
  deleteMajorOpen.value = false
  deletingMajorId.value = null
  toast.success("已删除行业大类")
}

function openCreateCategoryDialog() {
  editingCategoryId.value = null
  const first = majorRows.value[0]?.id
  categoryForm.value = {
    majorCategoryId: first !== undefined ? String(first) : "",
    name: "",
  }
  createCategoryOpen.value = true
}

function openEditCategory(row: CategoryRow) {
  editingCategoryId.value = row.id
  categoryForm.value = {
    majorCategoryId: String(row.majorCategoryId),
    name: row.name,
  }
  editCategoryOpen.value = true
}

function submitCategoryCreate() {
  const majorId = Number(categoryForm.value.majorCategoryId)
  const name = categoryForm.value.name.trim()
  if (!majorId || !name) {
    toast.error("请选择归属行业大类并填写行业名称")
    return
  }
  if (!majorById.value.has(majorId)) {
    toast.error("归属行业大类无效")
    return
  }
  const id = nextCategoryId.value++
  categoryRows.value = [...categoryRows.value, {
    id,
    majorCategoryId: majorId,
    name,
  }]
  createCategoryOpen.value = false
  emitCategoryCount()
  toast.success("已添加行业分类")
}

function submitCategoryEdit() {
  if (editingCategoryId.value === null) {
    return
  }
  const majorId = Number(categoryForm.value.majorCategoryId)
  const name = categoryForm.value.name.trim()
  if (!majorId || !name) {
    toast.error("请选择归属行业大类并填写行业名称")
    return
  }
  if (!majorById.value.has(majorId)) {
    toast.error("归属行业大类无效")
    return
  }
  const id = editingCategoryId.value
  categoryRows.value = categoryRows.value.map((c) => {
    if (c.id !== id) {
      return c
    }
    return {
      ...c,
      majorCategoryId: majorId,
      name,
    }
  })
  editCategoryOpen.value = false
  toast.success("已保存行业分类")
}

function promptDeleteCategory(row: CategoryRow) {
  deletingCategoryId.value = row.id
  deleteCategoryOpen.value = true
}

function confirmDeleteCategory() {
  const id = deletingCategoryId.value
  if (id === null) {
    return
  }
  categoryRows.value = categoryRows.value.filter(c => c.id !== id)
  deleteCategoryOpen.value = false
  deletingCategoryId.value = null
  emitCategoryCount()
  toast.success("已删除行业分类")
}

function asMajorRow(raw: Record<string, unknown>) {
  return raw as MajorRow
}

function asCategoryRow(raw: Record<string, unknown>) {
  return raw as CategoryDisplayRow
}

async function refreshData() {
  toast.success("列表已刷新", { description: "当前为本地模拟数据。" })
}

defineExpose({
  openCreateDialog: openCreateCategoryDialog,
  openCreateMajorDialog,
  openCreateCategoryDialog,
  refreshData,
})
</script>

<template>
  <section class="space-y-8">
    <SettingsToolbarRow v-if="!props.hideToolbar">
      <div class="flex flex-nowrap items-center justify-end gap-2">
        <SettingsToolbarSearchInput
          v-model="localSearchQuery"
          :expanded="searchExpanded"
          placeholder="搜索行业大类、行业名称或国标代码"
          @toggle="toggleSearch"
        />

        <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 rounded-md px-3"
            @click="refreshData"
          >
            <i class="ri-refresh-line text-sm" />
            <span>刷新列表</span>
          </Button>
        </SettingsToolbarRefreshSlot>

        <Button
          v-if="!props.hideCreateButton"
          class="h-8 gap-1 rounded-md px-3 text-[14px]"
          @click="openCreateCategoryDialog"
        >
          <i class="ri-add-line text-base" />
          <span>添加行业分类</span>
        </Button>
      </div>
    </SettingsToolbarRow>

    <Alert class="border-border/60 bg-muted/25">
      <i class="ri-information-line text-base text-muted-foreground" />
      <AlertTitle>说明</AlertTitle>
      <AlertDescription>
        行业大类仅用于分组与统计，不会在客户等表单中作为选项；建档时请从下方「行业名称」中选择具体行业。
      </AlertDescription>
    </Alert>

    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-foreground">
        行业大类
      </h3>
      <TablePageTable
        row-key="id"
        sticky-header
        :end-spacer="false"
        :columns="majorColumns"
        :rows="filteredMajorRows"
        :table-class="SETTINGS_TABLE_PAGE_CLASS"
        :empty-state="majorEmptyState"
      >
        <template #cell-major-actions="{ row: rawRow }">
          <div class="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
              @click="openEditMajor(asMajorRow(rawRow))"
            >
              <i class="ri-edit-line text-base" />
              <span>编辑</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
              @click="promptDeleteMajor(asMajorRow(rawRow))"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除</span>
            </Button>
          </div>
        </template>
      </TablePageTable>
    </div>

    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-foreground">
        行业分类
      </h3>
      <TablePageTable
        row-key="id"
        sticky-header
        :end-spacer="false"
        :columns="categoryColumns"
        :rows="categoryDisplayRows"
        :table-class="SETTINGS_TABLE_PAGE_CLASS"
        :empty-state="categoryEmptyState"
      >
        <template #cell-category-actions="{ row: rawRow }">
          <div class="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
              @click="openEditCategory(asCategoryRow(rawRow))"
            >
              <i class="ri-edit-line text-base" />
              <span>编辑</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
              @click="promptDeleteCategory(asCategoryRow(rawRow))"
            >
              <i class="ri-delete-bin-line text-base" />
              <span>删除</span>
            </Button>
          </div>
        </template>
      </TablePageTable>
    </div>

    <Dialog :open="createMajorOpen" @update:open="createMajorOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加行业大类</DialogTitle>
          <DialogDescription>
            对应国标中的「大类」层级，用于归组下属行业名称；客户侧不可直接选择大类。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-major-code">大类代码</label>
            <Input
              id="create-major-code"
              v-model="majorForm.code"
              placeholder="例如：01"
              class="font-mono"
            />
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-major-name">行业大类名称</label>
            <Input
              id="create-major-name"
              v-model="majorForm.name"
              placeholder="例如：农业"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" @click="createMajorOpen = false">
            取消
          </Button>
          <Button type="button" @click="submitMajorCreate">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="editMajorOpen" @update:open="editMajorOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑行业大类</DialogTitle>
          <DialogDescription>
            大类代码创建后不可修改，避免与已有行业分类引用不一致。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-major-code">大类代码</label>
            <Input
              id="edit-major-code"
              :model-value="majorForm.code"
              disabled
              class="font-mono"
            />
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-major-name">行业大类名称</label>
            <Input
              id="edit-major-name"
              v-model="majorForm.name"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" @click="editMajorOpen = false">
            取消
          </Button>
          <Button type="button" @click="submitMajorEdit">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteMajorOpen" @update:open="deleteMajorOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除该行业大类？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后不可恢复。请确认其下已无任何行业分类。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteMajor">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="createCategoryOpen" @update:open="createCategoryOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加行业分类</DialogTitle>
          <DialogDescription>
            选择归属行业大类后填写具体行业名称；客户建档时仅选择此处维护的名称。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <span class="text-sm font-medium text-foreground">归属行业大类</span>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div class="min-w-0 flex-1">
                <Select v-model="categoryForm.majorCategoryId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择行业大类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="m in majorsOrdered"
                      :key="m.id"
                      :value="String(m.id)"
                    >
                      {{ m.code }} {{ m.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-9 shrink-0 gap-1 px-3 sm:self-auto"
                @click="openCreateMajorBesideCategoryForm"
              >
                <i class="ri-folder-add-line text-base" />
                <span>添加行业大类</span>
              </Button>
            </div>
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="create-cat-name">行业名称</label>
            <Input
              id="create-cat-name"
              v-model="categoryForm.name"
              placeholder="例如：谷物种植"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" @click="createCategoryOpen = false">
            取消
          </Button>
          <Button type="button" @click="submitCategoryCreate">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="editCategoryOpen" @update:open="editCategoryOpen = $event">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑行业分类</DialogTitle>
          <DialogDescription>
            可调整归属行业大类或行业名称。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent>
          <div class="grid gap-2">
            <span class="text-sm font-medium text-foreground">归属行业大类</span>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div class="min-w-0 flex-1">
                <Select v-model="categoryForm.majorCategoryId">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择行业大类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="m in majorsOrdered"
                      :key="m.id"
                      :value="String(m.id)"
                    >
                      {{ m.code }} {{ m.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-9 shrink-0 gap-1 px-3 sm:self-auto"
                @click="openCreateMajorBesideCategoryForm"
              >
                <i class="ri-folder-add-line text-base" />
                <span>添加行业大类</span>
              </Button>
            </div>
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="edit-cat-name">行业名称</label>
            <Input
              id="edit-cat-name"
              v-model="categoryForm.name"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" @click="editCategoryOpen = false">
            取消
          </Button>
          <Button type="button" @click="submitCategoryEdit">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteCategoryOpen" @update:open="deleteCategoryOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除该行业分类？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后不可恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteCategory">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
