<script setup lang="ts">
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

defineProps<{
  modelValue: string
  expanded: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  toggle: []
}>()

const iconButtonClass =
  "top-tab-switch-icon-button flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"

/**
 * 展开 / 收起共用同一套时长与曲线，反向操作更「可逆」、更符合直觉。
 * 输入区不单独做 opacity 离场，避免与 width 打架；靠 overflow-hidden 随宽度被裁切。
 */
const shellTransition =
  "transition-[width,padding,border-color] duration-[300ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0"
</script>

<template>
  <div
    :class="
      cn(
        'flex h-8 items-center gap-0 overflow-hidden rounded-full border border-input bg-background',
        shellTransition,
        expanded ? 'w-[260px] pl-0 pr-1.5' : 'w-8 justify-center border-transparent px-0',
      )
    "
  >
    <button
      type="button"
      :class="cn(iconButtonClass, 'shrink-0 transition-colors duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]')"
      @click="emit('toggle')"
    >
      <i
        :class="
          expanded
            ? 'ri-close-line flex size-[17px] items-center justify-center text-[17px] leading-none'
            : 'ri-search-line flex size-[17px] items-center justify-center text-[17px] leading-none'
        "
      />
    </button>
    <Input
      v-if="expanded"
      :model-value="modelValue"
      :placeholder="placeholder"
      class="min-h-8 h-8 min-w-0 flex-1 border-0 bg-transparent py-0 pl-0 pr-2 text-sm leading-8 shadow-none focus-visible:border-transparent focus-visible:ring-0"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
  </div>
</template>
