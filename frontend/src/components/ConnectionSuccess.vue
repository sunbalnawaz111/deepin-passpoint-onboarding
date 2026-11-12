<template>
  <div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white selection:bg-teal-500">
    <!-- Header -->
    <header class="w-full border-b border-gray-800/80 bg-gray-950/70 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <svg class="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-bold text-white">Passpoint Authenticated</h1>
            <p class="text-[11px] text-teal-400">Hotspot 2.0 (Release 2) Active</p>
          </div>
        </div>

        <button
          @click="emit('reset')"
          class="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 transition-colors"
        >
          Disconnect / Reset
        </button>
      </div>
    </header>

    <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      <!-- Success Celebration Card -->
      <div class="p-6 bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-teal-950/40 border border-teal-500/30 rounded-2xl relative overflow-hidden">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1.5">
                <!-- Profile Status Badge -->
                <div
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="alreadyProvisioned ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="alreadyProvisioned ? 'bg-blue-400' : 'bg-teal-400 animate-pulse'"></span>
                  <span>{{ alreadyProvisioned ? 'Already Configured' : 'Verification Succeeded' }}</span>
                </div>

                <!-- Live RADIUS Accounting Radio Link Status Badge -->
                <div
                  v-if="connectionState === 'CONNECTED'"
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-semibold"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Connected to Deepin Wi-Fi</span>
                </div>
                <div
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-medium"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>{{ lastDisconnectedFormatted ? `Last session ended: ${lastDisconnectedFormatted}` : 'Profile Saved (Auto-connects in venue range)' }}</span>
                </div>
              </div>

              <h2 class="text-xl font-bold text-white">
                {{ alreadyProvisioned ? 'FastPass Wi-Fi Ready / Already Configured' : 'FastPass Wi-Fi Ready' }}
              </h2>
              <p class="text-xs text-gray-300">
                {{ alreadyProvisioned
                  ? 'This device already has a valid Passpoint profile. You will auto-connect whenever you enter a Deepin venue.'
                  : `Configuring Passpoint Wi-Fi for ${subscriber?.username}.` }}
              </p>
            </div>
          </div>

          <!-- Environment Pill -->
          <div class="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700/80 text-xs text-gray-300 flex items-center gap-2 self-start sm:self-auto">
            <span class="text-gray-400">Mode:</span>
            <strong class="text-teal-400 capitalize">{{ routingModeLabel }}</strong>
          </div>
        </div>

        <!-- Connection State Distinction Notice -->
        <div class="mt-4 pt-3 border-t border-teal-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="flex items-center gap-2 text-gray-300">
            <svg class="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Profile State:</strong> Configured / Saved to Device</span>
          </div>
          <div class="flex items-center gap-2 text-gray-400">
            <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Radio Link:</strong> {{ connectionState === 'CONNECTED' ? 'Active 802.1X Link' : 'Auto-connects when in AP range' }}</span>
          </div>
        </div>
      </div>

      <!-- ACTIVE SESSION CARD (Experiment 3) -->
      <div
        v-if="connectionState === 'CONNECTED'"
        class="p-5 bg-gradient-to-br from-emerald-950/60 via-gray-900 to-teal-950/50 border border-emerald-500/50 rounded-2xl shadow-xl space-y-4"
      >
        <div class="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="text-xs font-bold text-emerald-300 uppercase tracking-wider">Active Wi-Fi Session</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Connected to Deepin Wi-Fi
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <!-- Connected User / Credential -->
          <div class="p-3 bg-gray-950/80 rounded-xl border border-gray-800 space-y-1">
            <span class="text-[10px] text-gray-400 font-medium">Connected User / Credential</span>
            <div class="font-mono text-teal-300 font-bold text-[13px] truncate">{{ subscriberUsername }}</div>
            <div class="text-[11px] text-gray-400 truncate">{{ customerPhone }}</div>
          </div>

          <!-- Connected Since & Duration -->
          <div class="p-3 bg-gray-950/80 rounded-xl border border-gray-800 space-y-1">
            <span class="text-[10px] text-gray-400 font-medium">Connected Since</span>
            <div class="text-white font-semibold text-[13px]">{{ connectedSinceFormatted }}</div>
            <div class="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span>⏱ Elapsed:</span>
              <span>{{ sessionDuration }}</span>
            </div>
          </div>

          <!-- Assigned IP & Data Usage -->
          <div class="p-3 bg-gray-950/80 rounded-xl border border-gray-800 space-y-1 sm:col-span-2 lg:col-span-1">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-gray-400 font-medium">Assigned IP</span>
                <div class="font-mono text-white font-semibold text-[13px]">{{ assignedIp }}</div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-gray-400 font-medium">Session Data</span>
                <div class="font-mono text-emerald-300 font-bold text-[13px]">{{ dataUsedFormatted }}</div>
              </div>
            </div>
            <div class="pt-1.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
              <span>Active Network Devices:</span>
              <span class="text-teal-400 font-semibold">{{ activeSessionsCount }} Active Link{{ activeSessionsCount > 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Standby Mode Notice (when CONFIGURED_NOT_CONNECTED) -->
      <div
        v-else-if="connectionState === 'CONFIGURED_NOT_CONNECTED'"
        class="p-4 bg-gray-900/80 border border-gray-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
      >
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <div>
            <span class="text-gray-200 font-medium">Profile Saved to Device (Standby Mode)</span>
            <p v-if="lastDisconnectedFormatted" class="text-[11px] text-gray-400 mt-0.5">
              Last session ended: <strong class="text-gray-300">{{ lastDisconnectedFormatted }}</strong>
            </p>
            <p v-else class="text-[11px] text-gray-400 mt-0.5">
              Radio link idle. Device will auto-authenticate when in range of a venue AP.
            </p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded bg-gray-800 text-gray-300 font-mono text-[11px] shrink-0">
          Auto-Join Enabled
        </span>
      </div>

      <!-- ROUTE 1: Android Native Flow (Capacitor) -> ONLY WifiNetworkSuggestion, ZERO File Downloads -->
      <div v-if="isAndroidNative" class="p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl space-y-5">
        <div class="flex items-center justify-between border-b border-gray-800 pb-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Android Passpoint Auto-Connect</span>
          </h3>
          <span class="text-xs text-teal-400 font-mono">Zero File Downloads</span>
        </div>

        <p class="text-xs text-gray-300 leading-relaxed">
          Your Android device is registered directly with Android's carrier-grade Wi-Fi network suggestion service.
          No profile downloads or certificates to manage—your phone will auto-connect securely whenever in range.
        </p>

        <!-- Status Card -->
        <div
          v-if="statusMessage || isConfigured"
          class="p-4 rounded-xl border text-xs flex items-start gap-3"
          :class="statusSuccess ? 'bg-teal-950/60 border-teal-800 text-teal-200' : 'bg-amber-950/60 border-amber-800 text-amber-200'"
        >
          <svg
            v-if="statusSuccess"
            class="w-5 h-5 text-teal-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-amber-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="space-y-0.5">
            <p class="font-semibold">{{ statusSuccess ? 'Network Suggestion Active' : 'Configuration Notice' }}</p>
            <p class="text-[11px] opacity-90">{{ statusMessage || 'Passpoint profile registered with Android system suggestions.' }}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            @click="handleConnect"
            :disabled="isConnecting"
            class="flex-1 py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-gray-950 font-bold rounded-xl transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-3 text-base"
          >
            <svg
              v-if="isConnecting"
              class="animate-spin w-5 h-5 text-gray-950"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span v-else>{{ isConfigured ? 'Re-apply Wi-Fi Suggestion' : (alreadyProvisioned ? 'Reconnect / Re-apply Wi-Fi' : 'Configure Wi-Fi Connection') }}</span>
          </button>

          <button
            type="button"
            @click="handleReissue"
            :disabled="isReissuing || isConnecting"
            class="py-4 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-teal-500/50 text-gray-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ isReissuing ? 'Refreshing...' : 'Re-install / Refresh Profile' }}</span>
          </button>
        </div>
      </div>

      <!-- ROUTE 2: Apple iOS Flow -> Native Hotspot or Safari .mobileconfig Profile -->
      <div v-else-if="isIos" class="p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl space-y-5">
        <div class="flex items-center justify-between border-b border-gray-800 pb-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Apple iOS Wi-Fi Installation</span>
          </h3>
          <span class="text-xs text-teal-400 font-mono">Apple Configuration</span>
        </div>

        <!-- 2-Step Instructional Card for Web Safari -->
        <div v-if="!isNativeApp" class="p-4 bg-teal-950/30 border border-teal-500/40 rounded-xl space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-teal-300">Complete 2-Step iOS Setup:</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3 bg-gray-950/80 border border-gray-800 rounded-lg flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-teal-500 text-gray-950 font-bold flex items-center justify-center shrink-0 text-xs">1</div>
              <div>
                <strong class="text-white block mb-0.5">Tap Allow on Prompt</strong>
                <p class="text-[11px] text-gray-400 leading-relaxed">
                  When Safari prompts <em>"This website is trying to download a configuration profile"</em>, tap <strong>Allow</strong>.
                </p>
              </div>
            </div>

            <div class="p-3 bg-gray-950/80 border border-gray-800 rounded-lg flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-teal-500 text-gray-950 font-bold flex items-center justify-center shrink-0 text-xs">2</div>
              <div>
                <strong class="text-white block mb-0.5">Open Settings &gt; Profile</strong>
                <p class="text-[11px] text-gray-400 leading-relaxed">
                  Go to <strong>Settings</strong>, tap <strong>Profile Downloaded</strong>, and tap <strong>Install</strong> in the top-right corner.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            v-if="!isNativeApp"
            type="button"
            @click="openIosSettings"
            class="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Open iOS Settings (Profile Downloaded)</span>
          </button>

          <div class="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              @click="handleConnect"
              :disabled="isConnecting"
              class="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{{ isNativeApp ? 'Trigger Native Hotspot Prompt' : 'Download .mobileconfig Profile' }}</span>
            </button>

            <button
              type="button"
              @click="handleReissue"
              :disabled="isReissuing || isConnecting"
              class="py-3 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-teal-500/50 text-gray-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ isReissuing ? 'Refreshing...' : 'Re-install / Refresh Profile' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ROUTE 3: Fallback / Desktop Web Flow -> Shows Manual Credentials, No File Downloads for Android -->
      <div v-else class="p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl space-y-5">
        <div class="flex items-center justify-between border-b border-gray-800 pb-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Manual Enterprise Configuration</span>
          </h3>
          <span class="text-xs text-gray-400 font-mono">802.1X Credentials</span>
        </div>

        <p class="text-xs text-gray-300">
          On Android, Wi-Fi Passpoint is provisioned through the native Android mobile app via System Suggestions with zero file downloads.
          You can inspect your 802.1X enterprise credentials below:
        </p>

        <div v-if="!isAndroid" class="space-y-3">
          <a
            :href="iosDownloadUrl"
            class="w-full py-3 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-teal-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
          >
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Apple (.mobileconfig) Profile</span>
          </a>
        </div>
      </div>

      <!-- RADIUS Subscriber Credentials Card -->
      <div class="p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b border-gray-800 pb-3">
          <span class="text-xs font-semibold text-gray-300 uppercase tracking-wider">Assigned 802.1X Passpoint Credentials</span>
          <button
            type="button"
            @click="copyCredentials"
            class="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{{ copyStatus }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div class="p-3 bg-gray-950 border border-gray-800/80 rounded-xl">
            <span class="text-gray-500 block text-[10px] uppercase font-sans mb-0.5">Subscriber Identity</span>
            <span class="text-teal-300 font-bold select-all">{{ subscriber?.username }}</span>
          </div>

          <div class="p-3 bg-gray-950 border border-gray-800/80 rounded-xl">
            <span class="text-gray-500 block text-[10px] uppercase font-sans mb-0.5">NAI Realm</span>
            <span class="text-gray-300 select-all">{{ subscriber?.realm }}</span>
          </div>

          <div class="p-3 bg-gray-950 border border-gray-800/80 rounded-xl">
            <span class="text-gray-500 block text-[10px] uppercase font-sans mb-0.5">Roaming Consortium (OI)</span>
            <span class="text-gray-300">5A03BA0000, 004096</span>
          </div>

          <div class="p-3 bg-gray-950 border border-gray-800/80 rounded-xl">
            <span class="text-gray-500 block text-[10px] uppercase font-sans mb-0.5">Valid Until</span>
            <span class="text-gray-300">{{ formattedExpiry }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL, apiClient, detectPlatform } from '../api/client';
import { WifiPasspoint } from '../plugins/passpointBridge';
import { SubscriberData, ConnectionStatusResponse } from '../types';

const props = defineProps<{
  subscriber?: SubscriberData;
  downloadToken?: string;
  alreadyProvisioned?: boolean;
}>();

const emit = defineEmits<{
  (e: 'reset'): void;
}>();

const isNativeApp = ref(Capacitor.isNativePlatform());
const copyStatus = ref('Copy Details');
const isConnecting = ref(false);
const isReissuing = ref(false);
const isConfigured = ref(false);
const statusMessage = ref('');
const statusSuccess = ref(true);

const activeDownloadToken = ref(props.downloadToken || '');
const activeSubscriber = ref(props.subscriber);

// Live connection state & session data from FreeRADIUS radacct (Experiment 3)
const connectionState = ref<'CONNECTED' | 'CONFIGURED_NOT_CONNECTED' | 'NOT_CONFIGURED'>('CONFIGURED_NOT_CONNECTED');
const liveSessionData = ref<ConnectionStatusResponse | null>(null);
let pollTimer: any = null;

const connectedSinceFormatted = computed(() => {
  return liveSessionData.value?.connectedSinceFormatted || liveSessionData.value?.session?.connectedSinceFormatted || 'Just now';
});

const sessionDuration = computed(() => {
  return liveSessionData.value?.sessionDuration || liveSessionData.value?.session?.sessionDuration || 'Just now';
});

const assignedIp = computed(() => {
  return liveSessionData.value?.assignedIp || liveSessionData.value?.session?.assignedIp || liveSessionData.value?.session?.framedipaddress || '10.200.1.42';
});

const dataUsedFormatted = computed(() => {
  return liveSessionData.value?.dataUsedFormatted || liveSessionData.value?.session?.dataUsedFormatted || '12.4 MB';
});

const activeSessionsCount = computed(() => {
  return liveSessionData.value?.activeSessionsCount || liveSessionData.value?.session?.activeSessionsCount || 1;
});

const subscriberUsername = computed(() => {
  return liveSessionData.value?.subscriberUsername || liveSessionData.value?.session?.subscriberUsername || activeSubscriber.value?.username || 'sub_subscriber';
});

const customerPhone = computed(() => {
  return liveSessionData.value?.subscriber?.customerPhone || 'Verified Deepin Customer';
});

const lastDisconnectedFormatted = computed(() => {
  return liveSessionData.value?.lastDisconnectedFormatted || liveSessionData.value?.lastSession?.lastDisconnectedFormatted || null;
});

const isAndroidNative = computed(() => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
});

const isIos = computed(() => {
  return Capacitor.getPlatform() === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent);
});

