<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div
      class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      :class="{ 'animate-wiggle': isShaking }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
        <button
          @click="handleBack"
          class="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Change Number / Email</span>
        </button>

        <button
          @click="handleClose"
          class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <div class="text-center space-y-1">
          <div class="w-12 h-12 mx-auto rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white">Enter 6-Digit Code</h2>
          <p class="text-xs text-gray-400">
            We sent a verification code to
            <span class="text-teal-300 font-medium">{{ identifier }}</span>
          </p>
        </div>

        <!-- WebOTP Status Banner (When listening for automated SMS) -->
        <div
          v-if="isWebOtpListening"
          class="flex items-center justify-between p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300"
        >
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>WebOTP Active: Waiting for SMS to auto-verify...</span>
          </span>
          <svg class="w-4 h-4 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        <!-- Demo Quick-Fill Pill -->
        <div
          v-if="demoCode"
          class="flex items-center justify-between p-2.5 bg-teal-950/40 border border-teal-800/60 rounded-xl text-xs text-teal-300"
        >
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            <span>Prototype Code: <strong class="font-mono text-white text-sm">{{ demoCode }}</strong></span>
          </span>
          <button
            type="button"
            @click="fillDemoCode"
            class="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg text-[11px] transition-colors"
          >
            Auto-Fill
          </button>
        </div>

        <!-- 6-Digit Split-Box Inputs with WebOTP / Mobile Autofill attributes -->
        <div class="flex justify-between gap-2 sm:gap-2.5">
          <input
            v-for="(_, index) in 6"
            :key="index"
            :ref="(el) => setInputRef(el, index)"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            autocomplete="one-time-code"
            v-model="digits[index]"
            @input="handleInput($event, index)"
            @keydown="handleKeyDown($event, index)"
            @paste="handlePaste($event)"
            class="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono bg-gray-950 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all shadow-inner"
            :class="{ 'border-teal-500 bg-teal-950/20': digits[index] }"
          />
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Verify Button -->
        <button
          type="button"
          @click="submitOtp"
          :disabled="isVerifying || codeString.length !== 6"
          class="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-gray-950 font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm"
        >
          <svg
            v-if="isVerifying"
            class="animate-spin w-4 h-4 text-gray-950"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span v-else>Verify &amp; Provision Wi-Fi</span>
        </button>

        <!-- Cooldown Timer & Resend Option -->
        <div class="flex items-center justify-center gap-3 text-xs">
          <div v-if="cooldownRemaining > 0" class="flex items-center gap-2 text-gray-400">
            <!-- Circular countdown ring -->
            <div class="relative w-5 h-5 flex items-center justify-center">
              <svg class="w-5 h-5 transform -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-gray-800"
                  fill="none"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-teal-400"
                  fill="none"
                  :stroke-dasharray="50"
                  :stroke-dashoffset="50 * (1 - cooldownRemaining / totalCooldown)"
                />
              </svg>
            </div>
            <span>Resend code in <strong class="text-white font-mono">{{ cooldownRemaining }}s</strong></span>
          </div>

          <button
            v-else
            type="button"
            @click="resendOtp"
            :disabled="isResending"
            class="text-teal-400 hover:text-teal-300 font-semibold transition-colors flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Resend Verification Code</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, nextTick } from 'vue';
import { apiClient, detectPlatform, getOrCreateDeviceId } from '../api/client';
import { AuthMethod, VerifyOtpResponse } from '../types';

const props = defineProps<{
  identifier: string;
  type: AuthMethod;
  initialCooldown?: number;
  mockCode?: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'close'): void;
  (e: 'verified', result: VerifyOtpResponse): void;
}>();

const digits = ref<string[]>(['', '', '', '', '', '']);
const inputRefs = ref<(HTMLInputElement | null)[]>([]);
const isVerifying = ref(false);
const isResending = ref(false);
const errorMessage = ref('');
const isShaking = ref(false);

const demoCode = ref(props.mockCode || '');
const totalCooldown = ref(props.initialCooldown || 60);
const cooldownRemaining = ref(props.initialCooldown || 60);
let timerInterval: any = null;

// WebOTP API state & AbortController
const isWebOtpListening = ref(false);
let webOtpAbortController: AbortController | null = null;

const codeString = computed(() => digits.value.join(''));

function setInputRef(el: any, index: number) {
  if (el) {
    inputRefs.value[index] = el;
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (cooldownRemaining.value > 0) {
      cooldownRemaining.value--;
    } else {
      clearInterval(timerInterval);
    }
  }, 1000);
}

/**
 * Native WebOTP API Implementation:
 * Captures SMS codes formatted with the standard WebOTP origin pattern:
 * e.g. "Your verification code is 123456\n\n@yourdomain.com #123456"
 * and auto-submits without manual typing.
 */
