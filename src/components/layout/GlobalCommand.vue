<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"

import type { AppSidebarNavItem, AppSidebarTopTabId } from "@/components/layout/app-sidebar/types"
import type { SettingsCategory } from "@/components/settings/types"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"
import { PERMISSION_CODES, type PermissionCode } from "@/lib/permission-codes"

type SearchItem = {
  id: string
  label: string
  subtitle: string
  icon: string
  type: string
  keywords?: string[]
  to?: RouteLocationRaw
  tabId?: AppSidebarTopTabId
  requiredMenuPath?: string
  requiredButtonCode?: PermissionCode
}

type SearchTarget = {
  id: string
  label: string
  subtitle: string
  icon: string
  path: string
  menuPath: string
  queryKey: string
  keywords: string[]
}

type SearchGroup = {
  id: string
  heading: string
  items: SearchItem[]
}

const props = defineProps<{
  open: boolean
  navigationItems: AppSidebarNavItem[]
  settingsCategories: SettingsCategory[]
  topTabs: Array<{ id: AppSidebarTopTabId, label: string, icon: string }>
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
  "select-top-tab": [tabId: AppSidebarTopTabId]
}>()

const router = useRouter()
const { canButton, canMenu } = useCurrentUserPermissions()

const dialogOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
})
const searchQuery = ref("")
const normalizedSearchQuery = computed(() => searchQuery.value.trim())

const baseQuickItems: SearchItem[] = [
  {
    id: "action-customer-create",
    label: "添加客户",
    subtitle: "进入客户新建流程",
    icon: "ri-user-add-line",
    type: "新建",
    keywords: ["客户", "公司", "新增", "create customer"],
    to: "/customers/create",
    requiredMenuPath: "/customers",
    requiredButtonCode: PERMISSION_CODES.customerAdd,
  },
  {
    id: "action-park-create",
    label: "添加园区",
    subtitle: "进入园区新建流程",
    icon: "ri-community-line",
    type: "新建",
    keywords: ["园区", "项目", "新增", "create park"],
    to: "/parks/create",
    requiredMenuPath: "/parks",
    requiredButtonCode: PERMISSION_CODES.parkAdd,
  },
  {
    id: "action-building-create",
    label: "添加建筑",
    subtitle: "进入建筑新建流程",
    icon: "ri-building-line",
    type: "新建",
    keywords: ["建筑", "楼栋", "新增", "create building"],
    to: "/buildings/create",
    requiredMenuPath: "/buildings",
    requiredButtonCode: PERMISSION_CODES.buildingAdd,
  },
  {
    id: "action-monitoring-create",
    label: "添加监控设备",
    subtitle: "进入监控设备新建流程",
    icon: "ri-webcam-line",
    type: "新建",
    keywords: ["监控", "摄像头", "设备", "新增"],
    to: "/monitoring/create",
    requiredMenuPath: "/monitoring",
  },
  {
    id: "action-inspection-service-create",
    label: "添加检测服务",
    subtitle: "创建新的检测服务",
    icon: "ri-shield-check-line",
    type: "新建",
    keywords: ["检测服务", "服务", "新增", "create service"],
    to: "/inspection-services/create",
    requiredMenuPath: "/inspection-services",
    requiredButtonCode: PERMISSION_CODES.inspectionServiceAdd,
  },
  {
    id: "action-inspection-plan-create",
    label: "添加检测计划",
    subtitle: "创建新的周期检测计划",
    icon: "ri-calendar-check-line",
    type: "新建",
    keywords: ["检测计划", "计划", "巡检", "新增"],
    to: "/inspection-plans/create",
    requiredMenuPath: "/inspection-plans",
    requiredButtonCode: PERMISSION_CODES.inspectionPlanAdd,
  },
  {
    id: "action-inspection-work-order-create",
    label: "添加检测工单",
    subtitle: "创建检测工单",
    icon: "ri-file-add-line",
    type: "新建",
    keywords: ["检测工单", "工单", "新增"],
    to: "/work-orders/inspection/create",
    requiredMenuPath: "/work-orders/inspection",
    requiredButtonCode: PERMISSION_CODES.inspectionWorkOrderAdd,
  },
  {
    id: "action-repair-work-order-create",
    label: "添加报修工单",
    subtitle: "创建报修工单",
    icon: "ri-tools-line",
    type: "新建",
    keywords: ["报修工单", "维修", "工单", "新增"],
    to: "/work-orders/repair/create",
    requiredMenuPath: "/work-orders/repair",
    requiredButtonCode: PERMISSION_CODES.repairWorkOrderAdd,
  },
]

