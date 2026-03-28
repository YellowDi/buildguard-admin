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
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <RouterLink to="/login" class="flex items-center gap-2 font-medium">
          <BrandLogo
            image-class="size-8"
            text-class="truncate text-base font-semibold"
          />
        </RouterLink>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <Card class="border-none bg-transparent shadow-none">
            <CardHeader class="px-0 text-center">
              <CardTitle class="text-2xl">
                后台登录
              </CardTitle>
              <CardDescription>
                使用手机号或用户名加密码登录后台管理平台
              </CardDescription>
            </CardHeader>
            <CardContent class="px-0">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="account">账户</label>
                    <Input
                      id="account"
                      v-model="form.account"
                      type="text"
                      inputmode="text"
                      placeholder="请输入手机号或用户名"
                      autocomplete="username"
                      required
                    />
                  </div>

                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="password">密码</label>
                    <Input
                      id="password"
                      v-model="form.password"
                      type="password"
                      placeholder="请输入密码"
                      autocomplete="current-password"
                      required
                    />
                  </div>

                  <Button type="submit" class="w-full" :disabled="isSubmitting">
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
          class="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
          @contextmenu.prevent
        />
        <div
          class="pointer-events-none absolute inset-0 bg-white/35 backdrop-blur-md"
          aria-hidden="true"
        />
      </div>
      <div
        v-show="!showLoginVisualFallback"
        class="pointer-events-none absolute inset-0 z-10 bg-white/35 backdrop-blur-md"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
