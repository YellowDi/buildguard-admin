<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PractitionerFormState = {
  name: string
  phone: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: string
  joinedAt: string
  status: string
  note: string
}

type SubmittedPractitionerRecord = PractitionerFormState & {
  id: number
  submittedAt: string
}

const router = useRouter()

const form = reactive<PractitionerFormState>({
  name: "",
  phone: "",
  company: "",
  role: "",
  district: "",
  certificateLevel: "",
  experienceYears: "1",
  joinedAt: new Date().toISOString().slice(0, 10),
  status: "在岗",
  note: "",
})

const submittedRecord = ref<SubmittedPractitionerRecord | null>(null)

const canSubmit = computed(() =>
  Boolean(
    form.name.trim()
    && form.phone.trim()
    && form.company.trim()
    && form.role.trim()
    && form.district.trim()
    && form.certificateLevel.trim()
    && form.joinedAt.trim(),
  ),
)

function handleSubmit() {
  submittedRecord.value = {
    ...form,
    id: Date.now(),
    submittedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  }
}

function handleReset() {
  form.name = ""
  form.phone = ""
  form.company = ""
  form.role = ""
  form.district = ""
  form.certificateLevel = ""
  form.experienceYears = "1"
  form.joinedAt = new Date().toISOString().slice(0, 10)
  form.status = "在岗"
  form.note = ""
  submittedRecord.value = null
}

function goBack() {
  router.push({ name: "users" })
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
    <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <p class="text-sm text-muted-foreground">测试页</p>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">添加从业人员</h1>
        <p class="text-sm text-muted-foreground">
          该页面用于验证从业人员新增入口、表单录入与提交反馈流程。
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" @click="goBack">
          返回列表
        </Button>
        <Button variant="outline" @click="handleReset">
          重置表单
        </Button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <Card class="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>填写从业人员的身份与归属信息。</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">姓名</span>
              <Input v-model="form.name" required placeholder="输入从业人员姓名" />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">手机号</span>
              <Input
                v-model="form.phone"
                required
                type="tel"
                inputmode="numeric"
                pattern="^1[3-9]\\d{9}$"
                placeholder="输入 11 位手机号"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">所属企业</span>
              <Input v-model="form.company" required placeholder="输入企业名称" />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">岗位类型</span>
              <select
                v-model="form.role"
                required
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option disabled value="">
                  请选择岗位类型
                </option>
                <option value="驾驶员">
                  驾驶员
                </option>
                <option value="押运员">
                  押运员
                </option>
                <option value="安全员">
                  安全员
                </option>
                <option value="调度员">
                  调度员
                </option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">行政区域</span>
              <Input v-model="form.district" required placeholder="例如：浦东新区" />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">入职日期</span>
              <Input v-model="form.joinedAt" required type="date" />
            </label>
          </CardContent>
        </Card>

        <Card class="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>资质与状态</CardTitle>
            <CardDescription>补充证件、年限和当前状态，方便后续联调列表字段。</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">证件级别</span>
              <select
                v-model="form.certificateLevel"
                required
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option disabled value="">
                  请选择证件级别
                </option>
                <option value="A 类">
                  A 类
                </option>
                <option value="B 类">
                  B 类
                </option>
                <option value="C 类">
                  C 类
                </option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">从业年限</span>
              <Input
                v-model="form.experienceYears"
                min="0"
                max="50"
                required
                type="number"
                placeholder="输入从业年限"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-foreground">状态</span>
              <select
                v-model="form.status"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="在岗">
                  在岗
                </option>
                <option value="待审核">
                  待审核
                </option>
                <option value="离岗">
                  离岗
                </option>
              </select>
            </label>

            <label class="space-y-2 md:col-span-2">
              <span class="text-sm font-medium text-foreground">备注</span>
              <textarea
                v-model="form.note"
                rows="5"
                class="flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="输入备注信息，用于测试新增后的详情展示或列表回填。"
              />
            </label>
          </CardContent>
        </Card>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" type="button" @click="goBack">
            取消
          </Button>
          <Button :disabled="!canSubmit" type="submit">
            提交测试表单
          </Button>
        </div>
      </form>

      <div class="space-y-6">
        <Card class="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>联调说明</CardTitle>
            <CardDescription>当前是测试页，提交后不会写入后端，也不会自动回填列表。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 text-sm text-muted-foreground">
            <p>已覆盖列表页的主要字段：姓名、手机号、企业、岗位、区域、证件级别、年限、入职日期、状态、备注。</p>
            <p>后续如果要接真接口，可以直接在当前提交函数里替换为 API 调用，再决定提交成功后的跳转或回填策略。</p>
          </CardContent>
        </Card>

        <Card
          class="border-border/80 shadow-sm"
          :class="submittedRecord ? 'border-emerald-200 bg-emerald-50/60' : ''"
        >
          <CardHeader>
            <CardTitle>{{ submittedRecord ? "提交结果" : "等待提交" }}</CardTitle>
            <CardDescription>
              {{ submittedRecord ? "已生成一条测试提交记录。" : "提交后会在这里展示本次表单内容摘要。" }}
            </CardDescription>
          </CardHeader>
          <CardContent v-if="submittedRecord" class="space-y-3 text-sm">
            <div class="grid gap-3">
              <div class="rounded-lg border border-border bg-background px-3 py-2">
                <p class="text-xs text-muted-foreground">
                  测试记录 ID
                </p>
                <p class="mt-1 font-medium text-foreground">
                  {{ submittedRecord.id }}
                </p>
              </div>
              <div class="rounded-lg border border-border bg-background px-3 py-2">
                <p class="text-xs text-muted-foreground">
                  提交时间
                </p>
                <p class="mt-1 font-medium text-foreground">
                  {{ submittedRecord.submittedAt }}
                </p>
              </div>
              <div class="rounded-lg border border-border bg-background px-3 py-2">
                <p class="text-xs text-muted-foreground">
                  提交摘要
                </p>
                <p class="mt-1 text-foreground">
                  {{ submittedRecord.name }} / {{ submittedRecord.role }} / {{ submittedRecord.company }}
                </p>
              </div>
            </div>
          </CardContent>
          <CardContent v-else class="text-sm text-muted-foreground">
            表单尚未提交。
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
