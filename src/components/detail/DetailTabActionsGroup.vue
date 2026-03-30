<script setup lang="ts">
import { computed, useSlots } from "vue"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
const visibleMobileItems = computed(() => props.mobileItems.filter(item => !item.hidden))
</script>

<template>
  <template v-if="hasLeading || hasTrailing || visibleMobileItems.length">
    <DropdownMenu v-if="visibleMobileItems.length">
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm" class="h-9 gap-1 px-3 text-[14px] sm:hidden">
          <i class="ri-more-2-line text-base" />
          {{ props.mobileMenuLabel }}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5 sm:hidden">
        <DropdownMenuItem
          v-for="item in visibleMobileItems"
          :key="item.key"
          :disabled="item.disabled"
          class="rounded-lg px-2.5 py-2"
          @select="emit('select', item.key)"
        >
          <i
            v-if="item.iconClass"
            :class="[item.iconClass, 'mr-2 text-base', item.destructive ? 'text-destructive' : 'text-muted-foreground']"
          />
          <span :class="item.destructive ? 'text-destructive' : ''">{{ item.label }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

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
