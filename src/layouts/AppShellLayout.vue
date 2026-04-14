<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"

import AppHeader from "@/components/layout/AppHeader.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import SettingsDialog from "@/components/settings/SettingsDialog.vue"
import RouteLoadingFallback from "@/components/loading/RouteLoadingFallback.vue"
import { useRouteLoadingState, type RouteLoadingKind } from "@/composables/useRouteLoadingState"
import { SidebarProvider } from "@/components/ui/sidebar"

const mobileSidebarOpen = ref(false)
const { isRouteLoading, loadingKind } = useRouteLoadingState()
const route = useRoute()

const showContentFallback = computed(() =>
  isRouteLoading.value && loadingKind.value !== "auth" && loadingKind.value !== "table",
)
const routeTransitionName = ref("route-page-fade")
const currentRouteKind = ref<RouteLoadingKind | null>(resolveRouteLoadingKind(route.meta.loading))

function resolveRouteLoadingKind(value: unknown): RouteLoadingKind | null {
  return value === "auth" || value === "dashboard" || value === "table" || value === "detail" || value === "form"
    ? value
    : null
}

function getRouteTransitionName(fromKind: RouteLoadingKind | null, toKind: RouteLoadingKind | null) {
  if (fromKind === "table" && toKind === "detail") {
    return "route-page-forward"
  }

  if (fromKind === "detail" && toKind === "table") {
    return "route-page-backward"
  }

  return "route-page-fade"
}

watch(
  () => route.fullPath,
  () => {
    const fromKind = currentRouteKind.value
    const toKind = resolveRouteLoadingKind(route.meta.loading)

    routeTransitionName.value = getRouteTransitionName(fromKind, toKind)
    currentRouteKind.value = toKind
  },
)

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}
</script>

<template>
  <SidebarProvider v-slot="{ toggleSidebar }" v-model:open-mobile="mobileSidebarOpen" class="relative overflow-x-hidden bg-background">
    <AppSidebar
      :mobile-open="mobileSidebarOpen"
      @close-mobile="closeMobileSidebar"
    />
    <button
      v-if="mobileSidebarOpen"
      type="button"
      class="fixed inset-0 z-20 hidden bg-background/28 opacity-100 backdrop-blur-[2px] max-[999px]:block max-[999px]:touch-none"
      aria-label="关闭侧边栏"
      @click="closeMobileSidebar"
    />
    <div
      class="relative z-10 flex h-svh min-w-0 flex-1 flex-col overflow-hidden bg-background transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
      :class="mobileSidebarOpen ? 'max-[999px]:translate-x-[255px] max-[999px]:pointer-events-none' : ''"
      @click="mobileSidebarOpen && closeMobileSidebar()"
    >
      <AppHeader
        :on-toggle-mobile-sidebar="toggleMobileSidebar"
        :on-toggle-desktop-sidebar="toggleSidebar"
      />
      <main class="flex min-w-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        <RouterView v-slot="{ Component }">
          <RouteLoadingFallback
            v-if="showContentFallback"
            :kind="loadingKind"
          />
          <Transition
            v-else
            :name="routeTransitionName"
            mode="out-in"
          >
            <div :key="route.name ?? route.fullPath" class="route-page-shell flex min-h-0 flex-1 flex-col">
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </main>
    </div>
    <SettingsDialog />
  </SidebarProvider>
</template>
