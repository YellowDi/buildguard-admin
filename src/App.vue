<script setup lang="ts">
import { computed } from "vue"

import { useRouteLoadingState } from "@/composables/useRouteLoadingState"
import RouteLoadingFallback from "@/components/loading/RouteLoadingFallback.vue"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const { isRouteLoading, loadingKind } = useRouteLoadingState()

const showFullPageFallback = computed(() =>
  isRouteLoading.value && loadingKind.value === "auth",
)
</script>

<template>
  <TooltipProvider>
    <RouteLoadingFallback
      v-if="showFullPageFallback"
      full-page
      :kind="loadingKind"
    />
    <RouterView v-else />
    <Toaster position="top-center" />
  </TooltipProvider>
</template>
