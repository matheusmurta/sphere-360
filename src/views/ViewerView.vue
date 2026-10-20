<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, LocateFixed, Minus, RotateCw, Maximize, Minimize, Smartphone, Glasses, Heart, Info, Eye, EyeOff, X, RefreshCw } from '@lucide/vue'
import { useLibraryStore, sortPhotos } from '@/stores/library'
import { usePreferencesStore } from '@/stores/preferences'
import { useToastStore } from '@/stores/toasts'
import { usePanoramaViewer } from '@/composables/usePanoramaViewer'
import { requestOrientationPermission, probeOrientation, needsIOSPermission, SENSOR_MESSAGES } from '@/composables/useGyroscope'
import { useWakeLock } from '@/composables/useWakeLock'
import PanoramaNavigator from '@/components/viewer/PanoramaNavigator.vue'
import PhotoDetails from '@/components/viewer/PhotoDetails.vue'
import CardboardGuide from '@/components/vr/CardboardGuide.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const lib = useLibraryStore()
const prefs = usePreferencesStore()
const toasts = useToastStore()
const container = ref<HTMLElement | null>(null)
const pv = usePanoramaViewer(container)
const wake = useWakeLock()

const controlsVisible = ref(true)
const hidden = ref(false)
const showInfo = ref(false)
const showGuide = ref(false)
const sensorMsg = ref<string | null>(null)
const secure = typeof window !== 'undefined' ? window.isSecureContext : true

const list = computed(() => {
  const ids = lib.navigationIds.filter((id) => lib.byId.has(id))
  if (ids.includes(props.id)) return ids.map((id) => lib.byId.get(id)!)
  return sortPhotos(lib.photos, prefs.prefs.sort)
})
const index = computed(() => list.value.findIndex((p) => p.id === props.id))
const photo = computed(() => lib.byId.get(props.id))

let idleTimer: ReturnType<typeof setTimeout> | undefined
function poke() {
  controlsVisible.value = true
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { if (!showInfo.value) controlsVisible.value = false }, 3500)
}
const showControls = computed(() => !pv.stereoEnabled.value && !hidden.value && controlsVisible.value)

/** Precarrega (apenas decodifica do IndexedDB) a próxima foto, se o dispositivo tiver memória suficiente. */
let preloaded: { id: string; blob: Blob } | null = null
async function preloadNext() {
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  if (mem !== undefined && mem < 4) return
  const next = list.value[index.value + 1]
  if (!next || next.size > 60 * 1024 * 1024) { preloaded = null; return }
  const blob = await lib.getOriginal(next.id).catch(() => undefined)
  preloaded = blob ? { id: next.id, blob } : null
}

async function load() {
  const meta = photo.value
  if (!meta) return
  let blob = preloaded?.id === meta.id ? preloaded.blob : await lib.getOriginal(meta.id).catch(() => undefined)
  preloaded = null
  if (!blob) {
    // Fotos antigas gravadas como Blob podem ter se perdido no iOS: abre pela miniatura.
    blob = await lib.getThumbnail(meta.id).catch(() => undefined)
    if (!blob) { pv.error.value = 'O arquivo original não foi encontrado no armazenamento local.'; return }
    prefs.set('lastPhotoId', meta.id)
    await pv.show({ ...meta, width: meta.thumbWidth, height: meta.thumbHeight, projection: 'forced' }, blob)
    toasts.push('O original desta foto foi perdido pelo Safari. Exibindo a miniatura; importe a foto novamente para qualidade total.', 'warning', 7000)
    return
  }
  prefs.set('lastPhotoId', meta.id)
  await pv.show(meta, blob)
  if (pv.reduced.value) toasts.push('Imagem maior que o limite gráfico do aparelho: exibindo versão reduzida temporária. O original foi preservado.', 'warning', 6000)
  void preloadNext()
}

function go(delta: number) {
  const p = list.value[index.value + delta]
  if (p) void router.replace(`/foto/${p.id}`)
}
const goTo = (id: string) => router.replace(`/foto/${id}`)
function back() { if (window.history.state?.back) router.back(); else void router.push('/') }

