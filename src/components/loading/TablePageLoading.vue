<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"

import { Skeleton } from "@/components/ui/skeleton"
import { TABLE_EDGE_GUTTER_DESKTOP, TABLE_EDGE_GUTTER_MOBILE } from "@/components/table-page/tableTheme"

const props = withDefaults(defineProps<{
  columnsTemplate?: string
  columnCount?: number
  rowCount?: number
}>(), {
  columnsTemplate: "3rem minmax(11rem, 1.5fr) minmax(8rem, 1fr) minmax(8rem, 1fr) minmax(10rem, 1.2fr) minmax(8rem, 1fr)",
  columnCount: 6,
  rowCount: 8,
})

const tableStyle = computed(() => ({
  "--table-page-columns": props.columnsTemplate,
  "--table-page-sticky-top": "-1rem",
}))
const viewportRef = ref<HTMLElement | null>(null)
const surfaceRef = ref<HTMLElement | null>(null)
const edgeGutterSize = ref(TABLE_EDGE_GUTTER_MOBILE)
const horizontalOverflow = ref(false)
const leadingEdgeGutter = computed(() => edgeGutterSize.value)
const trailingEdgeGutter = computed(() => (horizontalOverflow.value ? edgeGutterSize.value : 0))
const surfaceStyle = computed(() => ({
  width: "max-content",
  minWidth: `calc(100% - ${leadingEdgeGutter.value + trailingEdgeGutter.value}px)`,
  maxWidth: "none",
}))

const cellWidthClasses = [
  "w-6",
  "w-3/4",
  "w-2/3",
  "w-2/3",
  "w-5/6",
  "w-1/2",
  "w-3/5",
  "w-2/5",
]

function getCellWidthClass(index: number) {
  return cellWidthClasses[index - 1] ?? "w-2/3"
}

function updateEdgeGutterSize() {
  if (typeof window === "undefined") {
    edgeGutterSize.value = TABLE_EDGE_GUTTER_MOBILE
    return
  }

  edgeGutterSize.value = window.innerWidth >= 640
    ? TABLE_EDGE_GUTTER_DESKTOP
    : TABLE_EDGE_GUTTER_MOBILE
}

function getEdgeGutterStyle(size: number) {
  return {
    width: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
  }
}

async function syncOverflowState() {
  updateEdgeGutterSize()
  await nextTick()

  if (!viewportRef.value || !surfaceRef.value) {
    horizontalOverflow.value = false
    return
  }

  horizontalOverflow.value = surfaceRef.value.scrollWidth > viewportRef.value.clientWidth - leadingEdgeGutter.value + 1
}

onMounted(() => {
  void syncOverflowState()
  window.addEventListener("resize", syncOverflowState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncOverflowState)
})
</script>

<template>
  <section
    class="-mx-4 flex min-h-0 min-w-0 flex-1 flex-col bg-background"
    :style="tableStyle"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col pb-3 pt-3">
      <div class="sticky top-(--table-page-sticky-top) z-10 border-b border-border/70 bg-background/95 px-4 pb-4 pt-1 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-8">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div class="space-y-3">
              <Skeleton class="h-8 w-24" />
              <Skeleton class="h-4 w-40" />
            </div>

            <div class="flex flex-wrap gap-2">
              <Skeleton class="h-9 w-24" />
              <Skeleton class="h-9 w-24" />
              <Skeleton class="h-9 w-28" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Skeleton class="h-8 w-16 rounded-full" />
            <Skeleton class="h-8 w-20 rounded-full" />
            <Skeleton class="h-8 w-20 rounded-full" />
            <Skeleton class="h-8 w-24 rounded-full" />
          </div>

          <div class="flex flex-wrap gap-2">
            <Skeleton class="h-9 w-40" />
            <Skeleton class="h-9 w-32" />
            <Skeleton class="h-9 w-36" />
          </div>
        </div>
      </div>

      <div
        ref="viewportRef"
        class="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-visible pt-4"
      >
        <div class="flex min-w-full items-stretch">
          <div class="shrink-0" :style="getEdgeGutterStyle(leadingEdgeGutter)" />
          <div ref="surfaceRef" class="overflow-hidden" :style="surfaceStyle">
            <div class="grid grid-cols-(--table-page-columns) gap-4 border-b border-border/60 px-4 py-3">
              <Skeleton
                v-for="index in props.columnCount"
                :key="`table-header-${index}`"
                class="h-4 w-full"
              />
            </div>

            <div
              v-for="row in props.rowCount"
              :key="`table-row-${row}`"
              class="grid grid-cols-(--table-page-columns) gap-4 border-b border-border/50 px-4 py-4 last:border-b-0"
            >
              <Skeleton
                v-for="index in props.columnCount"
                :key="`table-row-${row}-cell-${index}`"
                :class="['h-4', getCellWidthClass(index)]"
              />
            </div>
          </div>
          <div class="shrink-0" :style="getEdgeGutterStyle(trailingEdgeGutter)" />
        </div>
      </div>
    </div>
  </section>
</template>
