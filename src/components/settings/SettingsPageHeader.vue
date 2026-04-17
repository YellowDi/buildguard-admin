<script setup lang="ts">
import TitleBlock from "@/components/layout/TitleBlock.vue"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { RouterLink } from "vue-router"
import type { SettingsCategoryKey } from "@/components/settings/types"

const props = withDefaults(defineProps<{
  title: string
  description?: string | null
  currentLabel?: string
  rootCategory?: SettingsCategoryKey
}>(), {
  description: null,
  currentLabel: "",
  rootCategory: "me",
})
</script>

<template>
  <div class="sticky top-0 z-[6] shrink-0 bg-background px-3 pt-4 pb-3 sm:px-4">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink as-child>
              <RouterLink :to="{ name: 'settings', params: { category: props.rootCategory } }">
                设置
              </RouterLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{{ props.currentLabel || props.title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <TitleBlock
        :title="props.title"
        :description="props.description ?? undefined"
      />

      <slot />
    </div>
  </div>
</template>
