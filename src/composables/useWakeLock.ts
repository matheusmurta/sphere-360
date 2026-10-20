import { onBeforeUnmount, ref } from 'vue'

interface Sentinel { release(): Promise<void>; addEventListener(t: 'release', cb: () => void): void }

export function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const active = ref(false)
  let sentinel: Sentinel | null = null
  let wanted = false

  async function acquire() {
    wanted = true
    if (!supported || sentinel) return
    try {
      sentinel = await (navigator as unknown as { wakeLock: { request(t: 'screen'): Promise<Sentinel> } }).wakeLock.request('screen')
      active.value = true
      sentinel.addEventListener('release', () => { active.value = false; sentinel = null })
    } catch { active.value = false }
  }
  async function release() {
    wanted = false
    await sentinel?.release().catch(() => {})
    sentinel = null
    active.value = false
  }
  // O sistema libera o lock ao trocar de aba; readquire ao voltar.
  const onVis = () => { if (wanted && document.visibilityState === 'visible') void acquire() }
  document.addEventListener('visibilitychange', onVis)
  onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVis); void release() })

  return { supported, active, acquire, release }
}
