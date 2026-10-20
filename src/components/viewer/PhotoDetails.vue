<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Download, Trash2, Pencil } from '@lucide/vue'
import type { PhotoMeta } from '@/types'
import { useLibraryStore } from '@/stores/library'
import { useToastStore } from '@/stores/toasts'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { forgetThumbnails } from '@/composables/useObjectUrl'
import { formatBytes, formatResolution, mimeLabel } from '@/services/images/validation'
import { downloadBlob } from '@/services/storage/backup'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps<{ photo: PhotoMeta }>()
const emit = defineEmits<{ close: []; deleted: [] }>()
const lib = useLibraryStore()
const toasts = useToastStore()
const quota = useStorageQuota()
const name = ref(props.photo.name)
const confirm = ref(false)
const proj = computed(() => ({ equirectangular: 'Equiretangular 2:1', cropped: 'Equiretangular parcial (XMP GPano)', forced: 'Forçada pelo usuário' })[props.photo.projection])

async function save() {
  try { await lib.rename(props.photo.id, name.value); toasts.push('Nome atualizado.', 'success') } catch (e) { toasts.push((e as Error).message, 'error') }
}
async function exportOriginal() {
  const b = await lib.getOriginal(props.photo.id)
  if (b) downloadBlob(b, `${props.photo.name}.${props.photo.mimeType.split('/')[1]!.replace('jpeg', 'jpg')}`)
}
async function remove() {
  confirm.value = false
  await lib.deletePhotos([props.photo.id])
  forgetThumbnails([props.photo.id])
  await quota.refresh()
  toasts.push('Foto excluída.', 'success')
  emit('deleted')
}
</script>

<template>
  <aside class="fixed inset-x-0 bottom-0 z-40 max-h-[75dvh] overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 pb-[calc(var(--sab)+20px)] text-white shadow-2xl sm:inset-x-auto sm:top-[calc(var(--sat)+72px)] sm:right-4 sm:bottom-auto sm:w-80 sm:rounded-3xl" aria-label="Informações da foto" data-testid="photo-details">
    <div class="flex items-center justify-between"><h2 class="font-semibold">Informações</h2><button class="icon-btn hover:bg-white/10" aria-label="Fechar informações" @click="emit('close')"><X class="size-5" /></button></div>
    <form class="mt-3 flex gap-2" @submit.prevent="save">
      <label class="flex-1"><span class="sr-only">Nome</span><input v-model="name" class="input bg-white/10" maxlength="120" data-testid="rename-input" /></label>
      <button class="icon-btn bg-white/10" aria-label="Salvar nome"><Pencil class="size-4" /></button>
    </form>
    <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt class="text-white/50">Formato</dt><dd>{{ mimeLabel(photo.mimeType) }}</dd>
      <dt class="text-white/50">Resolução</dt><dd>{{ formatResolution(photo.width, photo.height) }}</dd>
      <dt class="text-white/50">Tamanho</dt><dd>{{ formatBytes(photo.size) }}</dd>
      <dt class="text-white/50">Projeção</dt><dd>{{ proj }}</dd>
      <dt class="text-white/50">Importada</dt><dd>{{ new Date(photo.importedAt).toLocaleString('pt-BR') }}</dd>
      <dt class="text-white/50">Álbuns</dt><dd>{{ lib.albums.filter((a) => photo.albumIds.includes(a.id)).map((a) => a.name).join(', ') || '—' }}</dd>
    </dl>
    <div v-if="lib.albums.length" class="mt-4 flex flex-wrap gap-2">
      <button v-for="a in lib.albums" :key="a.id" class="rounded-full px-3 py-1.5 text-xs ring-1" :class="photo.albumIds.includes(a.id) ? 'bg-accent ring-accent' : 'ring-white/20'" :aria-pressed="photo.albumIds.includes(a.id)"
        @click="lib.setAlbumMembership([photo.id], a.id, !photo.albumIds.includes(a.id))">{{ a.name }}</button>
    </div>
    <div class="mt-5 flex gap-2">
      <button class="btn flex-1 bg-white/10" @click="exportOriginal"><Download class="size-4" /> Original</button>
      <button class="btn-danger flex-1" data-testid="delete-photo" @click="confirm = true"><Trash2 class="size-4" /> Excluir</button>
    </div>
    <ConfirmDialog :open="confirm" danger confirm-label="Excluir" title="Excluir esta foto?" message="O original e a miniatura serão removidos deste dispositivo." @confirm="remove" @cancel="confirm = false" />
  </aside>
</template>
