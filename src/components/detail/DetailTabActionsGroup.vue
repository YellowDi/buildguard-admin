<script setup lang="ts">
import { computed, useSlots } from "vue"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DetailTabActionMenuItem = {
  key: string
  label: string
  iconClass?: string
  destructive?: boolean
  disabled?: boolean
  hidden?: boolean
}

const props = withDefaults(defineProps<{
  class?: string
  leadingClass?: string
  trailingClass?: string
  mobileMenuLabel?: string
  mobileItems?: DetailTabActionMenuItem[]
}>(), {
  class: "",
  leadingClass: "",
  trailingClass: "",
  mobileMenuLabel: "操作",
  mobileItems: () => [],
})

const emit = defineEmits<{
  select: [key: string]
}>()

const slots = useSlots()
const hasLeading = computed(() => Boolean(slots.leading))
const hasTrailing = computed(() => Boolean(slots.trailing))
const visibleMobileItems = computed(() => props.mobileItems.filter(item => !item.hidden && item.key !== "export"))
const quickMobileItems = computed(() => visibleMobileItems.value.filter(item => item.key === "toggle-filters" || item.key === "toggle-sort"))
const actionMobileItems = computed(() => visibleMobileItems.value.filter(item => item.key !== "toggle-filters" && item.key !== "toggle-sort"))

function isMobileItemActive(item: DetailTabActionMenuItem) {
  return item.label.startsWith("隐藏") || item.label.startsWith("关闭")
}
</script>

<template>
  <template v-if="hasLeading || hasTrailing || visibleMobileItems.length">
    <div v-if="visibleMobileItems.length" class="flex items-center justify-end gap-1 sm:hidden">
      <button
        v-for="item in quickMobileItems"
        :key="item.key"
        type="button"
        :aria-label="item.label"
        :disabled="item.disabled"
        :class="[
          'inline-flex size-9 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground active:bg-surface-secondary disabled:pointer-events-none disabled:opacity-50',
          item.destructive ? 'text-destructive hover:text-destructive' : '',
          isMobileItemActive(item) ? 'text-link' : '',
        ]"
        @click="emit('select', item.key)"
      >
        <i v-if="item.iconClass" :class="[item.iconClass, 'text-[17px]']" />
      </button>

      <Button
        v-for="item in actionMobileItems"
        :key="item.key"
        :variant="item.destructive ? 'outline' : 'default'"
        class="h-9 gap-1 px-3 text-[14px]"
        :class="item.destructive ? 'border-destructive/30 bg-background text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive' : ''"
        :disabled="item.disabled"
        :aria-label="item.label"
        @click="emit('select', item.key)"
      >
        <i v-if="item.iconClass" :class="[item.iconClass, 'text-base']" />
        {{ item.label }}
      </Button>
    </div>

    <div
      v-if="hasLeading || hasTrailing"
      :class="cn('hidden min-w-0 items-center justify-end gap-2 whitespace-nowrap sm:flex', props.class)"
    >
      <div
        v-if="hasLeading"
        :class="cn('flex min-w-0 items-center justify-end gap-2 whitespace-nowrap', props.leadingClass)"
      >
        <slot name="leading" />
      </div>

      <div
        v-if="hasTrailing"
        :class="cn('flex min-w-0 items-center justify-end gap-2 whitespace-nowrap', props.trailingClass)"
      >
        <slot name="trailing" />
      </div>
    </div>
  </template>
</template>