/** Giroscópio: a permissão do iOS é solicitada SINCRONAMENTE dentro do clique. */
function toggleGyro() {
  const g = pv.gyroscope()
  if (!g) return
  if (pv.gyroEnabled.value) { g.stop(); return }
  const perm = requestOrientationPermission()
  void perm.then(async (status) => {
    if (status !== 'granted') { sensorMsg.value = SENSOR_MESSAGES[status]; return }
    if (!needsIOSPermission() && !(await probeOrientation())) { sensorMsg.value = SENSOR_MESSAGES.unsupported; return }
    try { await g.start('smooth') } catch { sensorMsg.value = SENSOR_MESSAGES.unsupported }
  })
}
function recenter() {
  const g = pv.gyroscope()
  if (g?.isEnabled()) { g.stop(); void g.start('smooth') } else pv.resetView(prefs.prefs.defaultZoom)
}
function startVR() {
  showGuide.value = false
  const s = pv.stereo()
  if (!s) return
  const perm = requestOrientationPermission()
  void perm.then(async (status) => {
    if (status !== 'granted') { sensorMsg.value = SENSOR_MESSAGES[status]; return }
    if (!needsIOSPermission() && !(await probeOrientation())) {
      sensorMsg.value = 'O modo VR precisa do giroscópio, que não está disponível neste dispositivo.'
      return
    }
    try { await s.start(); void wake.acquire() } catch { sensorMsg.value = 'Não foi possível iniciar o modo VR neste navegador.' }
  })
}
function exitVR() { pv.stereo()?.stop() }
watch(pv.stereoEnabled, (on) => { if (!on) { void wake.release(); poke() } })

function toggleAuto() {
  pv.toggleAutorotate(prefs.prefs.autorotateSpeed)
  void nextTick(() => prefs.set('autorotate', pv.autorotating.value))
}
function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  if (e.key === 'Escape') { if (pv.stereoEnabled.value) exitVR(); else if (showInfo.value) showInfo.value = false; else back() }
  else if (e.key === 'n' || e.key === 'PageDown' || (e.key === 'ArrowRight' && e.shiftKey)) go(1)
  else if (e.key === 'p' || e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.shiftKey)) go(-1)
  else if (e.key === 'f') pv.toggleFullscreen()
  else if (e.key === 'h') hidden.value = !hidden.value
  else if (e.key === 'i') showInfo.value = !showInfo.value
  else if (e.key === 'r') pv.resetView(prefs.prefs.defaultZoom)
  else if (e.key === ' ') { e.preventDefault(); toggleAuto() }
  else return
  poke()
}
watch(() => prefs.prefs.autorotateSpeed, (s) => pv.setAutorotateSpeed(s))
const onResize = () => pv.viewer.value?.autoSize()

