/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event: PushEvent) => {
  const payload = parsePayload(event.data)
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'crewBean', {
      body: payload.body ?? '새 알림이 도착했어요',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag,
      data: { url: safePath(payload.url) },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const path = safePath((event.notification.data as { url?: unknown } | null)?.url)
  const target = new URL(path, self.location.origin).href
  event.waitUntil(openOrFocus(target))
})

function parsePayload(data: PushMessageData | null): PushPayload {
  if (!data) return {}
  try {
    return data.json() as PushPayload
  } catch {
    return { body: data.text() }
  }
}

function safePath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  try {
    const target = new URL(value, self.location.origin)
    if (target.origin !== self.location.origin) return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}

async function openOrFocus(target: string) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
  if (existing) {
    await existing.navigate(target)
    return existing.focus()
  }
  return self.clients.openWindow(target)
}

export {}
