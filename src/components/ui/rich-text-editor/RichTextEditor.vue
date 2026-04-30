<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, nextTick, ref, watch } from "vue"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes["class"]
}>(), {
  modelValue: "",
  placeholder: "输入正文内容",
})

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const editorRef = ref<HTMLElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const selectedBlock = ref("p")
const blockOptions = [
  { value: "p", label: "Paragraph", icon: "ri-text" },
  { value: "h1", label: "Heading 1", icon: "ri-h-1" },
  { value: "h2", label: "Heading 2", icon: "ri-h-2" },
  { value: "h3", label: "Heading 3", icon: "ri-h-3" },
  { value: "h4", label: "Heading 4", icon: "ri-h-4" },
  { value: "h5", label: "Heading 5", icon: "ri-h-5" },
  { value: "h6", label: "Heading 6", icon: "ri-h-6" },
]
const selectedBlockOption = computed(() => blockOptions.find((option) => option.value === selectedBlock.value) ?? blockOptions[0])

watch(
  () => props.modelValue,
  async (value) => {
    await nextTick()
    const editor = editorRef.value
    if (!editor || focused.value || editor.innerHTML === value) {
      return
    }

    editor.innerHTML = value || ""
  },
  { immediate: true },
)

function syncValue() {
  emit("update:modelValue", editorRef.value?.innerHTML ?? "")
}

function focusEditor() {
  editorRef.value?.focus()
}

function runCommand(command: string, value?: string) {
  focusEditor()
  document.execCommand(command, false, value)
  syncValue()
}

function runBlockCommand(command: string, value?: string) {
  focusEditor()
  document.execCommand(command, false, value)
  ensureExitParagraphAfterActiveBlock()
  syncValue()
}

function ensureExitParagraphAfterActiveBlock() {
  const editor = editorRef.value
  const selection = window.getSelection()
  if (!editor || !selection?.rangeCount) {
    return
  }

  const activeRange = selection.getRangeAt(0).cloneRange()
  const anchorNode = selection.anchorNode
  const anchorElement = anchorNode instanceof HTMLElement
    ? anchorNode
    : anchorNode?.parentElement

  if (!anchorElement || !editor.contains(anchorElement)) {
    return
  }

  const listItem = anchorElement.closest("li")
  const activeBlock = listItem?.closest("ul, ol")
    ?? anchorElement.closest("blockquote, pre")

  if (!activeBlock || !editor.contains(activeBlock)) {
    return
  }

  const nextElement = activeBlock.nextElementSibling
  if (nextElement instanceof HTMLParagraphElement && isEmptyParagraph(nextElement)) {
    return
  }

  const exitParagraph = document.createElement("p")
  exitParagraph.append(document.createElement("br"))
  activeBlock.after(exitParagraph)

  selection.removeAllRanges()
  selection.addRange(activeRange)
}

function isEmptyParagraph(paragraph: HTMLParagraphElement) {
  const text = paragraph.textContent?.replace(/\u200B/g, "").trim()
  return !text && (!paragraph.children.length || Array.from(paragraph.children).every(child => child.tagName === "BR"))
}

function applyBlock(value: string | number | bigint | boolean | Record<string, unknown> | null) {
  const next = typeof value === "string" ? value : "p"
  selectedBlock.value = next
  runCommand("formatBlock", next)
}

function applyLink() {
  const url = window.prompt("输入链接地址")
  if (!url?.trim()) {
    return
  }

  runCommand("createLink", url.trim())
}

function triggerImageSelect() {
  imageInputRef.value?.click()
}

function handleImageChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith("image/")) {
    if (input) {
      input.value = ""
    }
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === "string") {
      runCommand("insertImage", reader.result)
    }
    if (input) {
      input.value = ""
    }
  }
  reader.readAsDataURL(file)
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData("text/plain") ?? ""
  if (!text) {
    return
  }

  document.execCommand("insertText", false, text)
  syncValue()
}
</script>

