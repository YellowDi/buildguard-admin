<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"

import type { RouteLoadingKind } from "@/composables/useRouteLoadingState"
import AuthPageLoading from "@/components/loading/AuthPageLoading.vue"
import DashboardLoading from "@/components/loading/DashboardLoading.vue"
import DetailPageLoading from "@/components/loading/DetailPageLoading.vue"
import FormPageLoading from "@/components/loading/FormPageLoading.vue"

const props = withDefaults(defineProps<{
  fullPage?: boolean
  kind?: RouteLoadingKind
}>(), {
  fullPage: false,
})

const route = useRoute()

const loadingKind = computed<RouteLoadingKind>(() => {
  const value = props.kind ?? route.meta.loading

  return value === "auth" || value === "dashboard" || value === "table" || value === "detail" || value === "form"
    ? value
    : "table"
})

const wrapperClass = computed(() =>
  props.fullPage && loadingKind.value !== "auth"
    ? "min-h-svh bg-background"
    : props.fullPage
      ? "bg-background"
      : "min-h-0 flex-1",
)
</script>

<template>
  <div :class="wrapperClass">
    <AuthPageLoading v-if="loadingKind === 'auth'" />
    <DashboardLoading v-else-if="loadingKind === 'dashboard'" />
    <DetailPageLoading v-else-if="loadingKind === 'detail'" />
    <FormPageLoading v-else-if="loadingKind === 'form'" />
    <div v-else class="min-h-0 flex-1 bg-background" />
  </div>
</template>
