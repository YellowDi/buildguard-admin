<template>
  <div class="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
    <div
      v-if="$slots.leading"
      class="min-w-0 flex-1 overflow-x-auto"
    >
      <slot name="leading" />
    </div>

    <div class="min-w-0 shrink-0 overflow-x-auto">
      <slot />
    </div>
  </div>
</template>
