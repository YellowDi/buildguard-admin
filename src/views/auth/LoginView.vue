<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { toast } from "vue-sonner"

import loginVisual from "@/assets/auth-login-visual.svg"
import loginVideo from "@/assets/video.mp4"
import BrandLogo from "@/components/layout/BrandLogo.vue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { clearCurrentUser, loadCurrentUser } from "@/composables/useCurrentUser"
import { login } from "@/lib/auth-api"
import { setAuthToken } from "@/lib/auth"

const router = useRouter()

const form = reactive({
  account: "",
  password: "",
})
const isSubmitting = ref(false)

const videoReady = ref(false)
const videoError = ref(false)
const showLoginVisualFallback = computed(
  () => !videoReady.value || videoError.value,
)

function onLoginVideoCanPlay() {
  if (videoError.value) {
    return
  }
  videoReady.value = true
}

function onLoginVideoError() {
  videoError.value = true
  videoReady.value = false
}

async function handleSubmit() {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  try {
    const { token } = await login({
      Account: form.account,
      Password: form.password,
    })

    setAuthToken(token)
    clearCurrentUser()
    await loadCurrentUser({ force: true })

    const { redirect } = router.currentRoute.value.query

    await router.replace(
      typeof redirect === "string" && redirect.trim()
        ? redirect
        : { name: "dashboard" },
    )
  } catch (error) {
    toast.error("登录失败", {
      description: error instanceof Error ? error.message : "请检查手机号或稍后重试。",
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(0,117,222,0.08),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,252,0.96))] lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <RouterLink to="/login" class="flex items-center gap-2 rounded-xl px-2 py-1.5 font-medium transition-[background-color,color] duration-180 ease-out hover:bg-background/70">
          <BrandLogo
            image-class="size-8"
            text-class="truncate text-base font-semibold"
          />
        </RouterLink>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-sm">
          <Card class="rounded-[calc(var(--radius)+10px)] border-transparent bg-background/82 py-0 shadow-(--shadow-deep) backdrop-blur-md">
            <CardHeader class="px-6 pt-6 text-center">
              <CardTitle class="text-2xl tracking-tight">
                后台登录
              </CardTitle>
              <CardDescription class="mt-1">
                使用手机号或用户名加密码登录后台管理平台
              </CardDescription>
            </CardHeader>
            <CardContent class="px-6 pb-6">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground/88" for="account">账户</label>
                    <Input
                      id="account"
                      v-model="form.account"
                      type="text"
                      inputmode="text"
                      class="shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)"
                      placeholder="请输入手机号或用户名"
                      autocomplete="username"
                      required
                    />
                  </div>

                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground/88" for="password">密码</label>
                    <Input
                      id="password"
                      v-model="form.password"
                      type="password"
                      class="shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)"
                      placeholder="请输入密码"
                      autocomplete="current-password"
                      required
                    />
                  </div>

                  <Button type="submit" class="mt-1 h-11 w-full shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)" :disabled="isSubmitting">
                    {{ isSubmitting ? "登录中..." : "登录" }}
                  </Button>

                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="bg-muted relative hidden lg:block">
      <video
        class="absolute inset-0 z-0 h-full w-full object-cover"
        :src="loginVideo"
        preload="auto"
        autoplay
        loop
        muted
        playsinline
        aria-hidden="true"
        @canplay="onLoginVideoCanPlay"
        @error="onLoginVideoError"
        @contextmenu.prevent
      />
      <div
        v-show="showLoginVisualFallback"
        class="absolute inset-0 z-[1]"
      >
        <img
          :src="loginVisual"
          alt=""
          class="absolute inset-0 h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
          aria-hidden="true"
          @contextmenu.prevent
        />
        <div
          class="pointer-events-none absolute inset-0 bg-background/30 backdrop-blur-md"
          aria-hidden="true"
        />
      </div>
      <div
        v-show="!showLoginVisualFallback"
        class="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.32))] backdrop-blur-[3px]"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
