<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date"
import type { AcceptableValue } from "reka-ui"
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type ComponentPublicInstance } from "vue"

import type { TableQueryBarConfig, TableQueryControl, TableQueryDateControl, TableQuerySelectControl } from "@/components/table-page/types"
import FilterChip from "@/components/table-page/TableFilterChip.vue"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

const props = defineProps<{
  queryBar: TableQueryBarConfig
}>()

const emit = defineEmits<{
  "query-change": [payload: { key: string; value: string | string[] }]
  "query-clear": []
}>()

const rootRef = ref<HTMLElement | null>(null)
const expandedKey = ref<string | null>(null)
const searchDrafts = reactive<Record<string, string>>({})
const collapsedWidths = reactive<Record<string, number>>({})
const selectOpenState = reactive<Record<string, boolean>>({})
const datePopoverOpenState = reactive<Record<string, boolean>>({})
const measureRefs = new Map<string, ComponentPublicInstance | HTMLElement | null>()
const selectTriggerRefs = new Map<string, HTMLElement | null>()
const dateTriggerRefs = new Map<string, HTMLElement | null>()
let resizeObserver: ResizeObserver | null = null
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const dateFormatter = new DateFormatter("zh-CN", { dateStyle: "long" })

const controlMap = computed(() => new Map(props.queryBar.controls.map(control => [control.key, control])))

watch(
  () => [props.queryBar.controls, props.queryBar.values] as const,
  () => {
    syncDraftsFromValues()
    void nextTick(() => {
      updateCollapsedWidths()
      restartResizeObserver()
    })
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true)
  void nextTick(() => {
    updateCollapsedWidths()
    restartResizeObserver()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true)
  resizeObserver?.disconnect()
  resizeObserver = null

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }

  debounceTimers.clear()
})

function syncDraftsFromValues() {
  for (const control of props.queryBar.controls) {
    if (control.type !== "search") {
      continue
    }

    const currentValue = props.queryBar.values[control.key]
    searchDrafts[control.key] = typeof currentValue === "string" ? currentValue : ""
  }
}

function resolveExpandedWidth(control: TableQueryControl) {
  return control.expandedWidth ?? 248
}

function resolveCollapsedMinWidth(control: TableQueryControl) {
  return control.collapsedMinWidth ?? (control.type === "search" ? 102 : 96)
}

function resolveCollapsedMaxWidth(control: TableQueryControl) {
  return control.collapsedMaxWidth ?? resolveExpandedWidth(control)
}

function getControlWidth(control: TableQueryControl) {
  if (expandedKey.value === control.key) {
    return resolveExpandedWidth(control)
  }

  return collapsedWidths[control.key] ?? resolveCollapsedMinWidth(control)
}

function getSearchValue(control: TableQueryControl) {
  if (control.type !== "search") {
    return ""
  }

  return typeof props.queryBar.values[control.key] === "string"
    ? props.queryBar.values[control.key] as string
    : ""
}

function getDateValue(control: TableQueryDateControl) {
  const value = props.queryBar.values[control.key]
  return typeof value === "string" ? value : ""
}

function getSelectValue(control: TableQuerySelectControl) {
  const value = props.queryBar.values[control.key]

  if (control.multiple) {
    return Array.isArray(value) ? value : []
  }

  return typeof value === "string" ? value : ""
}

function getCollapsedLabel(control: TableQueryControl) {
  if (control.type === "search") {
    const value = getSearchValue(control).trim()
    return value ? `${control.label}：${value}` : control.label
  }

  if (control.type === "date") {
    const value = getDateValue(control).trim()
    return value ? `${control.label}：${formatDateLabel(value)}` : control.label
  }

  const rawValue = getSelectValue(control)
  const values = Array.isArray(rawValue)
    ? rawValue
    : rawValue
      ? [rawValue]
      : []

  if (!values.length) {
    return control.label
  }

  const labelMap = new Map(control.options.map(option => [option.value, option.label]))
  const labels = values.map(value => labelMap.get(value)).filter((value): value is string => Boolean(value))

  if (!labels.length) {
    return control.label
  }

  const summary = labels.length <= 2 ? labels.join("、") : `已选 ${labels.length} 项`
  return `${control.label}：${summary}`
}

function getExpandedDateLabel(control: TableQueryDateControl) {
  const value = getDateValue(control)
  return value ? formatDateLabel(value) : (control.placeholder ?? "请选择日期")
}

function getExpandedSelectLabel(control: TableQuerySelectControl) {
  const rawValue = getSelectValue(control)
  const values = Array.isArray(rawValue)
    ? rawValue
    : rawValue
      ? [rawValue]
      : []

  if (!values.length) {
    return control.placeholder ?? `请选择${control.label}`
  }

  const labelMap = new Map(control.options.map(option => [option.value, option.label]))
  const labels = values.map(value => labelMap.get(value)).filter((value): value is string => Boolean(value))

  if (!labels.length) {
    return control.placeholder ?? `请选择${control.label}`
  }

  return labels.length <= 2 ? labels.join("、") : `已选 ${labels.length} 项`
}

