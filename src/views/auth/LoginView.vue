<script setup lang="ts">
import { reactive } from "vue"
import { useRouter } from "vue-router"

import loginVisual from "@/assets/auth-login-visual.svg"
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

const router = useRouter()

const form = reactive({
  phone: "",
})

function handleSubmit() {
  router.push({
    name: "otp",
    query: {
      phone: form.phone,
    },
  })
}
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <RouterLink to="/login" class="flex items-center gap-2 font-medium">
          <BrandLogo
            label="BuildGuard"
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
                手机号登录
              </CardTitle>
              <CardDescription>
                输入手机号以获取短信验证码
              </CardDescription>
            </CardHeader>
            <CardContent class="px-0">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="phone">手机号码</label>
                    <Input
                      id="phone"
                      v-model="form.phone"
                      type="tel"
                      inputmode="tel"
                      placeholder="请输入手机号码"
                      autocomplete="tel"
                      required
                    />
                  </div>

                  <Button type="submit" class="w-full">
                    获取验证码
                  </Button>

                  <Button type="button" variant="outline" class="w-full">
                    <i class="ri-github-line text-base" />
                    使用 GitHub 登录
                  </Button>
                </div>

                <div class="text-center text-sm">
                  还没有账户？
                  <RouterLink to="/signup" class="underline underline-offset-4">
                    立即注册
                  </RouterLink>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="bg-muted relative hidden lg:block">
      <img
        :src="loginVisual"
        alt="登录页抽象花瓣背景"
        class="absolute inset-0 h-full w-full object-cover"
      >
    </div>
  </div>
</template>