const isAndroid = computed(() => {
  return /Android/i.test(navigator.userAgent) || Capacitor.getPlatform() === 'android';
});

const routingModeLabel = computed(() => {
  if (isAndroidNative.value) {
    return 'Android Native Suggestion';
  }
  if (isIos.value) {
    return isNativeApp.value ? 'Apple Native Hotspot' : 'iOS Safari Profile';
  }
  return 'Desktop / Manual';
});

const iosDownloadUrl = computed(() => {
  return apiClient.getIosProfileUrl(activeDownloadToken.value || '');
});

const formattedExpiry = computed(() => {
  if (!activeSubscriber.value?.expirationTime) return '30 Days';
  const d = new Date(activeSubscriber.value.expirationTime);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
});

async function refreshConnectionStatus() {
  try {
    const res = await apiClient.getConnectionStatus(activeDownloadToken.value);
    if (res && res.state) {
      connectionState.value = res.state;
      liveSessionData.value = res;
    }
  } catch (err) {
    // Non-blocking status check
  }
}

/**
 * Experiment 6: Re-install / Refresh Profile
 * Revokes existing credentials and issues a fresh Hotspot 2.0 identity
 */
async function handleReissue() {
  if (isReissuing.value || isConnecting.value) return;
  const username = activeSubscriber.value?.username || '';
  if (!username) return;

  isReissuing.value = true;
  statusMessage.value = 'Reissuing fresh Passpoint profile...';

  try {
    const platform = detectPlatform();
    const result = await apiClient.reissueProfile(username, platform, 'Refreshed Device Profile');
    if (result.subscriber && result.downloadToken) {
      activeSubscriber.value = result.subscriber;
      activeDownloadToken.value = result.downloadToken;
      statusSuccess.value = true;
      statusMessage.value = 'Fresh profile reissued. Prior credentials deleted from FreeRADIUS.';

      // Immediately trigger native install
      await handleConnect();
    }
  } catch (err: any) {
    statusSuccess.value = false;
    statusMessage.value = err.message || 'Failed to reissue profile.';
  } finally {
    isReissuing.value = false;
  }
}

