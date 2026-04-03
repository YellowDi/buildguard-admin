<script setup lang="ts">
import { ChevronRight, MoreHorizontal } from "lucide-vue-next"
import { computed } from "vue"
import { onKeyStroke } from "@vueuse/core"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { SIDEBAR_WIDTH } from "@/components/ui/sidebar/utils"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

const props = defineProps<{
  open: boolean
  sourceType: AppSidebarCalendarItem["type"] | null
  title: string
  subtitle: string
  loading: boolean
  groups: Array<{ sectionLabel: string, events: AppSidebarCalendarItem[] }>
  swatchClass: string
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
  "select-event": [event: AppSidebarCalendarItem]
}>()

const { open: sidebarOpen, isMobile } = useSidebar()

/**
 * Teleport 在 body 上，无法继承 SidebarProvider 的 --sidebar-width，必须用与侧栏一致的定宽，
 * 否则 left 不生效，面板会叠在主内容区而非紧贴侧栏右侧。
 */
const panelFrameStyle = computed(() => {
  if (isMobile.value) {
    return {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      width: "100%",
    }
  }
  const docked = sidebarOpen.value
  return {
    top: "0",
    bottom: "0",
    left: docked ? SIDEBAR_WIDTH : "0",
    width: docked
      ? `min(22rem, calc(100vw - ${SIDEBAR_WIDTH}))`
      : `min(22rem, 100vw)`,
  }
})

function close() {
  emit("update:open", false)
}

onKeyStroke("Escape", (e) => {
  if (props.open) {
    e.preventDefault()
    close()
  }
})

const barBorderClass: Record<AppSidebarCalendarItem["type"], string> = {
  "work-order": "border-l-[3px] border-orange-500",
  "inspection-plan": "border-l-[3px] border-blue-500",
  "inspection-service": "border-l-[3px] border-emerald-500",
}

function onSelectEvent(event: AppSidebarCalendarItem) {
  emit("select-event", event)
}

function getEventTitleText(event: AppSidebarCalendarItem) {
  const parts = event.title.split(/[:：]\s*/, 2)
  return parts[1]?.trim() || event.title
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && sourceType"
        class="fixed z-[60] flex min-h-0 flex-col border-l border-border bg-background shadow-[4px_0_32px_rgba(15,23,42,0.06)]"
        :style="panelFrameStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 pr-2">
          <span
            class="size-3 shrink-0 rounded-[3px]"
            :class="swatchClass"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-foreground">{{ title }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ subtitle }}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 shrink-0 text-muted-foreground"
            aria-label="更多"
          >
            <MoreHorizontal class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 shrink-0 text-muted-foreground"
            aria-label="收起"
            @click="close"
          >
            <ChevronRight class="size-4" />
          </Button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 pt-2">
          <template v-if="loading">
            <p class="px-3 py-8 text-center text-sm text-muted-foreground">加载中...</p>
          </template>
          <template v-else-if="groups.length === 0">
            <p class="px-3 py-8 text-center text-sm text-muted-foreground">暂无条目</p>
          </template>
          <template v-else>
            <section
              v-for="(block, idx) in groups"
              :key="`${block.sectionLabel}-${idx}`"
              class="mb-4 last:mb-0"
            >
              <div class="flex items-center gap-2 px-2 py-1.5">
                <h3 class="text-xs font-medium text-muted-foreground">{{ block.sectionLabel }}</h3>
                <span
                  class="tabular-nums rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >{{ block.events.length }}</span>
              </div>
              <ul class="space-y-0.5" role="list">
                <li
                  v-for="event in block.events"
                  :key="`${event.type}-${event.uuid}-${event.dateKey}`"
                  class="cursor-pointer rounded-md py-2 pl-3 pr-2 transition-colors hover:bg-muted/60"
                  :class="barBorderClass[event.type]"
                  @click="onSelectEvent(event)"
                >
                  <p class="text-sm font-medium text-foreground">{{ getEventTitleText(event) }}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    <span v-if="event.time">{{ event.time }}</span>
                    <span v-if="event.time && event.meta" class="mx-1">·</span>
                    <span v-if="event.meta">{{ event.meta }}</span>
                  </p>
                </li>
              </ul>
            </section>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
