<template>
  <div class="min-h-screen bg-gray-950 text-white font-sans">
    <!-- 1. Hero / Attraction View -->
    <HeroScreen
      v-if="currentStep === 'hero' || currentStep === 'auth'"
      @openAuth="showAuthModal = true"
      @openScanner="showScannerModal = true"
    />

    <!-- 2. Authentication Modal -->
    <AuthModal
      v-if="showAuthModal"
      @close="showAuthModal = false"
      @otpSent="handleOtpSent"
    />

    <!-- 3. QR Code Scanner Modal -->
    <QrScannerModal
      v-if="showScannerModal"
      @close="showScannerModal = false"
      @scan="handleQrScanned"
    />

    <!-- 4. OTP Verification Screen -->
    <OtpVerification
      v-if="currentStep === 'otp'"
      :identifier="authIdentifier"
      :type="authType"
      :initialCooldown="otpCooldown"
      :mockCode="mockOtpCode"
      @back="currentStep = 'hero'; showAuthModal = true"
      @close="currentStep = 'hero'"
      @verified="handleVerified"
    />

    <!-- 5. Connection Success Screen -->
    <ConnectionSuccess
      v-if="currentStep === 'success'"
      :subscriber="subscriber"
      :downloadToken="downloadToken"
      :alreadyProvisioned="isAlreadyProvisioned"
      @reset="handleReset"
    />

    <!-- 6. Floating Deepin 10-Experiment Test Runner Drawer -->
    <ExperimentDrawer />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HeroScreen from './components/HeroScreen.vue';
import AuthModal from './components/AuthModal.vue';
import QrScannerModal from './components/QrScannerModal.vue';
import OtpVerification from './components/OtpVerification.vue';
import ConnectionSuccess from './components/ConnectionSuccess.vue';
import ExperimentDrawer from './components/ExperimentDrawer.vue';
import { AuthMethod, SendOtpResponse, VerifyOtpResponse, SubscriberData } from './types';
import { apiClient } from './api/client';

type Step = 'hero' | 'auth' | 'otp' | 'success';

const currentStep = ref<Step>('hero');
const showAuthModal = ref(false);
const showScannerModal = ref(false);

const authIdentifier = ref('');
const authType = ref<AuthMethod>('phone');
const otpCooldown = ref(60);
const mockOtpCode = ref('');

const subscriber = ref<SubscriberData | undefined>(undefined);
const downloadToken = ref<string | undefined>(undefined);
const isAlreadyProvisioned = ref(false);

function handleOtpSent(data: {
  identifier: string;
  type: AuthMethod;
  response: SendOtpResponse;
}) {
  authIdentifier.value = data.identifier;
  authType.value = data.type;
  otpCooldown.value = data.response.cooldownSeconds || 60;
  mockOtpCode.value = data.response.mockCode || '';

  showAuthModal.value = false;
  currentStep.value = 'otp';
}

async function handleQrScanned(scannedValue: string) {
  showScannerModal.value = false;
  // If QR contains phone or email, automatically dispatch OTP
  const isEmail = scannedValue.includes('@');
  const type: AuthMethod = isEmail ? 'email' : 'phone';

  try {
    const res = await apiClient.sendOtp({
      identifier: scannedValue,
      type,
    });
    handleOtpSent({
      identifier: scannedValue,
      type,
      response: res,
    });
  } catch (err: any) {
    // If not direct phone/email, prompt user in modal
    authIdentifier.value = scannedValue;
    showAuthModal.value = true;
  }
}

function handleVerified(result: VerifyOtpResponse) {
  subscriber.value = result.subscriber;
  downloadToken.value = result.downloadToken;
  isAlreadyProvisioned.value = !!(result.alreadyProvisioned || result.isExisting);
  currentStep.value = 'success';
}

function handleReset() {
  currentStep.value = 'hero';
  showAuthModal.value = false;
  showScannerModal.value = false;
  authIdentifier.value = '';
  mockOtpCode.value = '';
  subscriber.value = undefined;
  downloadToken.value = undefined;
  isAlreadyProvisioned.value = false;
}
</script>

