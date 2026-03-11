<script setup lang="ts">
import { computed, ref } from "vue"

import { Button } from "@/components/ui/button"
import DateFilterPopover from "@/components/resource/DateFilterPopover.vue"
import FilterChip from "@/components/resource/FilterChip.vue"
import NumberFilterPopover from "@/components/resource/NumberFilterPopover.vue"
import SortPopover from "@/components/resource/SortPopover.vue"
import TagFilterPopover from "@/components/resource/TagFilterPopover.vue"
import TextFilterPopover from "@/components/resource/TextFilterPopover.vue"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
const ghostIconButtonActiveClass =
  "bg-transparent text-link hover:bg-surface-tertiary active:bg-surface-secondary"

const sortFields = computed(() => props.fields.filter(field => field.kind === "sort"))
const activeFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && field.accent))
const inactiveFilterFields = computed(() => props.fields.filter(field => field.kind !== "sort" && !field.accent))
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
</script>

<template>
  <div class="flex min-w-0 w-full flex-col">
    <div class="px-4 sm:px-8">
      <div class="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
        <h1 class="min-w-0 text-[40px] font-semibold text-foreground sm:text-[48px]">{{ title }}</h1>
        <span class="pb-0 text-[18px] font-normal text-muted-foreground sm:pb-1 sm:text-[20px]">{{ count }}</span>
      </div>
    </div>

    <div class="px-4 sm:px-8">
      <div class="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-3 border-b border-border">
        <nav class="flex min-w-0 flex-[999_1_24rem] flex-wrap items-center text-[14px]">
          <button
            v-for="tab in tabs"
            :key="tab.label"
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
            <span
              v-if="tab.active"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
            />
          </button>
        </nav>

        <div class="flex min-w-0 flex-[1_1_100%] flex-wrap items-center justify-end gap-1 pb-2 text-muted-foreground sm:flex-[0_0_auto] sm:flex-nowrap">
          <button
            type="button"
            :class="[
              ghostIconButtonClass,
              showControls ? ghostIconButtonActiveClass : '',
            ]"
            @click="emit('toggle-controls')"
          >
            <i :class="['ri-filter-3-line text-[17px]', showControls ? 'text-link' : '']" />
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
              <i :class="['ri-sort-asc text-[17px]', customSortEnabled ? 'text-link' : '']" />
            </button>
          </div>
          <button
            type="button"
            :class="ghostIconButtonClass"
          >
            <i class="ri-more-line text-base" />
          </button>
          <Button
            v-if="primaryActionLabel"
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

    <Transition
      enter-active-class="overflow-hidden transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0 -translate-y-1"
      enter-to-class="max-h-16 opacity-100 translate-y-0"
      leave-active-class="overflow-hidden transition-all duration-150 ease-in"
      leave-from-class="max-h-16 opacity-100 translate-y-0"
      leave-to-class="max-h-0 opacity-0 -translate-y-1"
    >
      <div v-if="showControls" class="px-4 py-2 sm:px-8">
        <div class="flex flex-wrap items-center gap-0.5 text-[14px] text-muted-foreground">
          <div class="flex min-w-0 flex-wrap items-center gap-0.5">
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
