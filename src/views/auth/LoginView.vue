<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { toast } from "vue-sonner"

import BrandLogo from "@/components/layout/BrandLogo.vue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { clearCurrentUser, loadCurrentUser } from "@/composables/useCurrentUser"
import { login } from "@/lib/auth-api"
import { setAuthToken } from "@/lib/auth"

const router = useRouter()

const form = reactive({
  account: "",
  password: "",
})
const isSubmitting = ref(false)
const sceneRef = ref<HTMLElement | null>(null)

const mouse = reactive({
  x: 240,
  y: 180,
})

const animationState = reactive({
  accountFocused: false,
  lookAtEachOther: false,
  passwordFocused: false,
  loginFailed: false,
  purpleBlinking: false,
  blackBlinking: false,
})

let lookAtEachOtherTimer: ReturnType<typeof setTimeout> | undefined
let purpleBlinkDelayTimer: ReturnType<typeof setTimeout> | undefined
let purpleBlinkResetTimer: ReturnType<typeof setTimeout> | undefined
let blackBlinkDelayTimer: ReturnType<typeof setTimeout> | undefined
let blackBlinkResetTimer: ReturnType<typeof setTimeout> | undefined
let loginFailureTimer: ReturnType<typeof setTimeout> | undefined

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resetMouse() {
  mouse.x = 240
  mouse.y = 180
}

function clearTimer(timer: ReturnType<typeof setTimeout> | undefined) {
  if (timer) {
    clearTimeout(timer)
  }
}

function pulseLookAtEachOther() {
  animationState.lookAtEachOther = true
  clearTimer(lookAtEachOtherTimer)
  lookAtEachOtherTimer = setTimeout(() => {
    animationState.lookAtEachOther = false
  }, 800)
}

function schedulePurpleBlink() {
  clearTimer(purpleBlinkDelayTimer)
  purpleBlinkDelayTimer = setTimeout(() => {
    animationState.purpleBlinking = true
    clearTimer(purpleBlinkResetTimer)
    purpleBlinkResetTimer = setTimeout(() => {
      animationState.purpleBlinking = false
      schedulePurpleBlink()
    }, 150)
  }, Math.random() * 4000 + 3000)
}

function scheduleBlackBlink() {
  clearTimer(blackBlinkDelayTimer)
  blackBlinkDelayTimer = setTimeout(() => {
    animationState.blackBlinking = true
    clearTimer(blackBlinkResetTimer)
    blackBlinkResetTimer = setTimeout(() => {
      animationState.blackBlinking = false
      scheduleBlackBlink()
    }, 150)
  }, Math.random() * 4000 + 3000)
}

function onScenePointerMove(event: PointerEvent) {
  const scene = sceneRef.value

  if (!scene) {
    return
  }

  const rect = scene.getBoundingClientRect()
  mouse.x = clamp(event.clientX - rect.left, 0, rect.width)
  mouse.y = clamp(event.clientY - rect.top, 0, rect.height)
}

function onScenePointerLeave() {
  resetMouse()
}

function onAccountFocus() {
  animationState.accountFocused = true
  pulseLookAtEachOther()
}

function onAccountBlur() {
  animationState.accountFocused = false
  animationState.lookAtEachOther = false
  clearTimer(lookAtEachOtherTimer)
}

function onAccountInput() {
  pulseLookAtEachOther()
}

function onPasswordFocus() {
  animationState.passwordFocused = true
}

function onPasswordBlur() {
  animationState.passwordFocused = false
}

function triggerLoginFailureAnimation() {
  animationState.loginFailed = false
  clearTimer(loginFailureTimer)

  requestAnimationFrame(() => {
    animationState.passwordFocused = false
    animationState.lookAtEachOther = false
    animationState.loginFailed = true

    loginFailureTimer = setTimeout(() => {
      animationState.loginFailed = false
    }, 2400)
  })
}

type CharacterPose = {
  faceX: number
  faceY: number
  bodySkew: number
}

function calcPose(centerX: number, centerY: number): CharacterPose {
  const dx = mouse.x - centerX
  const dy = mouse.y - centerY

  return {
    faceX: clamp(dx / 20, -15, 15),
    faceY: clamp(dy / 30, -10, 10),
    bodySkew: clamp(-dx / 120, -6, 6),
  }
}

