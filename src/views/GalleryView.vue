<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, LayoutGrid, List, Plus, CheckSquare, Trash2, X, FolderPlus, Orbit } from '@lucide/vue'
import { useLibraryStore, sortPhotos } from '@/stores/library'
import { usePreferencesStore } from '@/stores/preferences'
import { useUiStore } from '@/stores/ui'
import { useToastStore } from '@/stores/toasts'
import { useStorageQuota } from '@/composables/useStorageQuota'
import { forgetThumbnails } from '@/composables/useObjectUrl'
import { formatBytes } from '@/services/images/validation'
import PhotoGrid from '@/components/gallery/PhotoGrid.vue'
import EmptyGallery from '@/components/gallery/EmptyGallery.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { SortKey } from '@/types'

const props = defineProps<{ albumId?: string }>()
const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const prefs = usePreferencesStore()
const ui = useUiStore()
const toasts = useToastStore()
const quota = useStorageQuota()

const selecting = ref(false)
const selected = ref(new Set<string>())
const confirmDelete = ref(false)
const albumPicker = ref(false)

const isFavorites = computed(() => route.meta.filter === 'favorites')
const album = computed(() => (props.albumId ? lib.albums.find((a) => a.id === props.albumId) : undefined))
const title = computed(() => (album.value ? album.value.name : isFavorites.value ? 'Favoritos' : 'Minha galeria'))
const isHome = computed(() => !album.value && !isFavorites.value)

const filtered = computed(() => {
  const q = ui.search.trim().toLocaleLowerCase('pt-BR')
  let list = lib.photos
  if (isFavorites.value) list = list.filter((p) => p.favorite)
  if (props.albumId) list = list.filter((p) => p.albumIds.includes(props.albumId!))
  if (q) list = list.filter((p) => p.name.toLocaleLowerCase('pt-BR').includes(q))
  return sortPhotos(list, prefs.prefs.sort)
})
const recent = computed(() => sortPhotos(lib.photos, 'date-desc').slice(0, 4))
const favorites = computed(() => lib.photos.filter((p) => p.favorite).slice(0, 4))
const showSections = computed(() => isHome.value && !ui.search && lib.photos.length > 4)

watch(() => route.fullPath, () => clearSel())

