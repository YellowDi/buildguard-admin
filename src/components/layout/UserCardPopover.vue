<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from "reka-ui"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const { state } = useSidebar()

const THEME_STORAGE_KEY = "buildguard-theme"

type ThemeMode = "system" | "light" | "dark"

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "system", label: "系统", icon: "ri-computer-line" },
  { value: "light", label: "浅色", icon: "ri-sun-line" },
  { value: "dark", label: "暗色", icon: "ri-moon-line" },
]

function getInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "system"
  try {
    let stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "system" || stored === "light" || stored === "dark")
      return stored
    const legacy = localStorage.getItem("buildguard-dark-mode")
    if (legacy === "true") {
      stored = "dark"
      localStorage.setItem(THEME_STORAGE_KEY, "dark")
      localStorage.removeItem("buildguard-dark-mode")
    } else if (legacy === "false") {
      stored = "light"
      localStorage.setItem(THEME_STORAGE_KEY, "light")
      localStorage.removeItem("buildguard-dark-mode")
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
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div
            class="flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-sm bg-avatar-placeholder text-sidebar-primary"
          >
            <span class="text-[10px] font-semibold">R</span>
          </div>
          <span class="truncate text-sm font-semibold text-foreground">Rolly</span>
        </div>
        <i class="ri-arrow-up-s-line shrink-0 text-base text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="'top'"
        :side-offset="8"
        :align="'start'"
        :class="
          cn(
            'z-50 w-[280px] overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:shadow-lg',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )
        "
      >
        <!-- 用户信息卡片 -->
        <div class="flex flex-col gap-0.5 border-b border-border px-3 py-3">
          <div class="flex items-start gap-2">
            <div
              class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-avatar-placeholder text-sidebar-primary"
            >
              <span class="text-sm font-semibold">R</span>
            </div>
            <div class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-foreground">Rolly</span>
              <p class="truncate text-xs text-muted-foreground">yellowdi@me.com</p>
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
                      ? 'bg-background text-foreground shadow-sm'
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

          <!-- 偏好设置 -->
          <RouterLink
            to="/settings"
            class="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-tertiary"
          >
            <i class="ri-settings-3-line text-base text-muted-foreground" />
            <span>偏好设置</span>
          </RouterLink>

          <!-- 账号登出 -->
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            @click="handleLogout"
          >
            <i class="ri-logout-box-r-line text-base" />
            <span>账号登出</span>
          </button>
        </div>

        <!-- 底部版本信息 -->
        <div class="border-t border-border px-3 py-2">
          <p class="text-xs text-muted-foreground">v.1.5.69 · 服务条款与条件</p>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