const searchTargets: SearchTarget[] = [
  {
    id: "customers-company",
    label: "客户公司",
    subtitle: "按公司名称筛选客户列表",
    icon: "ri-user-3-line",
    path: "/customers",
    menuPath: "/customers",
    queryKey: "q",
    keywords: ["客户", "公司", "corpName"],
  },
  {
    id: "customers-name",
    label: "客户姓名",
    subtitle: "按客户名称筛选客户列表",
    icon: "ri-user-search-line",
    path: "/customers",
    menuPath: "/customers",
    queryKey: "customerName",
    keywords: ["客户", "姓名", "联系人", "customerName"],
  },
  {
    id: "customers-phone",
    label: "客户手机",
    subtitle: "按手机号筛选客户列表",
    icon: "ri-phone-line",
    path: "/customers",
    menuPath: "/customers",
    queryKey: "customerPhone",
    keywords: ["客户", "手机", "电话", "customerPhone"],
  },
  {
    id: "parks",
    label: "园区",
    subtitle: "按园区名称筛选园区列表",
    icon: "ri-community-line",
    path: "/parks",
    menuPath: "/parks",
    queryKey: "q",
    keywords: ["园区", "项目", "park"],
  },
  {
    id: "buildings",
    label: "建筑",
    subtitle: "按建筑名称筛选建筑列表",
    icon: "ri-building-line",
    path: "/buildings",
    menuPath: "/buildings",
    queryKey: "q",
    keywords: ["建筑", "楼栋", "building"],
  },
  {
    id: "monitoring",
    label: "监控设备",
    subtitle: "按设备、编号、客户或位置筛选监控列表",
    icon: "ri-webcam-line",
    path: "/monitoring",
    menuPath: "/monitoring",
    queryKey: "q",
    keywords: ["监控", "设备", "摄像头", "monitoring"],
  },
  {
    id: "inspection-work-orders",
    label: "检测工单",
    subtitle: "按工单编号筛选检测工单",
    icon: "ri-file-list-3-line",
    path: "/work-orders/inspection",
    menuPath: "/work-orders/inspection",
    queryKey: "q",
    keywords: ["检测工单", "工单编号", "inspection work order"],
  },
  {
    id: "repair-work-orders",
    label: "报修工单",
    subtitle: "按工单编号筛选报修工单",
    icon: "ri-tools-line",
    path: "/work-orders/repair",
    menuPath: "/work-orders/repair",
    queryKey: "q",
    keywords: ["报修工单", "维修", "工单编号", "repair work order"],
  },
  {
    id: "inspection-services",
    label: "检测服务",
    subtitle: "按服务名称筛选检测服务",
    icon: "ri-shield-check-line",
    path: "/inspection-services",
    menuPath: "/inspection-services",
    queryKey: "q",
    keywords: ["检测服务", "服务名称", "service"],
  },
  {
    id: "inspection-plans",
    label: "检测计划",
    subtitle: "按计划名称筛选检测计划",
    icon: "ri-calendar-check-line",
    path: "/inspection-plans",
    menuPath: "/inspection-plans",
    queryKey: "q",
    keywords: ["检测计划", "计划名称", "plan"],
  },
  {
    id: "customer-feedback",
    label: "客户反馈",
    subtitle: "按客户或反馈内容筛选反馈列表",
    icon: "ri-feedback-line",
    path: "/customer-feedback",
    menuPath: "/customer-feedback",
    queryKey: "q",
    keywords: ["客户反馈", "反馈内容", "feedback"],
  },
]