<template>
  <div
    data-slot="rich-text-editor"
    :class="cn(
      'min-w-0 bg-transparent',
      props.class,
    )"
  >
    <div class="flex min-h-10 flex-wrap items-center gap-2">
      <input
        ref="imageInputRef"
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,gif"
        @change="handleImageChange"
      >

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="rich-text-toolbar-button"
        title="上传图片"
        aria-label="上传图片"
        @click="triggerImageSelect"
      >
        <i class="ri-add-line text-[18px]" />
      </Button>

      <Select
        :model-value="selectedBlock"
        @update:model-value="applyBlock"
      >
        <SelectTrigger
          class="rich-text-style-trigger"
          :title="selectedBlockOption.label"
          :aria-label="`文本样式：${selectedBlockOption.label}`"
        >
          <span class="rich-text-style-trigger-icon">
            <i :class="[selectedBlockOption.icon, 'text-[17px]']" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in blockOptions"
            :key="option.value"
            class="rich-text-style-option"
            :value="option.value"
            :title="option.label"
            :aria-label="option.label"
          >
            <i :class="[option.icon, 'text-base']" />
            <span>{{ option.label }}</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="rich-text-tool-group">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button"
          title="链接"
          aria-label="链接"
          @click="applyLink"
        >
          <i class="ri-link text-base" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button font-semibold"
          title="加粗"
          aria-label="加粗"
          @click="runCommand('bold')"
        >
          B
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button italic"
          title="斜体"
          aria-label="斜体"
          @click="runCommand('italic')"
        >
          I
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button"
          title="引用"
          aria-label="引用"
          @click="runBlockCommand('formatBlock', 'blockquote')"
        >
          <i class="ri-double-quotes-l text-base" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button"
          title="代码"
          aria-label="代码"
          @click="runBlockCommand('formatBlock', 'pre')"
        >
          <i class="ri-code-line text-base" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button"
          title="无序列表"
          aria-label="无序列表"
          @click="runBlockCommand('insertUnorderedList')"
        >
          <i class="ri-list-unordered text-base" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rich-text-tool-button"
          title="有序列表"
          aria-label="有序列表"
          @click="runBlockCommand('insertOrderedList')"
        >
          <i class="ri-list-ordered text-base" />
        </Button>
      </div>
    </div>

    <div
      ref="editorRef"
      class="rich-text-editor-content mt-5 min-h-[420px] text-sm leading-7 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      contenteditable="true"
      :data-placeholder="props.placeholder"
      @focus="focused = true"
      @blur="focused = false; syncValue()"
      @input="syncValue"
      @paste="handlePaste"
    />
  </div>
</template>

<style scoped>
.rich-text-toolbar-button {
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--muted);
  color: var(--muted-foreground);
  box-shadow: none;
}

.rich-text-toolbar-button:hover {
  background: color-mix(in srgb, var(--muted) 82%, var(--foreground) 8%);
  color: var(--foreground);
}

.rich-text-style-trigger {
  width: 4.625rem;
  min-width: 4.625rem;
  height: 2.5rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--muted);
  padding-inline: 0.75rem;
  color: var(--muted-foreground);
  font-weight: 600;
  box-shadow: none;
}

.rich-text-style-trigger:focus,
.rich-text-style-trigger:focus-visible {
  border: 0;
  box-shadow: none;
  outline: none;
}

.rich-text-style-trigger-icon {
  display: inline-flex;
  width: 1.25rem;
  align-items: center;
  justify-content: center;
}

.rich-text-style-option {
  min-width: 9rem;
  padding-left: 0.5rem;
}

.rich-text-tool-group {
  display: inline-flex;
  height: 2.5rem;
  align-items: center;
  gap: 0.125rem;
  border-radius: 0.75rem;
  background: var(--muted);
  padding: 0.25rem;
}

.rich-text-tool-button {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 0.5rem;
  color: var(--muted-foreground);
  box-shadow: none;
}

.rich-text-tool-button:hover {
  background: var(--background);
  color: var(--foreground);
}

.rich-text-tool-button:focus-visible {
  box-shadow: none;
  outline: none;
}

.rich-text-editor-content :deep(h1),
.rich-text-editor-content :deep(h2),
.rich-text-editor-content :deep(h3),
.rich-text-editor-content :deep(h4),
.rich-text-editor-content :deep(h5),
.rich-text-editor-content :deep(h6) {
  margin: 0 0 0.75rem;
  font-weight: 600;
}

.rich-text-editor-content :deep(h1) {
  font-size: 1.5rem;
  line-height: 2rem;
}

.rich-text-editor-content :deep(h2) {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.rich-text-editor-content :deep(h3) {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.rich-text-editor-content :deep(h4),
.rich-text-editor-content :deep(h5),
.rich-text-editor-content :deep(h6) {
  font-size: 1rem;
  line-height: 1.5rem;
}

.rich-text-editor-content :deep(p),
.rich-text-editor-content :deep(ul),
.rich-text-editor-content :deep(ol),
.rich-text-editor-content :deep(blockquote),
.rich-text-editor-content :deep(pre) {
  margin: 0 0 0.85rem;
}

.rich-text-editor-content :deep(ul),
.rich-text-editor-content :deep(ol) {
  padding-left: 1.15rem;
}

.rich-text-editor-content :deep(li) {
  margin: 0.3rem 0;
}

.rich-text-editor-content :deep(blockquote) {
  border-left: 3px solid rgba(15, 23, 42, 0.16);
  padding-left: 0.9rem;
  color: rgb(71 85 105);
}

.rich-text-editor-content :deep(pre),
.rich-text-editor-content :deep(code) {
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.06);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
}

.rich-text-editor-content :deep(pre) {
  overflow-x: auto;
  padding: 0.75rem 0.9rem;
}

.rich-text-editor-content :deep(code) {
  padding: 0.1rem 0.35rem;
  font-size: 0.88em;
}

.rich-text-editor-content :deep(a) {
  color: rgb(3 105 161);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rich-text-editor-content :deep(img) {
  display: block;
  max-width: 100%;
  max-height: 320px;
  margin: 1rem 0;
  border-radius: 0.75rem;
  object-fit: contain;
}
</style>
