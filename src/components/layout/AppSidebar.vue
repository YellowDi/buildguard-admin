<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import { useRoute } from "vue-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

type NavItem = {
  label: string
  icon?: string
  path?: string
  badge?: string
  action?: "inbox"
  children?: NavItem[]
  open?: boolean
}

const props = defineProps<{
  inboxOpen?: boolean
}>()

const emit = defineEmits<{
  "toggle-inbox": []
  "close-inbox": []
}>()

const { state, openMobile } = useSidebar()

const route = useRoute()

const pinnedItems: NavItem[] = [
  {
    label: "搜索",
    icon: "ri-search-line",
  },
  {
    label: "主页",
    icon: "ri-home-5-line",
    path: "/",
  },
  {
    label: "会议",
    icon: "ri-calendar-event-line",
  },
  {
    label: "收件箱",
    icon: "ri-mail-line",
    badge: "2",
    action: "inbox",
  },
]

const businessItems = reactive<NavItem[]>([
  {
    label: "QR",
    icon: "ri-qr-code-line",
  },
  {
    label: "企业",
    icon: "ri-building-line",
    path: "/companies",
  },
  {
    label: "车辆",
    icon: "ri-truck-line",
    path: "/vehicles",
  },
  {
    label: "从业人员",
    icon: "ri-team-line",
    path: "/users",
  },
  {
    label: "运营商",
    icon: "ri-bank-line",
  },
  {
    label: "呼叫中心",
    icon: "ri-customer-service-2-line",
    open: true,
    children: [
      {
        label: "工作台",
      },
      {
        label: "报警查询",
      },
    ],
  },
  {
    label: "统计报表",
    icon: "ri-pie-chart-2-line",
    open: true,
    children: [
      {
        label: "企业",
      },
      {
        label: "车辆",
      },
      {
        label: "区域",
      },
      {
        label: "排名",
      },
      {
        label: "总报表",
        path: "/settings",
      },
      {
        label: "区域报表",
      },
      {
        label: "客户信息",
      },
      {
        label: "行管报表",
      },
    ],
  },
])

const activePath = computed(() => route.path)
const activeItemClass = "bg-black/5 text-sidebar-accent-foreground"

function isActive(item: NavItem) {
  return item.path === activePath.value
}

function toggleItem(item: NavItem) {
  if (!item.children?.length) {
    return
  }

  item.open = !item.open
}

function handlePinnedItemClick(item: NavItem) {
  if (item.action === "inbox") {
    emit("toggle-inbox")
  }
}

watch(state, (value) => {
  if (value === "collapsed") {
    emit("close-inbox")
  }
})

watch(openMobile, (value) => {
  if (!value) {
    emit("close-inbox")
  }
})
</script>

<template>
  <Sidebar collapsible="offcanvas" class="bg-transparent">
    <SidebarHeader class="shrink-0 border-b px-4 pb-4 pt-5">
      <RouterLink
        to="/"
        class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <div
          class="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"
        >
          <div class="grid size-5 grid-cols-2 gap-0.5 rounded-full bg-white/10 p-0.5">
            <span class="rounded-full bg-current opacity-90" />
            <span class="rounded-full bg-current opacity-60" />
            <span class="rounded-full bg-current opacity-60" />
            <span class="rounded-full bg-current opacity-90" />
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">控制中心</p>
        </div>
        <i class="ri-arrow-down-s-line text-base" />
      </RouterLink>

      <nav class="mt-4">
        <component
          :is="item.path ? 'RouterLink' : 'button'"
          v-for="item in pinnedItems"
          :key="item.label"
          :to="item.path"
          type="button"
          @click="handlePinnedItemClick(item)"
          :class="[
            'group flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm font-medium transition-colors',
            isActive(item)
              ? activeItemClass
              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          ]"
        >
          <i :class="[item.icon, 'text-lg leading-none']" />
          <span class="flex-1 truncate">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="min-w-5 rounded-md bg-sidebar-primary px-1.5 text-center text-[11px] font-semibold leading-5 text-sidebar-primary-foreground"
          >
            {{ item.badge }}
          </span>
        </component>
      </nav>
    </SidebarHeader>

    <SidebarContent class="min-h-0 px-3 pb-4 pt-4">
      <nav class="overflow-y-auto pr-1">
        <div v-for="item in businessItems" :key="item.label">
          <component
            :is="item.path && !item.children?.length ? 'RouterLink' : 'button'"
            :to="item.path"
            type="button"
            :class="[
              'group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors',
              isActive(item)
                ? activeItemClass
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            ]"
            @click="toggleItem(item)"
          >
            <i v-if="item.icon" :class="[item.icon, 'text-lg leading-none']" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <i
              v-if="item.children?.length"
              :class="[
                'ri-arrow-down-s-line text-base transition-transform',
                item.open ? 'rotate-0' : '-rotate-90',
              ]"
            />
          </component>

          <SidebarMenuSub
            v-if="item.children?.length && item.open"
            class="mx-0 mr-0 ml-[1.3125rem] gap-0 px-0 pl-[1.3125rem] py-0"
          >
            <SidebarMenuSubItem
              v-for="child in item.children"
              :key="`${item.label}-${child.label}`"
              class="group/sub-item relative"
            >
              <div
                class="pointer-events-none absolute inset-y-0 -left-8 right-0 rounded-lg opacity-0 transition-opacity group-hover/sub-item:bg-sidebar-accent group-hover/sub-item:opacity-100 group-focus-within/sub-item:bg-sidebar-accent group-focus-within/sub-item:opacity-100 group-has-[[data-active=true]]/sub-item:bg-sidebar-accent group-has-[[data-active=true]]/sub-item:opacity-100"
                :class="{ 'bg-black/5 opacity-100': isActive(child) }"
              />
              <div
                class="pointer-events-none absolute left-[-1.3125rem] top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sidebar-foreground/40 opacity-0 transition-opacity group-hover/sub-item:opacity-100 group-focus-within/sub-item:opacity-100 group-has-[[data-active=true]]/sub-item:opacity-100"
              />
              <SidebarMenuSubButton
                as-child
                :is-active="isActive(child)"
                class="relative z-10 h-9 -ml-[1.3125rem] rounded-lg bg-transparent pl-[1.3125rem] pr-3 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
              >
                <component
                  :is="child.path ? 'RouterLink' : 'button'"
                  :to="child.path"
                  type="button"
                  class="w-full text-left"
                >
                  <span>{{ child.label }}</span>
                </component>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </div>

        <RouterLink
          to="/settings"
          class="flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          :class="{ [activeItemClass]: activePath === '/settings' }"
        >
          <i class="ri-settings-3-line text-lg leading-none" />
          <span class="truncate">偏好设置</span>
        </RouterLink>
      </nav>
    </SidebarContent>

    <SidebarFooter class="shrink-0 border-t px-4 py-4">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <div
          class="flex size-11 items-center justify-center rounded-full bg-sidebar-primary text-lg font-semibold text-sidebar-primary-foreground"
        >
          R
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-semibold">Rolly</span>
            <span
              class="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-accent-foreground"
            >
              Pro
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">yellowdi@me.com</p>
        </div>
        <i class="ri-arrow-up-s-line text-base" />
      </button>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
