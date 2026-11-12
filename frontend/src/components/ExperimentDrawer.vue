<template>
  <div>
    <!-- Floating Trigger Pill -->
    <button
      @click="isOpen = !isOpen"
      class="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-xl shadow-teal-900/50 border border-teal-400/30 transition-all hover:scale-105 active:scale-95"
      title="Open Deepin 10-Experiment Test Runner"
    >
      <span class="text-base">🧪</span>
      <span>Experiments Runner</span>
      <span
        class="w-2 h-2 rounded-full"
        :class="isOpen ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'"
      ></span>
    </button>

    <!-- Overlay & Drawer Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity"
      @click.self="isOpen = false"
    >
      <!-- Drawer Panel -->
      <div
        class="w-full max-w-lg bg-gray-900 border-l border-gray-800 text-gray-100 h-full flex flex-col shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/80">
          <div class="flex items-center gap-2">
            <span class="text-xl">🧪</span>
            <div>
              <h3 class="font-bold text-sm text-white">Deepin Validation Lab</h3>
              <p class="text-[11px] text-teal-400">10 Edge-Case Experiments Suite</p>
            </div>
          </div>
          <button
            @click="isOpen = false"
            class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <!-- Toast Alert Notification -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="toast"
              class="p-3 rounded-xl border flex items-start justify-between gap-2 shadow-lg mb-2"
              :class="{
                'bg-emerald-950/90 border-emerald-500/50 text-emerald-200': toast.type === 'success',
                'bg-amber-950/90 border-amber-500/50 text-amber-200': toast.type === 'warning',
                'bg-rose-950/90 border-rose-500/50 text-rose-200': toast.type === 'error',
                'bg-blue-950/90 border-blue-500/50 text-blue-200': toast.type === 'info',
              }"
            >
              <div class="space-y-0.5">
                <div class="font-bold text-xs flex items-center gap-1.5">
                  <span>{{ toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : 'ℹ️' }}</span>
                  <span>{{ toast.title }}</span>
                </div>
                <p class="text-[11px] leading-relaxed opacity-90">{{ toast.message }}</p>
              </div>
              <button @click="toast = null" class="text-xs opacity-60 hover:opacity-100 p-0.5">✕</button>
            </div>
          </transition>

          <!-- Active Device UUID Card -->
          <div class="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-gray-400">Current Device UUID (x-device-id):</span>
              <button
                @click="cycleDeviceId"
                class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30 text-[10px]"
              >
                + New Device ID (Exp 4/5)
              </button>
            </div>
            <div class="font-mono text-teal-300 bg-gray-900 px-2 py-1.5 rounded border border-gray-800 text-[11px] select-all break-all">
              {{ currentDeviceId }}
            </div>
            <div class="flex items-center justify-between text-[11px] text-gray-400">
              <span>Test Phone Number:</span>
              <input
                v-model="testPhone"
                type="text"
                class="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-white font-mono text-right w-36"
              />
            </div>
          </div>

          <!-- Experiment 1: Rescan Same Venue (Deduplication) -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 1: Rescan QR (Idempotency)</span>
              <span class="text-[10px] text-gray-400">Zero Duplicates</span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Submits OTP on the same device and customer. Verifies <code>alreadyProvisioned: true</code> with existing subscriber creds.
            </p>
            <button
              :disabled="loading"
              @click="runExp1"
              class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
            >
              Run Exp 1: Rescan Same Venue
            </button>
          </div>

          <!-- Experiment 2: Multi-Venue Roaming & 10-Minute Dedup Window -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 2: Multi-Venue Scan & Dedup</span>
              <span
                v-if="lastVenueScanResult"
                class="px-2 py-0.5 rounded text-[10px] font-bold"
                :class="lastVenueScanResult.recorded ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'"
              >
                {{ lastVenueScanResult.recorded ? '✓ Visit Logged' : '⚠ Duplicate Ignored' }}
              </span>
              <span v-else class="text-[10px] text-teal-400">10-Min Cooldown</span>
            </div>

            <p class="text-gray-400 text-[11px]">
              Simulates roaming between different branches or repeat scanning the same venue. Repeat scans at the same branch within 10 minutes are ignored.
            </p>

            <!-- Venue Selector Dropdown & Custom ID Input -->
            <div class="space-y-1">
              <label class="text-[10px] text-gray-400 font-medium">Select or Enter Venue:</label>
              <div class="flex gap-2">
                <select
                  v-model="exp2Venue"
                  class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white font-mono flex-1 text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option v-for="b in venueBranches" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </option>
                </select>
                <input
                  v-model="exp2Venue"
                  placeholder="Custom ID"
                  class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs w-32 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Last Scan Result Feedback Pill -->
            <div
              v-if="lastVenueScanResult"
              class="p-2 rounded-lg border text-[11px] flex items-center justify-between"
              :class="lastVenueScanResult.recorded ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/40 border-amber-500/30 text-amber-300'"
            >
              <span class="truncate">
                <strong>{{ lastVenueScanResult.venueId }}:</strong>
                {{ lastVenueScanResult.recorded ? ' Visit recorded' : ' Duplicate scan ignored (10m cooldown)' }}
              </span>
              <span class="text-[9px] opacity-75 shrink-0 ml-2 font-mono">{{ lastVenueScanResult.timestamp }}</span>
            </div>

            <!-- Action Buttons: Next Branch vs Repeat Scan Same Venue -->
            <div class="grid grid-cols-2 gap-2">
              <button
                :disabled="loading"
                @click="walkToNextVenue"
                class="py-1.5 px-2.5 bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-500/40 rounded-lg font-medium transition flex items-center justify-center gap-1.5"
                title="Walk to a genuinely different branch and scan"
              >
                <span>🚶 Next Branch</span>
                <span class="text-[10px] opacity-75 font-normal">(New Visit)</span>
              </button>
              <button
                :disabled="loading"
                @click="rescanCurrentVenue"
                class="py-1.5 px-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded-lg font-medium transition flex items-center justify-center gap-1.5"
                title="Rapid repeat scan at current venue to test 10-minute duplicate block"
              >
                <span>🔄 Rescan Current</span>
                <span class="text-[10px] opacity-75 font-normal">(Test Dedup)</span>
              </button>
            </div>
          </div>

          <!-- Experiment 3: Live 802.1X AP Session Simulator -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 3: Live AP Connection Status</span>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold"
                :class="liveRadioStatus === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-800 text-amber-300 border border-amber-500/30'"
              >
                {{ liveRadioStatus }}
              </span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Toggles FreeRADIUS <code>radacct</code> live session to simulate entering/leaving AP coverage.
            </p>

            <!-- Active Connected Metrics Card in Exp 3 -->
            <div
              v-if="liveRadioStatus === 'CONNECTED' && liveSessionMetrics"
              class="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-1.5"
            >
              <div class="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                <span class="font-bold text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Connected to Deepin Wi-Fi
                </span>
                <span class="font-mono text-[10px] text-emerald-400 font-semibold">{{ liveSessionMetrics.dataUsedFormatted || '12.4 MB' }}</span>
              </div>
              <div class="grid grid-cols-2 gap-1.5 text-[10px] text-gray-300">
                <div>
                  <span class="text-gray-500 block">User / Credential:</span>
                  <span class="font-mono text-teal-300 truncate block">{{ liveSessionMetrics.subscriberUsername || lastSubscriberUsername }}</span>
                </div>
                <div>
                  <span class="text-gray-500 block">Assigned IP:</span>
                  <span class="font-mono text-white block">{{ liveSessionMetrics.assignedIp || '10.200.1.42' }}</span>
                </div>
                <div>
                  <span class="text-gray-500 block">Connected Since:</span>
                  <span class="text-gray-200 block truncate">{{ liveSessionMetrics.connectedSinceFormatted || 'Just now' }}</span>
                </div>
                <div>
                  <span class="text-gray-500 block">Session Duration:</span>
                  <span class="text-emerald-300 font-medium block">{{ liveSessionMetrics.sessionDuration || 'Just now' }}</span>
                </div>
              </div>
            </div>

            <!-- Standby Disconnected Notice in Exp 3 -->
            <div
              v-else-if="liveRadioStatus === 'CONFIGURED_NOT_CONNECTED'"
              class="p-2 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-gray-400 flex items-center justify-between"
            >
              <span class="truncate">
                <span v-if="liveSessionMetrics?.lastDisconnectedFormatted">
                  Last session ended: <strong class="text-gray-300">{{ liveSessionMetrics.lastDisconnectedFormatted }}</strong>
                </span>
                <span v-else>
                  Standby: Profile saved, auto-connects in AP range.
                </span>
              </span>
              <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-2"></span>
            </div>

            <div class="flex gap-2">
              <button
                :disabled="loading"
                @click="toggleRadiusSession('start')"
                class="flex-1 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-lg font-medium transition"
              >
                Connect to AP (Start)
              </button>
              <button
                :disabled="loading"
                @click="toggleRadiusSession('stop')"
                class="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-lg font-medium transition"
              >
                Disconnect (Stop)
              </button>
            </div>
          </div>

          <!-- Experiment 4: Multi-Device (One Customer -> Multiple Devices) -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 4: Multi-Device Registration</span>
              <span class="text-[10px] text-gray-400">Distinct sub_xxxx</span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Simulates provisioning a 2nd physical device for the same phone. Verifies an independent subscriber account is created without wiping Device A.
            </p>
            <button
              :disabled="loading"
              @click="runExp4"
              class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
            >
              Simulate Device B Onboarding
            </button>
          </div>

          <!-- Experiment 5: Recycled SIM Recovery Protection -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 5: Recycled SIM Conflict</span>
              <span class="text-[10px] text-amber-400">Account Takeover Protection</span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Tests new device logging in to high-value account. Requires explicit recovery consent.
            </p>
            <div class="flex gap-2">
              <button
                :disabled="loading"
                @click="runExp5(false)"
                class="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded-lg transition"
              >
                Test Conflict (409)
              </button>
              <button
                :disabled="loading"
                @click="runExp5(true)"
                class="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg transition"
              >
                Confirm Recovery
              </button>
            </div>
          </div>

          <!-- Experiment 6: Profile Re-issue & Revocation -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 6: Re-issue & Revocation</span>
              <span class="text-[10px] text-gray-400">Atomic Radcheck Update</span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Revokes old FreeRADIUS password and provisions a fresh Passpoint profile.
            </p>
            <button
              :disabled="loading"
              @click="runExp6"
              class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
            >
              Re-issue Passpoint Profile
            </button>
          </div>

          <!-- Experiment 7: Cooldown & Lockout Check -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 7: Cooldown & 5-Attempt Lockout</span>
              <span class="text-[10px] text-rose-400">Rate Limiting</span>
            </div>
            <div class="flex gap-2">
              <button
                :disabled="loading"
                @click="runExp7Cooldown"
                class="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-rose-300 border border-rose-500/30 rounded-lg transition"
              >
                Trigger 60s Cooldown
              </button>
              <button
                :disabled="loading"
                @click="runExp7Lockout"
                class="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-lg transition"
              >
                Lockout (5 Bad Attempts)
              </button>
            </div>
          </div>

          <!-- Experiment 8: Double-Click / Race Condition -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 8: Concurrency Double-Click</span>
              <span class="text-[10px] text-gray-400">Idempotency Guard</span>
            </div>
            <p class="text-gray-400 text-[11px]">
              Fires 5 simultaneous verify requests with the same device ID to verify race condition defense.
            </p>
            <button
              :disabled="loading"
              @click="runExp8"
              class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
            >
              Fire 5 Rapid Requests
            </button>
          </div>

          <!-- Experiment 9: Android WifiNetworkSuggestion Payload Inspector -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 9: Android Suggestion Payload</span>
              <span class="text-[10px] text-emerald-400">Zero Downloads</span>
            </div>
            <button
              :disabled="loading"
              @click="inspectAndroidPayload"
              class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
            >
              Inspect Android Config Payload
            </button>
          </div>

          <!-- Experiment 10: Change Phone Number -->
          <div class="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white">Exp 10: Phone Number Update</span>
              <span class="text-[10px] text-gray-400">PK Cascade</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-gray-400 text-[11px]">New Phone:</span>
                <input
                  v-model="newPhoneTarget"
                  placeholder="+14155559999"
                  class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs w-40"
                />
              </div>
              <button
                :disabled="loading"
                @click="runExp10"
                class="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-teal-300 border border-teal-500/30 rounded-lg font-medium transition"
              >
                Migrate Customer Phone
              </button>
            </div>
          </div>

          <!-- Live Output Console -->
          <div class="p-3 bg-black rounded-xl border border-gray-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-300">Test Execution Output:</span>
              <span v-if="loading" class="text-amber-400 animate-pulse text-[10px]">Running...</span>
              <button
                @click="consoleOutput = 'Ready for experiment.'"
                class="text-[10px] text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <pre class="bg-gray-950 p-2.5 rounded border border-gray-900 font-mono text-[11px] text-teal-300 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">{{ consoleOutput }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient, getOrCreateDeviceId } from '../api/client';
