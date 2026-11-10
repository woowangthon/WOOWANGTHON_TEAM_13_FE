import { Check, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { formatTime } from '@/lib/format'
import { useAnswerQuestion } from '@/pages/owner/api/home'
import type { OwnerQuestionItem } from '@/pages/owner/api/types'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Textarea } from '@/ui/Textarea'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 확인 필요 (docs/03 S5): 알바생 질문에 답하기 + [매뉴얼에도 추가] 체크박스(처음엔 꺼짐, 11/10 회의)
// 답은 알바생 채팅에 "사장님 답변"으로 가고, 추가하면 다음부터 AI 사수가 그 매뉴얼로 답한다
// 체크하면 제목 · 본문을 고칠 수 있다. 본문은 고치기 전까지 답변을 그대로 따라간다 (BE 카테고리: 물건 위치)
export function QuestionSheet({
  question,
  onClose,
}: {
  question: OwnerQuestionItem
  onClose: () => void
}) {
  const [answer, setAnswer] = useState('')
  const [addToManual, setAddToManual] = useState(false)
  const [manualTitle, setManualTitle] = useState(question.title.replace(/ 문의$/, ''))
  /** 본문을 직접 고쳤으면 그 글, 아니면 null(답변을 그대로 쓴다) */
  const [editedBody, setEditedBody] = useState<string | null>(null)
  const manualBody = editedBody ?? answer
  const send = useAnswerQuestion(question.storeId)
  // 여러 매장 알림에서 열 수 있어서 어느 카페 질문인지 보여 준다
  const { stores } = useOwnerStore()
  const storeName = stores.find((s) => s.storeId === question.storeId)?.name
  const canSend = !!answer.trim() && (!addToManual || (!!manualTitle.trim() && !!manualBody.trim()))

  const submit = () =>
    send.mutate(
      { questionId: question.questionId, answer, addToManual, manualTitle, manualBody },
      {
        onSuccess: () => {
          onClose()
          toast(addToManual ? '답변을 보내고 매뉴얼에 추가했어요' : '답변을 보냈어요')
        },
        onError: (error) => toastApiError(error, '보내지 못했어요. 다시 시도해 주세요', submit),
      },
    )

  return (
    <BottomSheet open onClose={onClose} label="확인 필요" closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-destructive-soft px-2.5 py-[5px] text-xs font-bold text-destructive-foreground">
              확인 필요
            </span>
            {storeName && (
              <span className="rounded-full bg-accent px-2.5 py-[5px] text-xs font-bold text-accent-foreground">
                {storeName}
              </span>
            )}
          </div>
          <h2 className="m-0 text-[22px] leading-[1.4] font-extrabold tracking-[-0.02em] break-keep">
            “{question.question}”
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {question.staffName} · {formatTime(question.askedAt)}
          </span>
        </div>

        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="답변 입력"
          aria-label="답변"
          className="min-h-[110px]"
        />

        <div className="flex flex-col gap-3 rounded-[22px] bg-white p-[18px]">
          <button
            type="button"
            role="checkbox"
            aria-checked={addToManual}
            onClick={() => setAddToManual((on) => !on)}
            className="flex items-center gap-2.5 p-0 text-left"
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-lg border-[1.5px]',
                addToManual ? 'border-brand bg-brand text-white' : 'border-line bg-white',
              )}
            >
              {addToManual && <Check className="size-4" />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">매뉴얼에도 추가</span>
              <span className="text-xs text-muted-foreground">
                다음부터 AI 사수가 이 답으로 알려 줘요
              </span>
            </span>
          </button>

          {addToManual && (
            <div className="flex flex-col gap-2 animate-in duration-150 fade-in-0 motion-reduce:animate-none">
              <Input
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="매뉴얼 제목"
                aria-label="매뉴얼 제목"
                className="h-11 rounded-xl bg-background px-3 text-base font-bold"
              />
              <Textarea
                value={manualBody}
                onChange={(event) => setEditedBody(event.target.value)}
                placeholder="매뉴얼 내용"
                aria-label="매뉴얼 내용"
                className="min-h-[88px] bg-background"
              />
              <span className="flex items-start gap-1.5 text-xs leading-normal text-muted-foreground">
                <Lightbulb className="mt-px size-3.5 shrink-0" />
                물건 이름을 함께 적으면 AI가 더 잘 찾아요 (예: 우산 → 창고 선반 두 번째 칸)
              </span>
            </div>
          )}
        </div>

        <Button className="h-[54px]" disabled={!canSend || send.isPending} onClick={submit}>
          보내기
        </Button>
      </div>
    </BottomSheet>
  )
}
