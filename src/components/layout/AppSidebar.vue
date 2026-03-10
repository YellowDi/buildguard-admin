<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
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
} from "@/components/ui/sidebar"
import BrandLogo from "@/components/layout/BrandLogo.vue"
import UserCardPopover from "@/components/layout/UserCardPopover.vue"
import { Calendar } from "@/components/ui/calendar"
import Input from "@/components/ui/input/Input.vue"
import { Switch } from "@/components/ui/switch"
import inboxData from "@/data/inbox.json"

type TopTabId = "home" | "calendar" | "inbox"

type NavItem = {
  label: string
  icon?: string
  path?: string
  badge?: string
  children?: NavItem[]
  open?: boolean
}

type InboxGroup = {
  label: string
  items: InboxItem[]
}

type InboxItem = {
  id: number
  title: string
  source: string
  date: string
  dueLabel: string
  dueAt: string
  summary: string
  severity: "info" | "warning" | "danger"
}

const props = defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  "close-mobile": []
}>()

const route = useRoute()

const topTabs: Array<{ id: TopTabId, label: string, icon: string }> = [
  {
    id: "home",
    label: "工作台",
    icon: "ri-home-5-line",
  },
  {
    id: "calendar",
    label: "日历",
    icon: "ri-calendar-event-line",
  },
  {
    id: "inbox",
    label: "收件箱",
    icon: "ri-mail-line",
  },
]

const businessItems = reactive<NavItem[]>([
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
    label: "呼叫中心",
    icon: "ri-customer-service-2-line",
    open: true,
    children: [
      {
        label: "报警查询",
        path: "/alarm-queries",
      },
    ],
  },
])

const inboxGroups = inboxData as InboxGroup[]
const inboxAttentionCount = inboxGroups.reduce(
  (total, group) => total + group.items.filter((item) => item.severity !== "info").length,
  0,
)
const inboxSearch = ref("")
const inboxUnreadOnly = ref(false)
const calendarItems = [
  {
    time: "09:30",
    title: "重点企业回访",
    meta: "余姚安泰危货运输有限公司",
  },
  {
    time: "14:00",
    title: "车辆报警复核",
    meta: "粤B88231 · 鹏程危运",
  },
  {
    time: "16:30",
    title: "证照资料催办",
    meta: "北仑盛安危险品运输有限公司",
  },
]

const selectedTopTab = ref<TopTabId>("home")

const activePath = computed(() => route.path)
const activeItemClass = "bg-surface-tertiary text-sidebar-accent-foreground"
const mobileTabRefs = ref<Array<HTMLElement | null>>([])
const desktopTabRefs = ref<Array<HTMLElement | null>>([])
const mobileIndicatorStyle = ref({
  width: "0px",
  transform: "translateX(0px)",
  opacity: "0",
})
const desktopIndicatorStyle = ref({
  width: "0px",
  transform: "translateX(0px)",
  opacity: "0",
})
let indicatorRafId = 0

const inboxEntries = computed(() =>
  inboxGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      inboxTime: buildInboxTime(group.label, item.date),
      unread: item.severity !== "info",
    })),
  ),
)

