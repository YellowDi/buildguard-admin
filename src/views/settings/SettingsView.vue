<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue"
import { useRoute } from "vue-router"

import SettingsContent from "@/components/settings/SettingsContent.vue"
import { detailBreadcrumbItems, detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import { useSettings } from "@/composables/useSettings"
import { DEFAULT_SETTINGS_CATEGORY_KEY, isSettingsCategoryKey, type SettingsCategoryKey } from "@/components/settings/types"

const route = useRoute()
const {
  activeCategory,
  ensureSettingsLoaded,
  runAction,
  setActiveKey,
  state,
} = useSettings()

const routeCategoryKey = computed<SettingsCategoryKey>(() => {
  const category = route.params.category
  return typeof category === "string" && isSettingsCategoryKey(category)
    ? category
    : DEFAULT_SETTINGS_CATEGORY_KEY
})

watch(routeCategoryKey, (value) => {
  setActiveKey(value)
  void ensureSettingsLoaded()
}, { immediate: true })

watch(activeCategory, (category) => {
  const currentLabel = category.pageTitle ?? category.label

  detailBreadcrumbItems.value = [
    {
      title: "设置",
      to: { name: "settings", params: { category: DEFAULT_SETTINGS_CATEGORY_KEY } },
    },
    {
      title: currentLabel,
    },
  ]
  detailBreadcrumbTitle.value = null
}, { immediate: true })

onBeforeUnmount(() => {
  detailBreadcrumbItems.value = null
  detailBreadcrumbTitle.value = null
})
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background -mx-4">
    <SettingsContent
      :category="activeCategory"
      :state="state"
      @action="runAction"
    />
  </div>
</template>
