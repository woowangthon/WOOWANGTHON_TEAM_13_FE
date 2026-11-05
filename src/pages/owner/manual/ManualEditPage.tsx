import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { MANUAL_TEMPLATES } from '@/api/mocks/owner/data'
import { isNotFound } from '@/lib/api/errors'
import { useManual } from '@/lib/api/manuals'
import { ManualFormSheet } from '@/pages/owner/manual/components/ManualFormSheet'
import { StoreInfoBoard } from '@/pages/owner/recipe/components/StoreInfoBoard'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'

// 매뉴얼 작성 · 수정 · 삭제: 매뉴얼 목록 위에 시트
//   /owner/manuals/new?template=wifi → 템플릿 예시 문구 · /owner/manuals/:manualId → 수정
export default function ManualEditPage() {
  const { manualId } = useParams()
  const { store } = useOwnerStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const close = useCloseTo('/owner/manuals')
  const toList = () => navigate('/owner/manuals', { replace: true })
  const template = MANUAL_TEMPLATES.find((t) => t.icon === params.get('template'))

  return (
    <>
      <StoreInfoBoard segment="manual" />
      {manualId ? (
        <EditManual
          key={manualId}
          storeId={store.storeId}
          manualId={manualId}
          onClose={close}
          onDone={toList}
        />
      ) : (
        <ManualFormSheet
          storeId={store.storeId}
          template={template}
          onClose={close}
          onDone={toList}
        />
      )}
    </>
  )
}

function EditManual({
  storeId,
  manualId,
  onClose,
  onDone,
}: {
  storeId: string
  manualId: string
  onClose: () => void
  onDone: () => void
}) {
  const query = useManual(storeId, manualId)
  if (isNotFound(query.error)) return <Navigate to="/owner/manuals" replace />
  if (!query.data) return null
  return <ManualFormSheet storeId={storeId} manual={query.data} onClose={onClose} onDone={onDone} />
}
