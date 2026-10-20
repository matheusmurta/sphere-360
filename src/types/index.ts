export type ProjectionKind = 'equirectangular' | 'cropped' | 'forced'

export interface CroppedPanoData {
  fullWidth: number
  fullHeight: number
  croppedWidth: number
  croppedHeight: number
  croppedX: number
  croppedY: number
  poseHeading?: number
}

/** Metadados leves (listagem). Blobs ficam em tabelas separadas. */
export interface PhotoMeta {
  id: string
  name: string
  mimeType: string
  size: number
  width: number
  height: number
  importedAt: number
  lastModified: number
  hash: string
  favorite: boolean
  albumIds: string[]
  projection: ProjectionKind
  panoData?: CroppedPanoData
  thumbWidth: number
  thumbHeight: number
}

export interface PhotoBlobRecord {
  id: string
  /** Registros novos usam ArrayBuffer (Blobs no IndexedDB são instáveis no Safari/iOS). */
  blob?: Blob
  data?: ArrayBuffer
  type?: string
}

export interface Album {
  id: string
  name: string
  createdAt: number
}

export type SortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
export type ViewMode = 'grid' | 'list'
export type ThemeMode = 'dark' | 'light'

export interface Preferences {
  theme: ThemeMode
  sort: SortKey
  viewMode: ViewMode
  autorotate: boolean
  autorotateSpeed: number
  defaultZoom: number
  lastPhotoId: string | null
}

export type PanoramaCheck =
  | { ok: true; projection: 'equirectangular' | 'cropped'; panoData?: CroppedPanoData }
  | { ok: false; reason: string }
