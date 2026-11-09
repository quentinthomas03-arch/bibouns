/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Mise à jour immédiate de l'appli quand une nouvelle version est déployée
self.skipWaiting()
clientsClaim()

// Tous les fichiers de l'appli sont mis en cache : elle s'ouvre sans réseau.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Les appels à Supabase ne sont JAMAIS mis en cache par le service worker :
// la base locale (IndexedDB) s'en charge, de façon contrôlée.

// ---- Notifications push (activées en Phase 3) ----
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {}
    } catch {
      return { title: "Biboun's", body: event.data?.text() }
    }
  })() as { title?: string; body?: string; url?: string; tag?: string }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Biboun's", {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? './'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins[0]
      if (win) return win.focus().then((w) => w.navigate(url))
      return self.clients.openWindow(url)
    }),
  )
})
