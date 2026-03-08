<script setup lang="ts">
import { ref } from "vue"
import AppHeader from "@/components/layout/AppHeader.vue"
import InboxPanel from "@/components/layout/InboxPanel.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import { SidebarProvider } from "@/components/ui/sidebar"

const inboxOpen = ref(false)

function toggleInbox() {
  inboxOpen.value = !inboxOpen.value
}

function closeInbox() {
  inboxOpen.value = false
}
</script>

<template>
  <SidebarProvider class="relative bg-background">
    <AppSidebar :inbox-open="inboxOpen" @toggle-inbox="toggleInbox" @close-inbox="closeInbox" />
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
      class="fixed inset-y-0 left-[16rem] right-0 z-20 bg-black/[0.04] dark:bg-black/40 backdrop-blur-[2px]"
      aria-label="关闭收件箱"
      @click="closeInbox"
    />
    <div class="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
      <AppHeader />
      <main class="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <RouterView />
      </main>
    </div>
  </SidebarProvider>
</template>
