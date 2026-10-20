import { ref } from 'vue'

export const NEAR_LIMIT_RATIO = 0.85

const usage = ref(0)
const quota = ref(0)
const persisted = ref<boolean | null>(null)
const supported = typeof navigator !== 'undefined' && !!navigator.storage?.estimate

async function refresh() {
  if (!supported) return
  try {
    const est = await navigator.storage.estimate()
    usage.value = est.usage ?? 0
    quota.value = est.quota ?? 0
    if (navigator.storage.persisted) persisted.value = await navigator.storage.persisted()
  } catch {
    /* ignorado: estimativa é apenas informativa */
  }
}

/** Solicita armazenamento persistente (chamar após ação do usuário, ex.: primeira importação). */
async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return (persisted.value = true)
    persisted.value = await navigator.storage.persist()
    return persisted.value
  } catch {
    return false
  }
}

export function useStorageQuota() {
  return {
    usage,
    quota,
    persisted,
    supported,
    refresh,
    requestPersistence,
    isNearLimit: () => quota.value > 0 && usage.value / quota.value >= NEAR_LIMIT_RATIO,
  }
}
