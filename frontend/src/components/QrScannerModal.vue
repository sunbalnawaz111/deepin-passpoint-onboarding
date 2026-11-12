<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div
      class="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h3 class="text-base font-semibold text-white">Scan Venue Passpoint QR</h3>
        </div>
        <button
          @click="closeScanner"
          class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Close Scanner"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Insecure Context Banner (HTTP / Non-localhost warning) -->
      <div
        v-if="isInsecureContext"
        class="bg-amber-950/60 border-b border-amber-800/80 p-3.5 text-xs text-amber-200 flex items-start gap-2.5"
      >
        <svg class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="space-y-1">
          <p class="font-semibold text-amber-300">Insecure Context Detected (HTTP)</p>
          <p class="text-[11px] text-amber-200/90 leading-relaxed">
            Browsers block camera access (<code class="font-mono text-amber-300">navigator.mediaDevices</code>) over unencrypted HTTP.
            To use live scanning, access this service via <strong>HTTPS</strong> or <strong>localhost</strong>.
          </p>
          <p class="text-[10px] text-amber-400/80 font-mono pt-0.5">
            Current Origin: {{ currentOrigin }}
          </p>
        </div>
      </div>

      <!-- Scanner Viewport Area -->
      <div class="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
        <!-- Live Video Element -->
        <video
          ref="videoRef"
          class="w-full h-72 object-cover"
          playsinline
          muted
        ></video>

        <!-- Viewfinder Reticle (Visible only when camera stream is active without errors) -->
        <div
          v-if="!cameraError && isStreaming"
          class="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <div class="w-56 h-56 border-2 border-teal-500/70 rounded-2xl relative shadow-[0_0_50px_rgba(20,184,166,0.3)]">
            <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg"></div>
            <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg"></div>
            <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg"></div>
            <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg"></div>

            <!-- Animated Laser Scan Line -->
            <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2"></div>
          </div>
        </div>

        <!-- Camera Status / Fallback Overlay -->
        <div
          v-if="cameraError || !isStreaming"
          class="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center p-6 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          
          <h4 class="text-sm font-semibold text-gray-200 mb-1">
            {{ isInsecureContext ? 'Camera Requires HTTPS' : 'Camera Stream Inactive' }}
          </h4>
          <p class="text-xs text-gray-400 mb-5 max-w-xs leading-relaxed">
            {{ cameraError || 'Scanning is ready via simulated venue QR code.' }}
          </p>

          <!-- Primary Fallback Action Button -->
          <button
            type="button"
            @click="simulateScan"
            class="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            <span>Simulate Venue QR Scan</span>
            <svg class="w-3.5 h-3.5 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs">
        <span class="text-gray-400">Position venue QR in viewfinder or use test scan</span>
        <button
          type="button"
          @click="simulateScan"
          class="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 transition-colors"
        >
          Test Sample QR
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { BrowserQRCodeReader } from '@zxing/browser';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'scan', result: string): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const cameraError = ref<string | null>(null);
const isStreaming = ref(false);
const isInsecureContext = ref(false);
const currentOrigin = ref(typeof window !== 'undefined' ? window.location.origin : '');

let codeReader: BrowserQRCodeReader | null = null;
let controls: any = null;

async function startScanner() {
  cameraError.value = null;
  isStreaming.value = false;

  // 1. Check for Secure Context (HTTPS or localhost)
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  if (!isSecure) {
    isInsecureContext.value = true;
    cameraError.value =
      'Camera access is disabled by browser security policies because this page is served over unencrypted HTTP. Use HTTPS or localhost, or use the simulated test scan below.';
    return;
  }

  // 2. Check for mediaDevices and getUserMedia capability
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function'
  ) {
    cameraError.value =
      'MediaDevices API (getUserMedia) is unavailable in this browser environment. Please use the simulated scan fallback.';
    return;
  }

  // 3. Initialize ZXing Reader safely
  try {
    codeReader = new BrowserQRCodeReader();
    if (videoRef.value) {
      controls = await codeReader.decodeFromVideoDevice(
        undefined, // default camera
        videoRef.value,
        (result, _err) => {
          if (result) {
            const text = result.getText();
            stopScanner();
            emit('scan', text);
          }
        }
      );
      isStreaming.value = true;
    }
  } catch (err: any) {
    isStreaming.value = false;
    const msg = err?.message || String(err);
    if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
      cameraError.value = 'Camera permission was denied. Please grant camera permissions or use the test QR.';
    } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
      cameraError.value = 'No physical video camera was detected on this device.';
    } else {
      cameraError.value = msg || 'Unable to access video camera. Please use manual input or test button.';
    }
  }
}

/**
 * Safely stops all camera streams, active tracks, and ZXing reader controls.
 */
function stopScanner() {
  // Stop ZXing controls loop
  if (controls) {
    try {
      controls.stop();
    } catch {
      // ignore
    }
    controls = null;
  }

  // Explicitly release hardware camera tracks on the video element
  if (videoRef.value && videoRef.value.srcObject) {
    try {
      const stream = videoRef.value.srcObject as MediaStream;
      if (typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    } catch {
      // ignore
    }
    videoRef.value.srcObject = null;
  }

  isStreaming.value = false;
}

function closeScanner() {
  stopScanner();
  emit('close');
}

function simulateScan() {
  stopScanner();
  // Simulate scanning a venue fast-link QR containing a pre-configured identifier
  emit('scan', '+14155552671');
}

onMounted(() => {
  startScanner();
});

onUnmounted(() => {
  stopScanner();
});
</script>
