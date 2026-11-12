<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all">
    <div
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800/80">
        <div>
          <h2 class="text-lg font-bold text-white">Get High-Speed Wi-Fi</h2>
          <p class="text-xs text-gray-400">Verify your credentials to generate your Passpoint profile</p>
        </div>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-5">
        <!-- Auth Method Tabs -->
        <div class="flex bg-gray-950 p-1 rounded-xl border border-gray-800">
          <button
            type="button"
            @click="authType = 'phone'"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            :class="authType === 'phone' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Mobile Phone</span>
          </button>

          <button
            type="button"
            @click="authType = 'email'"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            :class="authType === 'email' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Email Address</span>
          </button>
        </div>

        <!-- Phone Input Group -->
        <div v-if="authType === 'phone'" class="space-y-1.5">
          <label class="text-xs font-medium text-gray-300">Mobile Phone Number</label>
          <div class="flex">
            <DialCodeSelect v-model="dialCode" />
            <input
              v-model="phoneNumber"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              placeholder="300 1234567"
              class="w-full px-4 py-2.5 bg-gray-950 border border-l-0 border-gray-700 rounded-r-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
              @keydown.enter="handleSubmit"
            />
          </div>
          <p class="text-[11px] text-gray-400">We will send a 6-digit confirmation code via SMS</p>
        </div>

        <!-- Email Input Group -->
        <div v-else class="space-y-1.5">
          <label class="text-xs font-medium text-gray-300">Email Address</label>
          <div class="relative">
            <input
              v-model="email"
              type="email"
              inputmode="email"
              placeholder="user@example.com"
              class="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
              @keydown.enter="handleSubmit"
            />
          </div>
          <p class="text-[11px] text-gray-400">We will send a 6-digit pass code to your inbox</p>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2"
        >
          <svg class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Submit Button -->
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isLoading"
          class="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-gray-950 font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm"
        >
          <svg
            v-if="isLoading"
            class="animate-spin w-4 h-4 text-gray-950"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span v-else>Send Verification Code</span>
        </button>

        <p class="text-[11px] text-gray-500 text-center">
          By continuing, you agree to our Acceptable Use Policy and Passpoint roaming terms.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DialCodeSelect from './DialCodeSelect.vue';
import { apiClient } from '../api/client';
import { AuthMethod, SendOtpResponse } from '../types';

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'otpSent',
    data: {
      identifier: string;
      type: AuthMethod;
      response: SendOtpResponse;
    }
  ): void;
}>();

const authType = ref<AuthMethod>('phone');
const dialCode = ref('+92');
const phoneNumber = ref('');
const email = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';

  let fullIdentifier = '';
  if (authType.value === 'phone') {
    const rawNumber = phoneNumber.value.replace(/[^0-9]/g, '');
    if (rawNumber.length < 6) {
      errorMessage.value = 'Please enter a valid phone number.';
      return;
    }
    fullIdentifier = `${dialCode.value}${rawNumber}`;
  } else {
    fullIdentifier = email.value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fullIdentifier)) {
      errorMessage.value = 'Please enter a valid email address.';
      return;
    }
  }

  isLoading.value = true;
  try {
    const response = await apiClient.sendOtp({
      identifier: fullIdentifier,
      type: authType.value,
    });

    if (response && response.success) {
      emit('otpSent', {
        identifier: fullIdentifier,
        type: authType.value,
        response,
      });
    } else {
      errorMessage.value = response?.message || 'Failed to dispatch verification code.';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to dispatch verification code.';
  } finally {
    isLoading.value = false;
  }
}
</script>

