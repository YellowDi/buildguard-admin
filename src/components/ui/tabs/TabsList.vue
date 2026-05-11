<script setup lang="ts">
import type { TabsListProps } from "reka-ui"
import type { ComponentPublicInstance, HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsList, useForwardProps } from "reka-ui"
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue"

import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<TabsListProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
const listRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const indicatorStyle = ref({
  height: "0px",
  opacity: "0",
  transform: "translate3d(0, 0, 0)",
  width: "0px",
})
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null
let syncRafId = 0

function resolveElement(element: HTMLElement | ComponentPublicInstance | null) {
  if (!element) return null
  if (element instanceof HTMLElement) return element
  if ("$el" in element && element.$el instanceof HTMLElement) return element.$el
  return null
}

function syncIndicator() {
  const listElement = resolveElement(listRef.value)
  const activeTrigger = listElement?.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]')

  if (!listElement || !activeTrigger) {
    indicatorStyle.value = {
      height: "0px",
      opacity: "0",
      transform: "translate3d(0, 0, 0)",
      width: "0px",
    }
    return
  }

  indicatorStyle.value = {
    height: `${activeTrigger.offsetHeight}px`,
    opacity: "1",
    transform: `translate3d(${activeTrigger.offsetLeft}px, ${activeTrigger.offsetTop}px, 0)`,
    width: `${activeTrigger.offsetWidth}px`,
  }
}

function scheduleSyncIndicator() {
  if (syncRafId) {
    cancelAnimationFrame(syncRafId)
  }

  syncRafId = requestAnimationFrame(() => {
    syncIndicator()
    syncRafId = 0
  })
}

onMounted(async () => {
  await nextTick()

  const listElement = resolveElement(listRef.value)
  if (!listElement) return

  syncIndicator()

  resizeObserver = new ResizeObserver(scheduleSyncIndicator)
  resizeObserver.observe(listElement)
  listElement.querySelectorAll('[data-slot="tabs-trigger"]').forEach(trigger => resizeObserver?.observe(trigger))

  mutationObserver = new MutationObserver(() => {
    listElement.querySelectorAll('[data-slot="tabs-trigger"]').forEach(trigger => resizeObserver?.observe(trigger))
    scheduleSyncIndicator()
  })
  mutationObserver.observe(listElement, {
    attributes: true,
    attributeFilter: ["data-state", "class", "style"],
    childList: true,
    subtree: true,
  })

  window.addEventListener("resize", scheduleSyncIndicator)
  document.fonts?.ready.then(scheduleSyncIndicator)
})

onBeforeUnmount(() => {
  if (syncRafId) {
    cancelAnimationFrame(syncRafId)
  }

  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  window.removeEventListener("resize", scheduleSyncIndicator)
})
</script>

<template>
  <TabsList
    ref="listRef"
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="tabs-list"
    :class="
      cn(
        'relative isolate inline-flex h-8 w-fit items-center justify-center overflow-hidden rounded-full bg-[var(--tabs-track-background)] p-0.5 text-muted-foreground',
        props.class,
      )
    "
  >
    <span
      class="tabs-active-indicator pointer-events-none absolute left-0 top-0 z-0 rounded-full"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <slot />
  </TabsList>
</template>
