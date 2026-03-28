<script setup lang="ts">
import { ref } from "vue"
import { toast } from "vue-sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useGlobalBranding } from "@/composables/useGlobalBranding"

const {
  siteName,
  logoSrc,
  faviconHref,
  logoDataUrl,
  faviconDataUrl,
  setLogoFromFile,
  setFaviconFromFile,
  clearCustomLogo,
  clearCustomFavicon,
  persist,
} = useGlobalBranding()

const logoInputRef = ref<HTMLInputElement | null>(null)
const faviconInputRef = ref<HTMLInputElement | null>(null)

const maxBytes = 2 * 1024 * 1024

function assertImageSize(file: File): boolean {
  if (file.size > maxBytes) {
    toast.error("图片太大", {
      description: "请选一张较小的图片（不超过 2MB）。",
    })
    return false
  }
  return true
}

async function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) {
    return
  }
  if (!assertImageSize(file)) {
    return
  }
  try {
    await setLogoFromFile(file)
  } catch {
    toast.error("无法使用该图片", {
      description: "请换一张图片后重试。",
    })
  }
}

async function onFaviconChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) {
    return
  }
  if (!assertImageSize(file)) {
    return
  }
  try {
    await setFaviconFromFile(file)
  } catch {
    toast.error("无法使用该图标", {
      description: "请换一张图片后重试。",
    })
  }
}

function handleSave() {
  persist()
  toast.success("已保存", {
    description: "您的名称和标志设置已生效。若在其他电脑登录，需要在当地重新设置一次。",
  })
}
</script>

<template>
  <div class="space-y-0">
    <div class="flex min-w-0 flex-row items-center gap-4 py-3 sm:gap-6 lg:gap-8">
      <Field class="min-w-0 flex-1 gap-1.5">
        <FieldLabel class="text-sm">
          站点名称
        </FieldLabel>
        <FieldDescription class="text-sm leading-5">
          会出现在左侧菜单顶部、登录页左上角，以及浏览器标签页标题。
        </FieldDescription>
      </Field>
      <div class="flex w-[196px] shrink-0 justify-end xl:w-[220px]">
        <Input
          v-model="siteName"
          class="h-9 w-full rounded-md bg-background"
          placeholder="例如：我的工作台"
          autocomplete="off"
        />
      </div>
    </div>

    <Separator class="bg-border/70" />

    <div class="flex min-w-0 flex-row items-center gap-4 py-3 sm:gap-6 lg:gap-8">
      <Field class="min-w-0 flex-1 gap-1.5">
        <FieldLabel class="text-sm">
          标志（Logo）
        </FieldLabel>
        <FieldDescription class="text-sm leading-5">
          建议上传清晰、背景简单的图片。菜单和页面里会显示完整图案，这里仅作小图预览。
        </FieldDescription>
      </Field>
      <div
        class="flex shrink-0 flex-row items-center justify-end gap-3 sm:gap-4"
      >
        <div
          class="flex size-12 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/30 p-1"
        >
          <img
            :src="logoSrc"
            alt=""
            class="max-h-full max-w-full object-contain"
          >
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <input
            ref="logoInputRef"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onLogoChange"
          >
          <Button
            type="button"
            variant="outline"
            class="h-8 whitespace-nowrap rounded-md px-2.5 text-xs"
            @click="logoInputRef?.click()"
          >
            上传图片
          </Button>
          <Button
            v-if="logoDataUrl"
            type="button"
            variant="ghost"
            class="h-8 whitespace-nowrap rounded-md px-2.5 text-xs"
            @click="clearCustomLogo"
          >
            恢复默认
          </Button>
        </div>
      </div>
    </div>

    <Separator class="bg-border/70" />

    <div class="flex min-w-0 flex-row items-center gap-4 py-3 sm:gap-6 lg:gap-8">
      <Field class="min-w-0 flex-1 gap-1.5">
        <FieldLabel class="text-sm">
          浏览器小图标
        </FieldLabel>
        <FieldDescription class="text-sm leading-5">
          显示在浏览器标签上的小图案，用正方形图片效果最好。不上传时，会与上面的标志保持一致。
        </FieldDescription>
      </Field>
      <div
        class="flex shrink-0 flex-row items-center justify-end gap-3 sm:gap-4"
      >
        <div
          class="flex size-12 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/30 p-1"
        >
          <img
            :src="faviconHref"
            alt=""
            class="max-h-full max-w-full object-contain"
          >
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <input
            ref="faviconInputRef"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onFaviconChange"
          >
          <Button
            type="button"
            variant="outline"
            class="h-8 whitespace-nowrap rounded-md px-2.5 text-xs"
            @click="faviconInputRef?.click()"
          >
            上传图片
          </Button>
          <Button
            v-if="faviconDataUrl"
            type="button"
            variant="ghost"
            class="h-8 whitespace-nowrap rounded-md px-2.5 text-xs"
            @click="clearCustomFavicon"
          >
            恢复默认
          </Button>
        </div>
      </div>
    </div>

    <Separator class="bg-border/70" />

    <div class="flex justify-end py-3">
      <Button
        type="button"
        class="h-9 rounded-md px-3.5"
        @click="handleSave"
      >
        保存
      </Button>
    </div>
  </div>
</template>
