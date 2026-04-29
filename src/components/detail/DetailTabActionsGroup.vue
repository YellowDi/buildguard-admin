<script setup lang="ts">
import { computed, useSlots } from "vue"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toMobileActionLabel } from "@/lib/mobileActionLabel"
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
const primaryMobileActionItem = computed(() => actionMobileItems.value[actionMobileItems.value.length - 1] ?? null)
const overflowMobileActionItems = computed(() => actionMobileItems.value.slice(0, -1))

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
          'inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground active:bg-surface-secondary disabled:pointer-events-none disabled:opacity-50',
          isMobileItemActive(item) ? 'text-link' : '',
        ]"
        @click="emit('select', item.key)"
      >
        <i v-if="item.iconClass" :class="[item.iconClass, 'text-[17px]']" />
      </button>

      <Button
        v-if="primaryMobileActionItem && overflowMobileActionItems.length === 0"
        variant="default"
        size="sm"
        class="h-8 gap-1 px-3 text-[14px]"
        :class="[
          primaryMobileActionItem.destructive ? 'text-destructive hover:text-destructive' : '',
          isMobileItemActive(primaryMobileActionItem) ? 'text-link' : '',
        ]"
        :disabled="primaryMobileActionItem.disabled"
        :aria-label="primaryMobileActionItem.label"
        @click="emit('select', primaryMobileActionItem.key)"
      >
        <i v-if="primaryMobileActionItem.iconClass" :class="[primaryMobileActionItem.iconClass, 'text-base']" />
        {{ toMobileActionLabel(primaryMobileActionItem.label) }}
      </Button>

      <ButtonGroup v-else-if="primaryMobileActionItem" aria-label="移动端其他操作">
        <Button
          variant="default"
          size="sm"
          class="h-8 gap-1 px-3 text-[14px]"
          :class="[
            primaryMobileActionItem.destructive ? 'text-destructive hover:text-destructive' : '',
            isMobileItemActive(primaryMobileActionItem) ? 'text-link' : '',
          ]"
          :disabled="primaryMobileActionItem.disabled"
          :aria-label="primaryMobileActionItem.label"
          @click="emit('select', primaryMobileActionItem.key)"
        >
          <i v-if="primaryMobileActionItem.iconClass" :class="[primaryMobileActionItem.iconClass, 'text-base']" />
          {{ toMobileActionLabel(primaryMobileActionItem.label) }}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="default" size="icon-sm" class="size-8" aria-label="更多操作">
              <i class="ri-arrow-down-s-line text-base" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5">
            <DropdownMenuItem
              v-for="item in overflowMobileActionItems"
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
      </ButtonGroup>
    </div>

    <div
      v-if="hasLeading || hasTrailing"
      :class="cn('hidden min-w-0 items-center justify-end gap-1 whitespace-nowrap sm:flex', props.class)"
    >
      <div
        v-if="hasLeading"
        :class="cn('flex min-w-0 items-center justify-end gap-1 whitespace-nowrap', props.leadingClass)"
      >
        <slot name="leading" />
      </div>

      <div
        v-if="hasTrailing"
        :class="cn('flex min-w-0 items-center justify-end gap-1 whitespace-nowrap', props.trailingClass)"
      >
        <slot name="trailing" />
      </div>
    </div>
  </template>
</template>
