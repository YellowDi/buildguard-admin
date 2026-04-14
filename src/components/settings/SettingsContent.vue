<script setup lang="ts">
import { defineAsyncComponent } from "vue"

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
import SettingsAppsPage from "@/components/settings/SettingsAppsPage.vue"
import SettingsMePage from "@/components/settings/SettingsMePage.vue"
import SettingsPreferencesPage from "@/components/settings/SettingsPreferencesPage.vue"
import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import SettingsSection from "@/components/settings/SettingsSection.vue"
import type {
  BooleanSettingsKey,
  SettingsActionKey,
  SettingsCategory,
  SettingsInputItem,
  SettingsSelectItem,
  SettingsState,
  StringSettingsKey,
  SettingsToggleItem,
} from "@/components/settings/types"

const SettingsBusinessPresetsHub = defineAsyncComponent(() => import("@/components/settings/SettingsBusinessPresetsHub.vue"))
const SettingsInspectionHub = defineAsyncComponent(() => import("@/components/settings/SettingsInspectionHub.vue"))
const SettingsMenusTable = defineAsyncComponent(() => import("@/components/settings/SettingsMenusTable.vue"))
const SettingsMembersTable = defineAsyncComponent(() => import("@/components/settings/SettingsMembersTable.vue"))

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

function updateTextItem(item: SettingsInputItem | SettingsSelectItem, value: string) {
  updateString(item.modelKey, value as SettingsState[typeof item.modelKey])
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
  <SettingsMePage
    v-if="props.category.key === 'me'"
    :user-name="state.accountName"
    :user-email="state.accountEmail"
    :avatar-src="props.category.avatarSrc"
    :avatar-fallback="props.category.avatarFallback ?? state.accountName.charAt(0).toUpperCase()"
    :preferred-name="state.preferredName"
    :selected-avatar-key="state.selectedAvatarKey"
    :user-id="state.userId"
    :support-access-enabled="state.supportAccessEnabled"
    @action="emit('action', $event)"
    @update:preferred-name="updateString('preferredName', $event)"
    @update:selected-avatar-key="updateString('selectedAvatarKey', $event)"
    @update:support-access-enabled="updateBoolean('supportAccessEnabled', $event)"
  />
  <SettingsMembersTable
    v-else-if="props.category.key === 'members'"
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
  <SettingsAppsPage
    v-else-if="props.category.key === 'apps'"
    :state="props.state"
  />
  <SettingsPreferencesPage
    v-else-if="props.category.key === 'preferences'"
    :category="props.category"
    :state="props.state"
    @action="emit('action', $event)"
  />

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
              class="mb-4 border-destructive/20 bg-destructive/3"
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
                    @update:checked="updateToggleItem(item, Boolean($event))"
                  />

                  <Input
                    v-else-if="item.type === 'input'"
                    :model-value="getStringValue(item.modelKey)"
                    :placeholder="item.placeholder"
                    class="h-9 w-full min-w-0 rounded-md bg-background"
                    @update:model-value="updateTextItem(item, String($event))"
                  />

                  <Select
                    v-else-if="item.type === 'select'"
                    :model-value="getStringValue(item.modelKey)"
                    @update:model-value="updateTextItem(item, String($event))"
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