const quickSearchItems = computed(() => baseQuickItems.filter(isSearchItemAllowed))
const pageSearchItems = computed<SearchItem[]>(() => [
  {
    id: "page-dashboard",
    label: "工作台",
    subtitle: "打开工作台首页",
    icon: "ri-home-5-line",
    type: "页面",
    keywords: ["首页", "dashboard", "workspace"],
    to: "/",
  },
  ...flattenNavigationItems(props.navigationItems),
])
const settingsSearchItems = computed<SearchItem[]>(() => (
  props.settingsCategories.map(category => ({
    id: `settings-${category.key}`,
    label: category.pageTitle ?? category.label,
    subtitle: category.pageDescription ?? category.description,
    icon: category.icon,
    type: "设置",
    keywords: [category.key, category.label, category.description],
    to: {
      name: "settings",
      params: { category: category.key },
    },
    requiredMenuPath: `/settings/${category.key}`,
  }))
))
const sidebarTabItems = computed<SearchItem[]>(() => (
  props.topTabs
    .filter(tab => tab.id !== "home")
    .map(tab => ({
      id: `sidebar-tab-${tab.id}`,
      label: tab.label,
      subtitle: `切换侧边栏到${tab.label}`,
      icon: tab.icon,
      type: "侧栏",
      keywords: [tab.id, tab.label],
      tabId: tab.id,
    }))
))
const keywordSearchItems = computed<SearchItem[]>(() => {
  const keyword = normalizedSearchQuery.value

  if (!keyword) {
    return []
  }

  return searchTargets
    .filter(target => canMenu(target.menuPath))
    .map(target => ({
      id: `search-${target.id}`,
      label: `在${target.label}中搜索`,
      subtitle: `${target.subtitle}：${keyword}`,
      icon: target.icon,
      type: "搜索",
      keywords: [keyword, target.label, target.subtitle, ...target.keywords],
      to: {
        path: target.path,
        query: {
          [target.queryKey]: keyword,
        },
      },
    }))
})
const commandGroups = computed<SearchGroup[]>(() => [
  {
    id: "quick",
    heading: "快捷入口",
    items: quickSearchItems.value,
  },
  {
    id: "pages",
    heading: "页面",
    items: pageSearchItems.value,
  },
  {
    id: "keyword-search",
    heading: "数据搜索",
    items: keywordSearchItems.value,
  },
  {
    id: "settings",
    heading: "设置",
    items: settingsSearchItems.value,
  },
  {
    id: "sidebar",
    heading: "侧边栏",
    items: sidebarTabItems.value,
  },
].filter(group => group.items.length > 0))

function flattenNavigationItems(items: AppSidebarNavItem[], parentLabels: string[] = [], parentIcon = ""): SearchItem[] {
  return items.flatMap((item) => {
    if (item.kind === "separator") {
      return []
    }

    const itemIcon = item.icon || parentIcon || "ri-arrow-right-line"
    const children = item.children?.length
      ? flattenNavigationItems(item.children, [...parentLabels, item.label], itemIcon)
      : []
    const ownItem = item.path
      ? [{
          id: `page-${item.path}`,
          label: item.label,
          subtitle: parentLabels.length
            ? `${parentLabels.join(" / ")} / ${item.label}`
            : `打开${item.label}`,
          icon: itemIcon,
          type: "页面",
          keywords: [item.label, item.path, ...parentLabels],
          to: item.path,
          requiredMenuPath: item.permissionPath,
        } satisfies SearchItem]
      : []

    return [...ownItem, ...children]
  })
}

function isSearchItemAllowed(item: SearchItem) {
  if (item.requiredMenuPath && !canMenu(item.requiredMenuPath)) {
    return false
  }

  if (item.requiredButtonCode && !canButton(item.requiredButtonCode)) {
    return false
  }

  return true
}

function buildSearchValue(item: SearchItem) {
  return [
    item.label,
    item.subtitle,
    item.type,
    ...(item.keywords ?? []),
  ].filter(Boolean).join(" ")
}