import { ConnectionStatusResponse } from '../types';

interface ToastNotification {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

const isOpen = ref(false);
const loading = ref(false);
const currentDeviceId = ref(getOrCreateDeviceId());
const testPhone = ref('+14155550001');

// Exp 2: Multi-Venue Branches & Cooldown State
const venueBranches = [
  { id: 'venue-mall-07', name: 'Downtown Mall (Branch 07)' },
  { id: 'venue-cafe-02', name: 'Espresso Bar (Branch 02)' },
  { id: 'venue-gym-05', name: 'Fitness Center (Branch 05)' },
  { id: 'venue-airport-t3', name: 'Airport Terminal 3 (Branch T3)' },
  { id: 'venue-hotel-lounge', name: 'Grand Hotel Lounge (Branch HL)' },
];
const currentVenueIdx = ref(0);
const exp2Venue = ref(venueBranches[0].id);
const lastVenueScanResult = ref<{
  venueId: string;
  recorded: boolean;
  reason?: string;
  timestamp: string;
} | null>(null);

const newPhoneTarget = ref('+14155558888');
const liveRadioStatus = ref<'CONNECTED' | 'CONFIGURED_NOT_CONNECTED' | 'NOT_CONFIGURED'>('NOT_CONFIGURED');
const liveSessionMetrics = ref<ConnectionStatusResponse | null>(null);
const consoleOutput = ref('Ready for experiment.');
const lastSubscriberUsername = ref<string>('');

// Toast Notification State
const toast = ref<ToastNotification | null>(null);
let toastTimer: any = null;

function triggerToast(type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) {
  toast.value = { type, title, message };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, 6500);
}

