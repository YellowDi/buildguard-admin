<script setup lang="ts">
import { ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useClipboard } from "@vueuse/core"
import { toast } from "vue-sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  TooltipWrap,
} from "@/components/ui/tooltip"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsSection from "@/components/settings/SettingsSection.vue"
import {
  DEFAULT_AVATAR_OPTIONS,
  type DefaultAvatarKey,
} from "@/lib/default-avatars"
import { clearCurrentUser } from "@/composables/useCurrentUser"
import { clearAuthToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

const props = defineProps<{
  userName: string
  avatarSrc?: string
  avatarFallback: string
  preferredName: string
  selectedAvatarKey: DefaultAvatarKey
  userId: string
}>()

const emit = defineEmits<{
  "update:preferredName": [value: string]
  "update:selectedAvatarKey": [value: DefaultAvatarKey]
}>()

const router = useRouter()
const isAvatarPickerOpen = ref(false)
const localPreferredName = ref(props.preferredName)
const avatarOptions = DEFAULT_AVATAR_OPTIONS

watch(() => props.preferredName, (value) => {
  localPreferredName.value = value
})

const { copy } = useClipboard()

function handleCopyUserId() {
  copy(props.userId)
  toast.success("已复制到剪贴板")
}

function handleSavePreferredName() {
  emit("update:preferredName", localPreferredName.value)
  toast.success("偏好名称已更新")
}

function handleSelectAvatar(avatarKey: DefaultAvatarKey) {
  if (props.selectedAvatarKey === avatarKey) {
    isAvatarPickerOpen.value = false
    return
  }

  emit("update:selectedAvatarKey", avatarKey)
  isAvatarPickerOpen.value = false
}

function handleLogout() {
  clearAuthToken()
  clearCurrentUser()
  void router.replace({ name: "login" })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <SettingsPageHeader
      title="我"
      description="管理你的档案和头像"
    />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
      <div class="mx-auto w-full max-w-4xl space-y-6">
        <!-- 账号 -->
        <SettingsSection
          title="账号"
          description=""
          :show-header="true"
        >
          <div class="space-y-0 py-4">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Popover v-model:open="isAvatarPickerOpen">
                <PopoverTrigger as-child>
                  <button
                    type="button"
                    class="inline-flex w-fit shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="选择头像"
                  >
                    <Avatar class="size-16 rounded-sm">
                      <AvatarImage
                        v-if="avatarSrc"
                        :src="avatarSrc"
                        :alt="userName"
                        class="object-cover"
                      />
                      <AvatarFallback class="rounded-sm bg-avatar-placeholder text-xl font-semibold">
                        {{ avatarFallback }}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  class="w-auto rounded-xl p-3"
                >
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="avatar in avatarOptions"
                      :key="avatar.key"
                      type="button"
                      :class="
                        cn(
                          'rounded-sm p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          props.selectedAvatarKey === avatar.key && 'ring-2 ring-primary ring-offset-2',
                        )
                      "
                      :aria-label="`选择${avatar.label}头像`"
                      :aria-pressed="props.selectedAvatarKey === avatar.key"
                      @click="handleSelectAvatar(avatar.key)"
                    >
                      <Avatar class="size-14 rounded-sm">
                        <AvatarImage
                          :src="avatar.src"
                          :alt="`${avatar.label}头像`"
                          class="object-cover"
                        />
                        <AvatarFallback class="rounded-sm bg-avatar-placeholder text-base font-semibold">
                          {{ avatarFallback }}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <div class="flex-1 space-y-2">
                <label class="text-sm font-medium text-foreground">
                  偏好名称
                </label>
                <div class="flex gap-2">
                  <Input
                    v-model="localPreferredName"
                    placeholder="输入偏好名称"
                    class="h-9 max-w-[280px]"
                  />
                </div>
              </div>
            </div>

            <div class="h-6" />

            <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  用户 ID
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  用于定位当前账号。
                </div>
              </div>
              <div class="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
                <code class="min-w-0 max-w-full truncate rounded bg-muted px-2 py-1 text-sm text-muted-foreground sm:max-w-[320px]">
                  {{ userId }}
                </code>
                <TooltipWrap content="复制用户 ID">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8 shrink-0"
                    aria-label="复制用户 ID"
                    @click="handleCopyUserId"
                  >
                    <i class="ri-file-copy-line" />
                  </Button>
                </TooltipWrap>
              </div>
            </div>

            <div class="h-6" />

            <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  退出登录
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  退出当前账号并返回登录页。
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end">
                <Button
                  variant="outline"
                  class="h-8 shrink-0 gap-1.5 rounded-md px-3.5 font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
                  @click="handleLogout"
                >
                  <i class="ri-logout-box-r-line text-base" />
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  </div>
</template>
