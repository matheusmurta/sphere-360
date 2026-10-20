<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Heart, Check, Orbit } from '@lucide/vue'
import type { PhotoMeta, ViewMode } from '@/types'
import { useThumbnailUrl } from '@/composables/useObjectUrl'
import { formatBytes, formatResolution, mimeLabel } from '@/services/images/validation'

const props = defineProps<{ photo: PhotoMeta; mode: ViewMode; selecting: boolean; selected: boolean }>()
const emit = defineEmits<{ open: []; toggleSelect: []; favorite: [] }>()

const root = ref<HTMLElement | null>(null)
const visible = ref(false)
let io: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') { visible.value = true; return }
  io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { visible.value = true; io?.disconnect() } }, { rootMargin: '400px' })
  if (root.value) io.observe(root.value)
})
onBeforeUnmount(() => io?.disconnect())
const url = useThumbnailUrl(computed(() => props.photo.id), visible)
const info = computed(() => `${mimeLabel(props.photo.mimeType)} · ${formatResolution(props.photo.width, props.photo.height)}`)
function click() { if (props.selecting) emit('toggleSelect'); else emit('open') }
</script>

<template>
  <article ref="root" class="group relative" :class="mode === 'list' ? 'card flex items-center gap-4 p-2' : ''" data-testid="photo-card" :data-name="photo.name">
    <button class="relative block shrink-0 overflow-hidden rounded-2xl bg-black/10 text-left dark:bg-white/5" :class="mode === 'list' ? 'h-16 w-32 rounded-xl' : 'aspect-[2/1] w-full'" :aria-label="selecting ? `Selecionar ${photo.name}` : `Abrir ${photo.name} em 360°`" :aria-pressed="selecting ? selected : undefined" @click="click">
      <img v-if="url" :src="url" :alt="photo.name" class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" draggable="false" />
      <span v-if="mode === 'grid'" class="glass absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"><Orbit class="size-3" /> 360°</span>
      <span v-if="selecting" class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-2 border-white" :class="selected ? 'bg-accent' : 'bg-black/30'"><Check v-if="selected" class="size-4 text-white" /></span>
      <span v-if="photo.projection === 'forced'" class="absolute bottom-2 left-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-black">Forçada</span>
    </button>
    <div class="flex min-w-0 flex-1 items-start gap-2" :class="mode === 'grid' && 'px-1 pt-2'">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-medium">{{ photo.name }}</h3>
        <p class="truncate text-xs text-neutral-500">{{ info }}<span v-if="mode === 'list'"> · {{ formatBytes(photo.size) }}</span></p>
      </div>
      <button v-if="!selecting" class="icon-btn -mt-2 -mr-2 shrink-0" :aria-label="photo.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'" :aria-pressed="photo.favorite" data-testid="favorite-btn" @click="emit('favorite')">
        <Heart class="size-5" :class="photo.favorite ? 'fill-red-500 text-red-500' : 'text-neutral-400'" />
      </button>
    </div>
  </article>
</template>