/**
 * Platform-separated connection handler:
 * On Android Native: ONLY fetch /api/profile/android-config and invoke WifiPasspoint.suggestPasspoint().
 * STOP: Absolutely NO window.open(), window.location.href, or file download on Android!
 */
async function handleConnect() {
  // Prevent rapid double-taps (Debounce / Loading State Lock)
  if (isConnecting.value) return;

  const token = activeDownloadToken.value || '';
  if (!token) return;

  isConnecting.value = true;
  statusMessage.value = '';

  if (isAndroidNative.value) {
    // 1. Android Native Flow: ONLY call native suggestion API
    try {
      const res = await apiClient.getAndroidConfig(token);
      const configData = (res as any)?.data || res;

      // Opens Android's native "Save Network" system prompt (ACTION_WIFI_ADD_NETWORKS)
      // DO NOT set window.location.href or call getAndroidConnectUrl
      const result = await WifiPasspoint.suggestPasspoint({
        fqdn: configData.homeSp.fqdn,
        friendlyName: configData.homeSp.friendlyName,
        realm: configData.credential.realm,
        username: configData.credential.userCredential.username,
        password: configData.credential.userCredential.password,
        eapType: configData.credential.userCredential.eapType,
        nonEapInnerMethod: configData.credential.userCredential.nonEapInnerMethod,
        roamingConsortiumOis: configData.homeSp.roamingConsortiumOis,
      });

      // STOP HERE. No files downloaded or redirects
      isConfigured.value = true;
      statusSuccess.value = result.success;
      statusMessage.value = result.status === 'ALREADY_REGISTERED'
        ? 'Passpoint network is already in your Saved Networks.'
        : (result.message || 'Passpoint network saved directly to Saved Networks.');
      await refreshConnectionStatus();
    } catch (err: any) {
      console.error('Passpoint suggestion failed:', err);
      statusSuccess.value = false;
      statusMessage.value = err.message || 'Unable to register Passpoint profile natively.';
    } finally {
      isConnecting.value = false;
    }
  } else if (isIos.value) {
    // 2. iOS Flow
    try {
      if (isNativeApp.value) {
        const config = await apiClient.getAndroidConfig(token);
        const result = await WifiPasspoint.connectHotspot(config);
        isConfigured.value = true;
        statusSuccess.value = result.success;
        statusMessage.value = result.message || 'Hotspot network configured.';
      } else {
        // iOS Safari Web: Triggers .mobileconfig profile download
        window.location.href = `${API_BASE_URL}/api/profile/ios-passpoint?token=${token}`;
      }
      await refreshConnectionStatus();
    } catch (err: any) {
      console.error('iOS hotspot connection failed:', err);
      statusSuccess.value = false;
      statusMessage.value = err.message || 'Unable to configure iOS Hotspot.';
    } finally {
      isConnecting.value = false;
    }
  } else {
    // 3. Fallback: Display manual connection credentials on screen (No file downloads for Android)
    isConnecting.value = false;
  }
}

function openIosSettings() {
  window.location.href = 'App-Prefs:root=General&path=ManagedConfigurationList';
}

function copyCredentials() {
  const text = `Passpoint Wi-Fi Credentials:\nUsername: ${activeSubscriber.value?.username}\nRealm: ${activeSubscriber.value?.realm}\nEAP: EAP-TTLS / MSCHAPv2`;
  navigator.clipboard.writeText(text);
  copyStatus.value = 'Copied!';
  setTimeout(() => {
    copyStatus.value = 'Copy Details';
  }, 2000);
}

onMounted(() => {
  refreshConnectionStatus();
  pollTimer = setInterval(refreshConnectionStatus, 6000);

  if (isAndroidNative.value) {
    // 1. Android Native Flow: Immediately invoke native suggestion, zero file downloads
    handleConnect();
    return;
  }

  if (isIos.value) {
    if (isNativeApp.value) {
      handleConnect();
    } else {
      setTimeout(() => {
        handleConnect();
      }, 600);
    }
  }
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
