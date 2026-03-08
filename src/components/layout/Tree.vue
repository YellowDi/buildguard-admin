<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface TreeFile {
  name: string
  path: string
}

interface TreeFolder {
  name: string
  defaultOpen?: boolean
  files: TreeFile[]
}

const route = useRoute()

const folders: TreeFolder[] = [
  {
    name: "app",
    files: [
      { name: "layout.vue", path: "/" },
      { name: "page.vue", path: "/users" },
    ],
  },
  {
    name: "components",
    defaultOpen: true,
    files: [
      { name: "button.vue", path: "/" },
      { name: "breadcrumb.vue", path: "/users" },
      { name: "dialog.vue", path: "/vehicles" },
    ],
  },
  {
    name: "hooks",
    files: [
      { name: "use-mobile.ts", path: "/" },
    ],
  },
  {
    name: "lib",
    files: [
      { name: "utils.ts", path: "/" },
    ],
  },
]

const activePath = computed(() => route.path)
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Files</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem v-for="folder in folders" :key="folder.name">
          <Collapsible :default-open="folder.defaultOpen" class="group/collapsible">
            <CollapsibleTrigger as-child>
              <SidebarMenuButton>
                <i class="ri-arrow-right-s-line transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <i class="ri-folder-2-line text-muted-foreground" />
                <span>{{ folder.name }}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="file in folder.files" :key="`${folder.name}-${file.name}`">
                  <SidebarMenuSubButton as-child :is-active="activePath === file.path">
                    <RouterLink :to="file.path">
                      <i class="ri-file-line text-muted-foreground" />
                      <span>{{ file.name }}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
