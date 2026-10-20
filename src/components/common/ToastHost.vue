<script setup lang="ts">
import { X, CircleCheck, CircleAlert, Info, TriangleAlert } from '@lucide/vue'
import { useToastStore } from '@/stores/toasts'
const t = useToastStore()
const icons = { success: CircleCheck, error: CircleAlert, info: Info, warning: TriangleAlert }
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4" style="bottom: calc(var(--sab) + 88px)" aria-live="polite" role="status">
    <TransitionGroup name="toast">
      <div v-for="x in t.toasts" :key="x.id" class="glass pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl" :data-kind="x.kind">
        <component :is="icons[x.kind]" class="size-5 shrink-0" :class="{ 'text-green-400': x.kind === 'success', 'text-red-400': x.kind === 'error', 'text-amber-400': x.kind === 'warning' }" />
        <span class="flex-1">{{ x.message }}</span>
        <button class="icon-btn size-8 hover:bg-white/10" aria-label="Fechar aviso" @click="t.dismiss(x.id)"><X class="size-4" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
