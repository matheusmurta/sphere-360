import type { Preferences } from '@/types'

const KEY = 'sphere360:prefs'

export const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  sort: 'date-desc',
  viewMode: 'grid',
  autorotate: false,
  autorotateSpeed: 2,
  defaultZoom: 50,
  lastPhotoId: null,
}

export function loadPreferences(storage: Storage | undefined = globalThis.localStorage): Preferences {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    const p = { ...DEFAULT_PREFS, ...parsed }
    if (!['dark', 'light'].includes(p.theme)) p.theme = DEFAULT_PREFS.theme
    if (!['date-desc', 'date-asc', 'name-asc', 'name-desc'].includes(p.sort)) p.sort = DEFAULT_PREFS.sort
    if (!['grid', 'list'].includes(p.viewMode)) p.viewMode = DEFAULT_PREFS.viewMode
    p.autorotateSpeed = Math.min(10, Math.max(0.5, Number(p.autorotateSpeed) || DEFAULT_PREFS.autorotateSpeed))
    p.defaultZoom = Math.min(100, Math.max(0, Number(p.defaultZoom) || 0))
    return p
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePreferences(p: Preferences, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(KEY, JSON.stringify(p))
    return true
  } catch {
    return false
  }
}
