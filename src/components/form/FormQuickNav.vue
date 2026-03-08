<script setup lang="ts">
type QuickNavItem = {
  id: string
  label: string
}

defineProps<{
  activeId: string
  items: QuickNavItem[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <nav>
    <div class="space-y-1">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :class="[
          'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors',
          activeId === item.id
            ? 'bg-accent font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        ]"
        @click="emit('select', item.id)"
      >
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>
