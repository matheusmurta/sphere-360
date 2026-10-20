<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = withDefaults(defineProps<{ open: boolean; title: string; message?: string; confirmLabel?: string; danger?: boolean }>(), { confirmLabel: 'Confirmar' })
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
watch(() => props.open, (o) => { if (!dialog.value) return; if (o && !dialog.value.open) dialog.value.showModal(); else if (!o && dialog.value.open) dialog.value.close() })
onMounted(() => { if (props.open) dialog.value?.showModal() })
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" class="m-auto w-[min(92vw,420px)] rounded-3xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:bg-neutral-900 dark:text-neutral-100" @cancel.prevent="emit('cancel')">
    <div class="p-6">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <p v-if="message" class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{{ message }}</p>
      <slot />
      <div class="mt-6 flex justify-end gap-2">
        <button class="btn-ghost" @click="emit('cancel')">Cancelar</button>
        <button :class="danger ? 'btn-danger' : 'btn-primary'" data-testid="confirm-ok" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </dialog>
</template>
