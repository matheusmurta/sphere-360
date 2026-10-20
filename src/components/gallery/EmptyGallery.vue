<script setup lang="ts">
import { Orbit, Plus, Smartphone, Glasses } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
withDefaults(defineProps<{ title?: string; text?: string; action?: boolean }>(), {
  title: 'Sua galeria 360° está vazia',
  text: 'Importe fotos panorâmicas equiretangulares (proporção 2:1) do seu dispositivo. Elas ficam salvas apenas aqui, no seu navegador.',
  action: true,
})
const ui = useUiStore()
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center" data-testid="empty-gallery">
    <div class="relative mb-6 flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-fuchsia-500/20">
      <Orbit class="size-14 text-accent" />
    </div>
    <h2 class="text-2xl font-semibold tracking-tight">{{ title }}</h2>
    <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{{ text }}</p>
    <button v-if="action" class="btn-primary mt-8 px-6" @click="ui.pickFiles()"><Plus class="size-5" /> Adicionar fotos</button>
    <div v-if="action" class="mt-10 grid gap-3 text-left text-xs text-neutral-500 sm:grid-cols-2">
      <div class="card flex gap-3 p-4"><Smartphone class="size-5 shrink-0 text-accent" /> Mova o celular para olhar ao redor com o giroscópio.</div>
      <div class="card flex gap-3 p-4"><Glasses class="size-5 shrink-0 text-accent" /> Use o modo VR com óculos Google Cardboard.</div>
    </div>
  </div>
</template>