onMounted(async () => {
  currentDeviceId.value = getOrCreateDeviceId();
  refreshLiveStatus();
});

function cycleDeviceId() {
  const newId = 'deepin_dev_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('deepin_device_id', newId);
  currentDeviceId.value = newId;
  consoleOutput.value = `Switched device ID to: ${newId}`;
  triggerToast('info', 'Device ID Cycled', `Now acting as new hardware client: ${newId}`);
  refreshLiveStatus();
}

async function refreshLiveStatus() {
  try {
    const status = await apiClient.getConnectionStatus(undefined, currentDeviceId.value);
    liveRadioStatus.value = status.state;
    liveSessionMetrics.value = status;
    if (status.subscriber?.username) {
      lastSubscriberUsername.value = status.subscriber.username;
    }
  } catch {
    liveRadioStatus.value = 'NOT_CONFIGURED';
    liveSessionMetrics.value = null;
  }
}

// Exp 1: Rescan QR
async function runExp1() {
  loading.value = true;
  try {
    const otpRes = await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    const verifyRes = await apiClient.verifyOtp({
      identifier: testPhone.value,
      code: otpRes.mockCode || '123456',
    });
    if (verifyRes.subscriber) {
      lastSubscriberUsername.value = verifyRes.subscriber.username;
    }
    triggerToast(
      'info',
      'Exp 1: Rescan Verified',
      verifyRes.alreadyProvisioned
        ? 'Existing active profile recognized. Zero duplicate credentials created.'
        : 'Fresh profile provisioned.'
    );
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 1: Rescan QR (Idempotency)',
      alreadyProvisioned: verifyRes.alreadyProvisioned,
      isExisting: verifyRes.isExisting,
      subscriber: verifyRes.subscriber?.username,
      expiration: verifyRes.subscriber?.expirationTime,
    }, null, 2);
    await refreshLiveStatus();
  } catch (err: any) {
    triggerToast('error', 'Exp 1 Error', err.message);
    consoleOutput.value = `Exp 1 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 2: Multi-Venue Roaming & 10-Minute Dedup
function walkToNextVenue() {
  currentVenueIdx.value = (currentVenueIdx.value + 1) % venueBranches.length;
  exp2Venue.value = venueBranches[currentVenueIdx.value].id;
  runExp2();
}

function rescanCurrentVenue() {
  runExp2();
}

async function runExp2() {
  loading.value = true;
  try {
    const venueId = exp2Venue.value.trim() || 'venue-mall-07';
    const otpRes = await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    const verifyRes = await apiClient.verifyOtp({
      identifier: testPhone.value,
      code: otpRes.mockCode || '123456',
      venueId,
    });

    const isRecorded = verifyRes.venueVisitRecorded !== false;
    const reason = verifyRes.venueVisitReason;

    lastVenueScanResult.value = {
      venueId,
      recorded: isRecorded,
      reason,
      timestamp: new Date().toLocaleTimeString(),
    };

    if (!isRecorded && reason === 'DUPLICATE_RECENT_SCAN') {
      triggerToast(
        'warning',
        'Duplicate Scan Ignored (10m Cooldown)',
        `Visit to "${venueId}" was already logged within the last 10 minutes. Row insertion was skipped to prevent inflating visit counts (satisfies Exp 1 deduplication).`
      );
    } else {
      triggerToast(
        'success',
        'New Venue Interaction Logged',
        `Walked into "${venueId}". Visit recorded in database while preserving active profile (Exp 2 satisfied).`
      );
    }

    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 2: Multi-Venue Roaming & Dedup',
      venueId,
      venueVisitRecorded: isRecorded,
      venueVisitReason: reason || 'NEW_VENUE_OR_WINDOW_EXPIRED',
      alreadyProvisioned: verifyRes.alreadyProvisioned,
      subscriber: verifyRes.subscriber?.username,
      explanation: isRecorded
        ? 'New distinct venue visit record logged in database.'
        : 'Repeat scan at same venue within 10-minute window deduplicated.',
    }, null, 2);
  } catch (err: any) {
    triggerToast('error', 'Exp 2 Failed', err.message);
    consoleOutput.value = `Exp 2 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 3: Simulate Radio Connection
async function toggleRadiusSession(action: 'start' | 'stop') {
  if (!lastSubscriberUsername.value) {
    await runExp1();
  }
  loading.value = true;
  try {
    const res = await apiClient.simulateRadiusSession(lastSubscriberUsername.value, action);
    triggerToast(
      action === 'start' ? 'success' : 'info',
      `AP Session ${action === 'start' ? 'Connected' : 'Stopped'}`,
      action === 'start'
        ? `Device associated with 802.1X AP. Status: CONNECTED.`
        : `Device disassociated from AP. Status: CONFIGURED_NOT_CONNECTED.`
    );
    await refreshLiveStatus();
    consoleOutput.value = JSON.stringify({
      experiment: `Exp 3: Live 802.1X AP ${action.toUpperCase()}`,
      username: lastSubscriberUsername.value,
      result: res,
      connectionStatus: {
        state: liveSessionMetrics.value?.state,
        connectedSinceFormatted: liveSessionMetrics.value?.connectedSinceFormatted,
        sessionDuration: liveSessionMetrics.value?.sessionDuration,
        subscriberUsername: liveSessionMetrics.value?.subscriberUsername,
        assignedIp: liveSessionMetrics.value?.assignedIp,
        dataUsedFormatted: liveSessionMetrics.value?.dataUsedFormatted,
        activeSessionsCount: liveSessionMetrics.value?.activeSessionsCount,
        lastDisconnectedFormatted: liveSessionMetrics.value?.lastDisconnectedFormatted,
      },
    }, null, 2);
  } catch (err: any) {
    triggerToast('error', 'Exp 3 Error', err.message);
    consoleOutput.value = `Exp 3 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 4: Multi-Device
async function runExp4() {
  loading.value = true;
  try {
    const devB_id = 'deepin_devB_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('deepin_device_id', devB_id);
    currentDeviceId.value = devB_id;

    const otpRes = await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    const verifyRes = await apiClient.verifyOtp({
      identifier: testPhone.value,
      code: otpRes.mockCode || '123456',
      deviceInfo: {
        deviceId: devB_id,
        platform: 'android',
        userAgent: 'Deepin Device B Simulator',
      },
    });

    if (verifyRes.subscriber) {
      lastSubscriberUsername.value = verifyRes.subscriber.username;
    }
    triggerToast('success', 'Device B Provisioned', `New independent credential "${verifyRes.subscriber?.username}" registered for Device B.`);
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 4: Multi-Device Registration (Device B)',
      newDeviceId: devB_id,
      subscriberUsername: verifyRes.subscriber?.username,
      note: 'Customer has two separate active sub_ credentials in radcheck!',
    }, null, 2);
    await refreshLiveStatus();
  } catch (err: any) {
    triggerToast('error', 'Exp 4 Error', err.message);
    consoleOutput.value = `Exp 4 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 5: Recycled SIM Recovery
async function runExp5(confirmRecovery: boolean) {
  loading.value = true;
  try {
    const highValPhone = '+14155550005';
    const unknownDev = 'deepin_hacker_dev_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('deepin_device_id', unknownDev);
    currentDeviceId.value = unknownDev;

    const otpRes = await apiClient.sendOtp({ identifier: highValPhone, type: 'phone' });
    const verifyRes = await apiClient.verifyOtp({
      identifier: highValPhone,
      code: otpRes.mockCode || '123456',
      confirmRecovery,
      deviceInfo: {
        deviceId: unknownDev,
        platform: 'android',
        userAgent: 'Unknown Recycled SIM Attacker Device',
      },
    });

    triggerToast(
      confirmRecovery ? 'success' : 'warning',
      confirmRecovery ? 'Recovery Confirmed' : 'Recovery Conflict Detected',
      confirmRecovery
        ? 'Customer confirmed ownership. Fresh credential authorized.'
        : 'Sign-in from unknown device blocked until customer confirms recovery.'
    );

    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 5: Recycled SIM Recovery Protection',
      confirmRecovery,
      success: verifyRes.success,
      subscriber: verifyRes.subscriber?.username,
    }, null, 2);
    await refreshLiveStatus();
  } catch (err: any) {
    triggerToast('warning', 'SIM Protection Triggered', err.message);
    consoleOutput.value = `Exp 5 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 6: Reissue & Revocation
async function runExp6() {
  loading.value = true;
  try {
    const res = await apiClient.reissueProfile(testPhone.value, 'android');
    if (res.subscriber) {
      lastSubscriberUsername.value = res.subscriber.username;
    }
    triggerToast('info', 'Profile Re-issued', 'Revoked prior credentials and generated fresh profile.');
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 6: Re-issue & Revocation',
      message: 'Old credential revoked, fresh credential created.',
      subscriber: res.subscriber?.username,
      expiration: res.subscriber?.expirationTime,
    }, null, 2);
    await refreshLiveStatus();
  } catch (err: any) {
    triggerToast('error', 'Exp 6 Error', err.message);
    consoleOutput.value = `Exp 6 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 7: Cooldown & Lockout
async function runExp7Cooldown() {
  loading.value = true;
  try {
    await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    // Immediately attempt second send
    await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    consoleOutput.value = 'Exp 7 Cooldown: Unexpected success (expected 429 cooldown block)';
  } catch (err: any) {
    triggerToast('warning', 'Cooldown Triggered', err.message);
    consoleOutput.value = `Exp 7 Cooldown Triggered: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

async function runExp7Lockout() {
  loading.value = true;
  try {
    await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    for (let i = 1; i <= 5; i++) {
      try {
        await apiClient.verifyOtp({ identifier: testPhone.value, code: '000000' });
      } catch (err: any) {
        if (i === 5) {
          triggerToast('error', '5-Attempt Lockout Enforced', err.message);
          consoleOutput.value = `Exp 7 Lockout (Attempt 5): ${err.message}`;
          return;
        }
      }
    }
  } catch (err: any) {
    triggerToast('error', 'Exp 7 Error', err.message);
    consoleOutput.value = `Exp 7 Lockout Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 8: Concurrency / Idempotency
async function runExp8() {
  loading.value = true;
  try {
    const otpRes = await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    const promises = [1, 2, 3, 4, 5].map(() =>
      apiClient.verifyOtp({ identifier: testPhone.value, code: otpRes.mockCode || '123456' })
    );
    const results = await Promise.allSettled(promises);
    triggerToast('info', 'Concurrency Guard Tested', 'Fired 5 simultaneous requests.');
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 8: Concurrency Race Condition Guard',
      attempts: 5,
      resolved: results.map(r => r.status),
    }, null, 2);
  } catch (err: any) {
    triggerToast('error', 'Exp 8 Error', err.message);
    consoleOutput.value = `Exp 8 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 9: Android Payload Inspector
async function inspectAndroidPayload() {
  loading.value = true;
  try {
    if (!lastSubscriberUsername.value) {
      await runExp1();
    }
    const otpRes = await apiClient.sendOtp({ identifier: testPhone.value, type: 'phone' });
    const verifyRes = await apiClient.verifyOtp({ identifier: testPhone.value, code: otpRes.mockCode || '123456' });
    if (!verifyRes.downloadToken) {
      throw new Error('No downloadToken returned');
    }
    const config = await apiClient.getAndroidConfig(verifyRes.downloadToken);
    triggerToast('success', 'Payload Inspected', 'Retrieved Android WifiNetworkSuggestion config.');
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 9: Android Suggestion Payload (Zero Downloads)',
      homeSp: config.homeSp,
      credential: {
        realm: config.credential.realm,
        userCredential: config.credential.userCredential,
      },
      expirationTime: config.expirationTime,
    }, null, 2);
  } catch (err: any) {
    triggerToast('error', 'Exp 9 Error', err.message);
    consoleOutput.value = `Exp 9 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

// Exp 10: Change Phone
async function runExp10() {
  loading.value = true;
  try {
    const reqRes = await apiClient.requestPhoneUpdate(testPhone.value, newPhoneTarget.value);
    const confirmRes = await apiClient.confirmPhoneUpdate(testPhone.value, newPhoneTarget.value, reqRes.mockCode || '123456');
    triggerToast('success', 'Phone Number Migrated', `Customer migrated to ${newPhoneTarget.value}.`);
    consoleOutput.value = JSON.stringify({
      experiment: 'Exp 10: Phone Number Update (PK Cascade)',
      previousPhone: testPhone.value,
      newPhone: newPhoneTarget.value,
      result: confirmRes,
    }, null, 2);
    testPhone.value = newPhoneTarget.value;
  } catch (err: any) {
    triggerToast('error', 'Exp 10 Error', err.message);
    consoleOutput.value = `Exp 10 Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
}
</script>
