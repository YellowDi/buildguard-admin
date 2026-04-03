<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

type SearchItem = {
  id: string
  label: string
  subtitle: string
  icon: string
  type: string
  value: string
  to: RouteLocationRaw
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const router = useRouter()

const dialogOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
})
const searchQuery = ref("")

const pageSearchItems: SearchItem[] = [
  {
    id: "page-dashboard",
    label: "工作台",
    subtitle: "打开工作台首页",
    icon: "ri-home-5-line",
    type: "页面",
    value: "工作台 打开工作台首页 dashboard home workspace",
    to: "/",
  },
  {
    id: "page-customers",
    label: "客户",
    subtitle: "查看客户列表",
    icon: "ri-user-3-line",
    type: "页面",
    value: "客户 查看客户列表 customer client",
    to: "/customers",
  },
  {
    id: "page-inspection-services",
    label: "检测服务",
    subtitle: "查看检测服务列表",
    icon: "ri-shield-check-line",
    type: "页面",
    value: "检测服务 查看检测服务列表 inspection service services",
    to: "/inspection-services",
  },
  {
    id: "page-inspection-plans",
    label: "检测计划",
    subtitle: "查看检测计划列表",
    icon: "ri-calendar-check-line",
    type: "页面",
    value: "检测计划 查看检测计划列表 inspection plan plans",
    to: "/inspection-plans",
  },
  {
    id: "page-inspection-work-orders",
    label: "检测工单",
    subtitle: "查看检测工单列表",
    icon: "ri-file-list-3-line",
    type: "页面",
    value: "检测工单 查看检测工单列表 inspection work order work-order ticket",
    to: "/work-orders/inspection",
  },
  {
    id: "page-repair-work-orders",
    label: "报修工单",
    subtitle: "查看报修工单列表",
    icon: "ri-tools-line",
    type: "页面",
    value: "报修工单 查看报修工单列表 repair work order work-order ticket",
    to: "/work-orders/repair",
  },
]

const quickSearchItems: SearchItem[] = [
  {
    id: "action-customer-create",
    label: "添加客户",
    subtitle: "进入客户新建流程",
    icon: "ri-add-circle-line",
    type: "新建",
    value: "添加客户 进入客户新建流程 create customer",
    to: "/customers/create",
  },
]

function handleCommandSelect(to: RouteLocationRaw) {
  dialogOpen.value = false
  router.push(to)
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const isCommandShortcut = (event.metaKey || event.ctrlKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === "k"

  if (!isCommandShortcut) {
    return
  }

  event.preventDefault()
  dialogOpen.value = true
}

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown)
})

function buildSearchValue(...parts: Array<string | number | undefined>) {
  return parts.filter(Boolean).join(" ")
}

function getMatchedItems(items: SearchItem[]) {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return []
  }

  return items.filter(item => item.value.toLowerCase().includes(keyword))
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
    title="搜索"
    description="搜索页面与常用操作"
    :prevent-close-auto-focus="true"
    content-class="h-[min(680px,calc(100vh-2rem))] [&>[data-slot=dialog-close]]:top-0.5 [&>[data-slot=dialog-close]]:right-2 [&>[data-slot=dialog-close]]:flex [&>[data-slot=dialog-close]]:h-8 [&>[data-slot=dialog-close]]:w-8 [&>[data-slot=dialog-close]]:items-center [&>[data-slot=dialog-close]]:justify-center [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:bg-transparent [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]]:ring-0 [&>[data-slot=dialog-close]]:transition-colors [&>[data-slot=dialog-close]]:focus:ring-0 [&>[data-slot=dialog-close]]:focus:ring-offset-0 [&>[data-slot=dialog-close]]:focus:outline-none [&>[data-slot=dialog-close]]:data-[state=open]:bg-transparent [&>[data-slot=dialog-close]]:data-[state=open]:text-sidebar-foreground/52 [&>[data-slot=dialog-close]]:hover:bg-transparent [&>[data-slot=dialog-close]]:hover:text-sidebar-accent-foreground [&>[data-slot=dialog-close]]:before:absolute [&>[data-slot=dialog-close]]:before:inset-0 [&>[data-slot=dialog-close]]:before:rounded-md [&>[data-slot=dialog-close]]:before:bg-[var(--top-tab-switch-active-surface)] [&>[data-slot=dialog-close]]:before:opacity-0 [&>[data-slot=dialog-close]]:before:scale-[0.94] [&>[data-slot=dialog-close]]:before:transition-[opacity,transform] [&>[data-slot=dialog-close]]:before:duration-[120ms,220ms] [&>[data-slot=dialog-close]]:before:ease-out [&>[data-slot=dialog-close]]:hover:before:opacity-100 [&>[data-slot=dialog-close]]:hover:before:scale-100 [&>[data-slot=dialog-close]]:focus-visible:before:opacity-100 [&>[data-slot=dialog-close]]:focus-visible:before:scale-100 [&>[data-slot=dialog-close]>svg]:relative [&>[data-slot=dialog-close]>svg]:z-10"
  >
    <CommandInput v-model="searchQuery" placeholder="搜索..." class="pr-12" />
    <CommandList class="min-h-0 flex-1 max-h-none">
      <CommandEmpty>没有找到匹配结果。</CommandEmpty>

      <CommandGroup heading="页面">
        <CommandItem
          v-for="item in pageSearchItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="快捷操作">
        <CommandItem
          v-for="item in quickSearchItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>
      </CommandGroup>
    </CommandList>

    <div class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
      <div class="flex items-center gap-2">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>
        <span>移动选择</span>
      </div>

      <div class="flex items-center gap-2">
        <Kbd>Enter</Kbd>
        <span>执行</span>
      </div>

      <div class="flex items-center gap-2">
        <Kbd>Esc</Kbd>
        <span>关闭</span>
      </div>
    </div>
  </CommandDialog>
</template>
