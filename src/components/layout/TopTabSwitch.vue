<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

type TopTabSwitchItem = {
  id: string
  label: string
  icon: string
  badge?: string | number
}

const props = withDefaults(defineProps<{
  tabs: TopTabSwitchItem[]
  modelValue: string
  ariaLabel?: string
}>(), {
  ariaLabel: "切换视图",
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const COLLAPSED_TAB_WIDTH = 32

const measureRefs = ref<Array<HTMLElement | null>>([])
const measuredWidths = ref<number[]>([])
const hoveredTabId = ref<string | null>(null)
const focusedTabId = ref<string | null>(null)
let measureRafId = 0

function resolveElement(target: Element | ComponentPublicInstance | null) {
  if (!target) return null
  if (target instanceof HTMLElement) return target
  if ("$el" in target && target.$el instanceof HTMLElement) return target.$el
  return null
}

function setMeasureRef(element: Element | ComponentPublicInstance | null, index: number) {
  measureRefs.value[index] = resolveElement(element)
}

function updateMeasurements() {
  measuredWidths.value = props.tabs.map((_, index) => {
    const measureElement = measureRefs.value[index]
    if (!measureElement) {
      return COLLAPSED_TAB_WIDTH
    }

    return Math.max(Math.ceil(measureElement.getBoundingClientRect().width), COLLAPSED_TAB_WIDTH)
  })
}

function isEmphasized(tabId: string) {
  return props.modelValue === tabId || hoveredTabId.value === tabId || focusedTabId.value === tabId
}

async function syncMeasurements() {
  await nextTick()

  if (measureRafId) {
    cancelAnimationFrame(measureRafId)
  }

  measureRafId = requestAnimationFrame(() => {
    updateMeasurements()
    measureRafId = 0
  })
}

watch(() => props.modelValue, () => {
  syncMeasurements()
})

watch(() => props.tabs.map(tab => `${tab.id}:${tab.label}:${tab.badge ?? ""}`).join("|"), () => {
  syncMeasurements()
})

onMounted(() => {
  syncMeasurements()
  window.addEventListener("resize", syncMeasurements)
  document.fonts?.ready.then(() => {
    syncMeasurements()
  })
})

onBeforeUnmount(() => {
  if (measureRafId) {
    cancelAnimationFrame(measureRafId)
  }

  window.removeEventListener("resize", syncMeasurements)
})
</script>

<template>
  <div class="flex items-center gap-1" role="tablist" :aria-label="props.ariaLabel">
    <button
      v-for="(tab, index) in props.tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="props.modelValue === tab.id"
      :aria-pressed="props.modelValue === tab.id"
      :tabindex="props.modelValue === tab.id ? 0 : -1"
      class="top-tab-switch-shell relative h-8 shrink-0 overflow-hidden rounded-full text-[14px] font-medium"
      :style="{ width: `${props.modelValue === tab.id ? (measuredWidths[index] ?? COLLAPSED_TAB_WIDTH) : COLLAPSED_TAB_WIDTH}px` }"
      @click="emit('update:modelValue', tab.id)"
      @mouseenter="hoveredTabId = tab.id"
      @mouseleave="hoveredTabId = null"
      @focus="focusedTabId = tab.id"
      @blur="focusedTabId = null"
    >
      <span
        class="top-tab-switch-bg absolute inset-0"
        :class="isEmphasized(tab.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.94]'"
        aria-hidden="true"
      />

      <span
        :ref="element => setMeasureRef(element, index)"
        class="pointer-events-none absolute left-0 top-0 flex h-8 w-max items-center rounded-full px-2.5 opacity-0"
        aria-hidden="true"
      >
        <i :class="[tab.icon, 'shrink-0 text-[17px] leading-none']" />
        <span class="ml-2 flex items-center whitespace-nowrap">
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.badge !== undefined"
            class="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-badge px-1 text-center text-[10px] font-semibold leading-none text-link-foreground"
          >
            {{ tab.badge }}
          </span>
        </span>
      </span>

      <span
        class="absolute top-1/2 left-[7.5px] z-10 flex w-[17px] -translate-y-1/2 items-center justify-center"
      >
        <i
          :class="[
            tab.icon,
            'shrink-0 text-[17px] leading-none transition-colors duration-160 ease-out',
            isEmphasized(tab.id) ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/52',
          ]"
        />
      </span>

      <span
        class="absolute inset-y-0 left-0 z-10 flex items-center overflow-hidden whitespace-nowrap pl-[35px] pr-2.5"
      >
        <span
          class="top-tab-switch-content flex items-center overflow-hidden whitespace-nowrap"
          :class="props.modelValue === tab.id
            ? 'ml-0 max-w-[120px] translate-x-0 opacity-100 [transition-delay:110ms]'
            : 'ml-0 max-w-0 translate-x-1 opacity-0 [transition-delay:0ms]'"
        >
          <span class="truncate text-sidebar-accent-foreground">{{ tab.label }}</span>

          <span
            v-if="tab.badge !== undefined"
            class="top-tab-switch-badge flex h-4 min-w-4 items-center justify-center rounded-full bg-badge px-1 text-center text-[10px] font-semibold leading-none text-link-foreground"
            :class="props.modelValue === tab.id
              ? 'ml-2 scale-100 opacity-100 [transition-delay:120ms]'
              : 'ml-0 scale-75 opacity-0 [transition-delay:0ms]'"
          >
            {{ tab.badge }}
          </span>
        </span>
      </span>
    </button>
  </div>
</template>
