<script setup lang="ts">
import { computed, ref, useSlots } from "vue"

import SectionHeader from "@/components/layout/SectionHeader.vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ButtonVariants } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipWrap } from "@/components/ui/tooltip"
import { remixIconForActionLabel } from "@/lib/actionIcons"
import { cn } from "@/lib/utils"

type HeaderAction = {
  key: string
  label: string
  variant?: ButtonVariants["variant"]
  icon?: string
}

type PrimaryAction = {
  label: string
  icon?: string
  disabled?: boolean
}

type ResetDialog = {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
}

const props = defineProps<{
  title: string
  primaryAction?: PrimaryAction
  secondaryActions?: HeaderAction[]
  resetDialog?: ResetDialog
}>()

const emit = defineEmits<{
  back: []
  submit: []
  reset: []
  action: [key: string]
}>()

const slots = useSlots()
const mobileResetDialogOpen = ref(false)

const regularActions = computed(() =>
  (props.secondaryActions ?? []).filter(action => action.key !== "reset"),
)
const resetAction = computed(() =>
  (props.secondaryActions ?? []).find(action => action.key === "reset"),
)
const hasActions = computed(() =>
  regularActions.value.length > 0 || Boolean(resetAction.value || props.primaryAction || slots.actions),
)
const hasMobileOverflowActions = computed(() =>
  regularActions.value.length > 0 || Boolean(resetAction.value && props.resetDialog),
)

function emitSecondaryAction(key: string) {
  emit("action", key)
}

function emitSubmit() {
  emit("submit")
}

function emitReset() {
  emit("action", "reset")
  emit("reset")
}

function openMobileResetDialog() {
  mobileResetDialogOpen.value = true
}

function headerSecondaryIcon(action: HeaderAction) {
  return action.icon ?? remixIconForActionLabel(action.label)
}

const primaryActionText = "确认"
</script>

