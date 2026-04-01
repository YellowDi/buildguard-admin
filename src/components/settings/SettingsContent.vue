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
import SettingsBusinessPresetsHub from "@/components/settings/SettingsBusinessPresetsHub.vue"
import SettingsGlobalBranding from "@/components/settings/SettingsGlobalBranding.vue"
import SettingsInspectionHub from "@/components/settings/SettingsInspectionHub.vue"
import SettingsMenusTable from "@/components/settings/SettingsMenusTable.vue"
import SettingsMembersTable from "@/components/settings/SettingsMembersTable.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
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
  <SettingsMembersTable
    v-if="props.category.key === 'members'"
    :page-title="props.category.pageTitle ?? props.category.label"
    :page-description="props.category.pageDescription ?? props.category.description"
  />
  <SettingsMenusTable
    v-else-if="props.category.key === 'developer'"
    :page-title="props.category.pageTitle ?? props.category.label"
    :page-description="props.category.pageDescription ?? props.category.description"
  />
  <SettingsBusinessPresetsHub
    v-else-if="props.category.key === 'business-presets'"
    :page-title="props.category.pageTitle ?? props.category.label"
    :page-description="props.category.pageDescription ?? props.category.description"
  />
  <SettingsInspectionHub
    v-else-if="props.category.key === 'inspection-items'"
    :page-title="props.category.pageTitle ?? props.category.label"
    :page-description="props.category.pageDescription ?? props.category.description"
  />

  <SettingsRightPanelLayout
    v-else-if="props.category.key === 'system'"
    variant="title-only"
    :title="props.category.pageTitle ?? props.category.label"
    :description="props.category.pageDescription ?? props.category.description"
  >
    <SettingsGlobalBranding />
  </SettingsRightPanelLayout>

  <SettingsRightPanelLayout
    v-else
    variant="title-only"
    :title="props.category.pageTitle ?? props.category.label"
    :description="props.category.pageDescription ?? props.category.description"
  >
    <div class="space-y-0">
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
              <div
                class="flex min-w-0 flex-row items-center gap-4 py-3 sm:gap-6 lg:gap-8"
              >
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
                  class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]"
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
                    class="h-9 w-full min-w-0 rounded-md bg-background"
                    @update:model-value="updateString(item.modelKey, String($event))"
                  />

                  <Select
                    v-else-if="item.type === 'select'"
                    :model-value="getStringValue(item.modelKey)"
                    @update:model-value="updateString(item.modelKey, String($event))"
                  >
                    <SelectTrigger class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
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
  </SettingsRightPanelLayout>
</template>
