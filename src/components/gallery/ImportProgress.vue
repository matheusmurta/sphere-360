<script setup lang="ts">
import { computed } from 'vue'
import { X, CircleCheck, CircleAlert, Copy, Loader, Ban, TriangleAlert, Clock } from '@lucide/vue'
import { useLibraryStore, type ImportStatus } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import { formatResolution } from '@/services/images/validation'

const lib = useLibraryStore()
const ui = useUiStore()
const items = computed(() => lib.importItems)
const finished = computed(() => items.value.filter((i) => !['pending', 'processing'].includes(i.status)).length)
const pct = computed(() => (items.value.length ? (finished.value / items.value.length) * 100 : 0))
const count = (s: ImportStatus) => items.value.filter((i) => i.status === s).length
const icon: Record<ImportStatus, unknown> = { pending: Clock, processing: Loader, done: CircleCheck, duplicate: Copy, incompatible: TriangleAlert, error: CircleAlert, cancelled: Ban }
const label: Record<ImportStatus, string> = { pending: 'Aguardando', processing: 'Processando…', done: 'Importada', duplicate: 'Duplicada', incompatible: 'Não parece 360°', error: 'Erro', cancelled: 'Cancelada' }
function close() { lib.clearImport(); ui.importOpen = false }
</script>

<template>
  <Transition name="sheet">
    <section v-if="ui.importOpen && items.length" class="fixed inset-x-0 bottom-0 z-[60] max-h-[80dvh] overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px] sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10" role="dialog" aria-label="Importação de fotos" data-testid="import-panel">
      <header class="flex items-center gap-3 border-b border-black/5 p-4 dark:border-white/10">
        <div class="flex-1">
          <h2 class="font-semibold">{{ lib.importing ? 'Importando fotos…' : 'Importação concluída' }}</h2>
          <p class="text-xs text-neutral-500">{{ finished }} de {{ items.length }} · {{ count('done') }} importadas<span v-if="count('duplicate')"> · {{ count('duplicate') }} duplicadas</span><span v-if="count('incompatible')"> · {{ count('incompatible') }} incompatíveis</span><span v-if="count('error')"> · {{ count('error') }} com erro</span></p>
        </div>
        <button v-if="lib.importing" class="btn-ghost" @click="lib.cancelImport()">Cancelar</button>
        <button v-else class="icon-btn" aria-label="Fechar importação" @click="close"><X class="size-5" /></button>
      </header>
      <div class="h-1 bg-black/5 dark:bg-white/10" role="progressbar" :aria-valuenow="Math.round(pct)" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da importação">
        <div class="h-full bg-accent transition-all" :style="{ width: pct + '%' }" />
      </div>
      <ul class="max-h-[56dvh] overflow-y-auto p-2 pb-[calc(var(--sab)+8px)]">
        <li v-for="it in items" :key="it.key" class="flex items-center gap-3 rounded-xl p-2" :data-status="it.status">
          <div class="h-10 w-20 shrink-0 overflow-hidden rounded-lg bg-black/10 dark:bg-white/10">
            <img v-if="it.previewUrl" :src="it.previewUrl" alt="" class="size-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">{{ it.file.name }}</p>
            <p class="flex items-center gap-1 text-xs text-neutral-500">
              <component :is="icon[it.status]" class="size-3.5" :class="{ 'animate-spin': it.status === 'processing', 'text-green-500': it.status === 'done', 'text-red-500': it.status === 'error', 'text-amber-500': it.status === 'incompatible' }" />
              {{ label[it.status] }}<span v-if="it.analyzed"> · {{ formatResolution(it.analyzed.width, it.analyzed.height) }}</span>
            </p>
            <p v-if="it.message" class="text-xs text-neutral-500">{{ it.message }}</p>
          </div>
          <button v-if="it.status === 'incompatible'" class="btn-ghost shrink-0 px-3 text-xs" title="Importar mesmo assim (a imagem será esticada na esfera)" @click="lib.forceImport(it.key)">Importar mesmo assim</button>
        </li>
      </ul>
    </section>
  </Transition>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active { transition: transform .3s ease, opacity .3s ease; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(24px); opacity: 0; }
</style>
