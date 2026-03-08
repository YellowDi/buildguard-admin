<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from "reka-ui"
import { SwitchRoot, SwitchThumb } from "reka-ui"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const { state } = useSidebar()

const DARK_STORAGE_KEY = "buildguard-dark-mode"

const isDark = computed({
  get() {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("dark")
  },
  set(value: boolean) {
    if (typeof document === "undefined") return
    if (value) {
      document.documentElement.classList.add("dark")
      localStorage.setItem(DARK_STORAGE_KEY, "true")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem(DARK_STORAGE_KEY, "false")
    }
  },
})

const open = ref(false)

onMounted(() => {
  const stored = localStorage.getItem(DARK_STORAGE_KEY)
  if (stored === "true") {
    document.documentElement.classList.add("dark")
  } else if (stored === "false") {
    document.documentElement.classList.remove("dark")
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
          <!-- 暗黑模式 -->
          <div
            class="flex items-center justify-between gap-0 px-3 py-1.5 text-sm text-foreground"
          >
            <div class="flex items-center gap-2">
              <i class="ri-moon-line text-base text-muted-foreground" />
              <span>暗黑模式</span>
            </div>
            <SwitchRoot
              v-model="isDark"
              :class="
                cn(
                  'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors',
                  'data-[state=checked]:bg-success data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-secondary',
                )
              "
            >
              <SwitchThumb
                :class="
                  cn(
                    'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
                    'translate-x-0.5 data-[state=checked]:translate-x-[18px]',
                  )
                "
              />
            </SwitchRoot>
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