async function toggleControl(control: TableQueryControl) {
  if (expandedKey.value === control.key) {
    collapseControl(control.key)
    return
  }

  closeAllSelects()
  expandedKey.value = control.key
  await nextTick()

  if (control.type === "search") {
    rootRef.value?.querySelector<HTMLInputElement>(`[data-query-search-input="${control.key}"]`)?.focus()
    return
  }

  if (control.type === "date") {
    datePopoverOpenState[control.key] = true
    dateTriggerRefs.get(control.key)?.focus()
    return
  }

  selectOpenState[control.key] = true
  selectTriggerRefs.get(control.key)?.focus()
}

function collapseControl(key: string) {
  const control = controlMap.value.get(key)

  if (control?.type === "search") {
    commitSearch(control)
  }

  selectOpenState[key] = false
  datePopoverOpenState[key] = false

  if (expandedKey.value === key) {
    expandedKey.value = null
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!expandedKey.value) {
    return
  }

  const target = event.target

  if (!(target instanceof Node)) {
    return
  }

  if (rootRef.value?.contains(target)) {
    return
  }

  if (target instanceof Element && (target.closest("[data-slot='select-content']") || target.closest("[data-slot='popover-content']"))) {
    return
  }

  collapseControl(expandedKey.value)
}

function handleSearchInput(control: Extract<TableQueryControl, { type: "search" }>, value: string | number) {
  searchDrafts[control.key] = String(value ?? "")
  const debounceMs = control.debounceMs ?? 400
  const existingTimer = debounceTimers.get(control.key)

  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  const timer = setTimeout(() => {
    commitSearch(control)
    debounceTimers.delete(control.key)
  }, debounceMs)

  debounceTimers.set(control.key, timer)
}

function handleSearchEnter(control: Extract<TableQueryControl, { type: "search" }>) {
  commitSearch(control)
  collapseControl(control.key)
}

function commitSearch(control: Extract<TableQueryControl, { type: "search" }>) {
  const existingTimer = debounceTimers.get(control.key)

  if (existingTimer) {
    clearTimeout(existingTimer)
    debounceTimers.delete(control.key)
  }

  emit("query-change", {
    key: control.key,
    value: searchDrafts[control.key]?.trim() ?? "",
  })
}

function handleSelectChange(
  control: Extract<TableQueryControl, { type: "select" }>,
  value: AcceptableValue | AcceptableValue[] | undefined,
) {
  if (control.multiple) {
    emit("query-change", {
      key: control.key,
      value: Array.isArray(value)
        ? value
          .map(item => typeof item === "string" ? item : "")
          .filter(Boolean)
        : [],
    })
    return
  }

  emit("query-change", {
    key: control.key,
    value: typeof value === "string" ? value : "",
  })
}

function handleDateChange(control: TableQueryDateControl, value: { toString: () => string } | undefined) {
  emit("query-change", {
    key: control.key,
    value: value?.toString() ?? "",
  })
  collapseControl(control.key)
}

function getCalendarValue(control: TableQueryDateControl) {
  const value = getDateValue(control)

  if (!value) {
    return undefined
  }

  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

function closeAllSelects() {
  for (const control of props.queryBar.controls) {
    if (control.type === "select") {
      selectOpenState[control.key] = false
    }
  }
}

function formatDateLabel(value: string) {
  try {
    return dateFormatter.format(parseDate(value).toDate(getLocalTimeZone()))
  } catch {
    return value
  }
}

function updateCollapsedWidths() {
  for (const control of props.queryBar.controls) {
    const measuredWidth = measureCollapsedWidth(control.key)
    collapsedWidths[control.key] = Math.max(
      resolveCollapsedMinWidth(control),
      Math.min(resolveCollapsedMaxWidth(control), measuredWidth),
    )
  }
}

function restartResizeObserver() {
  if (typeof ResizeObserver === "undefined") {
    return
  }

  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => {
    updateCollapsedWidths()
  })

  for (const control of props.queryBar.controls) {
    const element = resolveMeasureElement(measureRefs.get(control.key) ?? null)

    if (element) {
      resizeObserver.observe(element)
    }
  }
}

function measureCollapsedWidth(key: string) {
  const element = resolveMeasureElement(measureRefs.get(key) ?? null)

  if (!element) {
    return 0
  }

  return Math.ceil(element.getBoundingClientRect().width)
}

function resolveMeasureElement(target: ComponentPublicInstance | HTMLElement | null) {
  if (target instanceof HTMLElement) {
    return target
  }

  const element = target?.$el
  return element instanceof HTMLElement ? element : null
}

function setMeasureRef(key: string, value: ComponentPublicInstance | HTMLElement | null) {
  measureRefs.set(key, value)
}

function setSelectTriggerRef(key: string, value: HTMLElement | null) {
  selectTriggerRefs.set(key, value)
}

function setDateTriggerRef(key: string, value: HTMLElement | null) {
  dateTriggerRefs.set(key, value)
}
</script>

