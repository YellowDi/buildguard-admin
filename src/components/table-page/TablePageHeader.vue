<script setup lang="ts">
import { computed, ref } from "vue"

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TooltipWrap } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SortFieldOption, SortRule } from "@/components/table-page/sort.types"
import type {
  DateFilterState,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  TagFilterState,
  TextFilterState,
} from "@/components/table-page/types"

type MobileToolbarActionKey = "filters" | "sort" | "export" | "primary"

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
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground active:bg-surface-secondary"
const mobileTabSelectTriggerClass =
  "h-8 max-w-[calc(100vw-11rem)] rounded-full bg-background px-3 text-[14px]"
const ghostIconButtonActiveClass =
  "bg-transparent text-link hover:bg-surface-tertiary active:bg-surface-secondary"

const sortFields = computed(() => props.fields.filter(field => field.kind === "sort"))
const activeFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && field.accent))
const inactiveFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && !field.accent))
const visibleFilterKeys = computed(() => props.fields.filter((field) => field.kind !== "sort").map((field) => field.key))
const addableFilters = computed(() => props.availableFilters.filter((key) => !visibleFilterKeys.value.includes(key)))
const hasTabs = computed(() => props.tabs.length > 0)
const hasHeading = computed(() => Boolean(props.title || props.description))
const hasTopSurface = computed(() => hasHeading.value || hasTabs.value || props.showToolbarActions)
const activeTabLabel = computed(() => props.tabs.find(tab => tab.active)?.label ?? props.tabs[0]?.label ?? "")
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
const { indicatorStyle, setTabRef } = useSlidingTabIndicator({
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

function handleMobileTabSelect(value: unknown) {
  if (typeof value !== "string" || !value) {
    return
  }

  const targetTab = props.tabs.find(tab => tab.label === value)
  if (targetTab) {
    emit("tab-click", targetTab)
  }
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
</script>

<template>
  <div class="flex min-w-0 w-full flex-col">
    <div v-if="hasTopSurface" :class="props.listLevelTable ? 'px-4 sm:px-8' : ''">
      <div class="flex min-w-0 flex-col border-b border-border">
        <div
          v-if="hasHeading || (!hasTabs && props.showToolbarActions)"
          class="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-3"
          :class="hasHeading ? 'pb-2' : 'pb-0'"
        >
          <div
            v-if="hasHeading"
            :class="['flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1', hasTabs ? '' : 'pb-2']"
          >
            <h1 class="min-w-0 text-[40px] leading-none font-semibold text-foreground sm:text-[48px]">{{ title }}</h1>
            <span v-if="description" class="hidden text-[18px] leading-none font-normal text-muted-foreground sm:inline sm:text-[20px]">{{ description }}</span>
          </div>

          <div
            v-if="!hasTabs && props.showToolbarActions"
            class="min-w-0"
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
                class="h-8 gap-1 px-3 text-[14px]"
                :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                :aria-label="primaryMobileToolbarItem.label"
                @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
              >
                <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                {{ primaryMobileToolbarItem.label }}
              </Button>

              <ButtonGroup v-else-if="primaryMobileToolbarItem" aria-label="移动端表格操作">
                <Button
                  variant="default"
                  size="sm"
                  class="h-8 gap-1 px-3 text-[14px]"
                  :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                  :aria-label="primaryMobileToolbarItem.label"
                  @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
                >
                  <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                  {{ primaryMobileToolbarItem.label }}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="default" size="sm" class="h-8 gap-1 px-3 text-[14px]" aria-label="更多操作">
                      更多
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
              <TooltipWrap content="更多">
                <button
                  type="button"
                  aria-label="更多"
                  :class="ghostIconButtonClass"
                >
                  <i class="ri-more-line text-base" />
                </button>
              </TooltipWrap>
              <Button
                variant="outline"
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('export-action')"
              >
                <i class="ri-download-line text-base" />
                导出
              </Button>
              <Button
                v-if="primaryActionLabel"
                variant="default"
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
          <div class="flex min-w-0 items-center justify-between gap-2 pb-2 sm:hidden">
            <Select :model-value="activeTabLabel" @update:model-value="handleMobileTabSelect">
              <SelectTrigger size="sm" :class="mobileTabSelectTriggerClass">
                <SelectValue placeholder="选择分页" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="tab in tabs"
                  :key="tab.label"
                  :value="tab.label"
                >
                  {{ tab.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <div v-if="props.showToolbarActions" class="ml-auto flex shrink-0 items-center justify-end gap-1">
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
                class="h-8 gap-1 px-3 text-[14px]"
                :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                :aria-label="primaryMobileToolbarItem.label"
                @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
              >
                <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                {{ primaryMobileToolbarItem.label }}
              </Button>

              <ButtonGroup v-else-if="primaryMobileToolbarItem" aria-label="移动端表格操作">
                <Button
                  variant="default"
                  size="sm"
                  class="h-8 gap-1 px-3 text-[14px]"
                  :class="primaryMobileToolbarItem.active ? 'text-link' : ''"
                  :aria-label="primaryMobileToolbarItem.label"
                  @click="handleMobileToolbarActionSelect(primaryMobileToolbarItem.key)"
                >
                  <i :class="[primaryMobileToolbarItem.iconClass, 'text-base']" />
                  {{ primaryMobileToolbarItem.label }}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="default" size="sm" class="h-8 gap-1 px-3 text-[14px]" aria-label="更多操作">
                      更多
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

          <div class="hidden min-w-0 flex-wrap items-end gap-x-6 gap-y-3 sm:flex">
            <nav class="relative flex min-w-0 flex-[999_1_24rem] flex-wrap items-center text-[14px]">
              <button
                v-for="tab in tabs"
                :key="tab.label"
                :ref="(element) => setTabRef(tab.label, element)"
                type="button"
                :aria-pressed="tab.active"
                :class="[
                  'group relative px-3 pb-[11px] text-muted-foreground transition-colors hover:text-foreground',
                  tab.active ? 'font-semibold text-foreground' : '',
                ]"
                @click="emit('tab-click', tab)"
              >
                <span class="relative isolate inline-block">
                  <span class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md transition-colors group-hover:bg-surface-tertiary" />
                  <span class="relative z-10">{{ tab.label }}</span>
                </span>
              </button>
              <span
                aria-hidden="true"
                class="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                :style="indicatorStyle"
              />
            </nav>

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
              <TooltipWrap content="更多">
                <button
                  type="button"
                  aria-label="更多"
                  :class="ghostIconButtonClass"
                >
                  <i class="ri-more-line text-base" />
                </button>
              </TooltipWrap>
              <Button
                variant="outline"
                class="h-8 gap-1 px-3 text-[14px]"
                @click="emit('export-action')"
              >
                <i class="ri-download-line text-base" />
                导出
              </Button>
              <Button
                v-if="primaryActionLabel"
                variant="default"
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
      enter-active-class="overflow-hidden transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0 -translate-y-1"
      enter-to-class="max-h-16 opacity-100 translate-y-0"
      leave-active-class="overflow-hidden transition-all duration-150 ease-in"
      leave-from-class="max-h-16 opacity-100 translate-y-0"
      leave-to-class="max-h-0 opacity-0 -translate-y-1"
    >
        <div v-if="showControls" :class="props.listLevelTable ? 'px-4 py-2 sm:px-8' : 'py-2'">
          <div class="flex flex-wrap items-center gap-0.5 text-[14px] text-muted-foreground">
            <div class="flex min-w-0 flex-wrap items-center gap-0.5">
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
                  class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition hover:bg-surface-tertiary"
                  @click="handleAddFilter(item)"
                >
                  <span>{{ item }}</span>
                  <i class="ri-add-line text-sm text-muted-foreground" />
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
