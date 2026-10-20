import { checkPanorama, resolveMime, sha256, sniffMime } from './validation'
import type { CroppedPanoData, ProjectionKind } from '@/types'

export const THUMB_WIDTH = 640

export interface AnalyzedImage {
  mime: string
  width: number
  height: number
  hash: string
  thumbnail: Blob
  thumbWidth: number
  thumbHeight: number
  projection: ProjectionKind | null
  panoData?: CroppedPanoData
  incompatibleReason?: string
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

async function decode(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob)
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      /* fallback abaixo (Safari antigo / imagens enormes) */
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } catch {
    throw new ImportError('Não foi possível decodificar a imagem (arquivo corrompido ou grande demais para este dispositivo).')
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function makeThumbnail(source: CanvasImageSource, w: number, h: number) {
  const tw = Math.min(THUMB_WIDTH, w)
  const th = Math.max(1, Math.round((h / w) * tw))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImportError('Canvas indisponível para gerar miniatura.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, tw, th)
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.82))
  const final = blob ?? (await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82)))
  canvas.width = canvas.height = 0
  if (!final) throw new ImportError('Falha ao gerar miniatura.')
  return { blob: final, width: tw, height: th }
}

/** Analisa um arquivo: valida, extrai metadados XMP, calcula hash e gera miniatura. Não altera o original. */
export async function analyzeFile(file: File): Promise<AnalyzedImage> {
  const declared = resolveMime(file)
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sniffed = sniffMime(bytes)
  const mime = sniffed ?? declared
  if (!mime || !sniffed) throw new ImportError('Formato não suportado. Use JPEG, PNG ou WebP.')

  // XMP normalmente fica nos primeiros KB do arquivo
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 256 * 1024)))
  const hash = await sha256(buffer)

  const decoded = await decode(file)
  try {
    const check = checkPanorama(decoded.width, decoded.height, head)
    const thumb = await makeThumbnail(decoded.source, decoded.width, decoded.height)
    return {
      mime,
      width: decoded.width,
      height: decoded.height,
      hash,
      thumbnail: thumb.blob,
      thumbWidth: thumb.width,
      thumbHeight: thumb.height,
      projection: check.ok ? check.projection : null,
      ...(check.ok && check.panoData ? { panoData: check.panoData } : {}),
      ...(!check.ok ? { incompatibleReason: check.reason } : {}),
    }
  } finally {
    decoded.close()
  }
}
