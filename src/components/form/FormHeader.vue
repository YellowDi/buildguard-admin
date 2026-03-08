<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useSlots } from "vue"

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
  back: []
  submit: []
  reset: []
  action: [key: string]
}>()

const slots = useSlots()
const isSticky = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)

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
  if (key === "back") emit("back")
}

function emitSubmit() {
  emit("submit")
}

function emitReset() {
  emit("action", "reset")
  emit("reset")
}

let stickyObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!sentinelRef.value) return
  stickyObserver = new IntersectionObserver(
    ([entry]) => { isSticky.value = !entry.isIntersecting },
    { threshold: 0, rootMargin: "64px 0px 0px 0px" },
  )
  stickyObserver.observe(sentinelRef.value)
})

onUnmounted(() => {
  stickyObserver?.disconnect()
})
</script>

<template>
  <div ref="sentinelRef" class="h-px w-full -mt-4 shrink-0" aria-hidden="true" />
  <div
    class="sticky top-[-1rem] z-10 -mx-4 bg-background xl:-mt-px xl:ml-[calc(50%-50vw)] xl:w-screen"
    :class="{ 'border-b border-border': isSticky }"
  >
    <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-4 px-4 pb-4 pt-4 sm:gap-5 md:grid md:grid-cols-[minmax(0,1fr)_max-content] md:gap-8 xl:px-0">
      <h1 class="min-w-0 text-2xl font-semibold tracking-tight text-foreground">
        {{ title }}
      </h1>
      <div
        v-if="hasActions"
        class="flex w-full min-w-0 items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap md:w-auto md:justify-end"
      >
        <Button
          v-for="action in regularActions"
          :key="action.key"
          :variant="action.variant ?? 'outline'"
          class="h-9 shrink-0 px-3 sm:h-10 sm:px-4"
          @click="emitSecondaryAction(action.key)"
        >
          {{ action.label }}
        </Button>

        <AlertDialog v-if="resetAction && resetDialog">
          <AlertDialogTrigger as-child>
            <Button
              :variant="resetAction.variant ?? 'outline'"
              class="h-9 shrink-0 px-3 sm:h-10 sm:px-4"
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
          class="h-9 shrink-0 px-3 sm:h-10 sm:px-4"
          @click="emitSubmit"
        >
          <i
            v-if="primaryAction.icon"
            :class="cn(primaryAction.icon, 'mr-2 text-base')"
          />
          {{ primaryAction.label }}
        </Button>
      </div>
    </div>
  </div>
</template>