const filteredInboxEntries = computed(() => {
  const keyword = inboxSearch.value.trim().toLowerCase()

  return inboxEntries.value.filter((item) => {
    if (inboxUnreadOnly.value && !item.unread) {
      return false
    }

    if (!keyword) {
      return true
    }

    const haystack = `${item.source} ${item.title} ${item.summary} ${item.dueAt}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

function isActive(item: NavItem) {
  return item.path === activePath.value
}

function toggleItem(item: NavItem) {
  if (!item.children?.length) {
    return
  }

  item.open = !item.open
}

function selectTopTab(tabId: TopTabId) {
  selectedTopTab.value = tabId
}

function isBusinessRoute(path: string) {
  return ["/", "/companies", "/vehicles", "/users", "/alarm-queries"].some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  )
}

function handleSearch() {
  window.dispatchEvent(new CustomEvent("buildguard-sidebar-search"))
}

function buildInboxTime(groupLabel: string, date: string) {
  if (groupLabel === "今天") return date.slice(-5)
  if (groupLabel === "更早") return "1 天前"
  return date
}

function resolveElement(target: Element | ComponentPublicInstance | null) {
  if (!target) return null
  if (target instanceof HTMLElement) return target
  if ("$el" in target && target.$el instanceof HTMLElement) return target.$el
  return null
}

function setMobileTabRef(element: Element | ComponentPublicInstance | null, index: number) {
  mobileTabRefs.value[index] = resolveElement(element)
}

function setDesktopTabRef(element: Element | ComponentPublicInstance | null, index: number) {
  desktopTabRefs.value[index] = resolveElement(element)
}

function updateIndicator(
  refs: Array<HTMLElement | null>,
  styleRef: typeof mobileIndicatorStyle,
) {
  const activeIndex = topTabs.findIndex(tab => tab.id === selectedTopTab.value)
  const activeElement = refs[activeIndex]

  if (!activeElement) {
    styleRef.value = {
      width: "0px",
      transform: "translateX(0px)",
      opacity: "0",
    }
    return
  }

  styleRef.value = {
    width: `${activeElement.offsetWidth}px`,
    transform: `translateX(${activeElement.offsetLeft}px)`,
    opacity: "1",
  }
}

function updateAllIndicators() {
  updateIndicator(mobileTabRefs.value, mobileIndicatorStyle)
  updateIndicator(desktopTabRefs.value, desktopIndicatorStyle)
}

async function syncIndicators() {
  await nextTick()

  if (indicatorRafId) {
    cancelAnimationFrame(indicatorRafId)
  }

  indicatorRafId = requestAnimationFrame(() => {
    updateAllIndicators()
    indicatorRafId = 0
  })
}

watch(() => route.fullPath, () => {
  if (isBusinessRoute(route.path)) {
    selectedTopTab.value = "home"
  }

  if (props.mobileOpen) {
    emit("close-mobile")
  }
}, { immediate: true })

watch(selectedTopTab, () => {
  syncIndicators()
})

onMounted(() => {
  syncIndicators()
  window.addEventListener("resize", updateAllIndicators)
})

onBeforeUnmount(() => {
  if (indicatorRafId) {
    cancelAnimationFrame(indicatorRafId)
  }

  window.removeEventListener("resize", updateAllIndicators)
})
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 flex w-[334px] max-w-[90vw] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out md:hidden"
    :class="props.mobileOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="shrink-0 p-2">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <BrandLogo />
          <i class="ri-arrow-down-s-line text-base" />
        </RouterLink>
      </div>

      <div class="shrink-0 p-2">
        <div class="flex items-center gap-1">
          <div class="relative flex items-center gap-1">
            <div
              class="pointer-events-none absolute left-0 top-0 h-8 rounded-full bg-[rgba(15,23,42,0.06)] transition-[transform,width,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
              :style="mobileIndicatorStyle"
            />
            <button
              v-for="(tab, index) in topTabs"
              :key="`mobile-top-tab-${tab.id}`"
              :ref="element => setMobileTabRef(element, index)"
              type="button"
              :aria-pressed="selectedTopTab === tab.id"
              :class="[
                'relative z-10 flex h-8 items-center justify-center rounded-full border border-transparent text-[14px] font-medium transition-colors duration-200 ease-out',
                selectedTopTab === tab.id
                  ? (tab.id === 'inbox'
                    ? 'w-auto shrink-0 gap-2 pl-3 pr-2 text-sidebar-accent-foreground'
                    : 'w-auto shrink-0 gap-2 pl-3 pr-4 text-sidebar-accent-foreground')
                  : 'w-8 shrink-0 px-0 text-sidebar-foreground/52 hover:text-sidebar-accent-foreground',
              ]"
              @click="selectTopTab(tab.id)"
            >
              <i :class="[tab.icon, 'shrink-0 text-[17px] leading-none']" />
              <span
                v-if="selectedTopTab === tab.id"
                class="whitespace-nowrap transition-[opacity,transform] duration-200 ease-out"
                :class="selectedTopTab === tab.id ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'"
              >
                {{ tab.label }}
              </span>
              <span
                v-if="selectedTopTab === tab.id && tab.id === 'inbox'"
                class="flex h-4 min-w-4 items-center justify-center rounded-full bg-badge px-1 text-center text-[10px] font-semibold leading-none text-link-foreground"
              >
                {{ inboxAttentionCount }}
              </span>
            </button>
          </div>

          <button
            type="button"
            class="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-sidebar-foreground/52 transition-colors duration-200 ease-out hover:text-sidebar-accent-foreground"
            aria-label="搜索"
            @click="handleSearch"
          >
            <i class="ri-search-line text-[17px] leading-none" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-x-hidden p-2">
        <nav v-if="selectedTopTab === 'home'" class="min-w-0 overflow-y-auto overflow-x-hidden">
          <div v-for="item in businessItems" :key="`mobile-business-${item.label}`">
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
              class="mx-0 mr-0 ml-5.25 gap-0 px-0 pl-5.25 py-0"
            >
              <SidebarMenuSubItem
                v-for="child in item.children"
                :key="`mobile-${item.label}-${child.label}`"
                class="group/sub-item relative"
              >
                <div
                  class="pointer-events-none absolute inset-y-0 -left-8 right-0 rounded-lg opacity-0 transition-opacity group-hover/sub-item:bg-sidebar-accent group-hover/sub-item:opacity-100 group-focus-within/sub-item:bg-sidebar-accent group-focus-within/sub-item:opacity-100 group-has-data-[active=true]/sub-item:bg-sidebar-accent group-has-data-[active=true]/sub-item:opacity-100"
                  :class="{ 'bg-surface-tertiary opacity-100': isActive(child) }"
                />
                <div
                  class="pointer-events-none absolute -left-5.25 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sidebar-foreground/40 opacity-0 transition-opacity group-hover/sub-item:opacity-100 group-focus-within/sub-item:opacity-100 group-has-data-[active=true]/sub-item:opacity-100"
                />
                <SidebarMenuSubButton
                  as-child
                  :is-active="isActive(child)"
                  class="relative z-10 h-9 -ml-5.25 rounded-lg bg-transparent pl-5.25 pr-3 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
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
        </nav>

        <div v-else-if="selectedTopTab === 'inbox'" class="flex h-full min-h-0 flex-col overflow-hidden">
          <div class="shrink-0 px-2 py-2">
            <div class="flex items-center gap-3">
              <Input
                v-model="inboxSearch"
                placeholder="搜索收件箱..."
                class="h-9 rounded-lg bg-background px-3 text-sm shadow-none"
              />
              <label class="flex shrink-0 items-center gap-2.5">
                <span class="text-xs font-medium text-foreground">仅看未读</span>
                <Switch v-model="inboxUnreadOnly" />
              </label>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <article
              v-for="(item, index) in filteredInboxEntries"
              :key="`mobile-inbox-item-${item.id}`"
              :class="[
                'group px-4 py-4 transition-colors hover:bg-accent/60',
                index !== filteredInboxEntries.length - 1 ? 'border-b border-border' : '',
              ]"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                  {{ item.source }}
                </p>
                <p class="shrink-0 pt-0.5 text-xs font-normal leading-none text-muted-foreground">
                  {{ item.inboxTime }}
                </p>
              </div>

              <p class="mt-2 text-sm font-semibold leading-tight text-foreground">
                {{ item.title }}
              </p>

              <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {{ item.summary }}
              </p>
            </article>

            <div
              v-if="filteredInboxEntries.length === 0"
              class="px-3 py-10 text-sm text-muted-foreground"
            >
              No messages found.
            </div>
          </div>
        </div>

        <div v-else class="flex h-full min-h-0 flex-col overflow-hidden">
          <Calendar
            locale="zh-CN"
            layout="month-and-year"
            class="w-full max-w-full p-0"
          />

          <div class="mt-3 overflow-hidden">
            <div class="flex items-center justify-between px-3 py-2.5">
              <p class="text-sm font-semibold text-foreground">今日安排</p>
              <span class="text-xs text-muted-foreground">{{ calendarItems.length }} 项</span>
            </div>

            <div class="divide-y divide-border">
              <article
                v-for="item in calendarItems"
                :key="`mobile-calendar-item-${item.time}-${item.title}`"
                class="px-3 py-3"
              >
                <div class="flex items-start gap-3">
                  <span class="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{{ item.time }}</span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground">{{ item.title }}</p>
                    <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.meta }}</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-sidebar-border p-2">
        <UserCardPopover />
      </div>
    </div>
  </aside>

  <Sidebar collapsible="offcanvas" class="z-40 bg-transparent max-md:hidden">
    <SidebarHeader class="shrink-0 pb-0">
      <div class="p-2">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <BrandLogo />
          <i class="ri-arrow-down-s-line text-base" />
        </RouterLink>
      </div>

      <div class="p-2">
        <div class="flex items-center gap-1">
          <div class="relative flex items-center gap-1">
            <div
              class="pointer-events-none absolute left-0 top-0 h-8 rounded-full bg-[rgba(15,23,42,0.06)] transition-[transform,width,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
              :style="desktopIndicatorStyle"
            />
            <button
              v-for="(tab, index) in topTabs"
              :key="`top-tab-${tab.id}`"
              :ref="element => setDesktopTabRef(element, index)"
              type="button"
              :aria-pressed="selectedTopTab === tab.id"
              :class="[
                'relative z-10 flex h-8 items-center justify-center rounded-full border border-transparent text-[14px] font-medium transition-colors duration-200 ease-out',
                selectedTopTab === tab.id
                  ? (tab.id === 'inbox'
                    ? 'w-auto shrink-0 gap-2 pl-3 pr-2 text-sidebar-accent-foreground'
                    : 'w-auto shrink-0 gap-2 pl-3 pr-4 text-sidebar-accent-foreground')
                  : 'w-8 shrink-0 px-0 text-sidebar-foreground/52 hover:text-sidebar-accent-foreground',
              ]"
              @click="selectTopTab(tab.id)"
            >
              <i :class="[tab.icon, 'shrink-0 text-[17px] leading-none']" />
              <span
                v-if="selectedTopTab === tab.id"
                class="whitespace-nowrap transition-[opacity,transform] duration-200 ease-out"
                :class="selectedTopTab === tab.id ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'"
              >
                {{ tab.label }}
              </span>
              <span
                v-if="selectedTopTab === tab.id && tab.id === 'inbox'"
                class="flex h-4 min-w-4 items-center justify-center rounded-full bg-badge px-1 text-center text-[10px] font-semibold leading-none text-link-foreground"
              >
                {{ inboxAttentionCount }}
              </span>
            </button>
          </div>

          <button
            type="button"
            class="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-sidebar-foreground/52 transition-colors duration-200 ease-out hover:text-sidebar-accent-foreground"
            aria-label="搜索"
            @click="handleSearch"
          >
            <i class="ri-search-line text-[17px] leading-none" />
          </button>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent class="min-h-0 overflow-x-hidden">
      <nav v-if="selectedTopTab === 'home'" class="min-w-0 overflow-y-auto overflow-x-hidden p-2">
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
            class="mx-0 mr-0 ml-5.25 gap-0 px-0 pl-5.25 py-0"
          >
            <SidebarMenuSubItem
              v-for="child in item.children"
              :key="`${item.label}-${child.label}`"
              class="group/sub-item relative"
            >
              <div
                class="pointer-events-none absolute inset-y-0 -left-8 right-0 rounded-lg opacity-0 transition-opacity group-hover/sub-item:bg-sidebar-accent group-hover/sub-item:opacity-100 group-focus-within/sub-item:bg-sidebar-accent group-focus-within/sub-item:opacity-100 group-has-data-[active=true]/sub-item:bg-sidebar-accent group-has-data-[active=true]/sub-item:opacity-100"
                :class="{ 'bg-surface-tertiary opacity-100': isActive(child) }"
              />
              <div
                class="pointer-events-none absolute -left-5.25 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sidebar-foreground/40 opacity-0 transition-opacity group-hover/sub-item:opacity-100 group-focus-within/sub-item:opacity-100 group-has-data-[active=true]/sub-item:opacity-100"
              />
              <SidebarMenuSubButton
                as-child
                :is-active="isActive(child)"
                class="relative z-10 h-9 -ml-5.25 rounded-lg bg-transparent pl-5.25 pr-3 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
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
      </nav>

      <div v-else-if="selectedTopTab === 'inbox'" class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="shrink-0 px-2 py-2">
          <div class="flex items-center gap-3">
            <Input
              v-model="inboxSearch"
              placeholder="搜索收件箱..."
              class="h-9 rounded-lg bg-background px-3 text-sm shadow-none"
            />
            <label class="flex shrink-0 items-center gap-2.5">
              <span class="text-xs font-medium text-foreground">仅看未读</span>
              <Switch v-model="inboxUnreadOnly" />
            </label>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <article
            v-for="(item, index) in filteredInboxEntries"
            :key="`inbox-item-${item.id}`"
            :class="[
              'group px-4 py-4 transition-colors hover:bg-accent/60',
              index !== filteredInboxEntries.length - 1 ? 'border-b border-border' : '',
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
                {{ item.source }}
              </p>
              <p class="shrink-0 pt-0.5 text-xs font-normal leading-none text-muted-foreground">
                {{ item.inboxTime }}
              </p>
            </div>

            <p class="mt-2 text-sm font-semibold leading-tight text-foreground">
              {{ item.title }}
            </p>

            <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {{ item.summary }}
            </p>
          </article>

          <div
            v-if="filteredInboxEntries.length === 0"
            class="px-3 py-10 text-sm text-muted-foreground"
          >
            No messages found.
          </div>
        </div>
      </div>

      <div v-else class="flex h-full min-h-0 flex-col overflow-hidden p-2">
        <Calendar
          locale="zh-CN"
          layout="month-and-year"
          class="w-full max-w-full p-0"
        />

        <div class="mt-3 overflow-hidden">
          <div class="flex items-center justify-between px-3 py-2.5">
            <p class="text-sm font-semibold text-foreground">今日安排</p>
            <span class="text-xs text-muted-foreground">{{ calendarItems.length }} 项</span>
          </div>

          <div class="divide-y divide-border">
            <article
              v-for="item in calendarItems"
              :key="`calendar-item-${item.time}-${item.title}`"
              class="px-3 py-3"
            >
              <div class="flex items-start gap-3">
                <span class="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{{ item.time }}</span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-foreground">{{ item.title }}</p>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.meta }}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </SidebarContent>

    <SidebarFooter class="shrink-0 border-t border-sidebar-border">
      <UserCardPopover />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
