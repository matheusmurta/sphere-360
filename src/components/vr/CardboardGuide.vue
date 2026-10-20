<script setup lang="ts">
import { Glasses, RotateCw, Hand, Info } from '@lucide/vue'
defineProps<{ secure: boolean }>()
const emit = defineEmits<{ start: []; cancel: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="vr-title" data-testid="cardboard-guide">
    <div class="w-full max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-[calc(var(--sab)+24px)] text-white sm:rounded-3xl">
      <div class="flex items-center gap-3"><Glasses class="size-7 text-accent" /><h2 id="vr-title" class="text-xl font-semibold">Modo VR Cardboard</h2></div>
      <ol class="mt-5 space-y-3 text-sm text-white/80">
        <li class="flex gap-3"><RotateCw class="size-5 shrink-0 text-accent" /> Gire o celular para a horizontal.</li>
        <li class="flex gap-3"><Glasses class="size-5 shrink-0 text-accent" /> Encaixe o aparelho no Cardboard com a linha divisória centralizada entre as lentes.</li>
        <li class="flex gap-3"><Hand class="size-5 shrink-0 text-accent" /> Para sair, toque na tela (ou use o botão do Cardboard).</li>
      </ol>
      <p class="mt-4 flex gap-2 rounded-xl bg-white/5 p-3 text-xs text-white/60"><Info class="size-4 shrink-0" />
        Fotos 360° comuns são monoscópicas: a imagem é duplicada para cada olho, criando imersão, mas sem profundidade 3D real.</p>
      <p v-if="!secure" class="mt-3 rounded-xl bg-amber-500/15 p-3 text-xs text-amber-300">Esta página não está em HTTPS. Os sensores de movimento podem ser bloqueados pelo navegador.</p>
      <div class="mt-6 flex gap-2">
        <button class="btn flex-1 bg-white/10 hover:bg-white/15" @click="emit('cancel')">Cancelar</button>
        <button class="btn-primary flex-1" data-testid="vr-start" @click="emit('start')">Entrar no VR</button>
      </div>
    </div>
  </div>
</template>
