<script setup lang="ts">
import { computed, ref } from "vue"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsInspectionCategoriesTable from "@/components/settings/SettingsInspectionCategoriesTable.vue"
import SettingsInspectionItemsTable from "@/components/settings/SettingsInspectionItemsTable.vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type InspectionHubTabKey = "items" | "categories" | "templates"

type ExposedActions = {
  openCreateDialog: () => void
  refreshData: () => void | Promise<void>
}

const activeTab = ref<InspectionHubTabKey>("items")
const itemsCount = ref(0)
const categoriesCount = ref(0)
const searchExpanded = ref(false)
const searchQueries = ref<Record<InspectionHubTabKey, string>>({
  items: "",
  categories: "",
  templates: "",
})
const itemsTableRef = ref<ExposedActions | null>(null)
const categoriesTableRef = ref<ExposedActions | null>(null)

const tabs = computed(() => [
  { id: "items", label: "检测项", badge: itemsCount.value },
  { id: "categories", label: "分类", badge: categoriesCount.value },
  { id: "templates", label: "模板", badge: 0 },
])

const toolbarIconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"

const currentSearchQuery = computed({
  get: () => searchQueries.value[activeTab.value],
  set: (value: string) => {
    searchQueries.value[activeTab.value] = value
  },
})

const currentSearchPlaceholder = computed(() => {
  if (activeTab.value === "items") {
    return "搜索检测项、分类、内容"
  }

  if (activeTab.value === "categories") {
    return "搜索分类名称、ID 或 Uuid"
  }

  return "搜索模板"
})

const actionLabel = computed(() => {
  if (activeTab.value === "items") {
    return "添加检测项"
  }

  if (activeTab.value === "categories") {
    return "添加分类"
  }

  return ""
})

const showPrimaryAction = computed(() => activeTab.value !== "templates")
const refreshDisabled = computed(() => activeTab.value === "templates")

function toggleSearch() {
  if (searchExpanded.value && currentSearchQuery.value) {
    currentSearchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function triggerPrimaryAction() {
  if (activeTab.value === "items") {
    itemsTableRef.value?.openCreateDialog()
    return
  }

  if (activeTab.value === "categories") {
    categoriesTableRef.value?.openCreateDialog()
  }
}

async function refreshCurrentTab() {
  if (activeTab.value === "items") {
    await itemsTableRef.value?.refreshData()
    return
  }

  if (activeTab.value === "categories") {
    await categoriesTableRef.value?.refreshData()
  }
}
</script>

<template>
  <section class="space-y-5">
    <div class="overflow-x-auto">
      <div class="flex min-w-max items-center justify-between gap-3">
        <TopTabSwitch
          :tabs="tabs"
          :model-value="activeTab"
          :collapse-inactive="false"
          tone="default"
          aria-label="检测项页签切换"
          @update:model-value="activeTab = $event as InspectionHubTabKey"
        />

        <div
          class="flex shrink-0 items-center justify-end gap-2"
        >
          <div
            :class="
              cn(
                'flex h-8 items-center overflow-hidden rounded-full border border-input bg-background transition-[width,padding] duration-200 ease-out',
                searchExpanded ? 'w-[220px] px-1.5' : 'w-8 justify-center border-transparent px-0',
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
              v-model="currentSearchQuery"
              :placeholder="currentSearchPlaceholder"
              class="h-8 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="h-8 rounded-md px-3"
            :disabled="refreshDisabled"
            @click="refreshCurrentTab"
          >
            <i class="ri-refresh-line text-sm" />
            <span>刷新列表</span>
          </Button>

          <Button v-if="showPrimaryAction" class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="triggerPrimaryAction">
            <i class="ri-add-line text-base" />
            <span>{{ actionLabel }}</span>
          </Button>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'items'">
      <SettingsInspectionItemsTable
        ref="itemsTableRef"
        :hide-toolbar="true"
        :search-query="searchQueries.items"
        @count-change="itemsCount = $event"
      />
    </div>

    <div v-show="activeTab === 'categories'">
      <SettingsInspectionCategoriesTable
        ref="categoriesTableRef"
        :hide-toolbar="true"
        :search-query="searchQueries.categories"
        @count-change="categoriesCount = $event"
      />
    </div>

    <section
      v-show="activeTab === 'templates'"
      class="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center"
    >
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
        <i class="ri-layout-grid-line text-[20px]" />
      </div>
      <h3 class="mt-4 text-base font-semibold text-foreground">
        检测项模板
      </h3>
      <p class="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        模板功能入口已预留，后续接入接口后可在这里统一维护模板内容。
      </p>
    </section>
  </section>
</template>
