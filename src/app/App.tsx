import { RouterProvider } from 'react-router'
import { OfflineBanner } from '@/app/OfflineBanner'
import { PushSubscriptionSync } from '@/app/PushSubscriptionSync'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'

export default function App() {
  return (
    <Providers>
      <OfflineBanner />
      <PushSubscriptionSync />
      <RouterProvider router={router} />
    </Providers>
  )
}
