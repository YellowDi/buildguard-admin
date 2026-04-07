<script setup lang="ts">
import { computed, useSlots } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

type AccordionColumn = {
  key: string
  label: string
  [property: string]: unknown
}

type AccordionItem = {
  key: string | number
  title: string
  meta?: string
  defaultOpen?: boolean
  [property: string]: unknown
}

const props = withDefaults(defineProps<{
  schema: {
    key: string
    title: string
    count?: number
    emptyText?: string
    emptyState?: {
      title?: string
      description?: string
      icon?: string
    }
    columns?: AccordionColumn[]
    items: AccordionItem[]
  }
  useTitleBlock?: boolean
}>(), {
  schema: () => ({
    key: "accordion-module",
    title: "",
    count: 0,
    emptyText: "暂无数据",
    columns: [],
    items: [],
  }),
  useTitleBlock: false,
})

const slots = useSlots()
const displayCount = computed(() => props.schema.count ?? props.schema.items.length)
const hasExpandedContent = computed(() => Boolean(slots["expanded-content"]))
</script>

<template>
  <section class="detail-accordion-module min-w-0">
    <TitleBlock
      v-if="props.useTitleBlock"
      variant="section"
      :title="schema.title"
      :show-separator="true"
      class="detail-section-inset py-1"
    >
      <template #append>
        <Badge
          variant="secondary"
          class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
        >
          {{ displayCount }}
        </Badge>
      </template>
    </TitleBlock>
    <div v-else class="detail-section-heading-row detail-section-inset flex items-center gap-2">
      <h2 class="detail-field-section__heading">{{ schema.title }}</h2>
      <Badge
        variant="secondary"
        class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
      >
        {{ displayCount }}
      </Badge>
    </div>

    <Accordion
      v-if="schema.items.length"
      type="single"
      collapsible
      class="w-full"
    >
      <AccordionItem
        v-for="(item, index) in schema.items"
        :key="`${schema.key}-${item.key}`"
        :value="`${item.key}`"
        class="border-b-0"
      >
        <div class="detail-section-inset flex items-center gap-3">
          <AccordionTrigger class="min-w-0 flex-1 justify-start py-4 text-left hover:no-underline [&>svg]:order-first [&>svg]:mr-2 [&>svg]:ml-0">
            <div class="min-w-0 pr-3">
              <div class="flex min-w-0 items-center gap-2 text-[14px]">
                <div class="truncate font-medium text-foreground">{{ item.title }}</div>
                <span v-if="item.meta" class="shrink-0 text-[12px] text-muted-foreground">{{ item.meta }}</span>
              </div>
            </div>
          </AccordionTrigger>

          <div class="ml-auto shrink-0">
            <slot name="item-actions" :item="item" />
          </div>
        </div>

        <AccordionContent>
          <div class="pb-4">
            <slot
              v-if="hasExpandedContent"
              name="expanded-content"
              :item="item"
            />
          </div>
        </AccordionContent>

        <div
          v-if="index < schema.items.length - 1"
          class="detail-section-inset"
        >
          <div class="w-full border-b border-dashed border-border/80" />
        </div>
      </AccordionItem>
    </Accordion>

    <div
      v-else
      class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-0 py-4"
    >
      <Empty class="w-full max-w-md flex-none border-0 bg-transparent shadow-none p-6! md:p-8!">
        <EmptyHeader class="max-w-md">
          <EmptyMedia variant="icon">
            <i
              :class="[
                schema.emptyState?.icon ?? 'ri-inbox-line',
                'text-[18px]',
              ]"
            />
          </EmptyMedia>
          <EmptyTitle>{{ schema.emptyState?.title ?? "暂无数据" }}</EmptyTitle>
          <EmptyDescription>
            {{ schema.emptyState?.description ?? schema.emptyText ?? "当前暂无可展示的数据。" }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  </section>
</template>
