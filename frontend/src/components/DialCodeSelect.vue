<template>
  <div class="relative" ref="containerRef">
    <button
      type="button"
      @click="isOpen = !isOpen"
      class="flex items-center gap-1.5 px-3 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 rounded-l-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      aria-label="Select Country Dial Code"
    >
      <span class="text-base">{{ selected.flag }}</span>
      <span class="text-sm font-semibold">{{ selected.dialCode }}</span>
      <svg
        class="w-3.5 h-3.5 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown menu -->
    <div
      v-if="isOpen"
      class="absolute left-0 mt-2 w-64 max-h-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl"
    >
      <!-- Search Input -->
      <div class="p-2 border-b border-gray-800">
        <input
          v-model="search"
          type="text"
          placeholder="Search country or code (e.g. Pak, +92)..."
          class="w-full px-2.5 py-1.5 text-xs bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
          autofocus
        />
      </div>

      <!-- Countries List -->
      <div class="overflow-y-auto divide-y divide-gray-800/40 text-sm">
        <button
          v-for="country in filteredCountries"
          :key="country.code"
          type="button"
          @click="selectCountry(country)"
          class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-teal-950/40 hover:text-teal-300 transition-colors"
          :class="{ 'bg-teal-900/30 text-teal-400 font-semibold': country.code === selected.code }"
        >
          <div class="flex items-center gap-2 truncate">
            <span>{{ country.flag }}</span>
            <span class="truncate text-xs text-gray-300">{{ country.name }}</span>
          </div>
          <span class="text-xs text-gray-400 font-mono ml-2">{{ country.dialCode }}</span>
        </button>

        <div v-if="filteredCountries.length === 0" class="p-4 text-center text-xs text-gray-500">
          No countries found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CountryCode } from '../types';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
  }>(),
  {
    modelValue: '+92',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const isOpen = ref(false);
const search = ref('');
const containerRef = ref<HTMLElement | null>(null);

const countries: CountryCode[] = [
  { name: 'Pakistan', dialCode: '+92', code: 'PK', flag: '🇵🇰' },
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦' },
  { name: 'United Arab Emirates', dialCode: '+971', code: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦' },
  { name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪' },
  { name: 'France', dialCode: '+33', code: 'FR', flag: '🇫🇷' },
  { name: 'Japan', dialCode: '+81', code: 'JP', flag: '🇯🇵' },
  { name: 'Australia', dialCode: '+61', code: 'AU', flag: '🇦🇺' },
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'Singapore', dialCode: '+65', code: 'SG', flag: '🇸🇬' },
  { name: 'Spain', dialCode: '+34', code: 'ES', flag: '🇪🇸' },
  { name: 'Italy', dialCode: '+39', code: 'IT', flag: '🇮🇹' },
  { name: 'Netherlands', dialCode: '+31', code: 'NL', flag: '🇳🇱' },
  { name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷' },
  { name: 'Mexico', dialCode: '+52', code: 'MX', flag: '🇲🇽' },
];

const selected = computed(() => {
  return (
    countries.find((c) => c.dialCode === props.modelValue || c.code === props.modelValue) ||
    countries.find((c) => c.code === 'PK') ||
    countries[0]
  );
});

const filteredCountries = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return countries;
  const qWithoutPlus = q.replace(/^\+/, '');

  return countries.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(q);
    const codeMatch = c.code.toLowerCase().includes(q);
    const dialCodeMatch = c.dialCode.toLowerCase().includes(q);
    const digitsOnlyMatch = c.dialCode.replace('+', '').includes(qWithoutPlus);

    return nameMatch || codeMatch || dialCodeMatch || digitsOnlyMatch;
  });
});

function selectCountry(country: CountryCode) {
  emit('update:modelValue', country.dialCode);
  isOpen.value = false;
  search.value = '';
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
