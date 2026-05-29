<script setup lang="ts">
import { computed } from "vue"

import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"

const props = withDefaults(defineProps<{
  code?: string
  mode?: "hide" | "disable"
}>(), {
  code: "",
  mode: "hide",
})

const { canButton } = useCurrentUserPermissions()

const allowed = computed(() => !props.code || canButton(props.code))
</script>

<template>
  <slot v-if="allowed || mode === 'disable'" :allowed="allowed" />
</template>
