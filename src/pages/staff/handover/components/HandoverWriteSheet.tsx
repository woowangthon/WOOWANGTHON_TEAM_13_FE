import { toastApiError } from '@/lib/api/errors'
import { useCreateHandoverNote, useHandoverDraft } from '@/lib/api/handover'
import type { NewHandoverNote } from '@/lib/api/types'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { HandoverWriteForm } from '@/shared/handover/HandoverWriteForm'
import { BottomSheet } from '@/ui/BottomSheet'
import { toast } from '@/ui/toastStore'

const NO_ISSUE: NewHandoverNote = { rawText: '', noIssue: true, summary: '', items: [] }

// 인수인계 남기기 시트: 작성 폼(shared/handover/HandoverWriteForm) + 저장 → 홈 목록에 바로 보인다
export function HandoverWriteSheet({ onClose }: { onClose: () => void }) {
  const { store } = useCurrentStore()
  const draft = useHandoverDraft(store.id)
  const create = useCreateHandoverNote(store.id)

  const save = (note: NewHandoverNote, doneMessage: string) =>
    create.mutate(note, {
      onSuccess: () => {
        onClose()
        toast(doneMessage)
      },
      onError: (error) =>
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () =>
          save(note, doneMessage),
        ),
    })

  return (
    <BottomSheet open onClose={onClose} label="인수인계 남기기">
      <HandoverWriteForm
        requestDraft={draft.mutateAsync}
        onSave={(note) => save(note, '저장했어요')}
        onNoIssue={() => save(NO_ISSUE, '특이사항 없음으로 저장했어요')}
      />
    </BottomSheet>
  )
}
