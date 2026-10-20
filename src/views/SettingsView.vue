<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Moon, Sun, Download, Upload, ShieldCheck, Smartphone, Share } from '@lucide/vue'
import { usePreferencesStore } from '@/stores/preferences'
import { useLibraryStore } from '@/stores/library'
import { useToastStore } from '@/stores/toasts'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { repository } from '@/services/database/repository'
import { createBackup, restoreBackup, downloadBlob } from '@/services/storage/backup'
import { toStorageError } from '@/services/storage/errors'
import StorageIndicator from '@/components/common/StorageIndicator.vue'

const prefs = usePreferencesStore()
const lib = useLibraryStore()
const toasts = useToastStore()
const quota = useStorageQuota()
const busy = ref(false)
const restoreInput = ref<HTMLInputElement | null>(null)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
type BIP = Event & { prompt(): Promise<void> }
const installEvt = ref<BIP | null>(null)
const onBip = (e: Event) => { e.preventDefault(); installEvt.value = e as BIP }
onMounted(() => { window.addEventListener('beforeinstallprompt', onBip); void quota.refresh() })
onBeforeUnmount(() => window.removeEventListener('beforeinstallprompt', onBip))

async function install() { await installEvt.value?.prompt(); installEvt.value = null }
async function exportBackup() {
  busy.value = true
  try {
    const blob = await createBackup(repository)
    downloadBlob(blob, `sphere360-backup-${new Date().toISOString().slice(0, 10)}.sphere360`)
  } catch (e) { toasts.push(toStorageError(e).message, 'error') } finally { busy.value = false }
}
async function onRestore(e: Event) {
  const el = e.target as HTMLInputElement
  const f = el.files?.[0]
  el.value = ''
  if (!f) return
  busy.value = true
  try {
    const r = await restoreBackup(f, repository)
    await lib.load()
    await quota.refresh()
    toasts.push(`Backup restaurado: ${r.imported} foto(s) importada(s), ${r.skipped} já existente(s).`, 'success', 6000)
  } catch (err) {
    const se = toStorageError(err)
    toasts.push(se.kind === 'quota' ? se.message : (err as Error).message, 'error')
  } finally { busy.value = false }
}
async function persist() {
  const ok = await quota.requestPersistence()
  toasts.push(ok ? 'Armazenamento persistente concedido.' : 'O navegador não concedeu armazenamento persistente.', ok ? 'success' : 'warning')
}
</script>
<template>
  <div class="mx-auto max-w-2xl px-4 pt-[calc(var(--sat)+16px)] sm:px-6 lg:pt-8">
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Ajustes</h1>

    <section class="card mt-6 p-5">
      <h2 class="font-semibold">Aparência</h2>
      <div class="mt-3 flex gap-2">
        <button class="btn-ghost flex-1" :class="prefs.prefs.theme === 'dark' && '!bg-accent text-white'" :aria-pressed="prefs.prefs.theme === 'dark'" @click="prefs.set('theme', 'dark')"><Moon class="size-4" /> Escuro</button>
        <button class="btn-ghost flex-1" :class="prefs.prefs.theme === 'light' && '!bg-accent text-white'" :aria-pressed="prefs.prefs.theme === 'light'" @click="prefs.set('theme', 'light')"><Sun class="size-4" /> Claro</button>
      </div>
    </section>

    <section class="card mt-4 space-y-4 p-5">
      <h2 class="font-semibold">Visualizador</h2>
      <label class="flex min-h-11 items-center justify-between gap-4 text-sm">Rotação automática ao abrir
        <input v-model="prefs.prefs.autorotate" type="checkbox" class="size-5 accent-accent" /></label>
      <label class="block text-sm">Velocidade da rotação: {{ prefs.prefs.autorotateSpeed }} rpm
        <input v-model.number="prefs.prefs.autorotateSpeed" type="range" min="0.5" max="10" step="0.5" class="mt-2 w-full accent-accent" /></label>
      <label class="block text-sm">Zoom inicial: {{ prefs.prefs.defaultZoom }}%
        <input v-model.number="prefs.prefs.defaultZoom" type="range" min="0" max="100" step="5" class="mt-2 w-full accent-accent" /></label>
    </section>

    <section class="card mt-4 p-5">
      <h2 class="mb-3 font-semibold">Armazenamento</h2>
      <StorageIndicator />
      <p class="mt-3 text-xs text-neutral-500">As fotos ficam apenas neste navegador (IndexedDB). Limpar os dados do site, a navegação privada ou políticas do sistema (ex.: o Safari pode remover dados de sites não instalados após 7 dias sem uso) podem apagar a biblioteca. Faça backups.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn-ghost" :disabled="busy || !lib.photos.length" @click="exportBackup"><Download class="size-4" /> Exportar backup</button>
        <button class="btn-ghost" :disabled="busy" @click="restoreInput?.click()"><Upload class="size-4" /> Restaurar backup</button>
        <button v-if="quota.persisted.value === false" class="btn-ghost" @click="persist"><ShieldCheck class="size-4" /> Pedir armazenamento persistente</button>
        <input ref="restoreInput" type="file" accept=".sphere360,application/octet-stream" class="sr-only" aria-label="Arquivo de backup" @change="onRestore" />
      </div>
      <p v-if="quota.persisted.value" class="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><ShieldCheck class="size-4" /> Armazenamento persistente ativo.</p>
    </section>

    <section class="card mt-4 p-5">
      <h2 class="font-semibold">Instalar aplicativo</h2>
      <p v-if="standalone" class="mt-2 text-sm text-neutral-500">O Sphere 360 já está instalado.</p>
      <button v-else-if="installEvt" class="btn-primary mt-3" @click="install"><Smartphone class="size-4" /> Instalar Sphere 360</button>
      <p v-else-if="isIOS" class="mt-2 flex flex-wrap items-center gap-1 text-sm text-neutral-500">No Safari, toque em <Share class="inline size-4" /> Compartilhar e escolha “Adicionar à Tela de Início”.</p>
      <p v-else class="mt-2 text-sm text-neutral-500">Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>
    </section>
    <p class="my-8 text-center text-xs text-neutral-500">Sphere 360 · suas fotos nunca saem do seu dispositivo.</p>
  </div>
</template>
