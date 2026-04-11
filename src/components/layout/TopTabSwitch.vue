<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

type TopTabSwitchItem = {
  id: string
  label: string
  icon?: string
  badge?: string | number
}

const props = withDefaults(defineProps<{
  tabs: TopTabSwitchItem[]
  modelValue: string
  ariaLabel?: string
  collapseInactive?: boolean
  tone?: "sidebar" | "default"
}>(), {
  ariaLabel: "切换视图",
  collapseInactive: true,
  tone: "sidebar",
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const COLLAPSED_TAB_WIDTH = 32
const LABEL_ONLY_TAB_MIN_WIDTH = 0

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
      return props.collapseInactive ? COLLAPSED_TAB_WIDTH : LABEL_ONLY_TAB_MIN_WIDTH
    }

    return Math.max(
      Math.ceil(measureElement.getBoundingClientRect().width),
      props.collapseInactive ? COLLAPSED_TAB_WIDTH : LABEL_ONLY_TAB_MIN_WIDTH,
    )
  })
}

function isEmphasized(tabId: string) {
  return props.modelValue === tabId || hoveredTabId.value === tabId || focusedTabId.value === tabId
}

function getLabelClass(tabId: string) {
  if (props.tone === "default") {
    return isEmphasized(tabId) ? "text-foreground" : "text-muted-foreground"
  }

  return isEmphasized(tabId) ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/52"
}

function getBadgeClass(tabId: string) {
  if (props.tone === "default") {
    return props.modelValue === tabId
      ? "bg-foreground text-background"
      : "bg-muted text-muted-foreground"
  }

  return props.modelValue === tabId
    ? "bg-interactive-active-surface text-sidebar-accent-foreground"
    : "bg-interactive-hover text-sidebar-foreground/72"
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

watch(() => props.collapseInactive, () => {
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
  <div class="flex items-center gap-0.5" role="tablist" :aria-label="props.ariaLabel">
    <button
      v-for="(tab, index) in props.tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="props.modelValue === tab.id"
      :aria-pressed="props.modelValue === tab.id"
      :tabindex="props.modelValue === tab.id ? 0 : -1"
      class="top-tab-switch-shell relative h-8 shrink-0 overflow-hidden rounded-full text-[14px] font-medium"
      :style="{ width: `${props.collapseInactive
        ? (props.modelValue === tab.id ? (measuredWidths[index] ?? COLLAPSED_TAB_WIDTH) : COLLAPSED_TAB_WIDTH)
        : (measuredWidths[index] ?? LABEL_ONLY_TAB_MIN_WIDTH)}px` }"
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
        :class="[
          'pointer-events-none absolute left-0 top-0 flex h-8 w-max items-center rounded-full opacity-0',
          props.collapseInactive && tab.icon ? 'pl-[30px] pr-2' : 'px-2.5',
        ]"
        aria-hidden="true"
      >
        <template v-if="props.collapseInactive && tab.icon">
          <span class="flex min-w-0 items-center whitespace-nowrap">
            <span class="leading-4">{{ tab.label }}</span>
            <span
              v-if="tab.badge !== undefined"
              :class="[
                'ml-2 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-center text-[10px] font-semibold leading-none',
                getBadgeClass(tab.id),
              ]"
            >
              {{ tab.badge }}
            </span>
          </span>
        </template>
        <template v-else>
          <i v-if="tab.icon" :class="[tab.icon, 'shrink-0 text-[17px] leading-none']" />
          <span :class="[tab.icon ? 'ml-2' : '', 'flex items-center whitespace-nowrap']">
            <span class="leading-4">{{ tab.label }}</span>
            <span
              v-if="tab.badge !== undefined"
              :class="[
                'ml-2 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-center text-[10px] font-semibold leading-none',
                getBadgeClass(tab.id),
              ]"
            >
              {{ tab.badge }}
            </span>
          </span>
        </template>
      </span>

      <span
        v-if="props.collapseInactive && tab.icon"
        class="absolute top-1/2 left-[7.5px] z-10 flex w-[17px] -translate-y-1/2 items-center justify-center"
      >
        <i
          :class="[
            tab.icon,
            'shrink-0 text-[17px] leading-none transition-colors duration-160 ease-out',
            getLabelClass(tab.id),
          ]"
        />
      </span>

      <span
        :class="[
          'absolute inset-y-0 left-0 z-10 flex items-center overflow-hidden whitespace-nowrap',
          props.collapseInactive && tab.icon ? 'pl-[30px] pr-2' : 'px-2.5',
        ]"
      >
        <span
          class="top-tab-switch-content flex h-full min-h-0 items-center overflow-hidden whitespace-nowrap"
          :class="props.collapseInactive
            ? (props.modelValue === tab.id
              ? 'ml-0 max-w-[120px] translate-x-0 opacity-100 [transition-delay:110ms]'
              : 'ml-0 max-w-0 translate-x-1 opacity-0 [transition-delay:0ms]')
            : 'ml-0 max-w-[180px] translate-x-0 opacity-100'"
        >
          <span
            :class="[
              'min-w-0 truncate leading-4 transition-colors duration-160 ease-out',
              getLabelClass(tab.id),
            ]"
          >
            {{ tab.label }}
          </span>

          <span
            v-if="tab.badge !== undefined"
            :class="[
              'top-tab-switch-badge flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-center text-[10px] font-semibold leading-none',
              getBadgeClass(tab.id),
              props.collapseInactive
                ? (props.modelValue === tab.id
                  ? 'ml-2 scale-100 opacity-100 [transition-delay:120ms]'
                  : 'ml-0 scale-75 opacity-0 [transition-delay:0ms]')
                : 'ml-2 scale-100 opacity-100',
            ]"
          >
            {{ tab.badge }}
          </span>
        </span>
      </span>
    </button>
  </div>
</template>
