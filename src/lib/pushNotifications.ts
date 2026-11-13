import { apiFetch } from '@/lib/apiClient'
import { env } from '@/lib/env'

export type PushStatus = 'loading' | 'unsupported' | 'denied' | 'ready' | 'subscribed'

const subscriptionPath = '/users/me/push-subscriptions'

export function supportsPushNotifications() {
  return (
    Boolean(env.vapidPublicKey) &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supportsPushNotifications()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return 'unsupported'
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'subscribed' : 'ready'
}

export async function enablePushNotifications(): Promise<void> {
  if (!supportsPushNotifications()) throw new Error('PUSH_UNSUPPORTED')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('PUSH_PERMISSION_DENIED')

  const registration = await navigator.serviceWorker.ready
  const applicationServerKey = decodeVapidPublicKey(env.vapidPublicKey)
  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await deleteSubscription(subscription.endpoint).catch(() => {})
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
  await saveSubscription(subscription)
}

export async function disablePushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  let deleteError: unknown
  try {
    await deleteSubscription(subscription.endpoint)
  } catch (error) {
    deleteError = error
  } finally {
    // 서버가 잠시 꺼져 있어도 로그아웃한 기기에는 더 이상 알림이 가지 않게 합니다.
    await subscription.unsubscribe()
  }
  if (deleteError) throw deleteError
}

/** 권한 창은 띄우지 않고 이미 허용된 구독만 현재 로그인 사용자에게 다시 연결합니다. */
export async function syncExistingPushSubscription(): Promise<void> {
  if (!supportsPushNotifications() || Notification.permission !== 'granted') return
  // 로그인 복원보다 서비스 워커 등록이 늦어도 기존 구독을 서버에 다시 연결합니다.
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await saveSubscription(subscription)
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('INVALID_PUSH_SUBSCRIPTION')
  }
  await apiFetch(subscriptionPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
}

async function deleteSubscription(endpoint: string) {
  await apiFetch(subscriptionPath, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
}

function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

function sameKey(current: ArrayBuffer | null, expected: Uint8Array<ArrayBuffer>): boolean {
  if (!current) return false
  const bytes = new Uint8Array(current)
  return (
    bytes.length === expected.length && bytes.every((value, index) => value === expected[index])
  )
}
