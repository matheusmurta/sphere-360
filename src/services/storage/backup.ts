import type { Album, PhotoMeta } from '@/types'
import type { Repository } from '@/services/database/repository'

/**
 * Formato de backup ".sphere360":
 *   [8 bytes magic "SPHR360\0"][4 bytes uint32 LE: tamanho do cabeçalho JSON][cabeçalho JSON][blobs concatenados]
 * Blobs são concatenados sem Base64 (Blob compõe de forma preguiçosa, sem duplicar memória).
 */
const MAGIC = 'SPHR360\0'
export const BACKUP_VERSION = 1

interface BackupEntry {
  meta: PhotoMeta
  originalOffset: number
  originalSize: number
  thumbOffset: number
  thumbSize: number
}
interface BackupHeader {
  app: 'sphere360'
  version: number
  createdAt: number
  albums: Album[]
  photos: BackupEntry[]
}

export async function createBackup(repo: Repository): Promise<Blob> {
  const photos = await repo.listPhotos()
  const albums = await repo.listAlbums()
  const parts: Blob[] = []
  const entries: BackupEntry[] = []
  let offset = 0
  for (const meta of photos) {
    const original = await repo.getOriginal(meta.id)
    const thumb = await repo.getThumbnail(meta.id)
    if (!original || !thumb) continue
    entries.push({
      meta,
      originalOffset: offset,
      originalSize: original.size,
      thumbOffset: offset + original.size,
      thumbSize: thumb.size,
    })
    parts.push(original, thumb)
    offset += original.size + thumb.size
  }
  const header: BackupHeader = { app: 'sphere360', version: BACKUP_VERSION, createdAt: Date.now(), albums, photos: entries }
  const headerBytes = new TextEncoder().encode(JSON.stringify(header))
  const len = new Uint8Array(4)
  new DataView(len.buffer).setUint32(0, headerBytes.length, true)
  return new Blob([new TextEncoder().encode(MAGIC), len, headerBytes, ...parts], { type: 'application/octet-stream' })
}

export interface RestoreResult {
  imported: number
  skipped: number
  albums: number
}

async function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

export async function restoreBackup(file: Blob, repo: Repository): Promise<RestoreResult> {
  const magic = new TextDecoder().decode(await readBytes(file.slice(0, 8)))
  if (magic !== MAGIC) throw new Error('Arquivo de backup inválido.')
  const lenBytes = await readBytes(file.slice(8, 12))
  const headerLen = new DataView(lenBytes.buffer).getUint32(0, true)
  if (headerLen <= 0 || 12 + headerLen > file.size) throw new Error('Backup corrompido.')
  let header: BackupHeader
  try {
    header = JSON.parse(new TextDecoder().decode(await readBytes(file.slice(12, 12 + headerLen))))
  } catch {
    throw new Error('Backup corrompido.')
  }
  if (header.app !== 'sphere360' || header.version > BACKUP_VERSION) throw new Error('Versão de backup não suportada.')
  const base = 12 + headerLen

  // Álbuns: mescla por id; conflito de id com nome diferente mantém o local.
  const existingAlbums = new Map((await repo.listAlbums()).map((a) => [a.id, a]))
  let albumCount = 0
  for (const a of header.albums) {
    if (!existingAlbums.has(a.id)) {
      await repo.db.albums.add(a)
      albumCount++
    }
  }

  let imported = 0
  let skipped = 0
  for (const e of header.photos) {
    const dup = await repo.findByHash(e.meta.hash)
    const sameId = await repo.getPhoto(e.meta.id)
    if (dup || sameId) {
      skipped++
      continue
    }
    const end = base + e.thumbOffset + e.thumbSize
    if (end > file.size) {
      skipped++
      continue
    }
    const original = file.slice(base + e.originalOffset, base + e.originalOffset + e.originalSize, e.meta.mimeType)
    const thumb = file.slice(base + e.thumbOffset, end, 'image/webp')
    // materializa os pedaços para não manter referência ao arquivo de backup inteiro
    const o = new Blob([await original.arrayBuffer()], { type: e.meta.mimeType })
    const t = new Blob([await thumb.arrayBuffer()], { type: thumb.type })
    await repo.addPhoto({ ...e.meta, albumIds: e.meta.albumIds ?? [] }, o, t)
    imported++
  }
  return { imported, skipped, albums: albumCount }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
