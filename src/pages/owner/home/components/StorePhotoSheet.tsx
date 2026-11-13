import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { useSaveStorePhoto } from '@/pages/owner/api/stores'
import { StorePhotoStep } from '@/pages/owner/store/components/StorePhotoStep'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 사장님 홈 매장 카드 오른쪽 아래 버튼 → 매장 사진 변경 (찍기 · 갤러리, POST /stores/{storeId}/photo)
export function StorePhotoSheet({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [cropping, setCropping] = useState(false)
  const save = useSaveStorePhoto()

  const submit = () => {
    if (!photo) return
    save.mutate(
      { storeId, file: photo },
      {
        onSuccess: () => {
          toast('매장 사진을 변경했어요')
          onClose()
        },
        onError: (error) => {
          const status = error instanceof ApiError ? error.status : 0
          if (status === 413) return toast.error('10MB 이하 사진으로 다시 골라 주세요')
          if (status === 415) return toast.error('JPG · PNG · WebP 사진만 넣을 수 있어요')
          toastApiError(error, '사진을 저장하지 못했어요. 다시 시도해 주세요', submit)
        },
      },
    )
  }

  return (
    <BottomSheet open onClose={onClose} label="매장 사진 변경" closeButton>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">매장 사진 변경</h2>
        <StorePhotoStep value={photo} onChange={setPhoto} onCroppingChange={setCropping} />
        {!cropping && (
          <Button className="h-[54px]" disabled={!photo || save.isPending} onClick={submit}>
            {save.isPending ? '올리는 중…' : '저장'}
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
