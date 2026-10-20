<script setup lang="ts">
import { FolderClosed } from '@lucide/vue'
import { useLibraryStore } from '@/stores/library'
const lib = useLibraryStore()
</script>

<template>
  <div v-if="lib.albums.length" class="min-h-0 overflow-y-auto">
    <h3 class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Álbuns</h3>
    <RouterLink v-for="a in lib.albums" :key="a.id" :to="`/album/${a.id}`" class="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm hover:bg-black/5 dark:hover:bg-white/8" active-class="!bg-accent/15 text-accent">
      <FolderClosed class="size-4" /> <span class="truncate">{{ a.name }}</span>
      <span class="ml-auto text-xs text-neutral-500">{{ lib.photos.filter((p) => p.albumIds.includes(a.id)).length }}</span>
    </RouterLink>
  </div>
</template>
