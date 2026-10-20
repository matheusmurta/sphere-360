<script setup lang="ts">
import { ref } from 'vue'
import { FolderPlus, Pencil, Trash2, FolderClosed } from '@lucide/vue'
import { useLibraryStore } from '@/stores/library'
import { useToastStore } from '@/stores/toasts'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ThumbImage from '@/components/common/ThumbImage.vue'

const lib = useLibraryStore()
const toasts = useToastStore()
const newName = ref('')
const editing = ref<string | null>(null)
const editName = ref('')
const toDelete = ref<string | null>(null)
const cover = (id: string) => lib.photos.find((p) => p.albumIds.includes(id))?.id
const count = (id: string) => lib.photos.filter((p) => p.albumIds.includes(id)).length

async function create() {
  try { await lib.createAlbum(newName.value); newName.value = ''; toasts.push('Álbum criado.', 'success') } catch (e) { toasts.push((e as Error).message, 'error') }
}
async function saveRename(id: string) {
  try { await lib.renameAlbum(id, editName.value); editing.value = null } catch (e) { toasts.push((e as Error).message, 'error') }
}
async function del() {
  if (!toDelete.value) return
  await lib.deleteAlbum(toDelete.value); toDelete.value = null
  toasts.push('Álbum excluído. As fotos continuam na galeria.', 'success')
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-[calc(var(--sat)+16px)] sm:px-6 lg:pt-8">
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Álbuns</h1>
    <form class="mt-4 flex gap-2" @submit.prevent="create">
      <label class="flex-1"><span class="sr-only">Nome do novo álbum</span><input v-model="newName" class="input" placeholder="Nome do novo álbum" maxlength="60" data-testid="album-name" /></label>
      <button class="btn-primary" :disabled="!newName.trim()" data-testid="album-create"><FolderPlus class="size-5" /> Criar</button>
    </form>
    <p v-if="!lib.albums.length" class="mt-10 text-center text-sm text-neutral-500">Nenhum álbum ainda. Crie um e adicione fotos pela seleção da galeria ou pelo painel de informações.</p>
    <div class="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
      <div v-for="a in lib.albums" :key="a.id" class="card overflow-hidden">
        <RouterLink :to="`/album/${a.id}`" class="block aspect-[2/1] bg-black/10 dark:bg-white/5" :aria-label="`Abrir álbum ${a.name}`">
          <ThumbImage v-if="cover(a.id)" :id="cover(a.id)!" />
          <div v-else class="flex size-full items-center justify-center"><FolderClosed class="size-10 text-neutral-500" /></div>
        </RouterLink>
        <div class="flex items-center gap-2 p-3">
          <form v-if="editing === a.id" class="flex flex-1 gap-2" @submit.prevent="saveRename(a.id)">
            <input v-model="editName" class="input" aria-label="Novo nome do álbum" maxlength="60" />
            <button class="btn-primary">OK</button>
          </form>
          <template v-else>
            <div class="min-w-0 flex-1"><p class="truncate font-medium">{{ a.name }}</p><p class="text-xs text-neutral-500">{{ count(a.id) }} foto(s)</p></div>
            <button class="icon-btn" :aria-label="`Renomear ${a.name}`" @click="editing = a.id; editName = a.name"><Pencil class="size-4" /></button>
            <button class="icon-btn" :aria-label="`Excluir ${a.name}`" @click="toDelete = a.id"><Trash2 class="size-4" /></button>
          </template>
        </div>
      </div>
    </div>
    <ConfirmDialog :open="!!toDelete" danger confirm-label="Excluir" title="Excluir álbum?" message="As fotos não serão apagadas, apenas removidas deste álbum." @confirm="del" @cancel="toDelete = null" />
  </div>
</template>
