<script setup lang="ts">
import ControlChip from "@/components/companies/ControlChip.vue"

type TabItem = {
  label: string
  count: number
  active: boolean
}

type FieldItem = {
  icon: string
  label: string
  accent?: boolean
  arrow?: boolean
  kind: string
}

defineProps<{
  title: string
  count: number
  tabs: TabItem[]
  fields: FieldItem[]
  showControls: boolean
}>()

const emit = defineEmits<{
  "field-click": [kind: string]
  "toggle-controls": []
}>()
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
        <nav class="flex flex-1 flex-wrap items-center gap-6 text-[14px]">
          <button
            v-for="tab in tabs"
            :key="tab.label"
            type="button"
            :class="[
              'relative pb-[11px] text-[#6B6B6B] transition-colors hover:text-[#1F1F1F]',
              tab.active ? 'font-semibold text-[#1F1F1F]' : '',
            ]"
          >
            {{ tab.label }}
            <span
              v-if="tab.active"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-[#1F1F1F]"
            />
          </button>
        </nav>

        <div class="flex shrink-0 items-center gap-1 pb-2 text-[#606060]">
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-md transition hover:bg-[#F5F5F5]"
          >
            <i class="ri-filter-3-line text-[17px]" />
          </button>
          <button
            type="button"
            :class="[
              'inline-flex size-8 items-center justify-center rounded-md transition',
              showControls ? 'bg-[#EEF3FF] text-[#3559E0]' : 'hover:bg-[#F5F5F5]',
            ]"
            @click="emit('toggle-controls')"
          >
            <i class="ri-sort-asc text-[17px]" />
          </button>
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-md transition hover:bg-[#F5F5F5]"
          >
            <i class="ri-search-line text-[17px]" />
          </button>
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-md transition hover:bg-[#F5F5F5]"
          >
            <i class="ri-more-line text-base" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-md border border-[#E3E3E3] bg-white px-3 text-[14px] font-medium text-[#4A4A4A] transition hover:bg-[#F8F8F8]"
          >
            <i class="ri-add-line text-base" />
            添加企业
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
            <template v-for="(field, index) in fields" :key="field.label">
              <ControlChip
                :icon="field.icon"
                :label="field.label"
                :caret="field.arrow"
                :selected="field.accent"
                @click="emit('field-click', field.kind)"
              />

              <div
                v-if="index === 0"
                class="mx-2 h-5 w-px shrink-0 bg-[#E7E7E7]"
              />
            </template>

            <ControlChip icon="ri-add-line" label="筛选" variant="ghost" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
