import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mockSummarize, type HandoverItem } from '@/api/mocks/staff/handovers'
import { HANDOVER_TAG_PILL } from '@/shared/icons'
import { Button } from '@/ui/Button'
import { Textarea } from '@/ui/Textarea'

// 공용 보기 부품: 인수인계 텍스트 작성 폼 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 텍스트 → AI 정리(태그) → 저장. 저장 뒤 할 일(시트 닫기 · 토스트)은 화면이 정한다
interface HandoverWriteFormProps {
  onSave: (items: HandoverItem[]) => void
  onNoIssue: () => void
}

export function HandoverWriteForm({ onSave, onNoIssue }: HandoverWriteFormProps) {
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'write' | 'loading' | 'done'>('write')
  const [summary, setSummary] = useState<HandoverItem[]>([])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const summarize = () => {
    if (!note.trim()) return
    setSummary(mockSummarize(note))
    setStage('loading')
    timer.current = setTimeout(() => setStage('done'), 1200)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">인수인계 남기기</h2>

      {stage === 'write' && (
        <div className="flex flex-col gap-3">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="인수인계 내용"
            aria-label="인수인계 내용"
          />
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" className="text-sm" onClick={onNoIssue}>
              특이사항 없음
            </Button>
            <Button disabled={!note.trim()} onClick={summarize}>
              <Sparkles />
              AI로 정리하기
            </Button>
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="rounded-[18px] bg-warm p-4 text-sm font-semibold text-warm-foreground">
          정리하고 있어요…
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] text-[#6B7068]">AI 정리 결과 · 틀린 곳은 고쳐 주세요</span>
          {summary.map((item) => {
            const [bg, fg] = HANDOVER_TAG_PILL[item.tag]
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded-[18px] bg-white px-3.5 py-[13px]"
              >
                <span
                  className="shrink-0 rounded-full px-[9px] py-1 text-[11px] font-bold"
                  style={{ background: bg, color: fg }}
                >
                  {item.tag}
                </span>
                <span className="text-sm leading-[1.45]">{item.text}</span>
              </div>
            )
          })}
          <div className="mt-1 grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" onClick={() => setStage('write')}>
              고치기
            </Button>
            <Button size="lg" className="h-[54px]" onClick={() => onSave(summary)}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
