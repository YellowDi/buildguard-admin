<script setup lang="ts">
import TitleBlock from "@/components/layout/TitleBlock.vue"
import SettingsSection from "@/components/settings/SettingsSection.vue"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type {
  SettingsActionKey,
  SettingsCategory,
  SettingsState,
} from "@/components/settings/types"

const props = defineProps<{
  category: SettingsCategory
  state: SettingsState
}>()

const emit = defineEmits<{
  action: [actionKey: SettingsActionKey]
}>()

function updateBoolean(key: keyof SettingsState, value: boolean) {
  (props.state as Record<string, boolean | string>)[key] = value
}

function updateString(key: keyof SettingsState, value: string) {
  (props.state as Record<string, boolean | string>)[key] = value
}

function getStringValue(key: keyof SettingsState) {
  const value = props.state[key]
  return typeof value === "string" ? value : ""
}

function getBooleanValue(key: keyof SettingsState) {
  return Boolean(props.state[key])
}

function isItemDisabled(key: string) {
  if (key === "timezone") {
    return props.state.autoTimezoneByLocation
  }

  return false
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="sticky top-0 z-[6] shrink-0 bg-background px-3 pt-4 pb-3 sm:px-4">
      <TitleBlock
        :title="props.category.pageTitle ?? props.category.label"
        :description="props.category.pageDescription ?? props.category.description"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
      <div class="space-y-8">
        <SettingsSection
          v-for="section in props.category.sections"
          :key="section.key"
          :title="section.title"
          :tone="section.tone"
          :show-header="true"
        >
          <div class="space-y-5">
            <template
              v-for="item in section.items"
              :key="item.key"
            >
              <div class="flex min-w-0 flex-row items-start gap-4 py-1 sm:gap-6 lg:gap-8">
                <Field class="min-w-0 flex-1 gap-1.5">
                  <FieldLabel
                    :class="cn('text-sm', section.tone === 'danger' ? 'text-destructive' : undefined)"
                  >
                    {{ item.label }}
                  </FieldLabel>
                  <FieldDescription class="text-sm leading-5">
                    {{ item.description }}
                  </FieldDescription>
                </Field>

                <div class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]">
                  <Switch
                    v-if="item.type === 'toggle'"
                    :checked="getBooleanValue(item.modelKey)"
                    :disabled="isItemDisabled(item.key)"
                    @update:checked="updateBoolean(item.modelKey, Boolean($event))"
                  />

                  <Input
                    v-else-if="item.type === 'input'"
                    :model-value="getStringValue(item.modelKey)"
                    :placeholder="item.placeholder"
                    :disabled="isItemDisabled(item.key)"
                    class="h-9 w-full min-w-0 rounded-md bg-background"
                    @update:model-value="updateString(item.modelKey, String($event))"
                  />

                  <Select
                    v-else-if="item.type === 'select'"
                    :model-value="getStringValue(item.modelKey)"
                    @update:model-value="updateString(item.modelKey, String($event))"
                  >
                    <SelectTrigger
                      :disabled="isItemDisabled(item.key)"
                      class="h-9 w-full min-w-0 rounded-md bg-background text-sm"
                    >
                      <SelectValue :placeholder="item.label" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in item.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    v-else
                    :variant="item.variant === 'destructive' ? 'outline' : (item.variant ?? 'default')"
                    :class="cn(
                      'h-9 shrink-0 rounded-md px-3.5',
                      item.variant === 'destructive'
                        && 'border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive',
                    )"
                    @click="emit('action', item.actionKey)"
                  >
                    {{ item.buttonLabel }}
                  </Button>
                </div>
              </div>
            </template>
          </div>
        </SettingsSection>
      </div>
    </div>
  </div>
</template>
