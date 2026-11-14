import { useRef } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { useCreateHandoverNote, useHandoverDraft } from '@/lib/api/handover'
import { scheduleToday } from '@/lib/api/schedule'
import { isRealApi } from '@/lib/api/source'
import { todayInKst } from '@/lib/date'
import { formatDate } from '@/lib/format'
import type { NewHandoverNote } from '@/lib/api/types'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { HandoverWriteForm } from '@/shared/handover/HandoverWriteForm'
import { BottomSheet } from '@/ui/BottomSheet'
import { toast } from '@/ui/toastStore'

const NO_ISSUE: NewHandoverNote = { rawText: '', noIssue: true, summary: '', items: [] }

// 인수인계 남기기 시트: 작성 폼(shared/handover/HandoverWriteForm, 줄 노트 모양 variant="note") + 저장 → 홈 목록에 바로 보인다
// 노트 맨 위 "11/20(금) · 달빛 카페": 오늘 = 진짜 서버면 한국 시간 오늘, 가짜면 매장 시연 날짜 (홈과 같은 날)
export function HandoverWriteSheet({ onClose }: { onClose: () => void }) {
  const { store } = useCurrentStore()
  const draft = useHandoverDraft(store.id)
  const create = useCreateHandoverNote(store.id)
  const today = isRealApi('handover') ? todayInKst() : scheduleToday(store.id)

  // [저장] · [특이사항 없음]은 같은 create 로 저장한다. 폼은 저장 중(create.isPending)이면 버튼을 끄지만,
  // 화면이 다시 그려지기 전 같은 순간에 두 번 눌리면 isPending 이 아직 false 라서 여기서도 한 번만 보낸다
  const sending = useRef(false)

  const save = (note: NewHandoverNote, doneMessage: string) => {
    if (sending.current) return
    sending.current = true
    create.mutate(note, {
      onSuccess: () => {
        onClose()
        toast(doneMessage)
      },
      onError: (error) =>
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () =>
          save(note, doneMessage),
        ),
      onSettled: () => {
        sending.current = false
      },
    })
  }

  return (
    <BottomSheet open onClose={onClose} label="인수인계 남기기">
      <HandoverWriteForm
        variant="note"
        noteMeta={`${formatDate(today)} · ${store.name}`}
        requestDraft={draft.mutateAsync}
        onSave={(note) => save(note, '저장했어요')}
        onNoIssue={() => save(NO_ISSUE, '특이사항 없음으로 저장했어요')}
        saving={create.isPending}
      />
    </BottomSheet>
  )
}
