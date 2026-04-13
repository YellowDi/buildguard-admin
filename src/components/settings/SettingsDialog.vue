<script setup lang="ts">
import { Cross2Icon } from "@radix-icons/vue"

import SettingsContent from "@/components/settings/SettingsContent.vue"
import SettingsSidebar from "@/components/settings/SettingsSidebar.vue"
import { useSettingsDialog } from "@/composables/useSettingsDialog"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog"
import { TooltipWrap } from "@/components/ui/tooltip"

const {
  activeCategory,
  activeKey,
  categories,
  isOpen,
  runAction,
  setActiveKey,
  setSettingsDialogOpen,
  state,
} = useSettingsDialog()
</script>

<template>
  <Dialog :open="isOpen" @update:open="setSettingsDialogOpen">
    <DialogContent
      :show-close-button="false"
      :class="
        cn(
          'w-fit min-w-[min(1040px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] sm:min-w-[min(1040px,calc(100vw-2rem))] sm:max-w-[calc(100vw-2rem)] xl:min-w-[min(1040px,calc(100vw-5rem))] xl:max-w-[calc(100vw-5rem)] gap-0 overflow-hidden rounded-[20px] bg-background p-0 shadow-(--shadow-card)',
          'h-[760px]',
        )
      "
    >
      <div class="grid h-full min-h-0 grid-cols-[228px_auto] xl:grid-cols-[244px_auto]">
        <SettingsSidebar
          :categories="categories"
          :active-key="activeKey"
          @update:active-key="setActiveKey"
        >
          <template #top>
            <TooltipWrap content="关闭设置" side="right">
              <DialogClose
                class="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <Cross2Icon class="size-5" />
                <span class="sr-only">关闭设置</span>
              </DialogClose>
            </TooltipWrap>
          </template>
        </SettingsSidebar>
        <SettingsContent
          :category="activeCategory"
          :state="state"
          @action="runAction"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