onMounted(async () => {
  if (!lib.loaded) await lib.load().catch(() => {})
  await nextTick()
  pv.init({ zoom: prefs.prefs.defaultZoom, autorotateSpeed: prefs.prefs.autorotateSpeed })
  await load()
  if (prefs.prefs.autorotate && !pv.autorotating.value) pv.toggleAutorotate(prefs.prefs.autorotateSpeed)
  window.addEventListener('keydown', onKey)
  window.addEventListener('orientationchange', onResize)
  screen.orientation?.addEventListener?.('change', onResize)
  poke()
})
onBeforeUnmount(() => {
  clearTimeout(idleTimer)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('orientationchange', onResize)
  screen.orientation?.removeEventListener?.('change', onResize)
  preloaded = null
})
watch(() => props.id, () => { void load(); poke() })
async function fav() { if (photo.value) await lib.toggleFavorite(photo.value.id) }
</script>
<template>
  <div class="fixed inset-0 bg-black text-white select-none" data-testid="viewer" @pointermove="poke" @pointerdown="poke">
    <div ref="container" class="absolute inset-0" data-testid="panorama" />

    <div v-if="pv.error.value" class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
      <p class="max-w-sm text-sm text-white/80">{{ pv.error.value }}</p>
      <div class="flex gap-2"><button class="btn bg-white/10" @click="back">Voltar</button><button class="btn-primary" @click="load"><RefreshCw class="size-4" /> Tentar novamente</button></div>
    </div>
    <div v-else-if="!photo && lib.loaded" class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4" role="alert">
      <p>Foto não encontrada.</p><button class="btn-primary" @click="router.push('/')">Ir para a galeria</button>
    </div>

    <button v-if="pv.stereoEnabled.value" class="absolute top-[calc(var(--sat)+8px)] left-1/2 z-30 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-black/40 text-white/70" aria-label="Sair do modo VR" data-testid="vr-exit" @click.stop="exitVR"><X class="size-5" /></button>

    <Transition name="fade">
      <div v-show="showControls" class="pointer-events-none absolute inset-0 z-10">
        <header class="glass pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-2 px-2 pt-[calc(var(--sat)+8px)] pb-2 sm:px-4">
          <button class="icon-btn hover:bg-white/10" aria-label="Voltar para a galeria" data-testid="viewer-back" @click="back"><ArrowLeft class="size-5" /></button>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-sm font-medium" data-testid="viewer-title">{{ photo?.name }}</h1>
            <p v-if="index >= 0" class="text-xs text-white/60" data-testid="viewer-counter">{{ index + 1 }} de {{ list.length }}</p>
          </div>
          <button class="icon-btn hover:bg-white/10" :aria-label="photo?.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'" :aria-pressed="!!photo?.favorite" data-testid="viewer-favorite" @click="fav"><Heart class="size-5" :class="photo?.favorite && 'fill-red-500 text-red-500'" /></button>
          <button class="icon-btn hover:bg-white/10" aria-label="Informações da foto" data-testid="viewer-info" @click="showInfo = !showInfo"><Info class="size-5" /></button>
          <button class="icon-btn hover:bg-white/10" aria-label="Ocultar controles (H)" @click="hidden = true"><EyeOff class="size-5" /></button>
        </header>

        <button v-if="index > 0" class="glass pointer-events-auto absolute top-1/2 left-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full" aria-label="Foto anterior" data-testid="viewer-prev" @click="go(-1)"><ChevronLeft class="size-6" /></button>
        <button v-if="index >= 0 && index < list.length - 1" class="glass pointer-events-auto absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full" aria-label="Próxima foto" data-testid="viewer-next" @click="go(1)"><ChevronRight class="size-6" /></button>
        <footer class="glass pointer-events-auto absolute inset-x-0 bottom-0 pb-safe">
          <PanoramaNavigator v-if="list.length > 1" :photos="list" :current-id="id" @select="goTo" />
          <div class="flex flex-wrap items-center justify-center gap-1 px-2 pb-2" role="toolbar" aria-label="Controles do panorama">
            <button class="icon-btn hover:bg-white/10" aria-label="Diminuir zoom" @click="pv.zoomOut()"><ZoomOut class="size-5" /></button>
            <button class="icon-btn hover:bg-white/10" aria-label="Aumentar zoom" @click="pv.zoomIn()"><ZoomIn class="size-5" /></button>
            <button class="icon-btn hover:bg-white/10" aria-label="Resetar câmera / recentralizar" @click="recenter"><LocateFixed class="size-5" /></button>
            <button class="icon-btn hover:bg-white/10" aria-label="Centralizar horizonte" @click="pv.centerHorizon()"><Minus class="size-5" /></button>
            <button class="icon-btn hover:bg-white/10" :class="pv.autorotating.value && 'bg-white/20'" aria-label="Rotação automática" :aria-pressed="pv.autorotating.value" @click="toggleAuto"><RotateCw class="size-5" /></button>
            <input v-if="pv.autorotating.value" v-model.number="prefs.prefs.autorotateSpeed" type="range" min="0.5" max="10" step="0.5" class="w-20 accent-accent" aria-label="Velocidade da rotação automática" />
            <button class="icon-btn hover:bg-white/10" :aria-label="pv.fullscreen.value ? 'Sair da tela cheia' : 'Tela cheia'" @click="pv.toggleFullscreen()"><component :is="pv.fullscreen.value ? Minimize : Maximize" class="size-5" /></button>
            <button class="icon-btn hover:bg-white/10" :class="pv.gyroEnabled.value && 'bg-accent'" :aria-pressed="pv.gyroEnabled.value" :aria-label="pv.gyroEnabled.value ? 'Voltar ao modo toque' : 'Ativar giroscópio'" data-testid="gyro-btn" @click="toggleGyro"><Smartphone class="size-5" /></button>
            <button class="btn-primary ml-1 h-11" data-testid="vr-btn" @click="showGuide = true"><Glasses class="size-5" /> <span class="hidden min-[400px]:inline">Entrar no VR</span></button>
          </div>
        </footer>
      </div>
    </Transition>

    <button v-if="hidden && !pv.stereoEnabled.value" class="glass absolute right-3 bottom-[calc(var(--sab)+12px)] z-10 flex size-11 items-center justify-center rounded-full" aria-label="Mostrar controles" @click="hidden = false"><Eye class="size-5" /></button>

    <PhotoDetails v-if="showInfo && photo" :key="photo.id" :photo="photo" @close="showInfo = false" @deleted="back" />
    <CardboardGuide v-if="showGuide" :secure="secure" @start="startVR" @cancel="showGuide = false" />

    <div v-if="sensorMsg" class="fixed inset-x-4 bottom-[calc(var(--sab)+140px)] z-50 mx-auto max-w-md rounded-2xl bg-neutral-900 p-4 text-sm shadow-2xl ring-1 ring-white/10" role="alert" data-testid="sensor-msg">
      <p>{{ sensorMsg }}</p>
      <p class="mt-2 text-xs text-white/50">Você pode continuar explorando arrastando o dedo ou o mouse.</p>
      <button class="btn-primary mt-3 w-full" @click="sensorMsg = null">Entendi</button>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
