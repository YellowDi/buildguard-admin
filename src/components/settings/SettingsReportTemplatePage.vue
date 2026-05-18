<script setup lang="ts">
import { computed, ref } from "vue"
import { toast } from "vue-sonner"

import SettingsRightPanelLayout from "@/components/settings/SettingsRightPanelLayout.vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_REPORT_TEMPLATE_CONFIG,
  loadReportTemplateConfig,
  saveReportTemplateConfig,
  type ReportTemplateConfig,
} from "@/lib/inspection-report-mock"

const props = defineProps<{
  pageTitle: string
  pageDescription?: string | null
}>()

const config = ref<ReportTemplateConfig>(cloneTemplateConfig(loadReportTemplateConfig()))

const enabledModuleCount = computed(() => config.value.modules.filter(module => module.enabled).length)

function updateModuleEnabled(moduleKey: string, checked: boolean) {
  config.value.modules = config.value.modules.map(module => (
    module.key === moduleKey ? { ...module, enabled: checked } : module
  ))
}

function moveModule(index: number, direction: "up" | "down") {
  const targetIndex = direction === "up" ? index - 1 : index + 1

  if (targetIndex < 0 || targetIndex >= config.value.modules.length) {
    return
  }

  const nextModules = [...config.value.modules]
  const [movedModule] = nextModules.splice(index, 1)

  if (!movedModule) {
    return
  }

  nextModules.splice(targetIndex, 0, movedModule)
  config.value.modules = nextModules
}

function saveConfig() {
  saveReportTemplateConfig(config.value)
  config.value = cloneTemplateConfig(loadReportTemplateConfig())
  toast.success("报告模板已保存", {
    description: "后续新生成的报告会使用当前模板配置。",
  })
}

function resetConfig() {
  config.value = cloneTemplateConfig(DEFAULT_REPORT_TEMPLATE_CONFIG)
  toast("已恢复默认模板", {
    description: "点击保存后默认模板才会写入本地配置。",
  })
}

function cloneTemplateConfig(value: ReportTemplateConfig): ReportTemplateConfig {
  return {
    ...value,
    modules: value.modules.map(module => ({ ...module })),
  }
}
</script>

<template>
  <SettingsRightPanelLayout
    variant="title-only"
    :title="props.pageTitle"
    :description="props.pageDescription"
  >
    <div class="space-y-5">
      <section class="rounded-lg bg-background p-4 shadow-(--shadow-border)">
        <div class="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <h2 class="text-base font-semibold text-foreground">基础信息</h2>
            <p class="text-sm leading-5 text-muted-foreground">
              生成检测报告时会读取这些默认信息，也可以在生成前覆盖。
            </p>
          </div>
          <div class="inline-flex h-7 items-center rounded-md bg-brand-surface px-2.5 text-xs font-medium text-link">
            {{ enabledModuleCount }} 个模块启用
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1.5">
            <span class="text-sm font-medium text-foreground">模板名称</span>
            <Input v-model="config.templateName" placeholder="输入模板名称" />
          </label>

          <label class="space-y-1.5">
            <span class="text-sm font-medium text-foreground">水印文案</span>
            <Input v-model="config.watermarkText" placeholder="输入水印文案" />
          </label>

          <label class="space-y-1.5 md:col-span-2">
            <span class="text-sm font-medium text-foreground">页脚说明</span>
            <Textarea
              v-model="config.footerText"
              class="min-h-20 resize-none bg-background"
              placeholder="输入报告页脚说明"
            />
          </label>
        </div>
      </section>

      <section class="rounded-lg bg-background p-4 shadow-(--shadow-border)">
        <div class="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <h2 class="text-base font-semibold text-foreground">报告模块</h2>
            <p class="text-sm leading-5 text-muted-foreground">
              开关控制模块是否进入新报告，上移和下移控制报告内展示顺序。
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <article
            v-for="(module, index) in config.modules"
            :key="module.key"
            class="flex min-w-0 items-center gap-3 rounded-lg bg-muted/55 px-3 py-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.04)]"
          >
            <div class="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-(--shadow-border)">
              <i class="ri-draggable text-base" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h3 class="truncate text-sm font-semibold text-foreground">{{ module.title }}</h3>
                <span class="rounded bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {{ module.enabled ? "启用" : "隐藏" }}
                </span>
              </div>
              <p class="mt-1 text-sm leading-5 text-muted-foreground">{{ module.description }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-8 w-8 rounded-md"
                :disabled="index === 0"
                title="上移模块"
                @click="moveModule(index, 'up')"
              >
                <i class="ri-arrow-up-line text-base" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-8 w-8 rounded-md"
                :disabled="index === config.modules.length - 1"
                title="下移模块"
                @click="moveModule(index, 'down')"
              >
                <i class="ri-arrow-down-line text-base" />
              </Button>
              <Switch
                :checked="module.enabled"
                :aria-label="`${module.title}模块开关`"
                @update:checked="updateModuleEnabled(module.key, Boolean($event))"
              />
            </div>
          </article>
        </div>
      </section>

      <div class="sticky bottom-0 z-10 flex justify-end gap-2 bg-background/90 py-3 backdrop-blur">
        <Button type="button" variant="outline" class="h-9 px-3.5" @click="resetConfig">
          恢复默认
        </Button>
        <Button type="button" class="h-9 px-4" @click="saveConfig">
          保存模板
        </Button>
      </div>
    </div>
  </SettingsRightPanelLayout>
</template>