function calcPupilOffset(centerX: number, centerY: number, maxDistance: number) {
  const dx = mouse.x - centerX
  const dy = mouse.y - centerY
  const distance = Math.min(Math.hypot(dx, dy) / 12, maxDistance)
  const angle = Math.atan2(dy, dx)

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  }
}

function toTranslate(x: number, y: number) {
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
}

const characterStyles = computed(() => {
  const lookingAway = animationState.passwordFocused && !animationState.loginFailed
  const purplePose = calcPose(145, 130)
  const blackPose = calcPose(278, 150)
  const orangePose = calcPose(115, 220)
  const yellowPose = calcPose(357, 190)

  const purplePupil = calcPupilOffset(99, 49, 5)
  const blackPupil = calcPupilOffset(254, 40, 4)
  const orangePupil = calcPupilOffset(96, 96, 5)
  const yellowPupil = calcPupilOffset(62, 48, 5)

  const purpleBodyStyle = {
    height: animationState.accountFocused || lookingAway ? "410px" : "370px",
    transform: lookingAway
      ? "skewX(-14deg) translateX(-20px)"
      : animationState.accountFocused
        ? `skewX(${(purplePose.bodySkew - 12).toFixed(2)}deg) translateX(36px)`
        : `skewX(${purplePose.bodySkew.toFixed(2)}deg)`,
  }

  const blackBodyStyle = {
    transform: lookingAway
      ? "skewX(12deg) translateX(-10px)"
      : animationState.lookAtEachOther
        ? `skewX(${(blackPose.bodySkew * 1.5 + 10).toFixed(2)}deg) translateX(18px)`
        : `skewX(${blackPose.bodySkew.toFixed(2)}deg)`,
  }

  const orangeBodyStyle = {
    transform: lookingAway
      ? "skewX(-8deg) translateX(-16px) translateY(4px)"
      : `skewX(${orangePose.bodySkew.toFixed(2)}deg) translateX(${(orangePose.faceX * 0.45).toFixed(2)}px)`,
  }

  const yellowBodyStyle = {
    transform: lookingAway
      ? "skewX(-6deg) translateX(-12px) translateY(2px)"
      : `skewX(${yellowPose.bodySkew.toFixed(2)}deg) translateX(${(yellowPose.faceX * 0.35).toFixed(2)}px)`,
  }

  const purpleEyesStyle = animationState.loginFailed
    ? { left: "30px", top: "55px" }
    : lookingAway
      ? { left: "20px", top: "25px" }
      : animationState.lookAtEachOther
        ? { left: "55px", top: "65px" }
        : {
            left: `${45 + purplePose.faceX}px`,
            top: `${40 + purplePose.faceY}px`,
          }

  const purplePupilTransform = animationState.loginFailed
    ? toTranslate(-3, 4)
    : lookingAway
      ? toTranslate(-5, -5)
      : animationState.lookAtEachOther
        ? toTranslate(3, 4)
        : toTranslate(purplePupil.x, purplePupil.y)

  const blackEyesStyle = animationState.loginFailed
    ? { left: "15px", top: "40px" }
    : lookingAway
      ? { left: "10px", top: "20px" }
      : animationState.lookAtEachOther
        ? { left: "32px", top: "12px" }
        : {
            left: `${26 + blackPose.faceX}px`,
            top: `${32 + blackPose.faceY}px`,
          }

  const blackPupilTransform = animationState.loginFailed
    ? toTranslate(-3, 4)
    : lookingAway
      ? toTranslate(-4, -5)
      : animationState.lookAtEachOther
        ? toTranslate(0, -4)
        : toTranslate(blackPupil.x, blackPupil.y)

  const orangeEyesStyle = animationState.loginFailed
    ? { left: "60px", top: "95px" }
    : lookingAway
      ? { left: "50px", top: "75px" }
      : {
          left: `${82 + orangePose.faceX}px`,
          top: `${90 + orangePose.faceY}px`,
        }

  const orangePupilTransform = animationState.loginFailed
    ? toTranslate(-3, 4)
    : lookingAway
      ? toTranslate(-5, -5)
      : toTranslate(orangePupil.x, orangePupil.y)

  const orangeMouthStyle = animationState.loginFailed
    ? {
        left: `${80 + orangePose.faceX}px`,
        top: "130px",
      }
    : {
        left: "90px",
        top: "120px",
      }

  const yellowEyesStyle = animationState.loginFailed
    ? { left: "35px", top: "45px" }
    : lookingAway
      ? { left: "20px", top: "30px" }
      : {
          left: `${52 + yellowPose.faceX}px`,
          top: `${40 + yellowPose.faceY}px`,
        }

  const yellowPupilTransform = animationState.loginFailed
    ? toTranslate(-3, 4)
    : lookingAway
      ? toTranslate(-5, -5)
      : toTranslate(yellowPupil.x, yellowPupil.y)

  const yellowMouthStyle = animationState.loginFailed
    ? { left: "30px", top: "92px", transform: "rotate(-8deg)" }
    : lookingAway
      ? { left: "15px", top: "78px", transform: "rotate(0deg)" }
      : {
          left: `${40 + yellowPose.faceX}px`,
          top: `${88 + yellowPose.faceY}px`,
          transform: "rotate(0deg)",
        }

  return {
    blackBodyStyle,
    blackEyesStyle,
    blackPupilTransform,
    orangeBodyStyle,
    orangeEyesStyle,
    orangeMouthStyle,
    orangeMouthVisible: animationState.loginFailed,
    orangePupilTransform,
    purpleBodyStyle,
    purpleEyesStyle,
    purpleEyeHeight: animationState.purpleBlinking ? "2px" : "18px",
    purplePupilTransform,
    yellowBodyStyle,
    yellowEyesStyle,
    yellowMouthStyle,
    yellowPupilTransform,
    blackEyeHeight: animationState.blackBlinking ? "2px" : "16px",
    shaking: animationState.loginFailed,
  }
})

