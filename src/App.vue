<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import ToastHost from '@/components/common/ToastHost.vue'
import { useLibraryStore } from '@/stores/library'
import { usePreferencesStore } from '@/stores/preferences'
import { useToastStore } from '@/stores/toasts'
import { useStorageQuota } from '@/composables/useStorageQuota'

const route = useRoute()
const lib = useLibraryStore()
usePreferencesStore()
const toasts = useToastStore()
const quota = useStorageQuota()

onMounted(async () => {
  try {
    await lib.load()
  } catch (e) {
    toasts.push((e as Error).message || 'Falha ao abrir a biblioteca.', 'error', 8000)
  }
  await quota.refresh()
})
</script>

<template>
  <RouterView v-if="route.meta.immersive" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
  <ToastHost />
</template>
