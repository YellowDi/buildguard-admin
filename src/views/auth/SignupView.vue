<script setup lang="ts">
import { reactive } from "vue"

import signupVisual from "@/assets/auth-signup-visual.svg"
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

const form = reactive({
  company: "",
  phone: "",
  password: "",
  confirmPassword: "",
})

function handleSubmit() {
  // Placeholder for auth integration.
  console.log("signup submit", { ...form })
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
                创建新账户
              </CardTitle>
              <CardDescription>
                填写以下信息以创建工作区账户
              </CardDescription>
            </CardHeader>
            <CardContent class="px-0">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="company">团队名称</label>
                    <Input
                      id="company"
                      v-model="form.company"
                      type="text"
                      placeholder="请输入团队或公司名称"
                      autocomplete="organization"
                      required
                    />
                  </div>

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

                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="password">密码</label>
                    <Input
                      id="password"
                      v-model="form.password"
                      type="password"
                      autocomplete="new-password"
                      required
                    />
                  </div>

                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="confirm-password">确认密码</label>
                    <Input
                      id="confirm-password"
                      v-model="form.confirmPassword"
                      type="password"
                      autocomplete="new-password"
                      required
                    />
                  </div>

                  <Button type="submit" class="w-full">
                    注册
                  </Button>

                  <Button type="button" variant="outline" class="w-full">
                    <i class="ri-github-line text-base" />
                    使用 GitHub 注册
                  </Button>
                </div>

                <div class="text-center text-sm">
                  已有账户？
                  <RouterLink to="/login" class="underline underline-offset-4">
                    返回登录
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
        :src="signupVisual"
        alt="注册页抽象花瓣背景"
        class="absolute inset-0 h-full w-full object-cover"
      >
    </div>
  </div>
</template>
