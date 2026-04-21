<template>
  <div class="flex min-w-0 items-center justify-between gap-3">
    <div
      v-if="$slots.leading"
      class="-my-1 min-w-0 flex-1 overflow-x-auto py-1"
    >
      <slot name="leading" />
    </div>

    <div class="-my-1 min-w-0 shrink-0 overflow-x-auto py-1">
      <slot />
    </div>
  </div>
</template>
