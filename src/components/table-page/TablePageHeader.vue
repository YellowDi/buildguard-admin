<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { toast } from "vue-sonner"

import { Button } from "@/components/ui/button"
import { useSlidingTabIndicator } from "@/composables/useSlidingTabIndicator"
import DateFilterPopover from "@/components/table-page/TableDateFilterPopover.vue"
import FilterChip from "@/components/table-page/TableFilterChip.vue"
import NumberFilterPopover from "@/components/table-page/TableNumberFilterPopover.vue"
import SortPopover from "@/components/table-page/TableSortPopover.vue"
import TagFilterPopover from "@/components/table-page/TableTagFilterPopover.vue"
import TextFilterPopover from "@/components/table-page/TableTextFilterPopover.vue"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TooltipWrap } from "@/components/ui/tooltip"
import type { SortFieldOption, SortRule } from "@/components/table-page/sort.types"
import type {
  DateFilterState,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  TagFilterState,
  TextFilterState,
} from "@/components/table-page/types"
import { toMobileActionLabel } from "@/lib/mobileActionLabel"

type MobileToolbarActionKey = "filters" | "sort" | "export" | "primary"
type TableMoreActionKey =
  | "refresh"
  | "columns"
  | "density"
  | "pinned-columns"
  | "save-view"
  | "manage-views"
  | "reset-view"
  | "audit-log"
  | "export-records"

const props = withDefaults(defineProps<{
  title: string
  description?: string
  tabs: HeaderTab[]
  fields: HeaderField[]
  availableFilters?: string[]
  showControls: boolean
  customSortEnabled: boolean
  sortRules: SortRule[]
  sortFieldOptions?: SortFieldOption[]
  textFilters?: Record<string, TextFilterState>
  numberFilters?: Record<string, NumberFilterState>
  tagFilters?: Record<string, TagFilterState>
  tagFilterOptions?: Record<string, string[]>
  dateFilters?: Record<string, DateFilterState>
  dateFilterFields?: string[]
  primaryActionLabel?: string
  selectedRowsCount?: number
  showToolbarActions?: boolean
  listLevelTable?: boolean
}>(), {
  availableFilters: () => [],
  textFilters: () => ({}),
  numberFilters: () => ({}),
  tagFilters: () => ({}),
  tagFilterOptions: () => ({}),
  dateFilters: () => ({}),
  dateFilterFields: () => [],
  sortFieldOptions: () => [],
  primaryActionLabel: "",
  showToolbarActions: true,
  listLevelTable: true,
})

const emit = defineEmits<{
  "tab-click": [tab: HeaderTab]
  "toggle-controls": []
  "refresh-action": []
  "set-custom-sort-enabled": [enabled: boolean]
  "update-sort-rules": [rules: SortRule[]]
  "update-text-filter": [payload: { label: string; value: TextFilterState }]
  "update-number-filter": [payload: { label: string; value: NumberFilterState }]
  "update-tag-filter": [payload: { label: string; value: TagFilterState }]
  "update-date-filter": [payload: { label: string; value: DateFilterState }]
  "add-filter": [key: string]
  "replace-filter": [payload: { from: string; to: string; value?: DateFilterState }]
  "remove-filter": [key: string]
  "clear-all-filters": []
  "export-action": []
  "primary-action": []
}>()

const openPopover = ref<string | null>(null)
const sortPopoverSource = ref<"toolbar" | "chip">("toolbar")
const ghostIconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-interactive-hover hover:text-foreground active:bg-surface-secondary"
const ghostIconButtonActiveClass =
  "bg-transparent text-link hover:bg-interactive-hover active:bg-surface-secondary"
const tableMoreActions: Array<{
  key: TableMoreActionKey
  label: string
  iconClass: string
  separated?: boolean
}> = [
  { key: "refresh", label: "数据刷新", iconClass: "ri-refresh-line" },
  { key: "columns", label: "列显示设置", iconClass: "ri-layout-column-line" },
  { key: "density", label: "表格密度", iconClass: "ri-line-height" },
  { key: "pinned-columns", label: "固定列", iconClass: "ri-pushpin-line" },
  { key: "save-view", label: "保存当前筛选为视图", iconClass: "ri-bookmark-line", separated: true },
  { key: "manage-views", label: "管理视图", iconClass: "ri-folder-settings-line" },
  { key: "reset-view", label: "重置视图", iconClass: "ri-restart-line" },
  { key: "audit-log", label: "查看操作日志", iconClass: "ri-history-line", separated: true },
  { key: "export-records", label: "导出记录", iconClass: "ri-download-line" },
]
const placeholderBulkActions = [
  { label: "批量修改", iconClass: "ri-edit-line", danger: false },
  { label: "导出", iconClass: "ri-download-line", danger: false },
  { label: "删除", iconClass: "ri-delete-bin-line", danger: true },
] as const

