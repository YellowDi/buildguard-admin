<script setup lang="ts">
import { computed, useSlots } from "vue"

import SectionHeader from "@/components/layout/SectionHeader.vue"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// 详情页页面骨架。
// 新建详情页时优先复用这里：只关心标题、空态，以及 primary/secondary 两个内容槽。
// 单列详情页只传 primary；双列详情页同时传 primary 和 secondary。
const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  empty?: boolean
  emptyText?: string
  backLabel?: string
  secondaryVisible?: boolean
  fullWidth?: boolean
}>(), {
  subtitle: "",
  empty: false,
  emptyText: "未找到相关信息",
  backLabel: "返回列表",
  secondaryVisible: true,
  fullWidth: false,
})

const emit = defineEmits<{
  back: []
}>()

const slots = useSlots()
const hasSecondary = computed(() => Boolean(slots.secondary) && props.secondaryVisible)
</script>

<template>
  <section
    :class="[
      'detail-layout mx-auto flex w-full min-w-0 flex-1 flex-col px-0 pb-8 sm:px-4 sm:pb-10 xl:px-8',
      props.fullWidth ? 'max-w-none' : 'max-w-[1440px]',
    ]"
  >
    <template v-if="!props.empty">
      <div class="sticky top-0 z-10 -mx-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
        <div class="px-4 py-5">
          <SectionHeader :title="props.title" :subtitle="props.subtitle" :has-actions="Boolean($slots.actions)">
            <template #actions>
              <slot name="actions" />
            </template>
          </SectionHeader>
        </div>
      </div>

      <div class="detail-layout__content grid min-h-0 flex-1 grid-cols-1 gap-0 px-0 py-5">
        <div class="detail-layout__primary min-w-0 pr-0">
          <slot name="primary" />
        </div>

        <Separator
          v-if="hasSecondary"
          orientation="vertical"
          class="detail-layout__divider hidden h-auto bg-border/80"
        />

        <div
          v-if="hasSecondary"
          class="detail-layout__secondary min-w-0 pt-8"
        >
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
