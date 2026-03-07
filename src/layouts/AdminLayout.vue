<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import { SidebarProvider } from "@/components/ui/sidebar"
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <div class="flex min-h-svh flex-1 flex-col">
      <AppHeader />
      <main class="flex flex-1 flex-col gap-4 p-4">
        <RouterView />
      </main>
    </div>
  </SidebarProvider>
</template>
