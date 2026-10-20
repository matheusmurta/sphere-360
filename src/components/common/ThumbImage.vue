<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThumbnailUrl } from '@/composables/useObjectUrl'
const props = defineProps<{ id: string; alt?: string }>()
const url = useThumbnailUrl(computed(() => props.id), ref(true))
</script>

<template>
  <img v-if="url" :src="url" :alt="alt ?? ''" class="size-full object-cover" draggable="false" />
  <div v-else class="size-full animate-pulse bg-white/10" />
</template>
