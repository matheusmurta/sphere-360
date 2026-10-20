import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useLibraryStore } from '@/stores/library'

/** Cache LRU limitado de URLs de miniaturas (evita recriar e vazar object URLs). */
const MAX = 400
const cache = new Map<string, { url: string; refs: number }>()

function evict() {
  if (cache.size <= MAX) return
  for (const [id, e] of cache) {
    if (cache.size <= MAX) break
    if (e.refs <= 0) { URL.revokeObjectURL(e.url); cache.delete(id) }
  }
}

export function useThumbnailUrl(id: Ref<string | null>, enabled: Ref<boolean>) {
  const lib = useLibraryStore()
  const url = ref<string | null>(null)
  let held: string | null = null

  function releaseHeld() {
    if (!held) return
    const e = cache.get(held)
    if (e) e.refs--
    held = null
  }

  watch([id, enabled], async ([pid, en]) => {
    if (!pid || !en) return
    if (held === pid) return
    releaseHeld()
    let entry = cache.get(pid)
    if (!entry) {
      const blob = await lib.getThumbnail(pid).catch(() => undefined)
      if (!blob || id.value !== pid) return
      entry = cache.get(pid) ?? { url: URL.createObjectURL(blob), refs: 0 }
      cache.set(pid, entry)
    }
    entry.refs++
    held = pid
    url.value = entry.url
    evict()
  }, { immediate: true })

  onBeforeUnmount(releaseHeld)
  return url
}

export function forgetThumbnails(ids: string[]) {
  for (const id of ids) {
    const e = cache.get(id)
    if (e) { URL.revokeObjectURL(e.url); cache.delete(id) }
  }
}
