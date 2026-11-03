import { Navigate, useParams } from 'react-router'
import { storeManuals } from '@/api/mocks/staff/manuals'
import { ManualSheet } from '@/pages/staff/manual/components/ManualSheet'
import { RecipeBoard } from '@/pages/staff/recipe/components/RecipeBoard'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'

// 매뉴얼 상세: 매뉴얼 목록 위에 상세 시트를 띄운다
export default function ManualDetailPage() {
  const { manualId } = useParams()
  const { store } = useCurrentStore()
  const umbrellaAdded = useStaffStore((state) => state.umbrellaAdded)
  const close = useCloseTo('/staff/manuals')

  const manual = storeManuals(store.id, umbrellaAdded).find((m) => m.id === manualId)
  if (!manual) return <Navigate to="/staff/manuals" replace />

  return (
    <>
      <RecipeBoard segment="manual" />
      <ManualSheet manual={manual} storeName={store.name} onClose={close} />
    </>
  )
}
