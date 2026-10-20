<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Images, Heart, FolderOpen, Settings, Plus, WifiOff, Orbit } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
import { useLibraryStore } from '@/stores/library'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { useOnline } from '@/composables/useResponsive'
import StorageIndicator from '@/components/common/StorageIndicator.vue'
import ImportProgress from '@/components/gallery/ImportProgress.vue'
import AlbumSidebar from '@/components/gallery/AlbumSidebar.vue'

const ui = useUiStore()
const lib = useLibraryStore()
const quota = useStorageQuota()
const online = useOnline()
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
let dragDepth = 0

const nav = [
  { to: '/', label: 'Galeria', icon: Images },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/albuns', label: 'Álbuns', icon: FolderOpen },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

async function handleFiles(list: FileList | File[] | null | undefined) {
  const files = Array.from(list ?? [])
  if (!files.length) return
  ui.importOpen = true
  await lib.importFiles(files)
  void quota.requestPersistence()
  await quota.refresh()
}
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  void handleFiles(el.files)
  el.value = ''
}
const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
function onDragEnter(e: DragEvent) { if (hasFiles(e)) { dragDepth++; dragging.value = true } }
function onDragLeave() { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dragging.value = false }
function onDragOver(e: DragEvent) { if (hasFiles(e)) e.preventDefault() }
function onDrop(e: DragEvent) {
  if (!hasFiles(e)) return
  e.preventDefault(); dragDepth = 0; dragging.value = false
  void handleFiles(e.dataTransfer?.files)
}
onMounted(() => {
  ui.fileInput = input.value
  window.addEventListener('dragenter', onDragEnter); window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('dragover', onDragOver); window.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter); window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('dragover', onDragOver); window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <div class="flex min-h-dvh">
    <input ref="input" type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-testid="file-input" aria-label="Selecionar fotos 360°" @change="onInput" />

    <!-- Sidebar (desktop) -->
    <aside class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-black/5 p-5 lg:flex dark:border-white/10" aria-label="Navegação principal">
      <div class="flex items-center gap-2 text-lg font-semibold"><Orbit class="size-6 text-accent" /> Sphere 360</div>
      <button class="btn-primary w-full" @click="ui.pickFiles()"><Plus class="size-5" /> Adicionar fotos</button>
      <nav class="flex flex-col gap-1">
        <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-black/5 dark:hover:bg-white/8" active-class="!bg-accent/15 text-accent" exact-active-class="!bg-accent/15 text-accent">
          <component :is="n.icon" class="size-5" /> {{ n.label }}
        </RouterLink>
      </nav>
      <AlbumSidebar />
      <div class="mt-auto"><StorageIndicator /></div>
    </aside>

    <main class="min-w-0 flex-1 pb-[calc(var(--sab)+76px)] lg:pb-8">
      <div v-if="!online" class="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 pt-[calc(var(--sat)+8px)] text-xs text-amber-600 lg:pt-2 dark:text-amber-400" role="status">
        <WifiOff class="size-4" /> Você está offline — sua biblioteca local continua disponível.
      </div>
      <slot />
    </main>

    <!-- Navegação inferior (mobile/tablet) -->
    <nav class="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 px-2 pb-safe lg:hidden" aria-label="Navegação principal">
      <RouterLink v-for="n in nav.slice(0, 2)" :key="n.to" :to="n.to" class="flex min-h-16 min-w-16 flex-col items-center justify-center gap-1 text-[11px] text-white/70" exact-active-class="!text-accent">
        <component :is="n.icon" class="size-6" /> {{ n.label }}
      </RouterLink>
      <button class="flex min-h-16 min-w-16 flex-col items-center justify-center" aria-label="Adicionar fotos" data-testid="add-mobile" @click="ui.pickFiles()">
        <span class="flex size-11 items-center justify-center rounded-full bg-accent text-white shadow-lg"><Plus class="size-6" /></span>
      </button>
      <RouterLink v-for="n in nav.slice(2)" :key="n.to" :to="n.to" class="flex min-h-16 min-w-16 flex-col items-center justify-center gap-1 text-[11px] text-white/70" active-class="!text-accent">
        <component :is="n.icon" class="size-6" /> {{ n.label }}
      </RouterLink>
    </nav>

    <div v-if="dragging" class="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-accent/20 backdrop-blur-sm">
      <div class="rounded-3xl border-2 border-dashed border-accent bg-black/60 px-10 py-8 text-lg font-medium text-white">Solte as fotos 360° para importar</div>
    </div>
    <ImportProgress />
  </div>
</template>
