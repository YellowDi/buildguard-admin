<script setup lang="ts">
import { computed, ref, watch } from "vue"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { InspectionItemOption } from "@/lib/inspection-item-options"

type InspectionItemCategoryGroup = {
  key: string
  categoryName: string
  selectedCount: number
  items: InspectionItemOption[]
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: InspectionItemOption[]
  loading?: boolean
  errorMessage?: string
  disabled?: boolean
  open?: boolean
  searchPlaceholder?: string
  emptyText?: string
}>(), {
  loading: false,
  errorMessage: "",
  disabled: false,
  open: true,
  searchPlaceholder: "搜索检测项名称、分类",
  emptyText: "没有匹配的检测项。",
})

const emit = defineEmits<{
  "update:modelValue": [value: string[]]
}>()

const searchQuery = ref("")
const expandedCategoryKey = ref("")

const filteredInspectionItemOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return props.options
  }

  return props.options.filter(item => [
    item.name,
    item.uuid,
    item.categoryName,
  ].some(field => field.toLowerCase().includes(query)))
})

const groupedInspectionItemOptions = computed<InspectionItemCategoryGroup[]>(() => {
  const bucket = new Map<string, InspectionItemOption[]>()

  filteredInspectionItemOptions.value.forEach((item) => {
    const categoryName = item.categoryName || "未分类"

    if (!bucket.has(categoryName)) {
      bucket.set(categoryName, [])
    }

    bucket.get(categoryName)?.push(item)
  })

  return Array.from(bucket.entries())
    .sort((left, right) => left[0].localeCompare(right[0], "zh-Hans-CN"))
    .map(([categoryName, items]) => ({
      key: `category-${categoryName}`,
      categoryName,
      selectedCount: items.reduce((count, item) => (
        props.modelValue.includes(item.uuid) ? count + 1 : count
      ), 0),
      items,
    }))
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      return
    }

    searchQuery.value = ""
    expandedCategoryKey.value = ""
  },
)

function isInspectionSelected(uuid: string) {
  return props.modelValue.includes(uuid)
}

function updateInspectionSelected(uuid: string, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (checked) {
    emit("update:modelValue", Array.from(new Set([...props.modelValue, uuid])))
    return
  }

  emit("update:modelValue", props.modelValue.filter(item => item !== uuid))
}
</script>

<template>
  <div class="min-h-0 flex-1">
    <div class="mb-4">
      <Input
        id="inspection-item-picker-search"
        v-model="searchQuery"
        :placeholder="searchPlaceholder"
        :disabled="loading || disabled"
      />
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="slot in 5" :key="`inspection-item-picker-skeleton-${slot}`" class="h-20 rounded-2xl border border-border/60 bg-muted/15" />
    </div>

    <div v-else-if="errorMessage" class="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p class="text-sm font-medium text-destructive">
        检测项加载失败
      </p>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ errorMessage }}
      </p>
    </div>

    <div v-else-if="!filteredInspectionItemOptions.length" class="rounded-xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
      {{ emptyText }}
    </div>

    <Accordion
      v-else
      v-model="expandedCategoryKey"
      type="single"
      collapsible
      class="space-y-3"
    >
      <AccordionItem
        v-for="group in groupedInspectionItemOptions"
        :key="group.key"
        :value="group.key"
        class="overflow-hidden rounded-md border border-border/55 bg-muted shadow-xs"
      >
        <AccordionTrigger class="px-3.5 py-3 text-left hover:no-underline">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-semibold text-foreground">{{ group.categoryName }}</span>
            <span class="shrink-0 text-xs text-muted-foreground">已选 {{ group.selectedCount }} / {{ group.items.length }} 项</span>
          </div>
        </AccordionTrigger>
        <AccordionContent class="px-3.5">
          <div class="grid gap-3 pt-1 sm:grid-cols-2">
            <label
              v-for="item in group.items"
              :key="item.uuid"
              class="relative flex cursor-pointer items-start gap-3 rounded-md border border-border/55 bg-white px-3.5 py-3.5 shadow-xs transition-all duration-200 hover:border-[color:var(--theme-primary)]/35 hover:bg-white dark:bg-card dark:hover:bg-muted/60 hover:shadow-sm"
              :class="isInspectionSelected(item.uuid) ? 'border-[color:var(--theme-primary)]/50 bg-[color:var(--theme-primary)]/10 shadow-sm ring-1 ring-[color:var(--theme-primary)]/15' : ''"
            >
              <Checkbox
                :model-value="isInspectionSelected(item.uuid)"
                :disabled="disabled"
                class="mt-0.5"
                @update:model-value="updateInspectionSelected(item.uuid, $event)"
              />
              <div class="min-w-0 flex-1">
                <div class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                  {{ item.name }}
                </div>
              </div>
            </label>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>
