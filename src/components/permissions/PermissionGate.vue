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

const { canButton, hasLoaded } = useCurrentUserPermissions()

const allowed = computed(() => !props.code || !hasLoaded.value || canButton(props.code))
</script>

<template>
  <slot v-if="allowed || mode === 'disable'" :allowed="allowed" />
</template>
