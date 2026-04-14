<script setup lang="ts">
import BrandLogo from "@/components/layout/BrandLogo.vue"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import { TooltipWrap } from "@/components/ui/tooltip"

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
      class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-[background-color,color,box-shadow,transform] duration-180 ease-out hover:bg-interactive-hover hover:text-sidebar-accent-foreground hover:shadow-(--shadow-border) active:scale-[0.98] motion-reduce:active:scale-100"
    >
      <BrandLogo />
      <i class="ri-arrow-down-s-line text-base" />
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
