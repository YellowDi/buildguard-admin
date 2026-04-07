<script setup lang="ts">
import { computed } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  AppReleaseDraft,
  SettingsState,
} from "@/components/settings/types"

const props = defineProps<{
  state: SettingsState
}>()

const currentRelease = computed(() => props.state.appRelease)
const currentPayload = computed(() => JSON.stringify(currentRelease.value, null, 2))
const distributionHint = computed(() =>
  currentRelease.value.platform === "android"
    ? "Android 可填写 APK 地址，App Store 地址可选填。"
    : "iOS 以 App Store 地址为主，如有企业分发直链可填写下载地址。",
)

function updateRelease<K extends keyof AppReleaseDraft>(field: K, value: AppReleaseDraft[K]) {
  props.state.appRelease[field] = value
}
</script>

<template>
  <SettingsRightPanelLayout
    variant="title-only"
    title="应用"
    description="维护移动平台用户端 app 的版本号、更新日志和分发地址。"
  >
    <section class="space-y-7">
      <TitleBlock
        variant="section"
        title="更新策略"
        :show-separator="true"
        :sticky="true"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <Field class="gap-2">
          <FieldLabel>检测到新版本</FieldLabel>
          <FieldDescription>控制接口中的 `hasUpdate` 是否返回为 `true`。</FieldDescription>
          <div class="flex h-9 items-center">
            <Switch
              :checked="currentRelease.hasUpdate"
              @update:checked="updateRelease('hasUpdate', Boolean($event))"
            />
          </div>
        </Field>

        <Field class="gap-2">
          <FieldLabel>强制更新</FieldLabel>
          <FieldDescription>控制接口中的 `forceUpdate`，决定是否必须升级。</FieldDescription>
          <div class="flex h-9 items-center">
            <Switch
              :checked="currentRelease.forceUpdate"
              @update:checked="updateRelease('forceUpdate', Boolean($event))"
            />
          </div>
        </Field>
      </div>

      <TitleBlock
        variant="section"
        title="版本信息"
        :show-separator="true"
        :sticky="true"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <Field class="gap-2">
          <FieldLabel>平台</FieldLabel>
          <Select
            :model-value="currentRelease.platform"
            @update:model-value="updateRelease('platform', $event === 'ios' ? 'ios' : 'android')"
          >
            <SelectTrigger class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
              <SelectValue placeholder="选择平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="android">
                android
              </SelectItem>
              <SelectItem value="ios">
                ios
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field class="gap-2">
          <FieldLabel>版本名称</FieldLabel>
          <Input
            :model-value="currentRelease.versionName"
            placeholder="1.0.1"
            @update:model-value="updateRelease('versionName', String($event))"
          />
        </Field>

        <Field class="gap-2">
          <FieldLabel>版本号</FieldLabel>
          <Input
            :model-value="String(currentRelease.versionCode)"
            inputmode="numeric"
            placeholder="102"
            @update:model-value="updateRelease('versionCode', Number($event) || 0)"
          />
        </Field>

        <Field class="gap-2 sm:col-span-2">
          <FieldLabel>更新标题</FieldLabel>
          <Input
            :model-value="currentRelease.title"
            placeholder="发现新版本"
            @update:model-value="updateRelease('title', String($event))"
          />
        </Field>

        <Field class="gap-2 sm:col-span-2">
          <FieldLabel>更新日志</FieldLabel>
          <Textarea
            :model-value="currentRelease.description"
            class="min-h-32"
            placeholder="1. 修复问题&#10;2. 优化体验"
            @update:model-value="updateRelease('description', String($event))"
          />
        </Field>

        <Field class="gap-2">
          <FieldLabel>分发包类型</FieldLabel>
          <Select
            :model-value="currentRelease.packageType"
            @update:model-value="updateRelease('packageType', $event === 'apk' ? 'apk' : 'app-store')"
          >
            <SelectTrigger class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
              <SelectValue placeholder="选择包类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apk">
                apk
              </SelectItem>
              <SelectItem value="app-store">
                app-store
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <TitleBlock
        variant="section"
        title="分发地址"
        :show-separator="true"
        :sticky="true"
      />

      <div class="grid gap-4">
        <Field class="gap-2">
          <FieldLabel>下载地址</FieldLabel>
          <FieldDescription>{{ distributionHint }}</FieldDescription>
          <Input
            :model-value="currentRelease.downloadUrl"
            :placeholder="currentRelease.platform === 'android' ? 'https://example.com/app.apk' : 'https://example.com/app.ipa'"
            @update:model-value="updateRelease('downloadUrl', String($event))"
          />
        </Field>

        <Field class="gap-2">
          <FieldLabel>App Store 地址</FieldLabel>
          <FieldDescription>用于跳转商店详情页或安装页。</FieldDescription>
          <Input
            :model-value="currentRelease.appStoreUrl"
            placeholder="https://apps.apple.com/app/idxxxx"
            @update:model-value="updateRelease('appStoreUrl', String($event))"
          />
        </Field>
      </div>

      <TitleBlock
        variant="section"
        title="接口预览"
        :show-separator="true"
        :sticky="true"
      />

      <pre class="overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">{{ currentPayload }}</pre>
    </section>
  </SettingsRightPanelLayout>
</template>
