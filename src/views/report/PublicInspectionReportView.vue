<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import InspectionReportDocument from "@/components/report/InspectionReportDocument.vue"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  buildInspectionReportUrl,
  getInspectionReportMock,
  verifyInspectionReportPassword,
} from "@/lib/inspection-report-mock"

const route = useRoute()

const reportId = computed(() => typeof route.params.reportId === "string" ? route.params.reportId.trim() : "")
const report = ref(getInspectionReportMock(reportId.value))
const password = ref("")
const passwordError = ref("")
const unlocked = ref(false)

const reportUrl = computed(() => reportId.value ? buildInspectionReportUrl(reportId.value) : "")
const reportFileUrl = computed(() => report.value?.fileUrl?.trim() ?? "")

watch(reportId, (id) => {
  report.value = getInspectionReportMock(id)
  password.value = ""
  passwordError.value = ""
  unlocked.value = false
})

function updatePassword(value: string | number) {
  password.value = String(value).replace(/\D/g, "").slice(0, 4)
  passwordError.value = ""
}

function unlockReport() {
  if (!report.value) {
    return
  }

  if (!/^\d{4}$/.test(password.value)) {
    passwordError.value = "请输入 4 位数字密码"
    return
  }

  if (!verifyInspectionReportPassword(report.value.id, password.value)) {
    passwordError.value = "密码不正确，请重新输入"
    return
  }

  unlocked.value = true
  passwordError.value = ""
}

async function copyReportUrl() {
  if (!reportUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(reportUrl.value)
    toast.success("报告链接已复制")
  } catch {
    toast.error("复制失败，请手动复制浏览器地址")
  }
}

function downloadPdf() {
  if (!reportFileUrl.value) {
    toast.error("PDF 文件尚未生成，请在工单详情重新生成报告")
    return
  }

  window.open(reportFileUrl.value, "_blank", "noopener,noreferrer")
}
</script>

<template>
  <main class="min-h-svh bg-surface-secondary text-foreground">
    <section v-if="!report" class="mx-auto flex min-h-svh w-full max-w-lg items-center px-4">
      <div class="w-full rounded-xl bg-background p-6 text-center shadow-(--shadow-card)">
        <div class="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <i class="ri-file-warning-line text-2xl" />
        </div>
        <h1 class="text-lg font-semibold text-foreground">报告不存在</h1>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          当前报告可能尚未生成，或本地报告数据已被清理。
        </p>
      </div>
    </section>

    <section
      v-else-if="!unlocked"
      class="mx-auto flex min-h-svh w-full max-w-md items-center px-4"
    >
      <form class="w-full rounded-xl bg-background p-6 shadow-(--shadow-card)" @submit.prevent="unlockReport">
        <div class="mb-6 space-y-2">
          <div class="inline-flex size-11 items-center justify-center rounded-lg bg-brand-surface text-link">
            <i class="ri-lock-password-line text-xl" />
          </div>
          <h1 class="text-xl font-semibold text-foreground">请输入报告访问密码</h1>
          <p class="text-sm leading-6 text-muted-foreground">
            {{ report.snapshot.title }} 已开启访问保护，输入 4 位数字密码后可浏览。
          </p>
        </div>

        <InputOTP
          :model-value="password"
          autocomplete="off"
          class="mt-5 w-full"
          :max-length="4"
          aria-label="报告访问密码"
          inputmode="numeric"
          @complete="unlockReport"
          @update:model-value="updatePassword"
        >
          <InputOTPGroup class="grid w-full grid-cols-4">
            <InputOTPSlot
              v-for="slotIndex in 4"
              :key="slotIndex"
              class="h-16 w-full text-2xl sm:h-[72px] sm:text-3xl"
              :index="slotIndex - 1"
            />
          </InputOTPGroup>
        </InputOTP>

        <p v-if="passwordError" class="mt-3 text-center text-sm text-destructive">{{ passwordError }}</p>
      </form>
    </section>

    <section v-else class="inspection-report-page">
      <div class="report-no-print sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur">
        <div class="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-foreground">{{ report.snapshot.title }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ reportUrl }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" class="h-8 gap-1 px-3" @click="copyReportUrl">
              <i class="ri-file-copy-line text-base" />
              复制链接
            </Button>
            <Button
              type="button"
              aria-label="下载 PDF"
              class="h-8 gap-1 px-3"
              title="下载已生成的 PDF 文件"
              @click="downloadPdf"
            >
              <i class="ri-download-2-line text-base" />
              下载 PDF
            </Button>
          </div>
        </div>
      </div>

      <InspectionReportDocument :report="report" />
    </section>
  </main>
</template>

<style scoped>
.inspection-report-page {
  min-height: 100svh;
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .inspection-report-page {
    background: #ffffff !important;
  }
}
</style>
