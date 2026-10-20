import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useResponsive() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 768)
  const update = () => { width.value = window.innerWidth; height.value = window.innerHeight }
  onMounted(() => window.addEventListener('resize', update, { passive: true }))
  onBeforeUnmount(() => window.removeEventListener('resize', update))
  return {
    width, height,
    isMobile: computed(() => width.value < 768),
    isDesktop: computed(() => width.value >= 1024),
    isLandscape: computed(() => width.value > height.value),
  }
}

export function useOnline() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const on = () => (online.value = true)
  const off = () => (online.value = false)
  onMounted(() => { window.addEventListener('online', on); window.addEventListener('offline', off) })
  onBeforeUnmount(() => { window.removeEventListener('online', on); window.removeEventListener('offline', off) })
  return online
}
