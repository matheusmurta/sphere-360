import { createRouter, createWebHistory } from 'vue-router'
import GalleryView from '@/views/GalleryView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'gallery', component: GalleryView },
    { path: '/favoritos', name: 'favorites', component: GalleryView, meta: { filter: 'favorites' } },
    { path: '/album/:albumId', name: 'album', component: GalleryView, props: true },
    { path: '/albuns', name: 'albums', component: () => import('@/views/AlbumsView.vue') },
    { path: '/ajustes', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/foto/:id', name: 'viewer', component: () => import('@/views/ViewerView.vue'), props: true, meta: { immersive: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
