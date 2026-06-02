<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { DrawerClose, DrawerFooter } from "@/components/ui/drawer"
import { useSidebar } from "@/components/ui/sidebar"
import AppSidebarCalendarEventGroups from "@/components/layout/app-sidebar/AppSidebarCalendarEventGroups.vue"
import type { CalendarEventGroup } from "@/composables/useCalendarEvents"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

defineProps<{
  title: string
  subtitle: string
  swatchClass: string
  loading: boolean
  groups: CalendarEventGroup[]
}>()

const emit = defineEmits<{
  close: []
  add: []
  "select-event": [event: AppSidebarCalendarItem]
}>()

const { isMobile } = useSidebar()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 pr-2">
      <span
        class="size-3 shrink-0 rounded-[3px]"
        :class="swatchClass"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-1 flex-row items-center gap-2">
        <p class="min-w-0 truncate text-sm font-semibold text-foreground">{{ title }}</p>
        <p class="shrink-0 text-xs text-muted-foreground">{{ subtitle }}</p>
      </div>
      <template v-if="!isMobile">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="right-sheet-icon-button shrink-0"
          aria-label="添加"
          @click="emit('add')"
        >
          <i class="ri-add-line text-base leading-none" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="right-sheet-icon-button shrink-0"
          aria-label="关闭"
          @click="emit('close')"
        >
          <i class="ri-close-line text-base leading-none" />
        </Button>
      </template>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
      <AppSidebarCalendarEventGroups
        :loading="loading"
        :groups="groups"
        @select-event="emit('select-event', $event)"
      />
    </div>

    <!-- 与 shadcn-vue Drawer 文档 demo 一致：纵向、主按钮在上、DrawerClose + outline 在下 -->
    <DrawerFooter v-if="isMobile" class="mt-0 shrink-0">
      <Button type="button" @click="emit('add')">
        添加
      </Button>
      <DrawerClose as-child>
        <Button type="button" variant="outline">
          关闭
        </Button>
      </DrawerClose>
    </DrawerFooter>
  </div>
</template>
