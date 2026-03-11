<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const { state } = useSidebar()

const THEME_STORAGE_KEY = "app-theme"
const LEGACY_THEME_STORAGE_KEY = "app-dark-mode"

type ThemeMode = "system" | "light" | "dark"

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "system", label: "系统", icon: "ri-computer-line" },
  { value: "light", label: "浅色", icon: "ri-sun-line" },
  { value: "dark", label: "暗色", icon: "ri-moon-line" },
]

const user = {
  name: "Rolly",
  email: "yellowdi@me.com",
  avatarSrc: "",
}

const userInitial = user.name.charAt(0).toUpperCase()

function getInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "system"
  try {
    let stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "system" || stored === "light" || stored === "dark")
      return stored
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (legacy === "true") {
      stored = "dark"
      localStorage.setItem(THEME_STORAGE_KEY, "dark")
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    } else if (legacy === "false") {
      stored = "light"
      localStorage.setItem(THEME_STORAGE_KEY, "light")
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    }
    return stored === "dark" || stored === "light" ? stored : "system"
  } catch {
    return "system"
  }
}

function shouldUseDark(mode: ThemeMode): boolean {
  if (mode === "light") return false
  if (mode === "dark") return true
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
}

function applyTheme(dark: boolean) {
  if (dark) document.documentElement.classList.add("dark")
  else document.documentElement.classList.remove("dark")
}

const themeMode = ref<ThemeMode>(getInitialTheme())
const open = ref(false)
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

onMounted(() => {
  applyTheme(shouldUseDark(themeMode.value))
  if (themeMode.value === "system" && typeof window !== "undefined") {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaListener = () => applyTheme(shouldUseDark(themeMode.value))
    mediaQuery.addEventListener("change", mediaListener)
  }
})

onUnmounted(() => {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener)
  }
})

watch(themeMode, (mode) => {
  if (typeof document === "undefined") return
  localStorage.setItem(THEME_STORAGE_KEY, mode)
  applyTheme(shouldUseDark(mode))
  if (mode === "system" && typeof window !== "undefined") {
    if (mediaQuery && mediaListener) {
      mediaQuery.removeEventListener("change", mediaListener)
    }
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaListener = () => applyTheme(shouldUseDark(themeMode.value))
    mediaQuery.addEventListener("change", mediaListener)
  } else if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener)
    mediaQuery = null
    mediaListener = null
  }
})

watch(state, (value) => {
  if (value === "collapsed" && open.value) {
    open.value = false
  }
})

function handleLogout() {
  // TODO: 实现登出逻辑
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
          <span class="truncate text-sm font-semibold text-foreground">{{ user.name }}</span>
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
          'w-[280px] rounded-xl border-border p-0 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:shadow-md',
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
              <p class="truncate text-xs text-muted-foreground">{{ user.email }}</p>
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
            <div
              class="flex rounded-lg bg-muted/60 p-0.5"
              role="radiogroup"
              aria-label="主题"
            >
              <button
                v-for="opt in THEME_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                :aria-checked="themeMode === opt.value"
                :class="
                  cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
                    themeMode === opt.value
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                "
                @click="themeMode = opt.value"
              >
                <i :class="[opt.icon, 'text-sm']" />
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

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
