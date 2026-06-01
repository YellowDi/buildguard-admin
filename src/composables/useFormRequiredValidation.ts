import { computed, nextTick, ref } from "vue"

type RequiredFieldRule = {
  id: string
  isComplete: () => boolean
  enabled?: () => boolean
}

const REQUIRED_FOCUS_SELECTOR = [
  "input:not([type=hidden]):not([disabled])",
  "textarea:not([disabled])",
  "[data-slot='select-trigger']:not([disabled])",
  "[data-slot='date-picker-trigger']:not([disabled])",
  "button:not([disabled])",
].join(", ")

export function useFormRequiredValidation(getRules: () => RequiredFieldRule[]) {
  const requiredValidationTriggered = ref(false)

  const missingRequiredFieldIds = computed(() => {
    const ids = getRules()
      .filter(rule => (rule.enabled?.() ?? true) && !rule.isComplete())
      .map(rule => rule.id)

    return Array.from(new Set(ids))
  })

  const hasMissingRequiredFields = computed(() => missingRequiredFieldIds.value.length > 0)

  function isRequiredFieldInvalid(id: string) {
    return requiredValidationTriggered.value && missingRequiredFieldIds.value.includes(id)
  }

  function validateRequiredFields(scrollOffset = 112) {
    requiredValidationTriggered.value = true

    if (!hasMissingRequiredFields.value) {
      return true
    }

    scrollToFirstMissingRequiredField(scrollOffset)
    return false
  }

  function scrollToFirstMissingRequiredField(scrollOffset: number) {
    const firstMissingId = missingRequiredFieldIds.value[0]

    if (!firstMissingId) {
      return
    }

    nextTick(() => {
      const section = document.getElementById(firstMissingId)

      if (!section) {
        return
      }

      const rect = section.getBoundingClientRect()
      const top = rect.top + window.scrollY - scrollOffset
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })

      const focusable = section.querySelector<HTMLElement>(REQUIRED_FOCUS_SELECTOR)
      focusable?.focus({ preventScroll: true })
    })
  }

  return {
    hasMissingRequiredFields,
    isRequiredFieldInvalid,
    missingRequiredFieldIds,
    requiredValidationTriggered,
    validateRequiredFields,
  }
}
