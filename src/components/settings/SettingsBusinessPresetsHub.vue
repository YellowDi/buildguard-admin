<script setup lang="ts">
import { computed, ref } from "vue"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsIndustryCategoriesTable from "@/components/settings/SettingsIndustryCategoriesTable.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import { Button } from "@/components/ui/button"

type BusinessPresetsHubTabKey = "industry"

type ExposedActions = {
  openCreateDialog: () => void
  openCreateMajorDialog: () => void
  openCreateCategoryDialog: () => void
  refreshData: () => void | Promise<void>
}

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

const activeTab = ref<BusinessPresetsHubTabKey>("industry")
const industryCount = ref(0)
const searchExpanded = ref(false)
const searchQueries = ref<Record<BusinessPresetsHubTabKey, string>>({
  industry: "",
})
const industryTableRef = ref<ExposedActions | null>(null)

const tabs = computed(() => [
  { id: "industry", label: "行业分类", badge: industryCount.value },
])

const currentSearchQuery = computed({
  get: () => searchQueries.value[activeTab.value],
  set: (value: string) => {
    searchQueries.value[activeTab.value] = value
  },
})

const currentSearchPlaceholder = computed(() => "搜索行业大类、行业名称或国标代码")

function toggleSearch() {
  if (searchExpanded.value && currentSearchQuery.value) {
    currentSearchQuery.value = ""
    return
  }

  searchExpanded.value = !searchExpanded.value
}

function triggerAddMajor() {
  industryTableRef.value?.openCreateMajorDialog()
}

function triggerAddCategory() {
  industryTableRef.value?.openCreateCategoryDialog()
}

async function refreshCurrentTab() {
  await industryTableRef.value?.refreshData()
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
            aria-label="业务预设页签切换"
            @update:model-value="activeTab = $event as BusinessPresetsHubTabKey"
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
              @click="refreshCurrentTab"
            >
              <i class="ri-refresh-line text-sm" />
              <span>刷新列表</span>
            </Button>
          </SettingsToolbarRefreshSlot>

          <Button
            variant="outline"
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            @click="triggerAddMajor"
          >
            <i class="ri-folder-add-line text-base" />
            <span>添加行业大类</span>
          </Button>

          <Button
            class="h-8 gap-1 rounded-md px-3 text-[14px]"
            @click="triggerAddCategory"
          >
            <i class="ri-add-line text-base" />
            <span>添加行业分类</span>
          </Button>
        </div>
      </SettingsToolbarRow>
    </template>

    <section class="space-y-5">
      <div v-show="activeTab === 'industry'">
        <SettingsIndustryCategoriesTable
          ref="industryTableRef"
          :hide-toolbar="true"
          :search-query="searchQueries.industry"
          @count-change="industryCount = $event"
        />
      </div>
    </section>
  </SettingsRightPanelLayout>
</template>
