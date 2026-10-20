import type { CroppedPanoData, PanoramaCheck } from '@/types'

export const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Resolve o MIME (alguns seletores móveis entregam `type` vazio). */
export function resolveMime(file: { name: string; type: string }): string | null {
  if ((SUPPORTED_MIME as readonly string[]).includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!file.type && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext]
  return null
}

/** Verifica assinatura binária (magic bytes) do arquivo. */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return 'image/webp'
  return null
}

function xmpNumber(xmp: string, key: string): number | undefined {
  const re = new RegExp(`GPano:${key}(?:="([^"]*)"|>([^<]*)<)`)
  const m = xmp.match(re)
  const v = m ? (m[1] ?? m[2]) : undefined
  if (v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Extrai o pacote XMP GPano (Google Photo Sphere) dos bytes do arquivo. */
export function parseGPano(text: string): (CroppedPanoData & { projectionType?: string }) | null {
  const start = text.indexOf('<x:xmpmeta')
  if (start < 0) return null
  const end = text.indexOf('</x:xmpmeta>', start)
  const xmp = text.slice(start, end < 0 ? undefined : end)
  if (!xmp.includes('GPano:')) return null
  const fullWidth = xmpNumber(xmp, 'FullPanoWidthPixels')
  const fullHeight = xmpNumber(xmp, 'FullPanoHeightPixels')
  const croppedWidth = xmpNumber(xmp, 'CroppedAreaImageWidthPixels')
  const croppedHeight = xmpNumber(xmp, 'CroppedAreaImageHeightPixels')
  const croppedX = xmpNumber(xmp, 'CroppedAreaLeftPixels') ?? 0
  const croppedY = xmpNumber(xmp, 'CroppedAreaTopPixels') ?? 0
  const projMatch = xmp.match(/GPano:ProjectionType(?:="([^"]*)"|>([^<]*)<)/)
  const projectionType = projMatch ? (projMatch[1] ?? projMatch[2]) : undefined
  if (!fullWidth || !fullHeight || !croppedWidth || !croppedHeight) return null
  const heading = xmpNumber(xmp, 'PoseHeadingDegrees')
  return {
    fullWidth, fullHeight, croppedWidth, croppedHeight, croppedX, croppedY,
    ...(heading !== undefined ? { poseHeading: heading } : {}),
    projectionType,
  }
}

/** Tolerância da razão 2:1 (aceita pequenos arredondamentos de câmeras). */
export const RATIO_TOLERANCE = 0.02

export function checkPanorama(width: number, height: number, xmpText?: string): PanoramaCheck {
  if (width <= 0 || height <= 0) return { ok: false, reason: 'Dimensões inválidas.' }
  const gpano = xmpText ? parseGPano(xmpText) : null
  if (gpano && (!gpano.projectionType || gpano.projectionType === 'equirectangular')) {
    const full = Math.abs(gpano.fullWidth / gpano.fullHeight - 2) <= RATIO_TOLERANCE
    const isComplete =
      gpano.croppedWidth === gpano.fullWidth && gpano.croppedHeight === gpano.fullHeight
    if (full) {
      const { projectionType: _p, ...panoData } = gpano
      void _p
      return isComplete
        ? { ok: true, projection: 'equirectangular' }
        : { ok: true, projection: 'cropped', panoData }
    }
  }
  const ratio = width / height
  if (Math.abs(ratio - 2) <= 2 * RATIO_TOLERANCE) return { ok: true, projection: 'equirectangular' }
  return {
    ok: false,
    reason: `Proporção ${ratio.toFixed(2)}:1 — panoramas 360° equiretangulares têm proporção 2:1.`,
  }
}

export async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const v = bytes / 1024 ** i
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`
}

export function formatResolution(w: number, h: number): string {
  const mp = (w * h) / 1e6
  return `${w}×${h} · ${mp.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MP`
}

export function mimeLabel(mime: string): string {
  return mime.replace('image/', '').replace('jpeg', 'JPEG').toUpperCase()
}
