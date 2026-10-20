import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { repository as defaultRepo, uuid, type Repository } from '@/services/database/repository'
import { analyzeFile, ImportError, type AnalyzedImage } from '@/services/images/analyze'
import { toStorageError } from '@/services/storage/errors'
import type { Album, PhotoMeta, SortKey } from '@/types'

export type ImportStatus = 'pending' | 'processing' | 'done' | 'duplicate' | 'incompatible' | 'error' | 'cancelled'
export interface ImportItem {
  key: string
  file: File
  status: ImportStatus
  message?: string
  previewUrl?: string
  analyzed?: AnalyzedImage
}

export function sortPhotos(list: PhotoMeta[], sort: SortKey): PhotoMeta[] {
  const arr = [...list]
  const coll = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })
  switch (sort) {
    case 'date-asc': return arr.sort((a, b) => a.importedAt - b.importedAt)
    case 'name-asc': return arr.sort((a, b) => coll.compare(a.name, b.name))
    case 'name-desc': return arr.sort((a, b) => coll.compare(b.name, a.name))
    default: return arr.sort((a, b) => b.importedAt - a.importedAt)
  }
}

export function stripExtension(name: string) {
  return name.replace(/\.(jpe?g|png|webp)$/i, '')
}

export const createLibraryStore = (repo: Repository) =>
  defineStore('library', () => {
    const photos = ref<PhotoMeta[]>([])
    const albums = ref<Album[]>([])
    const loaded = ref(false)
    const navigationIds = ref<string[]>([])
    const importItems = ref<ImportItem[]>([])
    const importing = ref(false)
    let cancelRequested = false

    const totalSize = computed(() => photos.value.reduce((s, p) => s + p.size, 0))
    const byId = computed(() => new Map(photos.value.map((p) => [p.id, p])))

    async function load() {
      const [p, a] = await Promise.all([repo.listPhotos(), repo.listAlbums()])
      photos.value = p
      albums.value = a
      loaded.value = true
    }

    async function persistAnalyzed(file: File, a: AnalyzedImage, forced: boolean) {
      const meta: PhotoMeta = {
        id: uuid(),
        name: stripExtension(file.name) || 'Sem nome',
        mimeType: a.mime,
        size: file.size,
        width: a.width,
        height: a.height,
        importedAt: Date.now(),
        lastModified: file.lastModified || Date.now(),
        hash: a.hash,
        favorite: false,
        albumIds: [],
        projection: forced ? 'forced' : (a.projection ?? 'forced'),
        ...(a.panoData ? { panoData: a.panoData } : {}),
        thumbWidth: a.thumbWidth,
        thumbHeight: a.thumbHeight,
      }
      // Original armazenado sem recompressão
      await repo.addPhoto(meta, file, a.thumbnail)
      photos.value.push(meta)
      return meta
    }

    function revokePreviews() {
      for (const it of importItems.value) if (it.previewUrl) URL.revokeObjectURL(it.previewUrl)
    }

    async function importFiles(files: File[]) {
      if (importing.value) return
      revokePreviews()
      importItems.value = files.map((file, i) => ({ key: `${Date.now()}-${i}`, file, status: 'pending' }))
      importing.value = true
      cancelRequested = false
      const seen = new Set<string>()
      try {
        for (const item of importItems.value) {
          if (cancelRequested) { item.status = 'cancelled'; continue }
          item.status = 'processing'
          await new Promise((r) => setTimeout(r, 0))
          try {
            const a = await analyzeFile(item.file)
            item.analyzed = a
            item.previewUrl = URL.createObjectURL(a.thumbnail)
            if (seen.has(a.hash) || (await repo.findByHash(a.hash))) {
              item.status = 'duplicate'
              item.message = 'Esta foto já está na biblioteca.'
              continue
            }
            seen.add(a.hash)
            if (!a.projection) {
              item.status = 'incompatible'
              item.message = a.incompatibleReason
              continue
            }
            await persistAnalyzed(item.file, a, false)
            item.status = 'done'
          } catch (err) {
            item.status = 'error'
            if (err instanceof ImportError) item.message = err.message
            else {
              const se = toStorageError(err)
              item.message = se.message
              if (se.kind === 'quota') cancelRequested = true
            }
          }
        }
      } finally {
        importing.value = false
      }
    }

    async function forceImport(key: string) {
      const item = importItems.value.find((i) => i.key === key)
      if (!item?.analyzed || item.status !== 'incompatible') return
      try {
        await persistAnalyzed(item.file, item.analyzed, true)
        item.status = 'done'
        item.message = 'Importada como panorama forçado — pode aparecer distorcida.'
      } catch (err) {
        item.status = 'error'
        item.message = toStorageError(err).message
      }
    }

    function cancelImport() { cancelRequested = true }
    function clearImport() {
      if (importing.value) return
      revokePreviews()
      importItems.value = []
    }
    async function update(id: string, changes: Partial<Omit<PhotoMeta, 'id'>>) {
      await repo.updatePhoto(id, changes)
      const p = byId.value.get(id)
      if (p) Object.assign(p, changes)
    }

    const toggleFavorite = (id: string) => {
      const p = byId.value.get(id)
      return p ? update(id, { favorite: !p.favorite }) : Promise.resolve()
    }
    const rename = (id: string, name: string) => {
      const n = name.trim()
      if (!n) return Promise.reject(new Error('O nome não pode ficar vazio.'))
      return update(id, { name: n })
    }

    async function deletePhotos(ids: string[]) {
      await repo.deletePhotos(ids)
      const set = new Set(ids)
      photos.value = photos.value.filter((p) => !set.has(p.id))
      navigationIds.value = navigationIds.value.filter((id) => !set.has(id))
    }

    async function createAlbum(name: string) {
      if (!name.trim()) throw new Error('Informe um nome para o álbum.')
      const a = await repo.createAlbum(name)
      albums.value.push(a)
      return a
    }
    async function renameAlbum(id: string, name: string) {
      if (!name.trim()) throw new Error('Informe um nome para o álbum.')
      await repo.renameAlbum(id, name)
      const a = albums.value.find((x) => x.id === id)
      if (a) a.name = name.trim()
    }
    async function deleteAlbum(id: string) {
      await repo.deleteAlbum(id)
      albums.value = albums.value.filter((a) => a.id !== id)
      for (const p of photos.value) p.albumIds = p.albumIds.filter((x) => x !== id)
    }
    async function setAlbumMembership(photoIds: string[], albumId: string, member: boolean) {
      await repo.setAlbumMembership(photoIds, albumId, member)
      for (const id of photoIds) {
        const p = byId.value.get(id)
        if (!p) continue
        const s = new Set(p.albumIds)
        if (member) s.add(albumId)
        else s.delete(albumId)
        p.albumIds = [...s]
      }
    }

    return {
      photos, albums, loaded, navigationIds, importItems, importing, totalSize, byId,
      load, importFiles, forceImport, cancelImport, clearImport,
      toggleFavorite, rename, deletePhotos,
      createAlbum, renameAlbum, deleteAlbum, setAlbumMembership,
      getOriginal: repo.getOriginal, getThumbnail: repo.getThumbnail,
    }
  })

export const useLibraryStore = createLibraryStore(defaultRepo)
