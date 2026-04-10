<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core"
import { computed, useAttrs, useSlots } from "vue"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { SIDEBAR_MOBILE_MEDIA_QUERY } from "@/components/ui/sidebar/utils"
import Sheet from "./Sheet.vue"
import SheetContent from "./SheetContent.vue"
import SheetDescription from "./SheetDescription.vue"
import SheetHeader from "./SheetHeader.vue"
import SheetTitle from "./SheetTitle.vue"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 桌面 SheetContent 的额外 class */
    sheetContentClass?: string
    /** 移动端抽屉标题（也可用 #title 插槽） */
    title?: string
    /** 面板描述文本（也可用 #description 插槽） */
    description?: string
    /** 移动端底部主按钮文案，默认「查看详情」 */
    primaryLabel?: string
    /** 是否渲染主按钮（如无完整详情页可设 false，只保留关闭） */
    showPrimary?: boolean
  }>(),
  {
    primaryLabel: "查看详情",
    showPrimary: true,
  },
)

const emit = defineEmits<{
  "update:open": [value: boolean]
  "footer-primary": []
}>()

const attrs = useAttrs()
const slots = useSlots()
const isMobile = useMediaQuery(SIDEBAR_MOBILE_MEDIA_QUERY)
const hasDescription = computed(() => {
  if (slots.description) {
    return true
  }

  return Boolean(props.description?.trim())
})
const hasExplicitAriaDescribedBy = computed(() =>
  Object.prototype.hasOwnProperty.call(attrs, "aria-describedby"),
)
const contentAriaDescribedBy = computed(() => {
  if (hasExplicitAriaDescribedBy.value || hasDescription.value) {
    return undefined
  }

  return "undefined"
})

function onFooterPrimary() {
  emit("footer-primary")
}
</script>

<template>
  <Sheet v-if="!isMobile" :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      :class="cn('overflow-hidden sm:max-w-xl', sheetContentClass)"
      :aria-describedby="contentAriaDescribedBy"
    >
      <SheetHeader>
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
        <SheetTitle>
          <slot name="title">{{ title }}</slot>
        </SheetTitle>
        <SheetDescription v-if="hasDescription">
          <slot name="description">{{ description }}</slot>
        </SheetDescription>
      </SheetHeader>
      <slot />
    </SheetContent>
  </Sheet>

  <Drawer v-else :open="open" @update:open="emit('update:open', $event)">
    <DrawerContent
      class="flex min-h-0 flex-1 flex-col gap-0 border-0 p-0 outline-none"
      :aria-describedby="contentAriaDescribedBy"
    >
      <DrawerHeader class="shrink-0 border-b border-border/70 p-3">
        <DrawerTitle class="text-left text-base font-semibold leading-snug">
          <slot name="title">{{ title }}</slot>
        </DrawerTitle>
        <DrawerDescription v-if="hasDescription" class="text-left">
          <slot name="description">{{ description }}</slot>
        </DrawerDescription>
      </DrawerHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-3">
        <slot />
      </div>
      <DrawerFooter class="mt-0 shrink-0 p-3">
        <Button
          v-if="showPrimary"
          type="button"
          @click="onFooterPrimary"
        >
          {{ primaryLabel }}
        </Button>
        <DrawerClose as-child>
          <Button type="button" variant="outline">
            关闭
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
