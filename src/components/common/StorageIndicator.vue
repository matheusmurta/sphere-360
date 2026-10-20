<script setup lang="ts">
import { computed } from 'vue'
import { HardDrive, TriangleAlert } from '@lucide/vue'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { useLibraryStore } from '@/stores/library'
import { formatBytes } from '@/services/images/validation'
const q = useStorageQuota()
const lib = useLibraryStore()
const pct = computed(() => (q.quota.value ? Math.min(100, (q.usage.value / q.quota.value) * 100) : 0))
const near = computed(() => q.isNearLimit())
</script>

<template>
  <div class="text-xs text-neutral-500 dark:text-neutral-400" data-testid="storage-indicator">
    <div class="flex items-center gap-2">
      <component :is="near ? TriangleAlert : HardDrive" class="size-4" :class="near && 'text-amber-500'" />
      <span>{{ lib.photos.length }} {{ lib.photos.length === 1 ? 'foto' : 'fotos' }} · {{ formatBytes(lib.totalSize) }}</span>
    </div>
    <template v-if="q.supported && q.quota.value">
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" role="progressbar" :aria-valuenow="Math.round(pct)" aria-valuemin="0" aria-valuemax="100" aria-label="Uso de armazenamento">
        <div class="h-full rounded-full" :class="near ? 'bg-amber-500' : 'bg-accent'" :style="{ width: pct + '%' }" />
      </div>
      <p class="mt-1">{{ formatBytes(q.usage.value) }} de ~{{ formatBytes(q.quota.value) }} disponíveis</p>
      <p v-if="near" class="mt-1 text-amber-500">Armazenamento quase cheio.</p>
    </template>
  </div>
</template>
