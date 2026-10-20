import { onBeforeUnmount, ref, shallowRef, type Ref } from 'vue'
import { Viewer, events, type PanoData } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import '@photo-sphere-viewer/core/index.css'
import type { PhotoMeta } from '@/types'

const LANG = {
  zoom: 'Zoom', zoomOut: 'Diminuir zoom', zoomIn: 'Aumentar zoom',
  moveUp: 'Mover para cima', moveDown: 'Mover para baixo', moveLeft: 'Mover para a esquerda', moveRight: 'Mover para a direita',
  description: 'Descrição', download: 'Baixar', fullscreen: 'Tela cheia', loading: 'Carregando…', menu: 'Menu', close: 'Fechar',
  twoFingers: 'Use dois dedos para navegar', ctrlZoom: 'Use Ctrl + rolagem para dar zoom',
  loadError: 'Não foi possível carregar o panorama', webglError: 'Seu navegador não parece suportar WebGL',
  stereoNotification: 'Toque em qualquer lugar para sair do modo VR.',
  pleaseRotate: 'Gire o aparelho para a horizontal', tapToContinue: '(ou toque para continuar)',
} as Record<string, string>

let maxTexture = 0
export function getMaxTextureSize(): number {
  if (maxTexture) return maxTexture
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    maxTexture = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 4096
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { maxTexture = 4096 }
  return maxTexture
}

/** Reduz temporariamente (em memória) imagens maiores que a textura máxima. O original nunca é alterado. */
async function fitToDevice(blob: Blob, meta: PhotoMeta): Promise<{ blob: Blob; scale: number }> {
  const max = Math.min(getMaxTextureSize(), 16384)
  if (meta.width <= max) return { blob, scale: 1 }
  const w = max, h = Math.round((meta.height / meta.width) * max)
  const bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0)
  bmp.close()
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92))
  c.width = c.height = 0
  if (!out) throw new Error('Falha ao reduzir a imagem')
  return { blob: out, scale: w / meta.width }
}
export function usePanoramaViewer(container: Ref<HTMLElement | null>) {
  const viewer = shallowRef<Viewer | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const reduced = ref(false)
  const gyroEnabled = ref(false)
  const stereoEnabled = ref(false)
  const autorotating = ref(false)
  const fullscreen = ref(false)
  let currentUrl: string | null = null
  let loadToken = 0

  function init(opts: { zoom: number; autorotateSpeed: number }) {
    if (viewer.value || !container.value) return
    const v = new Viewer({
      container: container.value,
      navbar: false,
      lang: LANG as never,
      loadingTxt: 'Carregando…',
      defaultZoomLvl: opts.zoom,
      mousewheel: true,
      touchmoveTwoFingers: false,
      keyboard: 'always',
      canvasBackground: '#000',
      defaultTransition: { speed: 600, rotation: false, effect: 'fade' },
      plugins: [
        GyroscopePlugin.withConfig({ touchmove: true, roll: true }),
        StereoPlugin,
        AutorotatePlugin.withConfig({ autostartDelay: undefined, autostartOnIdle: false, autorotateSpeed: `${opts.autorotateSpeed}rpm` }),
      ],
    })
    viewer.value = v
    const gyro = v.getPlugin<GyroscopePlugin>(GyroscopePlugin)
    const stereo = v.getPlugin<StereoPlugin>(StereoPlugin)
    const auto = v.getPlugin<AutorotatePlugin>(AutorotatePlugin)
    gyro.addEventListener('gyroscope-updated', (e) => { gyroEnabled.value = (e as unknown as { gyroscopeEnabled: boolean }).gyroscopeEnabled })
    stereo.addEventListener('stereo-updated', (e) => { stereoEnabled.value = (e as unknown as { stereoEnabled: boolean }).stereoEnabled })
    auto.addEventListener('autorotate', (e) => { autorotating.value = (e as unknown as { autorotateEnabled: boolean }).autorotateEnabled })
    v.addEventListener(events.FullscreenEvent.type, (e) => { fullscreen.value = e.fullscreenEnabled })
    v.addEventListener(events.PanoramaErrorEvent.type, () => { error.value = 'Não foi possível carregar este panorama.' })
    container.value.querySelector('canvas')?.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      error.value = 'O processador gráfico foi reiniciado pelo sistema. Toque em "Tentar novamente".'
    })
  }

  async function show(meta: PhotoMeta, blob: Blob) {
    const v = viewer.value
    if (!v) return
    const token = ++loadToken
    loading.value = true
    error.value = null
    try {
      const fitted = await fitToDevice(blob, meta)
      if (token !== loadToken) return
      reduced.value = fitted.scale < 1
      const url = URL.createObjectURL(fitted.blob)
      let panoData: PanoData | undefined
      if (meta.projection === 'cropped' && meta.panoData) {
        const k = fitted.scale, p = meta.panoData
        panoData = {
          isEquirectangular: true,
          fullWidth: Math.round(p.fullWidth * k), fullHeight: Math.round(p.fullHeight * k),
          croppedWidth: Math.round(p.croppedWidth * k), croppedHeight: Math.round(p.croppedHeight * k),
          croppedX: Math.round(p.croppedX * k), croppedY: Math.round(p.croppedY * k),
        } as PanoData
      }
      const ok = await v.setPanorama(url, { ...(panoData ? { panoData } : {}), showLoader: true, transition: false, position: { yaw: 0, pitch: 0 } })
      const old = currentUrl
      currentUrl = url
      if (old) URL.revokeObjectURL(old)
      if (!ok && token === loadToken) error.value = 'Não foi possível carregar este panorama.'
    } catch {
      if (token === loadToken) error.value = 'Não foi possível exibir esta imagem neste dispositivo.'
    } finally {
      if (token === loadToken) loading.value = false
    }
  }

  const plugin = <T>(p: unknown) => (viewer.value?.getPlugin(p as never) as T | undefined) ?? null
  const zoomIn = () => viewer.value?.zoomIn(10)
  const zoomOut = () => viewer.value?.zoomOut(10)
  const resetView = (zoom: number) => viewer.value?.animate({ yaw: 0, pitch: 0, zoom, speed: '4rpm' })
  function centerHorizon() {
    const v = viewer.value
    if (v) v.animate({ yaw: v.getPosition().yaw, pitch: 0, speed: '4rpm' })
  }
  function setAutorotateSpeed(speed: number) {
    plugin<AutorotatePlugin>(AutorotatePlugin)?.setOptions({ autorotateSpeed: `${speed}rpm` })
  }
  function toggleAutorotate(speed: number) {
    setAutorotateSpeed(speed)
    plugin<AutorotatePlugin>(AutorotatePlugin)?.toggle()
  }
  const toggleFullscreen = () => viewer.value?.toggleFullscreen()

  function destroy() {
    loadToken++
    viewer.value?.destroy()
    viewer.value = null
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
  onBeforeUnmount(destroy)

  return {
    viewer, loading, error, reduced, gyroEnabled, stereoEnabled, autorotating, fullscreen,
    init, show, zoomIn, zoomOut, resetView, centerHorizon, toggleAutorotate, setAutorotateSpeed, toggleFullscreen, destroy,
    gyroscope: () => plugin<GyroscopePlugin>(GyroscopePlugin),
    stereo: () => plugin<StereoPlugin>(StereoPlugin),
  }
}
