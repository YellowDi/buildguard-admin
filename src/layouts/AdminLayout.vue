<script setup lang="ts">
import { ref } from "vue"
import AppHeader from "@/components/layout/AppHeader.vue"
import InboxPanel from "@/components/layout/InboxPanel.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import { SidebarProvider } from "@/components/ui/sidebar"

const inboxOpen = ref(false)
const mobileSidebarOpen = ref(false)

function toggleInbox() {
  inboxOpen.value = !inboxOpen.value
}

function closeInbox() {
  inboxOpen.value = false
}

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
      :inbox-open="inboxOpen"
      :mobile-open="mobileSidebarOpen"
      @toggle-inbox="toggleInbox"
      @close-inbox="closeInbox"
      @close-mobile="closeMobileSidebar"
    />
    <Transition
      enter-active-class="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <InboxPanel v-if="inboxOpen" />
    </Transition>
    <button
      v-if="inboxOpen"
      type="button"
      class="fixed inset-y-0 left-[var(--sidebar-width)] right-0 z-20 bg-black/[0.04] dark:bg-black/40 backdrop-blur-[2px]"
      aria-label="关闭收件箱"
      @click="closeInbox"
    />
    <button
      v-if="mobileSidebarOpen"
      type="button"
      class="fixed inset-0 z-20 hidden bg-transparent opacity-100 max-md:block max-md:touch-none"
      aria-label="关闭侧边栏"
      @click="closeMobileSidebar"
    />
    <div
      class="relative z-10 flex min-h-svh min-w-0 flex-1 flex-col bg-background transition-transform duration-300 ease-out"
      :class="mobileSidebarOpen ? 'max-md:translate-x-[334px] max-md:pointer-events-none' : ''"
      @click="mobileSidebarOpen && closeMobileSidebar()"
    >
      <AppHeader
        :on-toggle-mobile-sidebar="toggleMobileSidebar"
        :on-toggle-desktop-sidebar="toggleSidebar"
      />
      <main class="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <RouterView />
      </main>
    </div>
  </SidebarProvider>
</template>