const sortFields = computed(() => props.fields.filter(field => field.kind === "sort"))
const activeFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && field.accent))
const inactiveFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && !field.accent))
const visibleFilterKeys = computed(() => props.fields.filter((field) => field.kind !== "sort").map((field) => field.key))
const addableFilters = computed(() => props.availableFilters.filter((key) => !visibleFilterKeys.value.includes(key)))
const hasTabs = computed(() => props.tabs.length > 0)
const hasHeading = computed(() => Boolean(props.title || props.description))
const hasSelectedRows = computed(() => (props.selectedRowsCount ?? 0) > 0)
const hasControlsRow = computed(() => props.showControls || hasSelectedRows.value)
const hasTopSurface = computed(() => hasHeading.value || hasTabs.value || props.showToolbarActions)
const activeTabLabel = computed(() => props.tabs.find(tab => tab.active)?.label ?? props.tabs[0]?.label ?? "")
const mobilePrimaryActionLabel = computed(() => toMobileActionLabel(props.primaryActionLabel))
const mobileToolbarItems = computed<Array<{
  key: MobileToolbarActionKey
  label: string
  iconClass: string
  active?: boolean
}>>(() => {
  const items: Array<{
    key: MobileToolbarActionKey
    label: string
    iconClass: string
    active?: boolean
  }> = [
    {
      key: "filters",
      label: props.showControls ? "隐藏筛选" : "显示筛选",
      iconClass: "ri-filter-3-line",
      active: props.showControls,
    },
    {
      key: "sort",
      label: props.customSortEnabled ? "关闭排序" : "启用排序",
      iconClass: "ri-sort-asc",
      active: props.customSortEnabled,
    },
  ]

  if (props.primaryActionLabel) {
    items.push({
      key: "primary",
      label: props.primaryActionLabel,
      iconClass: "ri-add-line",
    })
  }

  return items
})
const quickMobileToolbarItems = computed(() => mobileToolbarItems.value.filter(item => item.key === "filters" || item.key === "sort"))
const actionMobileToolbarItems = computed(() => mobileToolbarItems.value.filter(item => item.key !== "filters" && item.key !== "sort"))
const primaryMobileToolbarItem = computed(() => actionMobileToolbarItems.value[actionMobileToolbarItems.value.length - 1] ?? null)
const overflowMobileToolbarItems = computed(() => actionMobileToolbarItems.value.slice(0, -1))
const mobileTabsScrollViewportRef = ref<HTMLElement | null>(null)
const mobileTabsOverflowLeft = ref(false)
const mobileTabsOverflowRight = ref(false)
let mobileTabsResizeObserver: ResizeObserver | null = null
const tabsScrollViewportRef = ref<HTMLElement | null>(null)
const tabsOverflowLeft = ref(false)
const tabsOverflowRight = ref(false)
let tabsResizeObserver: ResizeObserver | null = null
const controlsScrollViewportRef = ref<HTMLElement | null>(null)
const controlsOverflowLeft = ref(false)
const controlsOverflowRight = ref(false)
let controlsResizeObserver: ResizeObserver | null = null
const { indicatorStyle, setTabRef } = useSlidingTabIndicator({
  activeKey: activeTabLabel,
  watchSource: computed(() => props.tabs.map(tab => `${tab.label}:${Number(Boolean(tab.active))}`)),
})
const { indicatorStyle: mobileIndicatorStyle, setTabRef: setMobileTabRef } = useSlidingTabIndicator({
  activeKey: activeTabLabel,
  watchSource: computed(() => props.tabs.map(tab => `${tab.label}:${Number(Boolean(tab.active))}`)),
})

function getTextFilter(key: string) {
  return props.textFilters[key]
}

function getDateFilter(key: string) {
  return props.dateFilters[key]
}

function getNumberFilter(key: string) {
  return props.numberFilters[key]
}

function getTagFilter(key: string) {
  return props.tagFilters[key]
}

function togglePopover(kind: string) {
  openPopover.value = openPopover.value === kind ? null : kind
}

function openSortPopover(source: "toolbar" | "chip") {
  const sameSource = openPopover.value === "sort-popover" && sortPopoverSource.value === source
  sortPopoverSource.value = source
  openPopover.value = sameSource ? null : "sort-popover"
}

function buildNextSortRule(): SortRule {
  const fallbackField = props.sortFieldOptions[0]?.value ?? ""
  const unusedField = props.sortFieldOptions.find((option) => !props.sortRules.some((rule) => rule.field === option.value))?.value
    ?? fallbackField
  const fieldMeta = props.sortFieldOptions.find((option) => option.value === unusedField)

  return {
    id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field: unusedField,
    direction: fieldMeta?.kind === "metric" ? "desc" : "asc",
  }
}

