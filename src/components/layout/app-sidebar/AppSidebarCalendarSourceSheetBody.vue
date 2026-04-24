<script setup lang="ts">
import { Plus, X } from "lucide-vue-next"
import { Button } from "@/components/ui/button"
import { DrawerClose, DrawerFooter } from "@/components/ui/drawer"
import { useSidebar } from "@/components/ui/sidebar"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

defineProps<{
  title: string
  subtitle: string
  swatchClass: string
  loading: boolean
  groups: Array<{ sectionLabel: string, events: AppSidebarCalendarItem[] }>
}>()

const emit = defineEmits<{
  close: []
  add: []
  "select-event": [event: AppSidebarCalendarItem]
}>()

const { isMobile } = useSidebar()

const barAccentClass: Record<AppSidebarCalendarItem["type"], string> = {
  "work-order": "bg-orange-500 dark:bg-orange-400",
  "inspection-plan": "bg-blue-500 dark:bg-blue-400",
  "inspection-service": "bg-emerald-500 dark:bg-emerald-400",
}

function getEventTitleText(event: AppSidebarCalendarItem) {
  const parts = event.title.split(/[:：]\s*/, 2)
  return parts[1]?.trim() || event.title
}
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
          <Plus class="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="right-sheet-icon-button shrink-0"
          aria-label="关闭"
          @click="emit('close')"
        >
          <X class="size-4" />
        </Button>
      </template>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
    <template v-if="loading">
      <p class="py-8 text-center text-sm text-muted-foreground">加载中...</p>
    </template>
    <template v-else-if="groups.length === 0">
      <p class="py-8 text-center text-sm text-muted-foreground">暂无条目</p>
    </template>
    <template v-else>
      <section
        v-for="(block, idx) in groups"
        :key="`${block.sectionLabel}-${idx}`"
        class="mb-5 last:mb-0"
      >
        <div class="mb-2 flex items-center gap-2 py-1">
          <h3 class="text-xs font-medium text-muted-foreground">{{ block.sectionLabel }}</h3>
          <span
            class="tabular-nums rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >{{ block.events.length }}</span>
        </div>
        <ul class="flex flex-col gap-2" role="list">
          <li
            v-for="event in block.events"
            :key="`${event.type}-${event.uuid}-${event.dateKey}`"
            class="cursor-pointer rounded-md bg-background p-[4px] transition-colors hover:bg-muted dark:bg-background dark:hover:bg-muted/50"
            @click="emit('select-event', event)"
          >
            <div class="flex items-center gap-3">
              <span
                class="h-[46px] w-[4px] shrink-0 rounded-full"
                :class="barAccentClass[event.type]"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-snug text-foreground">
                  {{ getEventTitleText(event) }}
                </p>
                <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                  <span v-if="event.time">{{ event.time }}</span>
                  <span v-if="event.time && event.meta" class="mx-1">·</span>
                  <span v-if="event.meta">{{ event.meta }}</span>
                </p>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
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
