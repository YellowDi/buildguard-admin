<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue"
import AppSidebar from "@/components/layout/AppSidebar.vue"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <main class="flex flex-1 flex-col gap-4 p-4">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
