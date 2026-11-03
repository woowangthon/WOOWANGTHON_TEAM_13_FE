import { HandoverWriteForm } from '@/shared/handover/HandoverWriteForm'
import { BottomSheet } from '@/ui/BottomSheet'
import { toast } from '@/ui/toastStore'

// 인수인계 남기기 시트: 작성 폼(shared/handover/HandoverWriteForm) + 저장 토스트
export function HandoverWriteSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet open onClose={onClose} label="인수인계 남기기">
      <HandoverWriteForm
        onSave={() => {
          onClose()
          toast('저장했어요')
        }}
        onNoIssue={() => {
          onClose()
          toast('특이사항 없음으로 저장했어요')
        }}
      />
    </BottomSheet>
  )
}
