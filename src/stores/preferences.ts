import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { loadPreferences, savePreferences } from '@/services/storage/preferences'
import type { Preferences } from '@/types'

export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<Preferences>(loadPreferences())

  function applyTheme() {
    if (typeof document === 'undefined') return
    const dark = prefs.value.theme === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0f' : '#f5f5f7')
  }

  watch(prefs, (p) => { savePreferences(p); applyTheme() }, { deep: true })
  applyTheme()

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    prefs.value[key] = value
  }

  return { prefs, set }
})
