<script setup lang="ts">
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
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
  BooleanSettingsKey,
  SettingsActionKey,
  SettingsCategory,
  SettingsColorItem,
  SettingsInputItem,
  SettingsSelectItem,
  SettingsState,
  StringSettingsKey,
  SettingsToggleItem,
} from "@/components/settings/types"

const props = defineProps<{
  category: SettingsCategory
  state: SettingsState
}>()

const emit = defineEmits<{
  action: [actionKey: SettingsActionKey]
}>()

function updateBoolean(key: BooleanSettingsKey, value: boolean) {
  props.state[key] = value
}

function updateString<K extends StringSettingsKey>(key: K, value: SettingsState[K]) {
  props.state[key] = value
}

function updateToggleItem(item: SettingsToggleItem, value: boolean) {
  updateBoolean(item.modelKey, value)
}

function updateTextItem(item: SettingsInputItem | SettingsSelectItem | SettingsColorItem, value: string) {
  updateString(item.modelKey, value as SettingsState[typeof item.modelKey])
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
    <SettingsPageHeader
      :title="props.category.pageTitle ?? props.category.label"
      :description="props.category.pageDescription ?? props.category.description"
    />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
      <div class="mx-auto w-full max-w-4xl space-y-8">
        <SettingsSection
          v-for="section in props.category.sections"
          :key="section.key"
          :title="section.title"
          :description="section.description"
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

                <div
                  :class="cn(
                    'flex shrink-0 items-center justify-end',
                    item.type === 'color' ? 'w-[196px] xl:w-[236px]' : 'w-[196px] xl:w-[220px]',
                  )"
                >
                  <Switch
                    v-if="item.type === 'toggle'"
                    :checked="getBooleanValue(item.modelKey)"
                    :disabled="isItemDisabled(item.key)"
                    @update:checked="updateToggleItem(item, Boolean($event))"
                  />

                  <Input
                    v-else-if="item.type === 'input'"
                    :model-value="getStringValue(item.modelKey)"
                    :placeholder="item.placeholder"
                    :disabled="isItemDisabled(item.key)"
                    class="h-9 w-full min-w-0 rounded-md bg-background"
                    @update:model-value="updateTextItem(item, String($event))"
                  />

                  <Select
                    v-else-if="item.type === 'select'"
                    :model-value="getStringValue(item.modelKey)"
                    @update:model-value="updateTextItem(item, String($event))"
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

                  <div
                    v-else-if="item.type === 'color'"
                    class="flex max-w-full flex-wrap items-center justify-end gap-1.5"
                    role="radiogroup"
                    :aria-label="item.label"
                  >
                    <button
                      v-for="option in item.options"
                      :key="option.value"
                      type="button"
                      role="radio"
                      :aria-checked="getStringValue(item.modelKey) === option.value"
                      :aria-label="option.label"
                      :title="option.label"
                      :class="cn(
                        'relative flex size-10 shrink-0 items-center justify-center rounded-md outline-none transition-[transform,box-shadow] duration-180 ease-out active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        getStringValue(item.modelKey) === option.value
                          ? 'shadow-[0_0_0_2px_var(--ring),0_1px_2px_rgb(0_0_0_/_0.08)]'
                          : 'shadow-[0_0_0_1px_var(--border)]',
                      )"
                      @click="updateTextItem(item, option.value)"
                    >
                      <span
                        class="size-7 rounded-sm shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.08)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.12)]"
                        :class="option.swatchClass"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <Button
                    v-else
                    :variant="item.variant === 'destructive' ? 'outline' : (item.variant ?? 'default')"
                    :class="cn(
                      'h-8 shrink-0 rounded-md px-3.5',
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