<template>
  <div ref="rootRef" class="mr-2 flex min-w-max items-center gap-2">
    <div
      v-for="control in props.queryBar.controls"
      :key="control.key"
      class="relative h-8 shrink-0 overflow-visible transition-[width] duration-280 ease-[cubic-bezier(0.2,0,0,1)]"
      :style="{ width: `${getControlWidth(control)}px` }"
    >
      <div
        class="absolute inset-0 transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
        :class="expandedKey === control.key ? 'pointer-events-none scale-[0.92] opacity-0 blur-[2px]' : 'pointer-events-auto scale-100 opacity-100 blur-0'"
      >
        <FilterChip
          :icon="control.icon"
          :label="getCollapsedLabel(control)"
          :selected="control.type === 'search'
            ? Boolean(getSearchValue(control))
            : control.type === 'date'
              ? Boolean(getDateValue(control))
              : Boolean(Array.isArray(getSelectValue(control)) ? getSelectValue(control).length : getSelectValue(control))"
          caret
          class="absolute left-0 top-1/2 min-w-0 w-full -translate-y-1/2 justify-start overflow-hidden text-[13px] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate"
          @click="toggleControl(control)"
        />
      </div>

      <div
        class="absolute inset-0 origin-left transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
        :class="expandedKey === control.key ? 'pointer-events-auto scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[0.96] opacity-0 blur-[2px]'"
      >
        <InputGroup class="relative h-8 w-full rounded-full bg-background">
          <InputGroupAddon class="pl-2.5 pr-2">
            <InputGroupText>
              <i :class="[control.icon, 'text-[15px]']" />
              {{ control.label }}
            </InputGroupText>
          </InputGroupAddon>

          <template v-if="control.type === 'search'">
            <InputGroupInput
              :model-value="searchDrafts[control.key] ?? ''"
              :data-query-search-input="control.key"
              :placeholder="control.placeholder ?? `输入${control.label}`"
              class="min-w-0 pr-9"
              @update:model-value="handleSearchInput(control, $event)"
              @keydown.enter="handleSearchEnter(control)"
              @keydown.esc="collapseControl(control.key)"
            />
          </template>

          <template v-else-if="control.type === 'date'">
            <Popover v-model:open="datePopoverOpenState[control.key]">
              <PopoverTrigger as-child>
                <Button
                  :ref="value => setDateTriggerRef(control.key, value as HTMLElement | null)"
                  variant="ghost"
                  class="h-full w-full justify-start rounded-none border-0 bg-transparent px-2 pr-9 text-left font-normal shadow-none hover:bg-transparent"
                >
                  <span class="truncate">{{ getExpandedDateLabel(control) }}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                class="w-auto p-0"
                align="start"
                @escape-key-down="collapseControl(control.key)"
                @pointer-down-outside="collapseControl(control.key)"
              >
                <Calendar
                  :model-value="getCalendarValue(control)"
                  layout="month-and-year"
                  locale="zh-CN"
                  initial-focus
                  @update:model-value="handleDateChange(control, $event)"
                />
              </PopoverContent>
            </Popover>
          </template>

          <template v-else>
            <Select
              :model-value="getSelectValue(control)"
              v-model:open="selectOpenState[control.key]"
              :multiple="control.multiple"
              :disabled="control.loading || control.disabled"
              @update:model-value="handleSelectChange(control, $event)"
            >
              <SelectTrigger
                :ref="value => setSelectTriggerRef(control.key, value as HTMLElement | null)"
                :data-query-select-trigger="control.key"
                class="h-full w-full rounded-none border-0 bg-transparent px-2 pr-9 shadow-none focus-visible:border-0 focus-visible:ring-0 data-[state=open]:border-0 data-[state=open]:ring-0"
              >
                <span class="truncate text-left">{{ getExpandedSelectLabel(control) }}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in control.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </template>

          <button
            type="button"
            class="absolute right-1 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-180 ease-out hover:bg-interactive-hover hover:text-foreground active:scale-[0.96]"
            :aria-label="`收起${control.label}`"
            @click="collapseControl(control.key)"
          >
            <i class="ri-close-line text-[16px]" />
          </button>
        </InputGroup>
      </div>
    </div>

    <FilterChip
      icon="ri-close-circle-line"
      label="清空筛选"
      variant="ghost"
      :class="`h-6 shrink-0 self-center px-2${props.queryBar.canClear ? '' : ' pointer-events-none opacity-40'}`"
      @click="emit('query-clear')"
    />

    <div class="pointer-events-none fixed left-[-9999px] top-[-9999px] opacity-0" aria-hidden="true">
      <FilterChip
        v-for="control in props.queryBar.controls"
        :ref="value => setMeasureRef(control.key, value as ComponentPublicInstance | HTMLElement | null)"
        :key="`${control.key}-measure`"
        :icon="control.icon"
        :label="getCollapsedLabel(control)"
        :selected="control.type === 'search'
          ? Boolean(getSearchValue(control))
          : control.type === 'date'
            ? Boolean(getDateValue(control))
            : Boolean(Array.isArray(getSelectValue(control)) ? getSelectValue(control).length : getSelectValue(control))"
        caret
        class="text-[13px]"
      />
    </div>
  </div>
</template>
