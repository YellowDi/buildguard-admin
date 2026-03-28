<template>
  <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div
      v-if="$slots.leading"
      class="min-w-0 overflow-x-auto"
    >
      <slot name="leading" />
    </div>

    <div class="flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
      <slot />
    </div>
  </div>
</template>