function handleToolbarAddSort() {
  if (!props.sortFieldOptions.length) {
    return
  }

  closePopover()

  if (!props.showControls) {
    emit("toggle-controls")
  }

  if (props.customSortEnabled && props.sortRules.length) {
    return
  }

  const nextRules = props.sortRules.length ? props.sortRules : [buildNextSortRule()]
  emit("set-custom-sort-enabled", true)
  emit("update-sort-rules", nextRules)
}

function closePopover() {
  openPopover.value = null
}

function handleSortEnabledChange(enabled: boolean) {
  emit("set-custom-sort-enabled", enabled)
}

function handleSortRulesChange(rules: SortRule[]) {
  emit("update-sort-rules", rules)
}

function handleTextFilterChange(label: string, value: TextFilterState) {
  emit("update-text-filter", { label, value })
}

function handleDateFilterChange(label: string, value: DateFilterState) {
  emit("update-date-filter", { label, value })
}

function handleDateFilterFieldSwitch(currentKey: string, nextKey: string) {
  if (currentKey === nextKey) {
    return
  }

  emit("replace-filter", {
    from: currentKey,
    to: nextKey,
    value: getDateFilter(currentKey),
  })
  openPopover.value = nextKey
}

function handleNumberFilterChange(label: string, value: NumberFilterState) {
  emit("update-number-filter", { label, value })
}

function handleTagFilterChange(label: string, value: TagFilterState) {
  emit("update-tag-filter", { label, value })
}

function isFieldActive(field: HeaderField) {
  if (field.kind === "sort") {
    return field.accent || (openPopover.value === "sort-popover" && sortPopoverSource.value === "chip")
  }

  return field.accent || openPopover.value === field.key
}

function shouldShowDividerBeforeInactiveFilters() {
  return inactiveFilterFields.value.length > 0 && (sortFields.value.length > 0 || activeFilterFields.value.length > 0)
}

function handleAddFilter(key: string) {
  emit("add-filter", key)
  closePopover()
}

function handleRemoveFilter(key: string) {
  emit("remove-filter", key)
  closePopover()
}

function handleClearAllFilters() {
  emit("clear-all-filters")
  closePopover()
}

function handleMobileToolbarActionSelect(action: MobileToolbarActionKey) {
  if (action === "filters") {
    emit("toggle-controls")
    return
  }

  if (action === "sort") {
    if (props.customSortEnabled) {
      emit("set-custom-sort-enabled", false)
      return
    }

    handleToolbarAddSort()
    return
  }

  if (action === "export") {
    emit("export-action")
    return
  }

  if (action === "primary") {
    emit("primary-action")
  }
}

function handleTableMoreActionSelect(action: TableMoreActionKey) {
  if (action === "refresh") {
    emit("refresh-action")
    return
  }

  if (action === "export-records") {
    emit("export-action")
    return
  }

  const actionLabel = tableMoreActions.find(item => item.key === action)?.label ?? "该功能"
  toast.info(`${actionLabel}暂未接入`, {
    description: "当前仅保留入口，后续会补齐实际能力。",
  })
}

function handlePlaceholderBulkAction(actionLabel: string) {
  toast.info(`${actionLabel}暂未接入`, {
    description: "当前仅保留批量操作入口，后续会补齐实际能力。",
  })
}

function syncControlsOverflowState() {
  const element = controlsScrollViewportRef.value
  if (!element) {
    controlsOverflowLeft.value = false
    controlsOverflowRight.value = false
    return
  }

  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
  controlsOverflowLeft.value = element.scrollLeft > 2
  controlsOverflowRight.value = maxScrollLeft - element.scrollLeft > 2
}

function handleControlsScroll() {
  syncControlsOverflowState()
}

function syncMobileTabsOverflowState() {
  const element = mobileTabsScrollViewportRef.value
  if (!element) {
    mobileTabsOverflowLeft.value = false
    mobileTabsOverflowRight.value = false
    return
  }

  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
  mobileTabsOverflowLeft.value = element.scrollLeft > 2
  mobileTabsOverflowRight.value = maxScrollLeft - element.scrollLeft > 2
}

function handleMobileTabsScroll() {
  syncMobileTabsOverflowState()
}

function syncTabsOverflowState() {
  const element = tabsScrollViewportRef.value
  if (!element) {
    tabsOverflowLeft.value = false
    tabsOverflowRight.value = false
    return
  }

  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
  tabsOverflowLeft.value = element.scrollLeft > 2
  tabsOverflowRight.value = maxScrollLeft - element.scrollLeft > 2
}

function handleTabsScroll() {
  syncTabsOverflowState()
}