function clearSel() { selecting.value = false; selected.value = new Set() }
function openFrom(list: { id: string }[], id: string) {
  lib.navigationIds = list.map((p) => p.id)
  void router.push(`/foto/${id}`)
}
const open = (id: string) => openFrom(filtered.value, id)
function toggleSelect(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selected.value = s
}
async function fav(id: string) {
  try { await lib.toggleFavorite(id) } catch (e) { toasts.push((e as Error).message, 'error') }
}
async function doDelete() {
  const ids = [...selected.value]
  confirmDelete.value = false
  try {
    await lib.deletePhotos(ids)
    forgetThumbnails(ids)
    toasts.push(`${ids.length} ${ids.length === 1 ? 'foto excluída' : 'fotos excluídas'}.`, 'success')
    clearSel()
    await quota.refresh()
  } catch (e) { toasts.push((e as Error).message, 'error') }
}
async function addToAlbum(albumId: string) {
  albumPicker.value = false
  await lib.setAlbumMembership([...selected.value], albumId, true)
  toasts.push('Fotos adicionadas ao álbum.', 'success')
  clearSel()
}
async function removeFromAlbum() {
  if (!props.albumId) return
  await lib.setAlbumMembership([...selected.value], props.albumId, false)
  toasts.push('Fotos removidas do álbum.', 'success')
  clearSel()
}
const sorts: { v: SortKey; l: string }[] = [
  { v: 'date-desc', l: 'Mais recentes' }, { v: 'date-asc', l: 'Mais antigas' },
  { v: 'name-asc', l: 'Nome (A–Z)' }, { v: 'name-desc', l: 'Nome (Z–A)' },
]
</script>
<template>
  <div class="mx-auto max-w-[2400px] px-4 pt-[calc(var(--sat)+16px)] sm:px-6 lg:px-10 lg:pt-8">
    <header class="flex flex-wrap items-center gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <Orbit v-if="isHome" class="size-7 text-accent lg:hidden" />
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{{ isHome ? 'Sphere 360' : title }}</h1>
          <p class="text-xs text-neutral-500" data-testid="library-stats">{{ lib.photos.length }} {{ lib.photos.length === 1 ? 'fotografia' : 'fotografias' }} · {{ formatBytes(lib.totalSize) }} usados</p>
        </div>
      </div>
      <button class="btn-primary hidden sm:inline-flex" data-testid="add-photos" @click="ui.pickFiles()"><Plus class="size-5" /> Adicionar fotos</button>
    </header>

    <template v-if="lib.photos.length">
      <div class="sticky top-0 z-30 -mx-4 mt-4 flex flex-wrap items-center gap-2 bg-neutral-100/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 dark:bg-[#0a0a0f]/85">
        <template v-if="!selecting">
          <label class="relative min-w-0 flex-1 basis-48">
            <span class="sr-only">Buscar por nome</span>
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
            <input v-model="ui.search" type="search" class="input pl-9" placeholder="Buscar por nome" data-testid="search" />
          </label>
          <select v-model="prefs.prefs.sort" class="input w-auto" aria-label="Ordenar">
            <option v-for="s in sorts" :key="s.v" :value="s.v">{{ s.l }}</option>
          </select>
          <div class="flex rounded-xl bg-black/5 p-0.5 dark:bg-white/8" role="group" aria-label="Modo de visualização">
            <button class="icon-btn size-10 rounded-lg" :class="prefs.prefs.viewMode === 'grid' && 'bg-white shadow dark:bg-white/15'" aria-label="Grade" :aria-pressed="prefs.prefs.viewMode === 'grid'" @click="prefs.set('viewMode', 'grid')"><LayoutGrid class="size-4" /></button>
            <button class="icon-btn size-10 rounded-lg" :class="prefs.prefs.viewMode === 'list' && 'bg-white shadow dark:bg-white/15'" aria-label="Lista" :aria-pressed="prefs.prefs.viewMode === 'list'" @click="prefs.set('viewMode', 'list')"><List class="size-4" /></button>
          </div>
          <button class="btn-ghost" data-testid="select-mode" @click="selecting = true"><CheckSquare class="size-4" /> Selecionar</button>
        </template>
        <template v-else>
          <button class="icon-btn" aria-label="Cancelar seleção" @click="clearSel"><X class="size-5" /></button>
          <span class="flex-1 text-sm">{{ selected.size }} selecionada(s)</span>
          <button class="btn-ghost" @click="selected = new Set(filtered.map((p) => p.id))">Todas</button>
          <button class="btn-ghost" :disabled="!selected.size || !lib.albums.length" aria-label="Adicionar ao álbum" @click="albumPicker = true"><FolderPlus class="size-4" /><span class="hidden sm:inline">Álbum</span></button>
          <button v-if="albumId" class="btn-ghost" :disabled="!selected.size" @click="removeFromAlbum">Remover do álbum</button>
          <button class="btn-danger" :disabled="!selected.size" aria-label="Excluir selecionadas" data-testid="delete-selected" @click="confirmDelete = true"><Trash2 class="size-4" /><span class="hidden sm:inline">Excluir</span></button>
        </template>
      </div>
      <template v-if="showSections && !selecting">
        <section class="mt-6">
          <h2 class="mb-3 text-lg font-semibold">Recentes</h2>
          <PhotoGrid :photos="recent" mode="grid" :selecting="false" :selected="selected" @open="(id) => openFrom(recent, id)" @favorite="fav" @toggle-select="toggleSelect" />
        </section>
        <section v-if="favorites.length" class="mt-8">
          <div class="mb-3 flex items-center justify-between"><h2 class="text-lg font-semibold">Favoritos</h2><RouterLink to="/favoritos" class="text-sm text-accent">Ver todos</RouterLink></div>
          <PhotoGrid :photos="favorites" mode="grid" :selecting="false" :selected="selected" @open="(id) => openFrom(favorites, id)" @favorite="fav" @toggle-select="toggleSelect" />
        </section>
        <section v-if="lib.albums.length" class="mt-8">
          <div class="mb-3 flex items-center justify-between"><h2 class="text-lg font-semibold">Álbuns</h2><RouterLink to="/albuns" class="text-sm text-accent">Gerenciar</RouterLink></div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            <RouterLink v-for="a in lib.albums" :key="a.id" :to="`/album/${a.id}`" class="btn-ghost shrink-0">{{ a.name }}</RouterLink>
          </div>
        </section>
        <h2 class="mt-8 mb-3 text-lg font-semibold">Todas as fotos</h2>
      </template>

      <div :class="!showSections || selecting ? 'mt-4' : ''">
        <PhotoGrid v-if="filtered.length" :photos="filtered" :mode="prefs.prefs.viewMode" :selecting="selecting" :selected="selected" @open="open" @toggle-select="toggleSelect" @favorite="fav" />
        <EmptyGallery v-else :action="false" :title="ui.search ? 'Nenhum resultado' : 'Nada por aqui ainda'" :text="ui.search ? `Nenhuma foto com “${ui.search}”.` : isFavorites ? 'Toque no coração de uma foto para adicioná-la aos favoritos.' : 'Selecione fotos na galeria e adicione-as a este álbum.'" />
      </div>
    </template>
    <EmptyGallery v-else-if="lib.loaded" />

    <ConfirmDialog :open="confirmDelete" danger confirm-label="Excluir" :title="`Excluir ${selected.size} ${selected.size === 1 ? 'foto' : 'fotos'}?`" message="Os arquivos originais e miniaturas serão removidos permanentemente deste dispositivo." @confirm="doDelete" @cancel="confirmDelete = false" />
    <ConfirmDialog :open="albumPicker" title="Adicionar ao álbum" confirm-label="Fechar" @confirm="albumPicker = false" @cancel="albumPicker = false">
      <div class="mt-4 flex flex-col gap-1">
        <button v-for="a in lib.albums" :key="a.id" class="btn-ghost justify-start" @click="addToAlbum(a.id)">{{ a.name }}</button>
      </div>
    </ConfirmDialog>
  </div>
</template>