<template>
  <div class="sticky top-0 z-10 mx-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
    <div class="relative px-0 pb-4 pt-4 sm:px-4 sm:pb-5 sm:pt-5">
      <div class="flex min-w-0 items-center justify-between gap-3">
        <SectionHeader
          :title="title"
          :has-actions="false"
          layout-class="min-w-0 flex-1"
        >
          <template #leading>
            <TooltipWrap content="返回">
              <button
                type="button"
                class="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="返回"
                @click="emit('back')"
              >
                <i class="ri-arrow-left-line text-[18px]" />
              </button>
            </TooltipWrap>
          </template>
        </SectionHeader>

        <div v-if="hasActions" class="flex min-w-0 max-w-[55vw] shrink-0 justify-end sm:max-w-full">
          <div class="flex min-w-0 max-w-full items-center justify-end gap-1 overflow-x-auto px-1 py-1 whitespace-nowrap sm:hidden">
            <slot name="actions" />

          <Button
            v-if="primaryAction && !hasMobileOverflowActions"
            :disabled="primaryAction.disabled"
            size="sm"
            class="h-8 shrink-0 gap-1 px-3 text-[14px]"
            @click="emitSubmit"
          >
            <i
              v-if="primaryAction.icon"
              :class="cn(primaryAction.icon, 'text-base')"
            />
            {{ primaryActionText }}
          </Button>

          <ButtonGroup v-else-if="primaryAction" aria-label="移动端表单操作">
            <Button
              :disabled="primaryAction.disabled"
              size="sm"
              class="h-8 shrink-0 gap-1 px-3 text-[14px]"
              @click="emitSubmit"
            >
              <i
                v-if="primaryAction.icon"
                :class="cn(primaryAction.icon, 'text-base')"
              />
              {{ primaryActionText }}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="default" size="icon-sm" class="size-8" aria-label="更多表单操作">
                  <i class="ri-arrow-down-s-line text-base" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5">
                <DropdownMenuItem
                  v-for="action in regularActions"
                  :key="action.key"
                  :variant="action.variant === 'destructive' ? 'destructive' : 'default'"
                  class="rounded-lg px-2.5 py-2"
                  @select="emitSecondaryAction(action.key)"
                >
                  <i
                    v-if="headerSecondaryIcon(action)"
                    :class="cn(headerSecondaryIcon(action), 'mr-2 text-base text-muted-foreground')"
                  />
                  {{ action.label }}
                </DropdownMenuItem>

                <DropdownMenuItem
                  v-if="resetAction && resetDialog"
                  class="rounded-lg px-2.5 py-2"
                  @select="openMobileResetDialog"
                >
                  <i
                    v-if="headerSecondaryIcon(resetAction)"
                    :class="cn(headerSecondaryIcon(resetAction), 'mr-2 text-base text-muted-foreground')"
                  />
                  {{ resetAction.label }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <template v-else>
            <Button
              v-for="action in regularActions"
              :key="action.key"
              :variant="action.variant ?? 'outline'"
              size="sm"
              class="shrink-0"
              @click="emitSecondaryAction(action.key)"
            >
              <i
                v-if="headerSecondaryIcon(action)"
                :class="cn(headerSecondaryIcon(action), 'mr-2 text-base')"
              />
              {{ action.label }}
            </Button>

            <AlertDialog v-if="resetAction && resetDialog">
              <AlertDialogTrigger as-child>
                <Button
                  :variant="resetAction.variant ?? 'outline'"
                  size="sm"
                  class="shrink-0"
                >
                  <i
                    v-if="headerSecondaryIcon(resetAction)"
                    :class="cn(headerSecondaryIcon(resetAction), 'mr-2 text-base')"
                  />
                  {{ resetAction.label }}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{{ resetDialog.title ?? "确认重置表单？" }}</AlertDialogTitle>
                  <AlertDialogDescription>{{ resetDialog.description }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {{ resetDialog.cancelText ?? "取消" }}
                  </AlertDialogCancel>
                  <AlertDialogAction @click="emitReset">
                    {{ resetDialog.confirmText ?? "确认重置" }}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </template>

          <AlertDialog
            v-if="resetAction && resetDialog"
            v-model:open="mobileResetDialogOpen"
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{{ resetDialog.title ?? "确认重置表单？" }}</AlertDialogTitle>
                <AlertDialogDescription>{{ resetDialog.description }}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {{ resetDialog.cancelText ?? "取消" }}
                </AlertDialogCancel>
                <AlertDialogAction @click="emitReset">
                  {{ resetDialog.confirmText ?? "确认重置" }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

          <div class="hidden min-w-0 max-w-full items-center justify-end gap-1 overflow-x-auto px-1 py-1 whitespace-nowrap sm:flex">
            <Button
              v-for="action in regularActions"
              :key="action.key"
              :variant="action.variant ?? 'outline'"
              size="sm"
              class="shrink-0"
              @click="emitSecondaryAction(action.key)"
            >
              <i
                v-if="headerSecondaryIcon(action)"
                :class="cn(headerSecondaryIcon(action), 'mr-2 text-base')"
              />
              {{ action.label }}
            </Button>

          <AlertDialog v-if="resetAction && resetDialog">
            <AlertDialogTrigger as-child>
              <Button
                :variant="resetAction.variant ?? 'outline'"
                size="sm"
                class="shrink-0"
              >
                <i
                  v-if="headerSecondaryIcon(resetAction)"
                  :class="cn(headerSecondaryIcon(resetAction), 'mr-2 text-base')"
                />
                {{ resetAction.label }}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{{ resetDialog.title ?? "确认重置表单？" }}</AlertDialogTitle>
                <AlertDialogDescription>{{ resetDialog.description }}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {{ resetDialog.cancelText ?? "取消" }}
                </AlertDialogCancel>
                <AlertDialogAction @click="emitReset">
                  {{ resetDialog.confirmText ?? "确认重置" }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <slot name="actions" />

          <Button
            v-if="primaryAction"
            :disabled="primaryAction.disabled"
            size="sm"
            class="shrink-0"
            @click="emitSubmit"
          >
            <i
              v-if="primaryAction.icon"
              :class="cn(primaryAction.icon, 'mr-2 text-base')"
            />
            {{ primaryActionText }}
          </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
