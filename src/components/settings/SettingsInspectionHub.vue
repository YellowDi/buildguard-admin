<script setup lang="ts">
import { computed, ref } from "vue"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsInspectionCategoriesTable from "@/components/settings/SettingsInspectionCategoriesTable.vue"
import SettingsInspectionItemsTable from "@/components/settings/SettingsInspectionItemsTable.vue"
import SettingsInspectionTemplatesTable from "@/components/settings/SettingsInspectionTemplatesTable.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Button } from "@/components/ui/button"

type InspectionHubTabKey = "items" | "categories" | "templates"

type ExposedActions = {
  openCreateDialog: () => void
  refreshData: () => void | Promise<void>
}

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

const activeTab = ref<InspectionHubTabKey>("items")
const itemsCount = ref(0)
const categoriesCount = ref(0)
const templatesCount = ref(0)
const searchExpanded = ref(false)
const searchQueries = ref<Record<InspectionHubTabKey, string>>({
  items: "",
  categories: "",
  templates: "",
})
const itemsTableRef = ref<ExposedActions | null>(null)
const categoriesTableRef = ref<ExposedActions | null>(null)
const templatesTableRef = ref<ExposedActions | null>(null)

const tabs = computed(() => [
  { id: "items", label: "检测项", badge: itemsCount.value },
  { id: "categories", label: "分类", badge: categoriesCount.value },
  { id: "templates", label: "模板", badge: templatesCount.value },
])

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

  return "搜索模板名称、UUID、检测项"
})

const actionLabel = computed(() => {
  if (activeTab.value === "items") {
    return "添加检测项"
  }

  if (activeTab.value === "categories") {
    return "添加分类"
  }

  return "添加模板"
})

const showPrimaryAction = computed(() => true)
const refreshDisabled = computed(() => false)

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
    return
  }

  templatesTableRef.value?.openCreateDialog()
}

async function refreshCurrentTab() {
  if (activeTab.value === "items") {
    await itemsTableRef.value?.refreshData()
    return
  }

  if (activeTab.value === "categories") {
    await categoriesTableRef.value?.refreshData()
    return
  }

  await templatesTableRef.value?.refreshData()
}
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
          <TopTabSwitch
            :tabs="tabs"
            :model-value="activeTab"
            :collapse-inactive="false"
            tone="default"
            aria-label="检测项页签切换"
            @update:model-value="activeTab = $event as InspectionHubTabKey"
          />
        </template>

        <div class="flex flex-nowrap items-center justify-end gap-2">
          <SettingsToolbarSearchInput
            v-model="currentSearchQuery"
            :expanded="searchExpanded"
            :placeholder="currentSearchPlaceholder"
            @toggle="toggleSearch"
          />

          <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
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
          </SettingsToolbarRefreshSlot>

          <Button v-if="showPrimaryAction" class="h-8 gap-1 rounded-md px-3 text-[14px]" @click="triggerPrimaryAction">
            <i class="ri-add-line text-base" />
            <span>{{ actionLabel }}</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </template>

    <section class="space-y-5">
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

    <div v-show="activeTab === 'templates'">
      <SettingsInspectionTemplatesTable
        ref="templatesTableRef"
        :hide-toolbar="true"
        :search-query="searchQueries.templates"
        @count-change="templatesCount = $event"
      />
    </div>
    </section>
  </SettingsRightPanelLayout>
</template>
