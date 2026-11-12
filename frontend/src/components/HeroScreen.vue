<template>
  <div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white selection:bg-teal-500">
    <!-- Top Navigation Bar -->
    <header class="w-full border-b border-gray-800/80 bg-gray-950/70 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-gray-950">
            <svg class="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
            </svg>
          </div>
          <div>
            <div class="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>FastPass Wi-Fi</span>
              <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">Passpoint R2</span>
            </div>
            <div class="text-[11px] text-gray-400">Hotspot 2.0 • 802.1X Enterprise</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Venue Online • 1.2 Gbps</span>
          </div>
          <button
            @click="emit('openScanner')"
            class="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Scan QR Code"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Hero Content -->
    <main class="flex-1 max-w-4xl mx-auto px-4 py-8 flex flex-col justify-center items-center text-center">
      <!-- Glow effect -->
      <div class="relative w-full max-w-lg">
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <!-- Pill Badge -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium mb-6 shadow-sm">
        <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Wi-Fi Alliance Hotspot 2.0 Release 2</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        Connect Once. <br />
        <span class="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
          Auto-Connect Forever.
        </span>
      </h1>

      <p class="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mb-8 font-normal leading-relaxed">
        Say goodbye to annoying web captive portals. Download your secure Passpoint profile once, and your device seamlessly connects at airports, cafes, and stadiums worldwide.
      </p>

      <!-- Action Card / Primary CTAs -->
      <div class="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl mb-10 text-left">
        <div class="flex items-center justify-between mb-5">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-400">Instant Access Portal</span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Free 30-Day Pass
          </span>
        </div>

        <div class="space-y-3">
          <button
            type="button"
            @click="emit('openAuth')"
            class="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold rounded-xl transition-all transform active:scale-[0.99] shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg class="w-5 h-5 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Get Passpoint Profile</span>
          </button>

          <button
            type="button"
            @click="emit('openScanner')"
            class="w-full py-3 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:text-white"
          >
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Scan Venue Pass QR Code</span>
          </button>
        </div>

        <!-- Security footnotes -->
        <div class="mt-5 pt-4 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>EAP-TTLS / MSCHAPv2</span>
          </div>
          <div class="text-gray-500 font-mono">No tracking • Zero ads</div>
        </div>
      </div>

      <!-- Feature Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div class="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-white mb-1">True Zero-Touch</h4>
          <p class="text-xs text-gray-400">No pop-up browser logins. Connects in milliseconds using hardware-level 802.1X certificates.</p>
        </div>

        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-white mb-1">Encrypted Tunnel</h4>
          <p class="text-xs text-gray-400">Over-the-air WPA2/WPA3 enterprise encryption protects you against eavesdropping on public Wi-Fi.</p>
        </div>

        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-white mb-1">Global Roaming</h4>
          <p class="text-xs text-gray-400">Integrated with OpenRoaming and Hotspot 2.0 consortiums across thousands of partner networks.</p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="w-full py-6 border-t border-gray-900 text-center text-xs text-gray-500">
      <div class="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>&copy; {{ new Date().getFullYear() }} Passpoint Hotspot 2.0 Network Architecture</span>
        <div class="flex items-center gap-4 text-gray-400">
          <span>NAI Realm: wifi.example.com</span>
          <span>•</span>
          <span>OpenRoaming OI: 5A03BA0000</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openAuth'): void;
  (e: 'openScanner'): void;
}>();
</script>

