<script setup lang="ts">
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"

const props = defineProps<{
  variant: "with-tabs" | "title-only"
  title: string
  description?: string | null
}>()
</script>

<template>
  <!-- 与 TablePageShell 一致，供 TablePageTable 吸顶偏移（--table-page-sticky-top）继承 -->
  <div class="flex min-h-0 flex-1 flex-col" style="--table-page-sticky-top: -1rem;">
    <div class="shrink-0 px-3 pt-4 pb-3 sm:px-4">
      <template v-if="props.variant === 'with-tabs'">
        <div class="flex flex-col gap-3">
          <SettingsPageHeader
            :title="props.title"
            :description="props.description ?? undefined"
          />
          <slot name="toolbar" />
        </div>
      </template>
      <template v-else>
        <SettingsPageHeader
          :title="props.title"
          :description="props.description ?? undefined"
        />
      </template>
    </div>

    <div
      class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-gutter-stable sm:px-4"
    >
      <slot />
    </div>
  </div>
</template>
