import { Navigate, useParams } from 'react-router'
import { useManual } from '@/lib/api/manuals'
import { isNotFound } from '@/lib/api/errors'
import { ManualSheet } from '@/pages/staff/manual/components/ManualSheet'
import { RecipeBoard } from '@/pages/staff/recipe/components/RecipeBoard'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'

// 매뉴얼 상세: 매뉴얼 목록 위에 상세 시트를 띄운다
export default function ManualDetailPage() {
  const { manualId = '' } = useParams()
  const { store } = useCurrentStore()
  const close = useCloseTo('/staff/manuals')
  const manualQuery = useManual(store.id, manualId)

  if (isNotFound(manualQuery.error)) return <Navigate to="/staff/manuals" replace />

  return (
    <>
      <RecipeBoard segment="manual" />
      {manualQuery.data && (
        <ManualSheet manual={manualQuery.data} storeName={store.name} onClose={close} />
      )}
    </>
  )
}