async function handleSubmit() {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  try {
    const { token } = await login({
      Account: form.account,
      Password: form.password,
    })

    setAuthToken(token)
    clearCurrentUser()
    await loadCurrentUser({ force: true })

    const { redirect } = router.currentRoute.value.query

    await router.replace(
      typeof redirect === "string" && redirect.trim()
        ? redirect
        : { name: "dashboard" },
    )
  } catch (error) {
    triggerLoginFailureAnimation()
    toast.error("登录失败", {
      description: error instanceof Error ? error.message : "请检查手机号或稍后重试。",
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  resetMouse()
  schedulePurpleBlink()
  scheduleBlackBlink()
})

onBeforeUnmount(() => {
  clearTimer(lookAtEachOtherTimer)
  clearTimer(purpleBlinkDelayTimer)
  clearTimer(purpleBlinkResetTimer)
  clearTimer(blackBlinkDelayTimer)
  clearTimer(blackBlinkResetTimer)
  clearTimer(loginFailureTimer)
})
</script>

<template>
  <div class="relative grid min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(0,117,222,0.08),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,252,0.96))] lg:grid-cols-2">
    <div class="absolute left-6 top-6 z-20 md:left-10 md:top-10">
      <RouterLink to="/login" class="flex items-center gap-2 rounded-xl px-2 py-1.5 font-medium transition-[background-color,color] duration-180 ease-out hover:bg-background/70">
        <BrandLogo
          image-class="size-8"
          text-class="truncate text-base font-semibold"
        />
      </RouterLink>
    </div>

    <div class="auth-animated-panel relative hidden overflow-hidden lg:block">
      <div class="auth-animated-glow auth-animated-glow-top" aria-hidden="true" />
      <div class="auth-animated-glow auth-animated-glow-bottom" aria-hidden="true" />
      <div
        ref="sceneRef"
        class="auth-scene-wrapper"
        aria-hidden="true"
        @pointermove="onScenePointerMove"
        @pointerleave="onScenePointerLeave"
      >
        <div class="auth-scene">
          <div class="auth-character auth-purple" :style="characterStyles.purpleBodyStyle">
            <div class="auth-eyes" :class="{ 'is-shaking': characterStyles.shaking }" :style="characterStyles.purpleEyesStyle">
              <div class="auth-eyeball" :style="{ height: characterStyles.purpleEyeHeight }">
                <div class="auth-pupil" :style="{ transform: characterStyles.purplePupilTransform }" />
              </div>
              <div class="auth-eyeball" :style="{ height: characterStyles.purpleEyeHeight }">
                <div class="auth-pupil" :style="{ transform: characterStyles.purplePupilTransform }" />
              </div>
            </div>
          </div>

          <div class="auth-character auth-black" :style="characterStyles.blackBodyStyle">
            <div class="auth-eyes auth-eyes-black" :class="{ 'is-shaking': characterStyles.shaking }" :style="characterStyles.blackEyesStyle">
              <div class="auth-eyeball auth-eyeball-black" :style="{ height: characterStyles.blackEyeHeight }">
                <div class="auth-pupil auth-pupil-black" :style="{ transform: characterStyles.blackPupilTransform }" />
              </div>
              <div class="auth-eyeball auth-eyeball-black" :style="{ height: characterStyles.blackEyeHeight }">
                <div class="auth-pupil auth-pupil-black" :style="{ transform: characterStyles.blackPupilTransform }" />
              </div>
            </div>
          </div>

          <div class="auth-character auth-orange" :style="characterStyles.orangeBodyStyle">
            <div class="auth-eyes auth-eyes-bare" :class="{ 'is-shaking': characterStyles.shaking }" :style="characterStyles.orangeEyesStyle">
              <div class="auth-bare-pupil" :style="{ transform: characterStyles.orangePupilTransform }" />
              <div class="auth-bare-pupil" :style="{ transform: characterStyles.orangePupilTransform }" />
            </div>
            <div
              class="auth-orange-mouth"
              :class="{ 'is-visible': characterStyles.orangeMouthVisible, 'is-shaking': characterStyles.shaking }"
              :style="characterStyles.orangeMouthStyle"
            />
          </div>

          <div class="auth-character auth-yellow" :style="characterStyles.yellowBodyStyle">
            <div class="auth-eyes auth-eyes-bare" :class="{ 'is-shaking': characterStyles.shaking }" :style="characterStyles.yellowEyesStyle">
              <div class="auth-bare-pupil" :style="{ transform: characterStyles.yellowPupilTransform }" />
              <div class="auth-bare-pupil" :style="{ transform: characterStyles.yellowPupilTransform }" />
            </div>
            <div class="auth-yellow-mouth" :class="{ 'is-shaking': characterStyles.shaking }" :style="characterStyles.yellowMouthStyle" />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col bg-white p-6 md:p-10">
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-sm">
          <Card class="rounded-none border-none bg-transparent py-0 shadow-none">
            <CardHeader class="px-6 pt-6 text-center">
              <CardTitle class="text-2xl tracking-tight">
                后台登录
              </CardTitle>
              <CardDescription class="mt-1">
                使用手机号或用户名加密码登录后台管理平台
              </CardDescription>
            </CardHeader>
            <CardContent class="px-6 pb-6">
              <form class="grid gap-6" @submit.prevent="handleSubmit">
                <div class="grid gap-6">
                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground/88" for="account">账户</label>
                    <Input
                      id="account"
                      v-model="form.account"
                      type="text"
                      inputmode="text"
                      class="shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)"
                      placeholder="请输入手机号或用户名"
                      autocomplete="username"
                      required
                      @focus="onAccountFocus"
                      @blur="onAccountBlur"
                      @input="onAccountInput"
                    />
                  </div>

                  <div class="grid gap-2">
                    <label class="text-sm font-medium text-foreground/88" for="password">密码</label>
                    <Input
                      id="password"
                      v-model="form.password"
                      type="password"
                      class="shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)"
                      placeholder="请输入密码"
                      autocomplete="current-password"
                      required
                      @focus="onPasswordFocus"
                      @blur="onPasswordBlur"
                    />
                  </div>

                  <Button type="submit" class="mt-1 h-11 w-full shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)" :disabled="isSubmitting">
                    {{ isSubmitting ? "登录中..." : "登录" }}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-animated-panel {
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.62), transparent 22%),
    linear-gradient(145deg, #f0f2f4 0%, #e7eaee 46%, #dde2e7 100%);
}

.auth-animated-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(90px);
  opacity: 0.5;
}

