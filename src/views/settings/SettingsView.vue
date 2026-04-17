<script setup lang="ts">
import { computed, watch } from "vue"
import { useRoute } from "vue-router"

import SettingsContent from "@/components/settings/SettingsContent.vue"
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <SettingsContent
      :category="activeCategory"
      :state="state"
      @action="runAction"
    />
  </div>
</template>
