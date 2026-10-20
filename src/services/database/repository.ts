import { db as defaultDb, type SphereDB } from './db'
import { toStorageError } from '@/services/storage/errors'
import type { Album, PhotoMeta } from '@/types'

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Repositório da biblioteca: toda operação de persistência passa por aqui. */
export function createRepository(db: SphereDB = defaultDb) {
  async function guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      throw toStorageError(err)
    }
  }

  return {
    db,
    listPhotos: () => guard(() => db.photos.toArray()),
    listAlbums: () => guard(() => db.albums.orderBy('createdAt').toArray()),
    getPhoto: (id: string) => guard(() => db.photos.get(id)),
    findByHash: (hash: string) => guard(() => db.photos.where('hash').equals(hash).first()),

    async addPhoto(meta: PhotoMeta, original: Blob, thumbnail: Blob) {
      return guard(() =>
        db.transaction('rw', db.photos, db.originals, db.thumbnails, async () => {
          await db.photos.add(meta)
          await db.originals.add({ id: meta.id, blob: original })
          await db.thumbnails.add({ id: meta.id, blob: thumbnail })
        }),
      )
    },

    getOriginal: async (id: string) => (await guard(() => db.originals.get(id)))?.blob,
    getThumbnail: async (id: string) => (await guard(() => db.thumbnails.get(id)))?.blob,

    updatePhoto: (id: string, changes: Partial<Omit<PhotoMeta, 'id'>>) =>
      guard(() => db.photos.update(id, changes)),

    async deletePhotos(ids: string[]) {
      return guard(() =>
        db.transaction('rw', db.photos, db.originals, db.thumbnails, async () => {
          await db.photos.bulkDelete(ids)
          await db.originals.bulkDelete(ids)
          await db.thumbnails.bulkDelete(ids)
        }),
      )
    },

    async createAlbum(name: string): Promise<Album> {
      const album: Album = { id: uuid(), name: name.trim(), createdAt: Date.now() }
      await guard(() => db.albums.add(album))
      return album
    },
    renameAlbum: (id: string, name: string) => guard(() => db.albums.update(id, { name: name.trim() })),

    async deleteAlbum(id: string) {
      return guard(() =>
        db.transaction('rw', db.albums, db.photos, async () => {
          await db.albums.delete(id)
          await db.photos
            .where('albumIds')
            .equals(id)
            .modify((p) => {
              p.albumIds = p.albumIds.filter((a) => a !== id)
            })
        }),
      )
    },

    async setAlbumMembership(photoIds: string[], albumId: string, member: boolean) {
      return guard(() =>
        db.transaction('rw', db.photos, async () => {
          const photos = await db.photos.bulkGet(photoIds)
          for (const p of photos) {
            if (!p) continue
            const set = new Set(p.albumIds)
            if (member) set.add(albumId)
            else set.delete(albumId)
            await db.photos.update(p.id, { albumIds: [...set] })
          }
        }),
      )
    },
  }
}

export type Repository = ReturnType<typeof createRepository>
export const repository = createRepository()