.auth-animated-glow-top {
  top: 12%;
  right: 8%;
  width: 280px;
  height: 280px;
  background: rgba(214, 219, 225, 0.24);
}

.auth-animated-glow-bottom {
  bottom: 10%;
  left: 8%;
  width: 340px;
  height: 340px;
  background: rgba(255, 255, 255, 0.24);
}

.auth-scene-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.auth-scene {
  position: relative;
  width: min(100%, 520px);
  height: min(72vh, 430px);
}

.auth-character {
  position: absolute;
  bottom: 0;
  transform-origin: bottom center;
  transition:
    transform 0.7s ease-in-out,
    height 0.7s ease-in-out;
}

.auth-purple {
  left: 60px;
  z-index: 1;
  width: 170px;
  height: 370px;
  border-radius: 10px 10px 0 0;
  background: #6c3ff5;
}

.auth-black {
  left: 220px;
  z-index: 2;
  width: 115px;
  height: 290px;
  border-radius: 8px 8px 0 0;
  background: #2d2d2d;
}

.auth-orange {
  left: 0;
  z-index: 3;
  width: 230px;
  height: 190px;
  border-radius: 115px 115px 0 0;
  background: #ff9b6b;
}

.auth-yellow {
  left: 290px;
  z-index: 4;
  width: 135px;
  height: 215px;
  border-radius: 68px 68px 0 0;
  background: #e8d754;
}

