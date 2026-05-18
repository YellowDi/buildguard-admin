import type { ComputedRef, InjectionKey, Ref } from "vue"

export type InputOTPContext = {
  activeIndex: Ref<number>
  disabled: ComputedRef<boolean>
  focus: () => void
  maxLength: ComputedRef<number>
  value: Ref<string>
}

export const INPUT_OTP_CONTEXT_KEY = Symbol("InputOTPContext") as InjectionKey<InputOTPContext>