onMounted(() => {
  nextTick(() => {
    syncMobileTabsOverflowState()
    syncTabsOverflowState()
    syncControlsOverflowState()

    if (typeof ResizeObserver !== "undefined" && mobileTabsScrollViewportRef.value) {
      mobileTabsResizeObserver = new ResizeObserver(() => {
        syncMobileTabsOverflowState()
      })
      mobileTabsResizeObserver.observe(mobileTabsScrollViewportRef.value)
    }

    if (typeof ResizeObserver !== "undefined" && tabsScrollViewportRef.value) {
      tabsResizeObserver = new ResizeObserver(() => {
        syncTabsOverflowState()
      })
      tabsResizeObserver.observe(tabsScrollViewportRef.value)
    }

    if (typeof ResizeObserver !== "undefined" && controlsScrollViewportRef.value) {
      controlsResizeObserver = new ResizeObserver(() => {
        syncControlsOverflowState()
      })
      controlsResizeObserver.observe(controlsScrollViewportRef.value)
    }
  })

  window.addEventListener("resize", syncMobileTabsOverflowState)
  window.addEventListener("resize", syncTabsOverflowState)
  window.addEventListener("resize", syncControlsOverflowState)
})

onBeforeUnmount(() => {
  mobileTabsResizeObserver?.disconnect()
  mobileTabsResizeObserver = null
  tabsResizeObserver?.disconnect()
  tabsResizeObserver = null
  controlsResizeObserver?.disconnect()
  controlsResizeObserver = null
  window.removeEventListener("resize", syncMobileTabsOverflowState)
  window.removeEventListener("resize", syncTabsOverflowState)
  window.removeEventListener("resize", syncControlsOverflowState)
})

watch(
  () => [
    props.showControls,
    hasSelectedRows.value,
    sortFields.value.length,
    activeFilterFields.value.length,
    inactiveFilterFields.value.length,
    addableFilters.value.length,
  ],
  () => {
    nextTick(() => {
      syncControlsOverflowState()
    })
  },
)

watch(
  () => [
    props.showToolbarActions,
    props.tabs.length,
    activeTabLabel.value,
  ],
  () => {
    nextTick(() => {
      syncMobileTabsOverflowState()
      syncTabsOverflowState()
    })
  },
)
</script>

