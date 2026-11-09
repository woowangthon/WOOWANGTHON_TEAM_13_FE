import { RouterProvider } from 'react-router'
import { OfflineBanner } from '@/app/OfflineBanner'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'

export default function App() {
  return (
    <Providers>
      <OfflineBanner />
      <RouterProvider router={router} />
    </Providers>
  )
}