.auth-eyes {
  position: absolute;
  display: flex;
  gap: 28px;
  transition:
    left 0.7s ease-in-out,
    top 0.7s ease-in-out,
    transform 0.7s ease-in-out;
}

.auth-eyes-black {
  gap: 20px;
}

.auth-eyes-bare {
  gap: 28px;
}

.auth-eyeball {
  display: flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: #fff;
  transition: height 0.15s ease;
}

.auth-eyeball-black {
  width: 16px;
  height: 16px;
}

.auth-pupil {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #2d2d2d;
  transition: transform 0.1s ease-out;
}

.auth-pupil-black {
  width: 6px;
  height: 6px;
}

.auth-bare-pupil {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #2d2d2d;
  transition: transform 0.7s ease-in-out;
}

.auth-yellow-mouth,
.auth-orange-mouth {
  position: absolute;
  transition:
    left 0.7s ease-in-out,
    top 0.7s ease-in-out,
    opacity 0.4s ease,
    transform 0.7s ease-in-out;
}

.auth-yellow-mouth {
  width: 50px;
  height: 4px;
  border-radius: 999px;
  background: #2d2d2d;
}

.auth-orange-mouth {
  left: 90px;
  top: 120px;
  width: 28px;
  height: 14px;
  opacity: 0;
  border: 3px solid #2d2d2d;
  border-top: none;
  border-radius: 0 0 14px 14px;
}

.auth-orange-mouth.is-visible {
  opacity: 1;
}

@keyframes auth-shake {
  0%,
  100% {
    translate: 0 0;
  }

  10% {
    translate: -9px 0;
  }

  20% {
    translate: 7px 0;
  }

  30% {
    translate: -6px 0;
  }

  40% {
    translate: 5px 0;
  }

  50% {
    translate: -4px 0;
  }

  60% {
    translate: 3px 0;
  }

  70% {
    translate: -2px 0;
  }

  80% {
    translate: 1px 0;
  }

  90% {
    translate: -0.5px 0;
  }
}

.is-shaking {
  animation: auth-shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@media (prefers-reduced-motion: reduce) {
  .auth-character,
  .auth-eyes,
  .auth-eyeball,
  .auth-pupil,
  .auth-bare-pupil,
  .auth-yellow-mouth,
  .auth-orange-mouth {
    transition: none;
  }

  .is-shaking {
    animation: none;
  }
}
</style>
