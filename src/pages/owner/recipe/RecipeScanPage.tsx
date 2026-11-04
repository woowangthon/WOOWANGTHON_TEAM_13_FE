import { useNavigate } from 'react-router'
import { ScanSheet } from '@/pages/owner/recipe/components/ScanSheet'
import { StoreInfoBoard } from '@/pages/owner/recipe/components/StoreInfoBoard'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'

// 사진 스캔 · AI 초안 검토 (P1): 레시피 목록 위에 시트
export default function RecipeScanPage() {
  const { store } = useOwnerStore()
  const navigate = useNavigate()
  const close = useCloseTo('/owner/recipes')
  return (
    <>
      <StoreInfoBoard segment="recipe" />
      <ScanSheet
        storeId={store.storeId}
        onClose={close}
        onSaved={(_, category) => navigate(`/owner/recipes?cat=${category}`, { replace: true })}
      />
    </>
  )
}
