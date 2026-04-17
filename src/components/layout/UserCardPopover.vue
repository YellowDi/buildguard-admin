<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppTheme } from "@/composables/useAppTheme"
import { clearCurrentUser, useCurrentUser } from "@/composables/useCurrentUser"
import { clearAuthToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

const router = useRouter()
const { state } = useSidebar()
const { themeMode, themeOptions } = useAppTheme()
const { currentUser: user, error, hasLoaded, isLoading } = useCurrentUser()

const open = ref(false)
const userInitial = computed(() => user.name.trim().charAt(0).toUpperCase() || "U")
const userTriggerLabel = computed(() => {
  if (isLoading.value && !hasLoaded.value) {
    return "加载中..."
  }

  return user.name
})
const userDescription = computed(() => {
  if (user.departmentName && user.position) {
    return `${user.departmentName} · ${user.position}`
  }

  return user.departmentName || user.position || user.corpName || user.phone
})
const userContactLine = computed(() => {
  return user.phone || user.corpName || userDescription.value || ""
})
const userStatusLine = computed(() => {
  if (error.value) {
    return "用户信息加载失败"
  }

  if (isLoading.value && !hasLoaded.value) {
    return "正在同步账号信息..."
  }

  if (user.missingProfileMessage) {
    return user.missingProfileMessage
  }

  return userDescription.value || userContactLine.value || "暂无账号信息"
})

watch(state, (value) => {
  if (value === "collapsed" && open.value) {
    open.value = false
  }
})

function handleLogout() {
  open.value = false
  clearAuthToken()
  clearCurrentUser()
  void router.replace({ name: "login" })
}

function handleOpenSettings() {
  open.value = false
  void router.push({ name: "settings", params: { category: "me" } })
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-interactive-hover hover:text-sidebar-accent-foreground"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <Avatar class="size-[22px] rounded-sm">
            <AvatarImage
              v-if="user.avatarSrc"
              :src="user.avatarSrc"
              :alt="`${user.name} avatar`"
              class="object-cover"
            />
            <AvatarFallback class="rounded-sm bg-avatar-placeholder text-sidebar-primary">
              <span class="text-[10px] font-semibold">{{ userInitial }}</span>
            </AvatarFallback>
          </Avatar>
          <span class="truncate text-sm font-semibold text-foreground">{{ userTriggerLabel }}</span>
        </div>
        <i class="ri-arrow-up-s-line shrink-0 text-base text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :side="'top'"
      :side-offset="8"
      :align="'start'"
      :class="
        cn(
          'w-[280px] rounded-xl border-border p-0 shadow-(--shadow-soft)',
        )
      "
    >
        <!-- 用户信息卡片 -->
        <div class="flex flex-col gap-0.5 border-b border-border px-3 py-3">
          <div class="flex items-start gap-2">
            <Avatar class="size-9 rounded-sm">
              <AvatarImage
                v-if="user.avatarSrc"
                :src="user.avatarSrc"
                :alt="`${user.name} avatar`"
                class="object-cover"
              />
              <AvatarFallback class="rounded-sm bg-avatar-placeholder text-sidebar-primary">
                <span class="text-sm font-semibold">{{ userInitial }}</span>
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-foreground">{{ user.name }}</span>
              <p class="truncate text-xs text-muted-foreground">{{ userStatusLine }}</p>
              <p v-if="userContactLine && userContactLine !== userStatusLine" class="truncate text-xs text-muted-foreground">
                {{ userContactLine }}
              </p>
            </div>
          </div>
        </div>

        <!-- 菜单项 -->
        <div class="py-1">
          <!-- 外观 / 主题 -->
          <div class="px-3 py-1.5">
            <div class="mb-1.5 flex items-center gap-2 text-sm text-foreground">
              <i class="ri-palette-line text-base text-muted-foreground" />
              <span>外观</span>
            </div>
            <Tabs
              v-model="themeMode"
              aria-label="主题"
            >
              <TabsList class="h-auto w-full rounded-lg bg-muted/60">
                <TabsTrigger
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  :value="opt.value"
                  class="h-auto flex-1 px-2 py-1.5 text-xs data-[state=active]:shadow-xs"
                >
                  <i :class="[opt.icon, 'text-sm']" />
                  <span>{{ opt.label }}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <DropdownMenuItem
            as-child
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
          >
            <button
              type="button"
              @click="handleOpenSettings"
            >
              <i class="ri-settings-3-line text-base text-muted-foreground" />
              <span>打开设置</span>
            </button>
          </DropdownMenuItem>

          <!-- 账号登出 -->
          <DropdownMenuSeparator class="mx-0 my-1 bg-border" />
          <DropdownMenuItem
            as-child
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <button
              type="button"
              @click="handleLogout"
            >
              <i class="ri-logout-box-r-line text-base" />
              <span>账号登出</span>
            </button>
          </DropdownMenuItem>
        </div>

        <!-- 底部版本信息 -->
        <div class="border-t border-border px-3 py-2">
          <p class="text-xs text-muted-foreground">v.1.5.69 · 服务条款与条件</p>
        </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
