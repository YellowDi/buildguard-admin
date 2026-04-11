<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { onKeyStroke } from "@vueuse/core"
import { useSidebar } from "@/components/ui/sidebar"
import { SIDEBAR_WIDTH } from "@/components/ui/sidebar/utils"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import AppSidebarCalendarSourceSheetBody from "@/components/layout/app-sidebar/AppSidebarCalendarSourceSheetBody.vue"
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

const drawerOpen = computed({
  get: () => props.open && !!props.sourceType,
  set: (v) => {
    if (!v)
      emit("update:open", false)
  },
})

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
 * 仅桌面端侧滑面板使用；移动端「数据来源」面板走全局 `Drawer`/`DrawerContent`（`@/components/ui/drawer`）。
 */
const panelFrameStyle = computed(() => {
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

function onSelectEvent(event: AppSidebarCalendarItem) {
  emit("select-event", event)
}

onKeyStroke("Escape", (e) => {
  if (props.open && !isMobile.value && props.sourceType) {
    e.preventDefault()
    close()
  }
})
</script>

<template>
  <!-- 移动端：底部抽屉；样式由 `ui/drawer/DrawerContent` 统一提供 -->
  <Drawer
    v-if="isMobile"
    v-model:open="drawerOpen"
    direction="bottom"
  >
    <DrawerContent
      class="flex flex-col gap-0 border-0 outline-none"
      :aria-label="title"
    >
      <AppSidebarCalendarSourceSheetBody
        :title="title"
        :subtitle="subtitle"
        :swatch-class="swatchClass"
        :loading="loading"
        :groups="groups"
        @close="close"
        @add="goToCreateForm"
        @select-event="onSelectEvent"
      />
    </DrawerContent>
  </Drawer>

  <Teleport v-else to="body">
    <Transition name="calendar-sheet">
      <div
        v-if="open && sourceType"
        class="fixed z-20 flex min-h-0 flex-col overflow-hidden bg-background [outline:1px_solid_var(--border-whisper)] shadow-(--shadow-deep)"
        :style="panelFrameStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <AppSidebarCalendarSourceSheetBody
          :title="title"
          :subtitle="subtitle"
          :swatch-class="swatchClass"
          :loading="loading"
          :groups="groups"
          @close="close"
          @add="goToCreateForm"
          @select-event="onSelectEvent"
        />
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
