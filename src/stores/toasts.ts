import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'error' | 'warning'
export interface Toast { id: number; kind: ToastKind; message: string }

export const useToastStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([])
  let seq = 0
  function push(message: string, kind: ToastKind = 'info', timeout = 4000) {
    const id = ++seq
    toasts.value.push({ id, kind, message })
    if (timeout > 0) setTimeout(() => dismiss(id), timeout)
    return id
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return { toasts, push, dismiss }
})
