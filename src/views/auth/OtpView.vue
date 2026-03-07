<script setup lang="ts">
import { computed, reactive } from "vue"
import { GalleryVerticalEnd } from "lucide-vue-next"
import { useRoute } from "vue-router"

import otpVisual from "@/assets/auth-otp-visual.svg"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const route = useRoute()

const form = reactive({
  code: "",
})

const phone = computed(() => String(route.query.phone ?? ""))

function handleSubmit() {
  // Placeholder for OTP verification.
  console.log("otp submit", { phone: phone.value, code: form.code })
}
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <RouterLink to="/login" class="flex items-center gap-2 font-medium">
          <div class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd class="size-4" />
          </div>
          BuildGuard
        </RouterLink>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <Card class="border-none bg-transparent shadow-none">
            <CardHeader class="px-0 text-center">
              <CardTitle class="text-2xl">
                输入验证码
              </CardTitle>
              <CardDescription>
                验证码已发送至{{ phone || "你的手机号" }}
              </CardDescription>
            </CardHeader>
            <CardContent class="px-0">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium" for="code">短信验证码</label>
                    <Input
                      id="code"
                      v-model="form.code"
                      type="text"
                      inputmode="numeric"
                      maxlength="6"
                      placeholder="请输入 6 位验证码"
                      autocomplete="one-time-code"
                      required
                    />
                  </div>

                  <Button type="submit" class="w-full">
                    验证并登录
                  </Button>

                  <Button type="button" variant="outline" class="w-full">
                    重新发送验证码
                  </Button>
                </div>

                <div class="text-center text-sm">
                  输错手机号了？
                  <RouterLink to="/login" class="underline underline-offset-4">
                    返回修改
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
        :src="otpVisual"
        alt="验证码页抽象花瓣背景"
        class="absolute inset-0 h-full w-full object-cover"
      >
    </div>
  </div>
</template>
