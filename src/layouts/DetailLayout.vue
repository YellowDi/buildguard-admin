<script setup lang="ts">
import { computed, useSlots } from "vue"

import SectionHeader from "@/components/layout/SectionHeader.vue"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

// 详情页页面骨架。
// 新建详情页时优先复用这里：只关心标题、空态，以及 primary/secondary 两个内容槽。
// 单列详情页只传 primary；双列详情页同时传 primary 和 secondary。
type DetailLayoutTab = {
  id: string
  label: string
  active?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  empty?: boolean
  emptyText?: string
  backLabel?: string
  secondaryVisible?: boolean
  fullWidth?: boolean
  tabs?: DetailLayoutTab[]
  tabsAriaLabel?: string
}>(), {
  subtitle: "",
  empty: false,
  emptyText: "未找到相关信息",
  backLabel: "返回列表",
  secondaryVisible: true,
  fullWidth: false,
  tabs: () => [],
  tabsAriaLabel: "详情页面切换",
})

const emit = defineEmits<{
  back: []
  tabClick: [id: string]
}>()

const slots = useSlots()
const hasTabs = computed(() => props.tabs.length > 0)
const hasSecondary = computed(() => Boolean(slots.secondary) && props.secondaryVisible)
const useSingleColumn = computed(() => props.fullWidth || !hasSecondary.value)
const hasHeaderActions = computed(() => Boolean(slots.headerActions) || (!hasTabs.value && Boolean(slots.actions)))
const hasTabActions = computed(() => hasTabs.value && (Boolean(slots.tabActions) || Boolean(slots.actions)))
const hasHeaderBottom = computed(() => Boolean(slots.headerBottom))
const activeTabId = computed(() => props.tabs.find(tab => tab.active)?.id ?? props.tabs[0]?.id ?? "")

function handleTabSelect(value: unknown) {
  if (typeof value === "string" && value) {
    emit("tabClick", value)
  }
}
</script>

<template>
  <section
    :class="[
      'detail-layout mx-auto flex w-full min-w-0 flex-1 flex-col px-0 sm:px-4 xl:px-8',
      useSingleColumn ? 'detail-layout--single-column' : '',
      props.fullWidth ? 'max-w-none' : 'max-w-[1440px]',
    ]"
  >
    <template v-if="!props.empty">
      <div class="sticky top-0 z-10 -mx-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
        <div :class="['px-1 pt-4 sm:px-4 sm:pt-5', hasTabs || hasHeaderBottom ? '' : 'pb-4 sm:pb-5']">
          <SectionHeader :title="props.title" :subtitle="props.subtitle" :has-actions="hasHeaderActions">
            <template #leading>
              <button
                type="button"
                class="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                :aria-label="props.backLabel"
                @click="emit('back')"
              >
                <i class="ri-arrow-left-line text-[18px]" />
              </button>
            </template>
            <template #actions>
              <slot v-if="$slots.headerActions" name="headerActions" />
              <slot v-else name="actions" />
            </template>
          </SectionHeader>

          <div v-if="hasTabs" class="mt-4 border-b border-border text-muted-foreground">
            <div class="flex items-center gap-2 pb-2 sm:hidden">
              <Select :model-value="activeTabId" @update:model-value="handleTabSelect">
                <SelectTrigger class="h-9 min-w-0 flex-1 rounded-md bg-background text-[14px]">
                  <SelectValue placeholder="选择分页" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="tab in props.tabs"
                    :key="tab.id"
                    :value="tab.id"
                    :disabled="tab.disabled"
                  >
                    {{ tab.label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <div v-if="hasTabActions" class="shrink-0">
                <slot v-if="$slots.tabActions" name="tabActions" />
                <slot v-else name="actions" />
              </div>
            </div>

            <div class="hidden min-w-0 items-end gap-6 sm:flex">
              <div class="min-w-0 flex-1">
                <nav class="flex min-w-0 flex-wrap items-center text-[14px]" :aria-label="props.tabsAriaLabel">
                  <button
                    v-for="tab in props.tabs"
                    :key="tab.id"
                    type="button"
                    :aria-pressed="Boolean(tab.active)"
                    :disabled="tab.disabled"
                    :class="[
                      'group relative px-3 pb-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
                      tab.active ? 'font-semibold text-foreground' : '',
                    ]"
                    @click="emit('tabClick', tab.id)"
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
              </div>

              <div
                v-if="hasTabActions"
                class="flex shrink-0 items-center justify-end pb-2"
              >
                <slot v-if="$slots.tabActions" name="tabActions" />
                <slot v-else name="actions" />
              </div>
            </div>
          </div>

          <div v-if="hasHeaderBottom" class="mt-4">
            <slot name="headerBottom" />
          </div>
        </div>
      </div>

      <div class="detail-layout__content grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr] gap-0 px-0">
        <div class="detail-layout__primary flex min-h-0 min-w-0 flex-col pr-0">
          <slot name="primary" />
        </div>

        <Separator
          v-if="hasSecondary"
          orientation="vertical"
          class="detail-layout__divider hidden h-auto bg-border/80"
        />

        <div v-if="hasSecondary" class="detail-layout__secondary flex min-h-0 min-w-0 flex-col pt-8">
          <slot name="secondary" />
        </div>
      </div>
    </template>

    <template v-else>
      <div :class="['mx-auto w-full min-w-0', props.fullWidth ? 'max-w-none' : 'max-w-[1440px]']">
        <div class="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <slot name="empty">
            <p>{{ props.emptyText }}</p>
            <Button variant="link" class="ml-2" @click="emit('back')">
              {{ props.backLabel }}
            </Button>
          </slot>
        </div>
      </div>
    </template>
  </section>
</template>
