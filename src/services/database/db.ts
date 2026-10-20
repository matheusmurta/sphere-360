import Dexie, { type EntityTable } from 'dexie'
import type { Album, PhotoBlobRecord, PhotoMeta } from '@/types'

export class SphereDB extends Dexie {
  photos!: EntityTable<PhotoMeta, 'id'>
  originals!: EntityTable<PhotoBlobRecord, 'id'>
  thumbnails!: EntityTable<PhotoBlobRecord, 'id'>
  albums!: EntityTable<Album, 'id'>

  constructor(name = 'sphere360') {
    super(name)
    this.version(1).stores({
      photos: 'id, name, importedAt, &hash, favorite, *albumIds',
      originals: 'id',
      thumbnails: 'id',
      albums: 'id, name, createdAt',
    })
  }
}

export const db = new SphereDB()
