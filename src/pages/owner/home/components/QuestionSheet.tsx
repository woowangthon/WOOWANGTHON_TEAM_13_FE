import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { formatTime } from '@/lib/format'
import { canAddAnswerToManual, useAnswerQuestion } from '@/pages/owner/api/home'
import type { OwnerQuestionItem } from '@/pages/owner/api/types'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Textarea } from '@/ui/Textarea'
import { toast } from '@/ui/toastStore'

// 확인 필요 (docs/03 S5): 알바생 질문에 답하기 → 매뉴얼에 추가할지 고르기
// 답은 알바생 채팅에 "사장님 답변"으로 가고, 추가하면 다음부터 AI 사수가 그 매뉴얼로 답한다
// 진짜 API 는 매뉴얼 추가를 아직 지원하지 않아서 [답하기]가 바로 답변만 보낸다
export function QuestionSheet({
  question,
  onClose,
}: {
  question: OwnerQuestionItem
  onClose: () => void
}) {
  const [answer, setAnswer] = useState('')
  const [stage, setStage] = useState<'ask' | 'suggest'>('ask')
  const [manualTitle, setManualTitle] = useState(question.title.replace(/ 문의$/, ''))
  const send = useAnswerQuestion(question.storeId)
  const canAddToManual = canAddAnswerToManual()

  const submit = (addToManual: boolean) =>
    send.mutate(
      { questionId: question.questionId, answer, addToManual, manualTitle },
      {
        onSuccess: () => {
          onClose()
          toast(addToManual ? '매뉴얼에 추가했어요' : '답변을 보냈어요')
        },
        onError: (error) =>
          toastApiError(error, '보내지 못했어요. 다시 시도해 주세요', () => submit(addToManual)),
      },
    )

  return (
    <BottomSheet open onClose={onClose} label="확인 필요" closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="self-start rounded-full bg-destructive-soft px-2.5 py-[5px] text-xs font-bold text-destructive-foreground">
            확인 필요
          </span>
          <h2 className="m-0 text-[22px] leading-[1.4] font-extrabold tracking-[-0.02em] break-keep">
            “{question.question}”
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {question.staffName} · 매뉴얼에 없음 · {formatTime(question.askedAt)}
          </span>
        </div>

        {stage === 'ask' ? (
          <div className="flex flex-col gap-3">
            <Textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="답변 입력"
              aria-label="답변"
              className="min-h-[110px]"
            />
            <Button
              className="h-[54px]"
              disabled={!answer.trim() || send.isPending}
              onClick={() => (canAddToManual ? setStage('suggest') : submit(false))}
            >
              답하기
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-[18px] bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground">
              {question.staffName} 님에게 보낼 답변이에요
            </div>
            <div className="flex flex-col gap-2 rounded-[22px] bg-white p-[18px]">
              <span className="flex items-center gap-1.5 text-xs font-bold text-new">
                <Sparkles className="size-[17px]" />
                매뉴얼에 추가할까요?
              </span>
              <Input
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                aria-label="매뉴얼 제목"
                className="h-11 rounded-xl bg-background px-3 text-lg font-extrabold"
              />
              <p className="m-0 text-sm leading-[1.6] text-[#4F554D]">{answer}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="soft" disabled={send.isPending} onClick={() => submit(false)}>
                답변만 보내기
              </Button>
              <Button disabled={send.isPending || !manualTitle.trim()} onClick={() => submit(true)}>
                매뉴얼에 추가
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
