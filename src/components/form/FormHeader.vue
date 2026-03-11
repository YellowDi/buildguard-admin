<script setup lang="ts">
import { computed, useSlots } from "vue"

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
import { cn } from "@/lib/utils"

type HeaderAction = {
  key: string
  label: string
  variant?: ButtonVariants["variant"]
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
  submit: []
  reset: []
  action: [key: string]
}>()

const slots = useSlots()

const regularActions = computed(() =>
  (props.secondaryActions ?? []).filter(action => action.key !== "reset"),
)
const resetAction = computed(() =>
  (props.secondaryActions ?? []).find(action => action.key === "reset"),
)
const hasActions = computed(() =>
  regularActions.value.length > 0 || Boolean(resetAction.value || props.primaryAction || slots.actions),
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
</script>

<template>
  <div class="sticky top-0 z-10 mx-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
    <div class="px-4 py-5">
      <SectionHeader
        :title="title"
        :has-actions="hasActions"
        layout-class="gap-4 md:gap-5"
        actions-class="w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap md:w-auto"
      >
        <template #actions>
          <template v-if="hasActions">
            <Button
              v-for="action in regularActions"
              :key="action.key"
              :variant="action.variant ?? 'outline'"
              size="sm"
              class="shrink-0"
              @click="emitSecondaryAction(action.key)"
            >
              {{ action.label }}
            </Button>

            <AlertDialog v-if="resetAction && resetDialog">
              <AlertDialogTrigger as-child>
                <Button
                  :variant="resetAction.variant ?? 'outline'"
                  size="sm"
                  class="shrink-0"
                >
                  {{ resetAction.label }}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{{ resetDialog.title ?? "确认重置表单？" }}</AlertDialogTitle>
                  <AlertDialogDescription>{{ resetDialog.description }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{{ resetDialog.cancelText ?? "取消" }}</AlertDialogCancel>
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
              {{ primaryAction.label }}
            </Button>
          </template>
        </template>
      </SectionHeader>
    </div>
  </div>
</template>