async function startWebOtpListener() {
  if (typeof window === 'undefined') return;
  if (!('OTPCredential' in window) || !navigator.credentials) {
    return;
  }

  // Cleanup any active listener
  stopWebOtpListener();

  webOtpAbortController = new AbortController();
  isWebOtpListening.value = true;

  try {
    const content = await (navigator.credentials as any).get({
      otp: { transport: ['sms'] },
      signal: webOtpAbortController.signal,
    });

    if (content && content.code) {
      const code = String(content.code).trim();
      const extractedDigits = code.replace(/[^0-9]/g, '').slice(0, 6);

      if (extractedDigits.length === 6) {
        console.log('[WebOTP] SMS verification code automatically captured:', extractedDigits);
        for (let i = 0; i < 6; i++) {
          digits.value[i] = extractedDigits[i] || '';
        }
        await nextTick();
        submitOtp();
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('[WebOTP] WebOTP notification:', err.message);
    }
  } finally {
    isWebOtpListening.value = false;
  }
}

function stopWebOtpListener() {
  if (webOtpAbortController) {
    try {
      webOtpAbortController.abort();
    } catch {}
    webOtpAbortController = null;
  }
  isWebOtpListening.value = false;
}

function handleInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement;
  const val = target.value.replace(/[^0-9]/g, '');

  // If mobile keyboard autofill or paste inserted multiple digits into this box:
  if (val.length > 1) {
    const chars = val.slice(0, 6).split('');
    for (let i = 0; i < 6; i++) {
      digits.value[i] = chars[i] || '';
    }
    const lastFilled = Math.min(chars.length, 5);
    inputRefs.value[lastFilled]?.focus();
    if (chars.length === 6) {
      submitOtp();
    }
    return;
  }

  digits.value[index] = val ? val[val.length - 1] : '';

  // Focus next box if single digit entered
  if (val && index < 5) {
    nextTick(() => {
      inputRefs.value[index + 1]?.focus();
    });
  }

  // If complete, automatically submit
  if (codeString.value.length === 6) {
    submitOtp();
  }
}

function handleKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      inputRefs.value[index - 1]?.focus();
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    inputRefs.value[index - 1]?.focus();
  } else if (event.key === 'ArrowRight' && index < 5) {
    inputRefs.value[index + 1]?.focus();
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text') || '';
  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);

  if (!cleaned) return;

  for (let i = 0; i < 6; i++) {
    digits.value[i] = cleaned[i] || '';
  }

  const lastFilled = Math.min(cleaned.length, 5);
  inputRefs.value[lastFilled]?.focus();

  if (cleaned.length === 6) {
    submitOtp();
  }
}

function fillDemoCode() {
  if (!demoCode.value) return;
  const clean = demoCode.value.slice(0, 6);
  for (let i = 0; i < 6; i++) {
    digits.value[i] = clean[i] || '';
  }
  submitOtp();
}

async function submitOtp() {
  if (codeString.value.length !== 6 || isVerifying.value) return;

  errorMessage.value = '';
  isVerifying.value = true;
  stopWebOtpListener();

  try {
    const platform = detectPlatform();
    const result = await apiClient.verifyOtp({
      identifier: props.identifier,
      code: codeString.value,
      deviceInfo: {
        deviceId: getOrCreateDeviceId(),
        platform,
        userAgent: navigator.userAgent,
      },
    });

    emit('verified', result);
  } catch (err: any) {
    errorMessage.value = err.message || 'Verification failed. Please check the code.';
    triggerShake();
    // Restart WebOTP listener on failure
    startWebOtpListener();
  } finally {
    isVerifying.value = false;
  }
}

async function resendOtp() {
  if (isResending.value) return;
  errorMessage.value = '';
  isResending.value = true;

  try {
    const res = await apiClient.sendOtp({
      identifier: props.identifier,
      type: props.type,
    });

    if (res.mockCode) {
      demoCode.value = res.mockCode;
    }

    cooldownRemaining.value = res.cooldownSeconds || 60;
    totalCooldown.value = cooldownRemaining.value;
    startTimer();
    startWebOtpListener();
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to resend code.';
  } finally {
    isResending.value = false;
  }
}

function handleBack() {
  stopWebOtpListener();
  emit('back');
}

function handleClose() {
  stopWebOtpListener();
  emit('close');
}

function triggerShake() {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 400);
}

onMounted(() => {
  startTimer();
  startWebOtpListener();
  nextTick(() => {
    inputRefs.value[0]?.focus();
  });
});

onBeforeUnmount(() => {
  stopWebOtpListener();
  clearInterval(timerInterval);
});

onUnmounted(() => {
  stopWebOtpListener();
  clearInterval(timerInterval);
});
</script>
