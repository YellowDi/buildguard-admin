<script setup lang="ts">
import { cn } from "@/lib/utils"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import SettingsInspectionItemsTable from "@/components/settings/SettingsInspectionItemsTable.vue"
import SettingsMembersTable from "@/components/settings/SettingsMembersTable.vue"
import SettingsSection from "@/components/settings/SettingsSection.vue"
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
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:p-4">
    <div class="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <header class="flex flex-col gap-1.5">
        <div class="min-w-0">
          <h2 class="text-[1.625rem] font-semibold tracking-tight">{{ props.category.pageTitle ?? props.category.label }}</h2>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {{ props.category.pageDescription ?? props.category.description }}
          </p>
        </div>
      </header>

      <SettingsMembersTable v-if="props.category.key === 'members'" />
      <SettingsInspectionItemsTable v-else-if="props.category.key === 'inspection-items'" />

      <div v-else class="space-y-0">
        <template
          v-for="(section, sectionIndex) in props.category.sections"
          :key="section.key"
        >
          <SettingsSection
            :title="section.title"
            :description="section.description"
            :tone="section.tone"
            :show-header="false"
          >
            <div class="space-y-0">
          <Alert
            v-if="section.tone === 'danger'"
            variant="destructive"
            class="mb-4 border-destructive/20 bg-destructive/[0.03]"
          >
            <i class="ri-error-warning-line text-base" />
            <AlertTitle>危险操作</AlertTitle>
            <AlertDescription>
              以下操作不可撤销，请在确认影响范围后执行。
            </AlertDescription>
          </Alert>

          <template
            v-for="item in section.items"
            :key="item.key"
          >
            <div class="grid min-w-0 gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_196px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
              <Field class="gap-1.5">
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
                :class="
                  cn(
                    'w-full lg:justify-self-end',
                    item.type === 'toggle' ? 'flex justify-start lg:justify-end' : '',
                  )
                "
              >
                <Switch
                  v-if="item.type === 'toggle'"
                  :checked="getBooleanValue(item.modelKey)"
                  @update:checked="updateBoolean(item.modelKey, Boolean($event))"
                />

                <Input
                  v-else-if="item.type === 'input'"
                  :model-value="getStringValue(item.modelKey)"
                  :placeholder="item.placeholder"
                  class="h-9 w-full rounded-md bg-background"
                  @update:model-value="updateString(item.modelKey, String($event))"
                />

                <Select
                  v-else-if="item.type === 'select'"
                  :model-value="getStringValue(item.modelKey)"
                  @update:model-value="updateString(item.modelKey, String($event))"
                >
                  <SelectTrigger class="h-9 w-full rounded-md bg-background text-sm">
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
                  :variant="item.variant ?? 'default'"
                  class="h-9 rounded-md px-3.5 lg:ml-auto"
                  @click="emit('action', item.actionKey)"
                >
                  {{ item.buttonLabel }}
                </Button>
              </div>
            </div>

            <Separator
              v-if="item.key !== section.items[section.items.length - 1]?.key"
              class="bg-border/70"
            />
          </template>
            </div>
          </SettingsSection>

          <Separator
            v-if="sectionIndex !== props.category.sections.length - 1"
            class="my-2 bg-border/70"
          />
        </template>
      </div>
    </div>
  </div>
</template>
