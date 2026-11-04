import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type {
  HandoverDraft,
  HandoverDraftItem,
  HandoverTag,
  NewHandoverNote,
} from '@/lib/api/types'
import { HANDOVER_TAG_LABEL, HANDOVER_TAG_PILL } from '@/shared/icons'
import { Button } from '@/ui/Button'
import { Textarea } from '@/ui/Textarea'

// 공용 보기 부품: 인수인계 텍스트 작성 폼 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 텍스트 → AI 정리(태그) → (태그 · 글자 고치기) → 저장. AI 정리 요청 · 저장 뒤 할 일(시트 닫기 · 토스트)은 화면이 정한다
/** 태그를 누르면 이 순서로 바뀐다 */
const TAG_ORDER: HandoverTag[] = ['credit', 'stock', 'etc']

interface HandoverWriteFormProps {
  /** AI 초안 요청 (알바: useHandoverDraft) */
  requestDraft: (text: string) => Promise<HandoverDraft>
  onSave: (note: NewHandoverNote) => void
  onNoIssue: () => void
}

export function HandoverWriteForm({ requestDraft, onSave, onNoIssue }: HandoverWriteFormProps) {
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'write' | 'loading' | 'done'>('write')
  const [draft, setDraft] = useState<HandoverDraft>({ summary: '', items: [] })
  // AI 정리 결과를 고친 내용
  const [items, setItems] = useState<HandoverDraftItem[]>([])
  const [edited, setEdited] = useState(false)
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  // Enter · Esc 로 끝낸 뒤 입력칸이 사라지며 blur 가 또 와도 한 번만 처리한다
  const editDone = useRef(false)
  // 정리 중에 시트를 닫으면 결과를 버린다
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const summarize = async () => {
    if (!note.trim()) return
    setStage('loading')
    try {
      const result = await requestDraft(note)
      if (!alive.current) return
      setDraft(result)
      setItems(result.items)
      setEdited(false)
      setEditing(null)
      setStage('done')
    } catch (error) {
      if (!alive.current) return
      setStage('write')
      toastApiError(error, '정리하지 못했어요. 다시 시도해 주세요', summarize)
    }
  }

  const changeItem = (index: number, patch: Partial<HandoverDraftItem>) => {
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    setEdited(true)
  }

  const cycleTag = (index: number) => {
    const next = TAG_ORDER[(TAG_ORDER.indexOf(items[index].tag) + 1) % TAG_ORDER.length]
    changeItem(index, { tag: next })
  }

  const startEdit = (index: number, text: string) => {
    editDone.current = false
    setEditing({ index, text })
  }

  const cancelEdit = () => {
    editDone.current = true
    setEditing(null)
  }

  // 글자 고치기 끝: 비웠으면 원래대로, 바뀌었으면 반영
  const finishEdit = () => {
    if (!editing || editDone.current) return
    editDone.current = true
    const text = editing.text.trim()
    if (text && text !== items[editing.index].text) changeItem(editing.index, { text })
    setEditing(null)
  }

  const save = () =>
    onSave({
      rawText: note,
      noIssue: false,
      items,
      // 하나라도 고쳤으면 고친 항목 앞 2개로 요약을 다시, 아니면 AI 요약 그대로
      summary: edited
        ? items
            .slice(0, 2)
            .map((item) => item.text)
            .join(' · ')
        : draft.summary,
    })

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
          <span className="text-[13px] text-[#6B7068]">
            AI 정리 결과 · 태그나 글자를 눌러 고쳐 주세요
          </span>
          {items.map((item, i) => {
            const [bg, fg] = HANDOVER_TAG_PILL[item.tag]
            const label = HANDOVER_TAG_LABEL[item.tag]
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-[18px] bg-white px-3.5 py-[13px]"
              >
                <button
                  type="button"
                  onClick={() => cycleTag(i)}
                  aria-label={`${label} 태그 · 눌러서 바꾸기`}
                  className="shrink-0 rounded-full px-[9px] py-1 text-[11px] font-bold"
                  style={{ background: bg, color: fg }}
                >
                  {label}
                </button>
                {editing?.index === i ? (
                  <input
                    autoFocus
                    value={editing.text}
                    onChange={(event) => setEditing({ index: i, text: event.target.value })}
                    onBlur={finishEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') finishEdit()
                      if (event.key === 'Escape') {
                        // 시트(BottomSheet)도 Esc 로 닫히므로, 고치기만 취소하고 시트까지 전달하지 않는다
                        event.stopPropagation()
                        cancelEdit()
                      }
                    }}
                    aria-label="인수인계 항목 고치기"
                    className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm leading-[1.45]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(i, item.text)}
                    className="min-w-0 flex-1 text-left text-sm leading-[1.45]"
                  >
                    {item.text}
                  </button>
                )}
              </div>
            )
          })}
          <div className="mt-1 grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" onClick={() => setStage('write')}>
              고치기
            </Button>
            <Button size="lg" className="h-[54px]" onClick={save}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
