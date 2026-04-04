<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { useRoute } from "vue-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import AppSidebarCalendarPanel from "@/components/layout/app-sidebar/AppSidebarCalendarPanel.vue"
import AppSidebarConversationPanel from "@/components/layout/app-sidebar/AppSidebarConversationPanel.vue"
import AppSidebarHomeNav from "@/components/layout/app-sidebar/AppSidebarHomeNav.vue"
import AppSidebarInboxPanel from "@/components/layout/app-sidebar/AppSidebarInboxPanel.vue"
import AppSidebarTopBar from "@/components/layout/app-sidebar/AppSidebarTopBar.vue"
import type {
  AppSidebarConversationItem,
  AppSidebarInboxGroup,
  AppSidebarNavItem,
  AppSidebarTopTabId,
} from "@/components/layout/app-sidebar/types"
import GlobalCommand from "@/components/layout/GlobalCommand.vue"
import UserCardPopover from "@/components/layout/UserCardPopover.vue"
import { useSettingsDialog } from "@/composables/useSettingsDialog"
import conversationsData from "@/mocks/ai-conversations.json"
import inboxData from "@/mocks/inbox.json"

const props = defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  "close-mobile": []
}>()

const route = useRoute()
const { openSettingsDialog } = useSettingsDialog()

const topTabs: Array<{ id: AppSidebarTopTabId, label: string, icon: string }> = [
  {
    id: "home",
    label: "工作台",
    icon: "ri-home-5-line",
  },
  {
    id: "conversation",
    label: "对话",
    icon: "ri-chat-1-line",
  },
  {
    id: "calendar",
    label: "日历",
    icon: "ri-calendar-event-line",
  },
  {
    id: "inbox",
    label: "收件箱",
    icon: "ri-inbox-2-line",
  },
]

const businessItems = reactive<AppSidebarNavItem[]>([
  {
    label: "客户",
    icon: "ri-user-3-line",
    path: "/customers",
  },
  {
    label: "园区",
    icon: "ri-community-line",
    path: "/parks",
  },
  {
    label: "建筑",
    icon: "ri-building-line",
    path: "/buildings",
  },
  {
    label: "监控",
    icon: "ri-webcam-line",
    path: "/monitoring",
  },
  {
    label: "工单",
    icon: "ri-file-list-3-line",
    open: true,
    children: [
      {
        label: "检测工单",
        path: "/work-orders/inspection",
      },
      {
        label: "报修工单",
        path: "/work-orders/repair",
      },
    ],
  },
  {
    label: "检测服务",
    icon: "ri-shield-check-line",
    path: "/inspection-services",
  },
  {
    label: "检测计划",
    icon: "ri-calendar-check-line",
    path: "/inspection-plans",
  },
  {
    label: "设置",
    icon: "ri-settings-3-line",
    action: "open-settings",
  },
])

const inboxGroups = inboxData as AppSidebarInboxGroup[]
const conversationItems = conversationsData as AppSidebarConversationItem[]
const selectedTopTab = ref<AppSidebarTopTabId>("home")
const isSearchDialogOpen = ref(false)

const activePath = computed(() => {
  const navActivePath = typeof route.meta.navActivePath === "string"
    ? route.meta.navActivePath.trim()
    : ""

  return navActivePath || route.path
})
function toggleItem(item: AppSidebarNavItem) {
  if (!item.children?.length) {
    if (item.action === "open-settings") {
      openSettingsDialog()
    }
    return
  }

  item.open = !item.open
}

function selectTopTab(tabId: AppSidebarTopTabId) {
  selectedTopTab.value = tabId
}

function handleTopTabUpdate(tabId: string) {
  selectTopTab(tabId as AppSidebarTopTabId)
}

function isBusinessRoute(path: string) {
  return ["/", "/customers", "/parks", "/buildings", "/monitoring", "/inspection-services", "/inspection-plans", "/work-orders"].some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  )
}

function handleSearch() {
  isSearchDialogOpen.value = true
}

watch(() => route.fullPath, () => {
  if (isBusinessRoute(route.path)) {
    selectedTopTab.value = "home"
  }

  if (props.mobileOpen) {
    emit("close-mobile")
  }
}, { immediate: true })
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 flex w-[255px] max-w-[90vw] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out min-[1000px]:hidden"
    :class="props.mobileOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex min-h-0 flex-1 flex-col">
      <AppSidebarTopBar
        :tabs="topTabs"
        :model-value="selectedTopTab"
        @update:model-value="handleTopTabUpdate"
        @search="handleSearch"
      />

      <div class="min-h-0 flex-1 overflow-x-visible p-2">
        <AppSidebarHomeNav
          v-if="selectedTopTab === 'home'"
          :items="businessItems"
          :active-path="activePath"
          @toggle-item="toggleItem"
        />
        <AppSidebarConversationPanel
          v-else-if="selectedTopTab === 'conversation'"
          :items="conversationItems"
        />
        <AppSidebarInboxPanel
          v-else-if="selectedTopTab === 'inbox'"
          :groups="inboxGroups"
        />
        <AppSidebarCalendarPanel
          v-else
        />
      </div>

      <div class="shrink-0 border-t border-sidebar-border p-2">
        <UserCardPopover />
      </div>
    </div>
  </aside>

  <Sidebar collapsible="offcanvas" class="z-40 bg-transparent max-[999px]:hidden">
    <SidebarHeader class="shrink-0 pb-0">
      <AppSidebarTopBar
        :tabs="topTabs"
        :model-value="selectedTopTab"
        @update:model-value="handleTopTabUpdate"
        @search="handleSearch"
      />
    </SidebarHeader>

    <SidebarContent class="min-h-0 overflow-x-visible">
      <AppSidebarHomeNav
        v-if="selectedTopTab === 'home'"
        :items="businessItems"
        :active-path="activePath"
        class="p-2"
        @toggle-item="toggleItem"
      />
      <AppSidebarConversationPanel
        v-else-if="selectedTopTab === 'conversation'"
        :items="conversationItems"
      />
      <AppSidebarInboxPanel
        v-else-if="selectedTopTab === 'inbox'"
        :groups="inboxGroups"
      />
      <AppSidebarCalendarPanel
        v-else
        class="p-2"
      />
    </SidebarContent>

    <SidebarFooter class="shrink-0 border-t border-sidebar-border">
      <UserCardPopover />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>

  <GlobalCommand v-model:open="isSearchDialogOpen" />
</template>
