<script setup lang="ts">
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import { TooltipWrap } from "@/components/ui/tooltip"
import sidebarLogoDarkUrl from "@/assets/Logo-Apptext-dark.png"
import sidebarLogoLightUrl from "@/assets/Logo-Apptext.png"

type TopBarTab = {
  id: string
  label: string
  icon: string
  badge?: string | number
}

const props = defineProps<{
  tabs: TopBarTab[]
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  search: []
}>()
</script>

<template>
  <div class="p-2">
    <RouterLink
      to="/"
      class="inline-flex items-center px-2 py-1.5"
      aria-label="返回首页"
    >
      <img
        :src="sidebarLogoLightUrl"
        alt="宝京云维"
        class="h-8 w-auto max-w-[148px] shrink-0 object-contain object-left dark:hidden"
      >
      <img
        :src="sidebarLogoDarkUrl"
        alt="宝京云维"
        class="hidden h-8 w-auto max-w-[148px] shrink-0 object-contain object-left dark:block"
      >
    </RouterLink>
  </div>

  <div class="p-2">
    <div class="flex items-center gap-1">
      <TopTabSwitch
        :tabs="props.tabs"
        :model-value="props.modelValue"
        aria-label="侧边栏顶部导航"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <TooltipWrap content="搜索">
        <button
          type="button"
          class="top-tab-switch-icon-button ml-auto flex h-10 w-10 items-center justify-center rounded-full text-sidebar-foreground/52 hover:text-sidebar-accent-foreground"
          aria-label="搜索"
          @click="emit('search')"
        >
          <i class="ri-search-line relative z-10 text-[17px] leading-none" />
        </button>
      </TooltipWrap>
    </div>
  </div>
</template>
