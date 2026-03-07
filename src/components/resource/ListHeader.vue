<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import DateFilterPopover from "@/components/resource/DateFilterPopover.vue"
import FilterChip from "@/components/resource/FilterChip.vue"
import NumberFilterPopover from "@/components/resource/NumberFilterPopover.vue"
import SortPopover from "@/components/resource/SortPopover.vue"
import TagFilterPopover from "@/components/resource/TagFilterPopover.vue"
import TextFilterPopover from "@/components/resource/TextFilterPopover.vue"
import type { SortFieldOption, SortRule } from "@/components/resource/SortPopover.vue"
import type {
  DateFilterState,
  HeaderField,
  HeaderTab,
  NumberFilterState,
  TagFilterState,
  TextFilterState,
} from "@/components/resource/types"

const props = withDefaults(defineProps<{
  title: string
  count: number
  tabs: HeaderTab[]
  fields: HeaderField[]
  availableFilters?: string[]
  showControls: boolean
  customSortEnabled: boolean
  sortRules: SortRule[]
  sortFieldOptions?: SortFieldOption[]
  searchQuery: string
  textFilters?: Record<string, TextFilterState>
  numberFilters?: Record<string, NumberFilterState>
  tagFilters?: Record<string, TagFilterState>
  tagFilterOptions?: Record<string, string[]>
  dateFilters?: Record<string, DateFilterState>
  dateFilterFields?: string[]
  primaryActionLabel?: string
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
})

const emit = defineEmits<{
  "tab-click": [tab: HeaderTab]
  "toggle-controls": []
  "set-custom-sort-enabled": [enabled: boolean]
  "update-sort-rules": [rules: SortRule[]]
  "update-search-query": [query: string]
  "update-text-filter": [payload: { label: string; value: TextFilterState }]
  "update-number-filter": [payload: { label: string; value: NumberFilterState }]
  "update-tag-filter": [payload: { label: string; value: TagFilterState }]
  "update-date-filter": [payload: { label: string; value: DateFilterState }]
  "add-filter": [key: string]
  "replace-filter": [payload: { from: string; to: string; value?: DateFilterState }]
  "remove-filter": [key: string]
  "primary-action": []
}>()

const openPopover = ref<string | null>(null)
const sortPopoverSource = ref<"toolbar" | "chip">("toolbar")
const showSearchInput = ref(false)
const ghostIconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-[#7A7A7A] transition-colors hover:bg-[#F5F5F5] hover:text-[#3F3F3F] active:bg-[#EBEBEB] active:text-[#1F1F1F]"
const ghostIconButtonActiveClass =
  "bg-transparent text-[#3559E0] hover:bg-[#F5F5F5] hover:text-[#2448C8] active:bg-[#EBEBEB] active:text-[#1E3DA7]"

const visibleFilterKeys = computed(() => props.fields.filter((field) => field.kind !== "sort").map((field) => field.key))
const addableFilters = computed(() => props.availableFilters.filter((key) => !visibleFilterKeys.value.includes(key)))

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

function handleDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element) || target.closest("[data-list-popover]")) {
    return
  }

  closePopover()
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

function handleAddFilter(key: string) {
  emit("add-filter", key)
  closePopover()
}

function handleRemoveFilter(key: string) {
  emit("remove-filter", key)
  closePopover()
}

function toggleSearch() {
  showSearchInput.value = !showSearchInput.value

  if (!showSearchInput.value) {
    emit("update-search-query", "")
  }
}

function clearSearch() {
  emit("update-search-query", "")
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick)
})
</script>

