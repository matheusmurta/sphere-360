<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PhotoMeta, ViewMode } from '@/types'
import PhotoCard from './PhotoCard.vue'

const props = defineProps<{ photos: PhotoMeta[]; mode: ViewMode; selecting: boolean; selected: Set<string> }>()
const emit = defineEmits<{ open: [id: string]; toggleSelect: [id: string]; favorite: [id: string] }>()

/** Renderização incremental: galerias grandes crescem em blocos conforme a rolagem. */
const PAGE = 60
const limit = ref(PAGE)
const shown = computed(() => props.photos.slice(0, limit.value))
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') { limit.value = Infinity; return }
  io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) limit.value += PAGE }, { rootMargin: '800px' })
  if (sentinel.value) io.observe(sentinel.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div :class="mode === 'grid' ? 'grid grid-cols-1 gap-x-4 gap-y-5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 min-[1900px]:grid-cols-5 min-[2400px]:grid-cols-6' : 'flex flex-col gap-2'" data-testid="photo-grid">
    <PhotoCard v-for="p in shown" :key="p.id" :photo="p" :mode="mode" :selecting="selecting" :selected="selected.has(p.id)"
      @open="emit('open', p.id)" @toggle-select="emit('toggleSelect', p.id)" @favorite="emit('favorite', p.id)" />
  </div>
  <div ref="sentinel" class="h-px" aria-hidden="true" />
</template>
