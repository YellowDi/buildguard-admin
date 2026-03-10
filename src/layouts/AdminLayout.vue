<script setup lang="ts">
import { ref } from "vue"
import AppHeader from "@/components/layout/AppHeader.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import { SidebarProvider } from "@/components/ui/sidebar"

const mobileSidebarOpen = ref(false)

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
      class="fixed inset-0 z-20 hidden bg-transparent opacity-100 max-md:block max-md:touch-none"
      aria-label="关闭侧边栏"
      @click="closeMobileSidebar"
    />
    <div
      class="relative z-10 flex h-svh min-w-0 flex-1 flex-col overflow-hidden bg-background transition-transform duration-300 ease-out"
      :class="mobileSidebarOpen ? 'max-md:translate-x-[334px] max-md:pointer-events-none' : ''"
      @click="mobileSidebarOpen && closeMobileSidebar()"
    >
      <AppHeader
        :on-toggle-mobile-sidebar="toggleMobileSidebar"
        :on-toggle-desktop-sidebar="toggleSidebar"
      />
      <main class="flex min-w-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-0">
        <RouterView />
      </main>
    </div>
  </SidebarProvider>
</template>
