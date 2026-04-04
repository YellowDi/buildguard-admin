<script setup lang="ts">
import { Plus, X } from "lucide-vue-next"
import { computed } from "vue"
import { useRouter } from "vue-router"
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

const router = useRouter()
const { open: sidebarOpen, isMobile } = useSidebar()

function goToCreateForm() {
  if (!props.sourceType)
    return
  close()
  const name = props.sourceType === "work-order"
    ? "inspection-work-order-create"
    : props.sourceType === "inspection-plan"
      ? "inspection-plan-create"
      : "inspection-service-create"
  void router.push({ name })
}

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

/** 左侧圆角竖条填色（与类型色一致） */
const barAccentClass: Record<AppSidebarCalendarItem["type"], string> = {
  "work-order": "bg-orange-500 dark:bg-orange-400",
  "inspection-plan": "bg-blue-500 dark:bg-blue-400",
  "inspection-service": "bg-emerald-500 dark:bg-emerald-400",
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
    <Transition name="calendar-sheet">
      <div
        v-if="open && sourceType"
        class="fixed z-[20] flex min-h-0 flex-col overflow-hidden bg-background [outline:1px_solid_rgba(84,72,49,0.08)]"
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
          <div class="flex min-w-0 flex-1 flex-row items-center gap-2">
            <p class="min-w-0 truncate text-sm font-semibold text-foreground">{{ title }}</p>
            <p class="shrink-0 text-xs text-muted-foreground">{{ subtitle }}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 shrink-0 text-muted-foreground"
            aria-label="添加"
            @click="goToCreateForm"
          >
            <Plus class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 shrink-0 text-muted-foreground"
            aria-label="关闭"
            @click="close"
          >
            <X class="size-4" />
          </Button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
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
                  @click="onSelectEvent(event)"
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
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/**
 * 从侧栏一侧划入：left 已与侧栏右缘对齐，translateX(-100%) 使面板先整体位于侧栏下方（叠在侧栏之下），再滑入主内容区。
 * z-[20] 低于桌面侧栏 z-40，划入时经过侧栏区域会被侧栏盖住，视觉上像从侧栏边缘抽出。
 */
.calendar-sheet-enter-active,
.calendar-sheet-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.calendar-sheet-leave-active {
  transition-duration: 0.25s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.7, 0.2);
}

.calendar-sheet-enter-from,
.calendar-sheet-leave-to {
  transform: translateX(-100%);
}

.calendar-sheet-enter-to,
.calendar-sheet-leave-from {
  transform: translateX(0);
}
</style>