<template>
  <div class="flex flex-col">
    <div class="px-8">
      <div class="flex items-end gap-2">
        <h1 class="text-[48px] font-semibold tracking-[-0.05em] text-[#191919]">{{ title }}</h1>
        <span class="pb-1 text-[20px] font-normal text-[#8C8C8C]">{{ count }}</span>
      </div>
    </div>

    <div class="px-8">
      <div class="flex items-end justify-between gap-6 border-b border-[#ECECEC]">
        <nav class="flex flex-1 flex-wrap items-center text-[14px]">
          <button
            v-for="tab in tabs"
            :key="tab.label"
            type="button"
            :aria-pressed="tab.active"
            :class="[
              'group relative px-3 pb-[11px] text-[#6B6B6B] transition-colors hover:text-[#1F1F1F]',
              tab.active ? 'font-semibold text-[#1F1F1F]' : '',
            ]"
            @click="emit('tab-click', tab)"
          >
            <span class="relative isolate inline-block">
              <span class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md transition-colors group-hover:bg-[#F2F2F2]" />
              <span class="relative z-10">{{ tab.label }}</span>
            </span>
            <span
              v-if="tab.active"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-[#1F1F1F]"
            />
          </button>
        </nav>

        <div class="flex shrink-0 items-center gap-1 pb-2 text-[#606060]">
          <button
            type="button"
            :class="[
              ghostIconButtonClass,
              showControls ? ghostIconButtonActiveClass : '',
            ]"
            @click="emit('toggle-controls')"
          >
            <i :class="['ri-filter-3-line text-[17px]', showControls ? 'text-[#3559E0]' : '']" />
          </button>
          <div class="relative" data-list-popover>
            <button
              type="button"
              :class="[
                ghostIconButtonClass,
                customSortEnabled ? ghostIconButtonActiveClass : '',
              ]"
              @click="handleToolbarAddSort"
            >
              <i :class="['ri-sort-asc text-[17px]', customSortEnabled ? 'text-[#3559E0]' : '']" />
            </button>
          </div>
          <div class="flex items-center gap-0">
            <button
              type="button"
              :class="[
                ghostIconButtonClass,
                showSearchInput || searchQuery ? ghostIconButtonActiveClass : '',
              ]"
              @click="toggleSearch"
            >
              <i :class="['ri-search-line text-[17px]', showSearchInput || searchQuery ? 'text-[#3559E0]' : '']" />
            </button>
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="max-w-0 opacity-0"
              enter-to-class="max-w-[240px] opacity-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="max-w-[240px] opacity-100"
              leave-to-class="max-w-0 opacity-0"
            >
              <div
                v-if="showSearchInput || searchQuery"
                class="flex h-8 w-[220px] items-center gap-2 overflow-hidden rounded-md bg-white px-2 text-[13px] text-[#606060]"
              >
                <input
                  :value="searchQuery"
                  type="text"
                  placeholder="输入并搜索..."
                  class="w-full border-0 bg-transparent p-0 text-[13px] text-[#303030] outline-none placeholder:text-[#A0A0A0]"
                  aria-label="输入并搜索..."
                  @input="emit('update-search-query', ($event.target as HTMLInputElement).value)"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[#9A9A9A] transition hover:bg-[#F3F3F3] hover:text-[#5F5F5F]"
                  aria-label="清除搜索文字"
                  @click="clearSearch"
                >
                  <i class="ri-close-line text-[14px]" />
                </button>
              </div>
            </Transition>
          </div>
          <button
            type="button"
            :class="ghostIconButtonClass"
          >
            <i class="ri-more-line text-base" />
          </button>
          <button
            v-if="primaryActionLabel"
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-md border border-[#E3E3E3] bg-white px-3 text-[14px] font-medium text-[#4A4A4A] transition hover:bg-[#F8F8F8]"
            @click="emit('primary-action')"
          >
            <i class="ri-add-line text-base" />
            {{ primaryActionLabel }}
          </button>
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
      <div v-if="showControls" class="px-8 py-2">
        <div class="flex items-center gap-0.5 text-[14px] text-[#666]">
          <div class="flex min-w-0 items-center gap-0.5">
            <template v-for="(field, index) in fields" :key="field.key">
              <div class="relative" data-list-popover>
                <FilterChip
                  :icon="field.icon"
                  :label="field.label"
                  :caret="field.arrow"
                  :selected="isFieldActive(field)"
                  @click="field.kind === 'sort' ? openSortPopover('chip') : togglePopover(field.key)"
                />

                <div
                  v-if="field.kind === 'text-filter' && openPopover === field.key && getTextFilter(field.key)"
                  class="absolute left-0 top-[calc(100%+10px)] z-40"
                >
                  <TextFilterPopover
                    :title="field.key"
                    :value="getTextFilter(field.key)!"
                    @close="closePopover"
                    @remove="handleRemoveFilter(field.key)"
                    @update:value="handleTextFilterChange(field.key, $event)"
                  />
                </div>

                <div
                  v-if="field.kind === 'tag-filter' && openPopover === field.key && getTagFilter(field.key)"
                  class="absolute left-0 top-[calc(100%+10px)] z-40"
                >
                  <TagFilterPopover
                    :title="field.key"
                    :value="getTagFilter(field.key)!"
                    :options="props.tagFilterOptions[field.key] ?? []"
                    @close="closePopover"
                    @remove="handleRemoveFilter(field.key)"
                    @update:value="handleTagFilterChange(field.key, $event)"
                  />
                </div>

                <div
                  v-if="field.kind === 'number-filter' && openPopover === field.key && getNumberFilter(field.key)"
                  class="absolute left-0 top-[calc(100%+10px)] z-40"
                >
                  <NumberFilterPopover
                    :title="field.key"
                    :value="getNumberFilter(field.key)!"
                    @close="closePopover"
                    @remove="handleRemoveFilter(field.key)"
                    @update:value="handleNumberFilterChange(field.key, $event)"
                  />
                </div>

                <div
                  v-if="field.kind === 'date-filter' && openPopover === field.key && getDateFilter(field.key)"
                  class="absolute left-0 top-[calc(100%+10px)] z-40"
                >
                  <DateFilterPopover
                    :title="field.key"
                    :value="getDateFilter(field.key)!"
                    :fields="props.dateFilterFields"
                    @close="closePopover"
                    @remove="handleRemoveFilter(field.key)"
                    @switch-field="handleDateFilterFieldSwitch(field.key, $event)"
                    @update:value="handleDateFilterChange(field.key, $event)"
                  />
                </div>

                <div
                  v-if="field.kind === 'sort' && openPopover === 'sort-popover' && sortPopoverSource === 'chip'"
                  class="absolute left-0 top-[calc(100%+10px)] z-40"
                >
                  <SortPopover
                    :enabled="customSortEnabled"
                    :rules="sortRules"
                    :field-options="sortFieldOptions"
                    @close="closePopover"
                    @set-enabled="handleSortEnabledChange"
                    @update-rules="handleSortRulesChange"
                  />
                </div>
              </div>

              <div
                v-if="index === 0 && field.kind === 'sort' && fields.length > 1"
                class="mx-2 h-5 w-px shrink-0 bg-[#E7E7E7]"
              />
            </template>

            <div v-if="addableFilters.length" class="relative" data-list-popover>
              <FilterChip
                icon="ri-add-line"
                label="筛选"
                variant="ghost"
                @click="togglePopover('add-filter')"
              />

              <div
                v-if="openPopover === 'add-filter'"
                class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-[184px] rounded-xl border border-[#E8E8E8] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                <button
                  v-for="item in addableFilters"
                  :key="item"
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] text-[#4F4F4F] transition hover:bg-[#F6F6F6]"
                  @click="handleAddFilter(item)"
                >
                  <span>{{ item }}</span>
                  <i class="ri-add-line text-sm text-[#9A9A9A]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
