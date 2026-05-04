<script setup lang="ts">
import { computed } from "vue"
import { RouterLink, useRoute, useRouter } from "vue-router"

import { Button } from "@/components/ui/button"

const route = useRoute()
const router = useRouter()

const requestedPath = computed(() => route.fullPath)

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push({ name: "dashboard" })
}
</script>

<template>
  <section class="flex min-h-[calc(100svh-6rem)] items-center justify-center px-2 py-10">
    <div class="w-full max-w-3xl">
      <div class="min-w-0">
        <p class="text-sm font-medium text-muted-foreground">页面未找到</p>
        <h1 class="mt-3 text-[clamp(4.5rem,12vw,8.5rem)] font-semibold leading-none tracking-normal text-foreground">
          404
        </h1>
        <p class="mt-5 max-w-xl text-balance text-xl font-medium leading-8 text-foreground">
          当前地址不存在，可能已被移动、删除，或链接输入有误。
        </p>
        <p class="mt-3 max-w-xl break-all text-sm leading-6 text-muted-foreground">
          {{ requestedPath }}
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <Button size="default" class="h-10 px-4" @click="goBack">
            <i class="ri-arrow-left-line text-base leading-none" />
            返回上一页
          </Button>
          <Button as-child variant="outline" size="default" class="h-10 px-4">
            <RouterLink :to="{ name: 'dashboard' }">
              <i class="ri-home-5-line text-base leading-none" />
              回工作台
            </RouterLink>
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