<template>
  <div class="flex min-w-0 w-full flex-col">
    <div v-if="hasTopSurface" :class="props.listLevelTable ? 'px-4 sm:px-8' : ''">
      <div class="flex min-w-0 flex-col border-b border-border">
        <div
          v-if="hasHeading || (!hasTabs && props.showToolbarActions)"
          class="flex min-w-0 justify-between gap-x-4 gap-y-3"
          :class="[
            hasTabs ? 'flex-wrap items-end' : 'flex-nowrap items-center sm:items-end',
            hasHeading ? 'pb-2' : 'pb-0',
          ]"
        >
          <div
            v-if="hasHeading"
            :class="[
              'min-w-0 flex flex-1 gap-x-2',
              hasTabs
                ? 'flex-nowrap items-baseline gap-y-1 sm:flex-wrap'
                : 'items-baseline overflow-hidden',
            ]"
          >
            <h1
              :class="[
                'leading-none font-semibold text-foreground',
                hasTabs
                  ? 'min-w-0 truncate text-[32px] sm:overflow-visible sm:whitespace-normal sm:text-clip sm:text-[48px]'
                  : 'shrink-0 whitespace-nowrap text-[32px] sm:text-[40px] xl:text-[48px]',
              ]"
            >
              {{ title }}
            </h1>
            <span
              v-if="description"
              :class="[
                'hidden text-[18px] leading-none font-normal text-muted-foreground sm:inline sm:text-[20px]',
                hasTabs ? '' : 'min-w-0 flex-1 truncate',
              ]"
            >
              {{ description }}
            </span>
          </div>

          <div
            v-if="!hasTabs && props.showToolbarActions"
            class="ml-auto flex min-w-0 shrink-0 justify-end"
          >
            <div class="flex items-center justify-end gap-1 sm:hidden">
              <button
                v-for="item in quickMobileToolbarItems"
                :key="item.key"
                type="button"
                :aria-label="item.label"
                :class="[
                  ghostIconButtonClass,
                  item.active ? ghostIconButtonActiveClass : '',
                ]"
                @click="handleMobileToolbarActionSelect(item.key)"
              >
                <i :class="[item.iconClass, 'text-[17px]', item.active ? 'text-link' : '']" />
              </button>

              <Button
                v-if="primaryMobileToolbarItem && overflowMobileToolbarItems.length === 0"
                variant="default"
                size="sm"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                :aria-label="primaryMobileToolbarItem.label"
                @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
              >
                <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                {{ mobilePrimaryActionLabel }}
              </Button>

              <ButtonGroup v-else-if="primaryMobileToolbarItem" aria-label="移动端表格操作">
                <Button
                  variant="default"
                  size="sm"
                  static
                  class="h-8 gap-1 px-3 text-[14px]"
                  :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                  :aria-label="primaryMobileToolbarItem.label"
                  @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
                >
                  <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                  {{ mobilePrimaryActionLabel }}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button static variant="default" size="icon-sm" class="size-8" aria-label="更多操作">
                      <i class="ri-arrow-down-s-line text-base" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5">
                    <DropdownMenuItem
                      v-for="item in overflowMobileToolbarItems"
                      :key="item.key"
                      class="rounded-lg px-2.5 py-2"
                      @select="handleMobileToolbarActionSelect(item.key)"
                    >
                      <i :class="[item.iconClass, 'mr-2 text-base', item.active ? 'text-link' : 'text-muted-foreground']" />
                      {{ item.label }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>

            <div class="hidden min-w-0 flex-wrap items-center justify-end gap-1 text-muted-foreground sm:flex sm:flex-nowrap">
              <TooltipWrap content="筛选">
                <button
                  type="button"
                  aria-label="筛选"
                  :class="[
                    ghostIconButtonClass,
                    showControls ? ghostIconButtonActiveClass : '',
                  ]"
                  @click="emit('toggle-controls')"
                >
                  <i :class="['ri-filter-3-line text-[17px]', showControls ? 'text-link' : '']" />
                </button>
              </TooltipWrap>
              <div class="relative" data-list-popover>
                <TooltipWrap content="排序">
                  <button
                    type="button"
                    aria-label="排序"
                    :class="[
                      ghostIconButtonClass,
                      customSortEnabled ? ghostIconButtonActiveClass : '',
                    ]"
                    @click="handleToolbarAddSort"
                  >
                    <i :class="['ri-sort-asc text-[17px]', customSortEnabled ? 'text-link' : '']" />
                  </button>
                </TooltipWrap>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    aria-label="更多"
                    title="更多"
                    :class="ghostIconButtonClass"
                  >
                    <i class="ri-more-line text-base" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" class="w-56 rounded-xl p-1.5">
                  <template v-for="item in tableMoreActions" :key="item.key">
                    <DropdownMenuSeparator v-if="item.separated" />
                    <DropdownMenuItem
                      class="rounded-lg px-2.5 py-2"
                      @select="handleTableMoreActionSelect(item.key)"
                    >
                      <i :class="[item.iconClass, 'mr-2 text-base text-muted-foreground']" />
                      {{ item.label }}
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('export-action')"
              >
                <i class="ri-download-line text-base" />
                导出
              </Button>
              <Button
                v-if="primaryActionLabel"
                variant="default"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('primary-action')"
              >
                <i class="ri-add-line text-base" />
                {{ primaryActionLabel }}
              </Button>
            </div>
          </div>
        </div>

        <div
          v-if="hasTabs"
          class="text-muted-foreground"
        >
          <div class="flex min-w-0 items-end gap-2 sm:hidden">
            <div class="relative min-w-0 flex-1 overflow-visible pt-1">
              <div
                ref="mobileTabsScrollViewportRef"
                data-table-header-tabs-scroll
                class="min-w-0 -mt-1 overflow-x-auto whitespace-nowrap pt-1"
                @scroll="handleMobileTabsScroll"
              >
                <nav class="relative flex min-w-max flex-nowrap items-center text-[14px]">
                  <button
                    v-for="tab in tabs"
                    :key="tab.label"
                    :ref="(element) => setMobileTabRef(tab.label, element)"
                    type="button"
                    :aria-pressed="tab.active"
                    :class="[
                      'group relative shrink-0 px-3 pb-[11px] text-muted-foreground transition-colors hover:text-foreground',
                      'duration-180 ease-out',
                      tab.active ? 'font-semibold text-foreground' : '',
                    ]"
                    @click="emit('tab-click', tab)"
                  >
                    <span class="relative isolate inline-block">
                      <span class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md transition-colors group-hover:bg-interactive-hover" />
                      <span class="relative z-10">{{ tab.label }}</span>
                    </span>
                  </button>
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    :style="mobileIndicatorStyle"
                  />
                </nav>
              </div>

              <div
                v-if="mobileTabsOverflowLeft"
                class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/88 to-transparent"
              />
              <div
                v-if="mobileTabsOverflowRight"
                class="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/92 to-transparent"
              />
            </div>

            <div v-if="props.showToolbarActions" class="ml-auto flex shrink-0 items-center justify-end gap-1 pb-2">
              <button
                v-for="item in quickMobileToolbarItems"
                :key="item.key"
                type="button"
                :aria-label="item.label"
                :class="[
                  ghostIconButtonClass,
                  item.active ? ghostIconButtonActiveClass : '',
                ]"
                @click="handleMobileToolbarActionSelect(item.key)"
              >
                <i :class="[item.iconClass, 'text-[17px]', item.active ? 'text-link' : '']" />
              </button>

              <Button
                v-if="primaryMobileToolbarItem && overflowMobileToolbarItems.length === 0"
                variant="default"
                size="sm"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                :aria-label="primaryMobileToolbarItem.label"
                @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
              >
                <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                {{ mobilePrimaryActionLabel }}
              </Button>

              <ButtonGroup v-else-if="primaryMobileToolbarItem" aria-label="移动端表格操作">
                <Button
                  variant="default"
                  size="sm"
                  static
                  class="h-8 gap-1 px-3 text-[14px]"
                  :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                  :aria-label="primaryMobileToolbarItem.label"
                  @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
                >
                  <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                  {{ mobilePrimaryActionLabel }}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button static variant="default" size="icon-sm" class="size-8" aria-label="更多操作">
                      <i class="ri-arrow-down-s-line text-base" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5">
                    <DropdownMenuItem
                      v-for="item in overflowMobileToolbarItems"
                      :key="item.key"
                      class="rounded-lg px-2.5 py-2"
                      @select="handleMobileToolbarActionSelect(item.key)"
                    >
                      <i :class="[item.iconClass, 'mr-2 text-base', item.active ? 'text-link' : 'text-muted-foreground']" />
                      {{ item.label }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
          </div>

          <div class="hidden min-w-0 items-end gap-3 sm:flex sm:flex-nowrap">
            <div class="relative min-w-0 flex-[999_1_24rem] overflow-visible">
              <div
                ref="tabsScrollViewportRef"
                data-table-header-tabs-scroll
                class="min-w-0 -mt-1 overflow-x-auto whitespace-nowrap pt-1"
                @scroll="handleTabsScroll"
              >
                <nav class="relative flex min-w-max flex-nowrap items-center text-[14px]">
                  <button
                    v-for="tab in tabs"
                    :key="tab.label"
                    :ref="(element) => setTabRef(tab.label, element)"
                    type="button"
                    :aria-pressed="tab.active"
                    :class="[
                      'group relative shrink-0 px-3 pb-[11px] text-muted-foreground transition-colors hover:text-foreground',
                      'duration-180 ease-out',
                      tab.active ? 'font-semibold text-foreground' : '',
                    ]"
                    @click="emit('tab-click', tab)"
                  >
                    <span class="relative isolate inline-block">
                      <span class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md transition-colors group-hover:bg-interactive-hover" />
                      <span class="relative z-10">{{ tab.label }}</span>
                    </span>
                  </button>
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    :style="indicatorStyle"
                  />
                </nav>
              </div>

              <div
                v-if="tabsOverflowLeft"
                class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/88 to-transparent"
              />
              <div
                v-if="tabsOverflowRight"
                class="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/92 to-transparent"
              />
            </div>

            <div
              v-if="props.showToolbarActions"
              class="flex min-w-0 flex-[0_0_auto] items-center justify-end gap-1 pb-2 text-muted-foreground"
            >
              <TooltipWrap content="筛选">
                <button
                  type="button"
                  aria-label="筛选"
                  :class="[
                    ghostIconButtonClass,
                    showControls ? ghostIconButtonActiveClass : '',
                  ]"
                  @click="emit('toggle-controls')"
                >
                  <i :class="['ri-filter-3-line text-[17px]', showControls ? 'text-link' : '']" />
                </button>
              </TooltipWrap>
              <div class="relative" data-list-popover>
                <TooltipWrap content="排序">
                  <button
                    type="button"
                    aria-label="排序"
                    :class="[
                      ghostIconButtonClass,
                      customSortEnabled ? ghostIconButtonActiveClass : '',
                    ]"
                    @click="handleToolbarAddSort"
                  >
                    <i :class="['ri-sort-asc text-[17px]', customSortEnabled ? 'text-link' : '']" />
                  </button>
                </TooltipWrap>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    aria-label="更多"
                    title="更多"
                    :class="ghostIconButtonClass"
                  >
                    <i class="ri-more-line text-base" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" class="w-56 rounded-xl p-1.5">
                  <template v-for="item in tableMoreActions" :key="item.key">
                    <DropdownMenuSeparator v-if="item.separated" />
                    <DropdownMenuItem
                      class="rounded-lg px-2.5 py-2"
                      @select="handleTableMoreActionSelect(item.key)"
                    >
                      <i :class="[item.iconClass, 'mr-2 text-base text-muted-foreground']" />
                      {{ item.label }}
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('export-action')"
              >
                <i class="ri-download-line text-base" />
                导出
              </Button>
              <Button
                v-if="primaryActionLabel"
                variant="default"
                static
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('primary-action')"
              >
                <i class="ri-add-line text-base" />
                {{ primaryActionLabel }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition
      :enter-active-class="`transition-[max-height,opacity,transform] duration-200 ease-out ${hasSelectedRows ? 'overflow-visible' : 'overflow-hidden'}`"
      enter-from-class="max-h-0 opacity-0 -translate-y-1"
      enter-to-class="max-h-16 opacity-100 translate-y-0"
      :leave-active-class="`transition-[max-height,opacity,transform] duration-150 ease-in ${hasSelectedRows ? 'overflow-visible' : 'overflow-hidden'}`"
      leave-from-class="max-h-16 opacity-100 translate-y-0"
      leave-to-class="max-h-0 opacity-0 -translate-y-1"
    >
      <div v-if="hasControlsRow" :class="props.listLevelTable ? 'px-4 py-2.5 sm:px-8 overflow-visible' : 'py-2.5 overflow-visible'">
        <div
          :class="[
            'relative overflow-visible',
            showControls ? 'min-h-6' : 'min-h-8',
            hasSelectedRows ? '-ml-2 pl-2' : '',
          ]"
        >
          <div
            class="pointer-events-none absolute left-1 top-1/2 z-20 flex w-max max-w-full -translate-y-1/2 overflow-visible"
          >
            <Transition
              enter-active-class="transition-[opacity,transform] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]"
              enter-from-class="opacity-0 scale-[0.985]"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.4,0,1,1)]"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-[0.99]"
            >
              <div
                v-if="hasSelectedRows"
                class="pointer-events-auto flex min-w-0 max-w-full items-center py-1 origin-left will-change-[transform,opacity]"
              >
                <ButtonGroup
                  aria-label="批量操作"
                  class="translate-y-px overflow-hidden bg-background/96 shadow-sm ring-1 ring-border/60 backdrop-blur supports-backdrop-filter:bg-background/88"
                >
                  <div class="inline-flex h-8 items-center rounded-l-md bg-background px-3 text-[14px] leading-none font-medium text-foreground whitespace-nowrap">
                    已选 {{ props.selectedRowsCount }} 项
                  </div>
                  <slot name="bulk-actions" :selected-rows-count="props.selectedRowsCount">
                    <Button
                      v-for="action in placeholderBulkActions"
                      :key="action.label"
                      variant="outline"
                      static
                      :class="[
                        'h-8 gap-1 px-3 text-[14px] leading-none whitespace-nowrap',
                        action.danger ? 'text-destructive hover:text-destructive' : '',
                      ]"
                      @click="handlePlaceholderBulkAction(action.label)"
                    >
                      <i :class="[action.iconClass, 'text-base']" />
                      {{ action.label }}
                    </Button>
                  </slot>
                </ButtonGroup>
              </div>
            </Transition>
          </div>

          <div class="relative min-w-0 overflow-visible">
            <div
              ref="controlsScrollViewportRef"
              data-table-header-controls-scroll
              class="min-w-0 overflow-x-auto overflow-y-visible whitespace-nowrap"
              @scroll="handleControlsScroll"
            >
              <div class="flex min-w-max flex-nowrap items-center gap-1 pr-6 text-[14px] text-muted-foreground">
              <template v-if="showControls">
                <slot name="controls-prefix" />

                <template v-for="field in sortFields" :key="field.key">
                  <Popover
                    :open="field.kind === 'sort' && openPopover === 'sort-popover' && sortPopoverSource === 'chip'"
                    @update:open="(nextOpen) => {
                      if (field.kind !== 'sort') {
                        return
                      }

                      if (nextOpen) {
                        openSortPopover('chip')
                        return
                      }

                      closePopover()
                    }"
                  >
                    <PopoverTrigger as-child>
                      <FilterChip
                        :icon="field.icon"
                        :label="field.label"
                        :caret="field.arrow"
                        :selected="isFieldActive(field)"
                      />
                    </PopoverTrigger>

                    <PopoverContent
                      v-if="field.kind === 'sort'"
                      align="start"
                      :side-offset="10"
                      class="w-auto border-0 bg-transparent p-0 shadow-none"
                    >
                      <SortPopover
                        :enabled="customSortEnabled"
                        :rules="sortRules"
                        :field-options="sortFieldOptions"
                        @close="closePopover"
                        @set-enabled="handleSortEnabledChange"
                        @update-rules="handleSortRulesChange"
                      />
                    </PopoverContent>
                  </Popover>
                </template>

                <template v-for="field in activeFilterFields" :key="field.key">
                  <Popover
                    :open="openPopover === field.key"
                    @update:open="(nextOpen) => {
                      if (nextOpen) {
                        togglePopover(field.key)
                        return
                      }

                      closePopover()
                    }"
                  >
                    <PopoverTrigger as-child>
                      <FilterChip
                        :icon="field.icon"
                        :label="field.label"
                        :caret="field.arrow"
                        :selected="isFieldActive(field)"
                      />
                    </PopoverTrigger>

                    <PopoverContent
                      v-if="openPopover === field.key"
                      align="start"
                      :side-offset="10"
                      class="w-auto border-0 bg-transparent p-0 shadow-none"
                    >
                      <TextFilterPopover
                        v-if="field.kind === 'text-filter' && getTextFilter(field.key)"
                        :title="field.key"
                        :value="getTextFilter(field.key)!"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleTextFilterChange(field.key, $event)"
                      />

                      <TagFilterPopover
                        v-else-if="field.kind === 'tag-filter' && getTagFilter(field.key)"
                        :title="field.key"
                        :value="getTagFilter(field.key)!"
                        :options="props.tagFilterOptions[field.key] ?? []"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleTagFilterChange(field.key, $event)"
                      />

                      <NumberFilterPopover
                        v-else-if="field.kind === 'number-filter' && getNumberFilter(field.key)"
                        :title="field.key"
                        :value="getNumberFilter(field.key)!"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleNumberFilterChange(field.key, $event)"
                      />

                      <DateFilterPopover
                        v-else-if="field.kind === 'date-filter' && getDateFilter(field.key)"
                        :title="field.key"
                        :value="getDateFilter(field.key)!"
                        :fields="props.dateFilterFields"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @switch-field="handleDateFilterFieldSwitch(field.key, $event)"
                        @update:value="handleDateFilterChange(field.key, $event)"
                      />
                    </PopoverContent>
                  </Popover>
                </template>

                <FilterChip
                  v-if="activeFilterFields.length"
                  icon="ri-close-circle-line"
                  label="清空筛选"
                  variant="ghost"
                  @click="handleClearAllFilters"
                />

                <div
                  v-if="shouldShowDividerBeforeInactiveFilters()"
                  class="mx-2 h-5 w-px shrink-0 bg-border"
                />

                <template v-for="field in inactiveFilterFields" :key="field.key">
                  <Popover
                    :open="openPopover === field.key"
                    @update:open="(nextOpen) => {
                      if (nextOpen) {
                        togglePopover(field.key)
                        return
                      }

                      closePopover()
                    }"
                  >
                    <PopoverTrigger as-child>
                      <FilterChip
                        :icon="field.icon"
                        :label="field.label"
                        :caret="field.arrow"
                        :selected="isFieldActive(field)"
                      />
                    </PopoverTrigger>

                    <PopoverContent
                      v-if="openPopover === field.key"
                      align="start"
                      :side-offset="10"
                      class="w-auto border-0 bg-transparent p-0 shadow-none"
                    >
                      <TextFilterPopover
                        v-if="field.kind === 'text-filter' && getTextFilter(field.key)"
                        :title="field.key"
                        :value="getTextFilter(field.key)!"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleTextFilterChange(field.key, $event)"
                      />

                      <TagFilterPopover
                        v-else-if="field.kind === 'tag-filter' && getTagFilter(field.key)"
                        :title="field.key"
                        :value="getTagFilter(field.key)!"
                        :options="props.tagFilterOptions[field.key] ?? []"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleTagFilterChange(field.key, $event)"
                      />

                      <NumberFilterPopover
                        v-else-if="field.kind === 'number-filter' && getNumberFilter(field.key)"
                        :title="field.key"
                        :value="getNumberFilter(field.key)!"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @update:value="handleNumberFilterChange(field.key, $event)"
                      />

                      <DateFilterPopover
                        v-else-if="field.kind === 'date-filter' && getDateFilter(field.key)"
                        :title="field.key"
                        :value="getDateFilter(field.key)!"
                        :fields="props.dateFilterFields"
                        @close="closePopover"
                        @remove="handleRemoveFilter(field.key)"
                        @switch-field="handleDateFilterFieldSwitch(field.key, $event)"
                        @update:value="handleDateFilterChange(field.key, $event)"
                      />
                    </PopoverContent>
                  </Popover>
                </template>

                <Popover
                  v-if="addableFilters.length"
                  :open="openPopover === 'add-filter'"
                  @update:open="(nextOpen) => {
                    if (nextOpen) {
                      togglePopover('add-filter')
                      return
                    }

                    closePopover()
                  }"
                >
                  <PopoverTrigger as-child>
                    <FilterChip
                      icon="ri-add-line"
                      label="筛选"
                      variant="ghost"
                    />
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    :side-offset="8"
                    class="min-w-[184px] rounded-xl p-1.5"
                  >
                    <button
                      v-for="item in addableFilters"
                      :key="item"
                      type="button"
                      class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition hover:bg-interactive-hover"
                      @click="handleAddFilter(item)"
                    >
                      <span>{{ item }}</span>
                      <i class="ri-add-line text-sm text-muted-foreground" />
                    </button>
                  </PopoverContent>
                </Popover>
              </template>
            </div>
            </div>

            <div
              v-if="controlsOverflowLeft"
              class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/88 to-transparent"
            />
            <div
              v-if="controlsOverflowRight"
              class="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/92 to-transparent"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
[data-table-header-controls-scroll] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

[data-table-header-tabs-scroll] {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

[data-table-header-controls-scroll]::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

[data-table-header-tabs-scroll]::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
