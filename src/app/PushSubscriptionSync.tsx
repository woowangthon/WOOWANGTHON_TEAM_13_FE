import { useEffect } from 'react'
import { useAuthStore } from '@/lib/authStore'
import { syncExistingPushSubscription } from '@/lib/pushNotifications'

export function PushSubscriptionSync() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)

  useEffect(() => {
    if (isLoggedIn) void syncExistingPushSubscription().catch(() => {})
  }, [isLoggedIn])

  return null
}
