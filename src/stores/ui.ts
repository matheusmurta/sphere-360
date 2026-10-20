import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const importOpen = ref(false)
  const search = ref('')
  const fileInput = ref<HTMLInputElement | null>(null)
  /** Abre o seletor nativo (deve ser chamado direto de um clique — exigência do iOS). */
  function pickFiles() { fileInput.value?.click() }
  return { importOpen, search, fileInput, pickFiles }
})
