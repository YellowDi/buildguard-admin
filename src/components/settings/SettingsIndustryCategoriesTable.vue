<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { toast } from "vue-sonner"

import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Button } from "@/components/ui/button"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn, TablePageEmptyState } from "@/components/table-page/types"

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

type IndustryCategoryRow = {
  id: number
  sortOrder: number
  name: string
}

const rows = ref<IndustryCategoryRow[]>([])
const searchExpanded = ref(false)
const localSearchQuery = ref("")

const columns: TableColumn[] = [
  {
    key: "sortOrder",
    label: "排序",
    filterType: "number",
    tone: "muted",
  },
  {
    key: "name",
    label: "行业名称",
    filterType: "text",
    emphasis: "strong",
    tone: "primary",
    cellClass: "font-medium text-foreground",
  },
]

const effectiveSearchQuery = computed(() => props.searchQuery ?? localSearchQuery.value)

const filteredRows = computed(() => {
  const query = effectiveSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row =>
    [String(row.sortOrder), row.name].some(field => field.toLowerCase().includes(query)),
  )
})

const tableEmptyState = computed<TablePageEmptyState>(() => {
  if (effectiveSearchQuery.value.trim()) {
    return {
      title: "没有匹配的行业",
      description: "换个关键词试试。",
      icon: "ri-search-line",
    }
  }

  return {
    title: "暂无行业分类",
    description: "行业分类接口尚未接入，接入后将在此展示并支持维护。",
    icon: "ri-building-2-line",
  }
})

onMounted(() => {
  emit("countChange", rows.value.length)
})

function toggleSearch() {
  if (searchExpanded.value && localSearchQuery.value) {
    localSearchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function openCreateDialog() {
  toast.info("行业分类接口尚未接入", {
    description: "接口就绪后即可在此添加与管理行业。",
  })
}

async function refreshData() {
  emit("countChange", rows.value.length)
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
          v-model="localSearchQuery"
          :expanded="searchExpanded"
          placeholder="搜索排序或行业名称"
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
          @click="openCreateDialog"
        >
          <i class="ri-add-line text-base" />
          <span>添加行业</span>
        </Button>
      </div>
    </SettingsToolbarRow>

    <TablePageTable
      row-key="id"
      sticky-header
      :end-spacer="false"
      :columns="columns"
      :rows="filteredRows"
      :table-class="SETTINGS_TABLE_PAGE_CLASS"
      :empty-state="tableEmptyState"
    />
  </section>
</template>