function handleCommandSelect(item: SearchItem) {
  dialogOpen.value = false

  if (item.tabId) {
    emit("select-top-tab", item.tabId)
    return
  }

  if (item.to) {
    void router.push(item.to)
  }
}

watch(dialogOpen, (open) => {
  if (!open) {
    searchQuery.value = ""
  }
})
</script>

<template>
  <CommandDialog
    v-model:open="dialogOpen"
    title="全局搜索"
    description="搜索页面、功能和业务列表"
    :prevent-close-auto-focus="true"
    content-class="h-[min(720px,calc(100vh-2rem))] sm:max-w-[720px] [&>[data-slot=dialog-close]]:top-2 [&>[data-slot=dialog-close]]:right-2 [&>[data-slot=dialog-close]]:flex [&>[data-slot=dialog-close]]:h-8 [&>[data-slot=dialog-close]]:w-8 [&>[data-slot=dialog-close]]:items-center [&>[data-slot=dialog-close]]:justify-center [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:bg-transparent [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]]:ring-0 [&>[data-slot=dialog-close]]:transition-colors [&>[data-slot=dialog-close]]:focus:ring-0 [&>[data-slot=dialog-close]]:focus:ring-offset-0 [&>[data-slot=dialog-close]]:focus:outline-none [&>[data-slot=dialog-close]]:data-[state=open]:bg-transparent [&>[data-slot=dialog-close]]:data-[state=open]:text-sidebar-foreground/52 [&>[data-slot=dialog-close]]:hover:bg-transparent [&>[data-slot=dialog-close]]:hover:text-sidebar-accent-foreground [&>[data-slot=dialog-close]]:before:absolute [&>[data-slot=dialog-close]]:before:inset-0 [&>[data-slot=dialog-close]]:before:rounded-md [&>[data-slot=dialog-close]]:before:bg-[var(--top-tab-switch-active-surface)] [&>[data-slot=dialog-close]]:before:opacity-0 [&>[data-slot=dialog-close]]:before:scale-[0.94] [&>[data-slot=dialog-close]]:before:transition-[opacity,transform] [&>[data-slot=dialog-close]]:before:duration-[120ms,220ms] [&>[data-slot=dialog-close]]:before:ease-out [&>[data-slot=dialog-close]]:hover:before:opacity-100 [&>[data-slot=dialog-close]]:hover:before:scale-100 [&>[data-slot=dialog-close]]:focus-visible:before:opacity-100 [&>[data-slot=dialog-close]]:focus-visible:before:scale-100 [&>[data-slot=dialog-close]>i]:relative [&>[data-slot=dialog-close]>i]:z-10"
  >
    <CommandInput v-model="searchQuery" placeholder="搜索页面、功能，或输入关键词查找..." class="pr-12" />
    <CommandList class="min-h-0 flex-1 max-h-none px-1 py-1">
      <CommandEmpty class="py-10 text-muted-foreground">没有找到匹配结果。</CommandEmpty>

      <CommandGroup
        v-for="group in commandGroups"
        :key="group.id"
        :heading="group.heading"
      >
        <CommandItem
          v-for="item in group.items"
          :key="item.id"
          :value="buildSearchValue(item)"
          class="items-start gap-3 rounded-lg px-2.5 py-2.5"
          @select="handleCommandSelect(item)"
        >
          <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <i :class="[item.icon, 'text-base leading-none']" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-3">
              <span class="truncate font-medium">{{ item.label }}</span>
              <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-1 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>
      </CommandGroup>
    </CommandList>

    <div class="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
      <div class="flex min-w-0 items-center gap-2">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>
        <span class="truncate">选择</span>
      </div>

      <div class="flex items-center gap-2">
        <Kbd>Enter</Kbd>
        <span>打开</span>
      </div>

      <div class="hidden items-center gap-2 sm:flex">
        <Kbd>Esc</Kbd>
        <span>关闭</span>
      </div>
    </div>
  </CommandDialog>
</template>
