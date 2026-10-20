<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import ThumbImage from '@/components/common/ThumbImage.vue'
import type { PhotoMeta } from '@/types'
const props = defineProps<{ photos: PhotoMeta[]; currentId: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const strip = ref<HTMLElement | null>(null)
watch(() => props.currentId, async () => {
  await nextTick()
  strip.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}, { immediate: true })
</script>

<template>
  <div ref="strip" class="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]" role="list" aria-label="Fotos da galeria">
    <button v-for="(p, i) in photos" :key="p.id" role="listitem" class="h-12 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition" :class="p.id === currentId ? 'ring-white' : 'opacity-60 ring-transparent hover:opacity-100'"
      :aria-current="p.id === currentId" :aria-label="`Foto ${i + 1}: ${p.name}`" @click="emit('select', p.id)">
      <ThumbImage :id="p.id" />
    </button>
  </div>
</template>
