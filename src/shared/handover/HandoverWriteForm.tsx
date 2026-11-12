import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isNetworkError } from '@/lib/api/errors'
import {
  HANDOVER_ITEM_MAX,
  HANDOVER_ITEMS_MAX,
  HANDOVER_SUMMARY_MAX,
  HANDOVER_TEXT_MAX,
} from '@/lib/api/handover'
import { ApiError } from '@/lib/apiClient'
import type {
  HandoverDraft,
  HandoverDraftItem,
  HandoverTag,
  NewHandoverNote,
} from '@/lib/api/types'
import { HANDOVER_TAG_LABEL, HANDOVER_TAG_PILL } from '@/shared/icons'
import { LengthHint } from '@/shared/LengthHint'
import { Skeleton } from '@/shared/Skeleton'
import { Button } from '@/ui/Button'
import { Textarea } from '@/ui/Textarea'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 인수인계 텍스트 작성 폼 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 텍스트 → AI 정리(태그) → (태그 · 글자 고치기) → 저장. AI 정리 요청 · 저장 뒤 할 일(시트 닫기 · 토스트)은 화면이 정한다
// variant: default = 지금 모양(사장님 시트, 모양 · 문구 그대로) · note = 줄 노트 카드(알바 시트)
/** 태그를 누르면 이 순서로 바뀐다 */
const TAG_ORDER: HandoverTag[] = ['credit', 'stock', 'etc']

/** 직접 정리할 때 태그 짐작 (틀리면 눌러서 바꾼다) */
function guessTag(text: string): HandoverTag {
  if (/외상|계산|미수|돈/.test(text)) return 'credit'
  if (/남음|남았|재고|부족|떨어|채워|주문|입고/.test(text)) return 'stock'
  return 'etc'
}

/** AI 정리를 못 할 때: 줄 · 문장 단위로 나눠 항목으로 (BE 한도: 항목 50개 · 500자) */
function splitIntoItems(text: string): HandoverDraftItem[] {
  return text
    .split(/\n+|(?<=[.!?。])\s+/)
    .map((line) => line.replace(/^[\s\-•·*\d.)]+/, '').trim())
    .filter(Boolean)
    .slice(0, HANDOVER_ITEMS_MAX)
    .map((line) => ({ tag: guessTag(line), text: line.slice(0, HANDOVER_ITEM_MAX) }))
}

/** AI 정리 실패 안내: BE 가 AI 를 못 쓰면(503, 예: Gemini 키 없음) "지금 못 해요", 연결 실패 · 그 밖은 "정리하지 못했어요" */
function draftFailText(error: unknown) {
  if (isNetworkError(error)) return '서버에 연결하지 못해서 AI 정리를 못 했어요'
  if (error instanceof ApiError && error.status === 503) return 'AI 정리를 지금 못 해요'
  return 'AI 정리를 하지 못했어요'
}

interface HandoverWriteFormProps {
  /** AI 초안 요청 (알바: useHandoverDraft) */
  requestDraft: (text: string) => Promise<HandoverDraft>
  onSave: (note: NewHandoverNote) => void
  onNoIssue: () => void
  /** 저장 중: [저장] · [특이사항 없음] · [고치기]를 끄고 [저장]은 "저장 중…". 안 주면 지금처럼 늘 켜짐 */
  saving?: boolean
  /**
   * 모양. default = 지금 모양(사장님 시트) · note = 줄 노트 카드 (알바 시트, docs/08 챕터 4):
   * 흰 카드 + 옅은 테두리 · 위에 noteMeta 한 줄 · 본문 줄높이(24px)마다 옅은 가로줄 · 예시 안내 문구 ·
   * 정리 중 뼈대 · 결과 항목도 같은 카드 안에 줄로 이어짐 · ✦ 없음
   */
  variant?: 'default' | 'note'
  /** note 카드 맨 위 한 줄 (예: 11/20(금) · 달빛 카페) */
  noteMeta?: string
}

export function HandoverWriteForm({
  requestDraft,
  onSave,
  onNoIssue,
  saving = false,
  variant = 'default',
  noteMeta,
}: HandoverWriteFormProps) {
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'write' | 'loading' | 'done'>('write')
  const [draft, setDraft] = useState<HandoverDraft>({ summary: '', items: [] })
  // AI 정리 결과를 고친 내용
  const [items, setItems] = useState<HandoverDraftItem[]>([])
  const [edited, setEdited] = useState(false)
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  /** AI 정리 실패 안내 (있으면 [다시 시도] · [직접 정리하기]) */
  const [draftFail, setDraftFail] = useState<string | null>(null)
  /** AI 없이 직접 나눈 결과인지 */
  const [manual, setManual] = useState(false)
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
    setDraftFail(null)
    try {
      const result = await requestDraft(note)
      if (!alive.current) return
      setDraft(result)
      setItems(result.items)
      setEdited(false)
      setManual(false)
      setEditing(null)
      setStage('done')
    } catch (error) {
      if (!alive.current) return
      // 401 은 공통 처리(로그아웃)가 한다. 그 밖은 화면 안에서 안내하고 직접 정리할 수 있게
      setStage('write')
      setDraftFail(draftFailText(error))
    }
  }

  /** AI 없이: 줄 · 문장으로 나눠 항목을 만들고, 고친 뒤 저장 (요약은 앞 2개) */
  const writeManually = () => {
    const list = splitIntoItems(note)
    if (list.length === 0) return
    setDraft({ summary: '', items: list })
    setItems(list)
    setEdited(true)
    setManual(true)
    setEditing(null)
    setDraftFail(null)
    setStage('done')
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

  // 저장 중이면 다시 보내지 않는다 (같은 순간 두 번 눌림은 화면 쪽 저장 함수도 막는다)
  const noIssue = () => {
    if (saving) return
    onNoIssue()
  }

  const save = () => {
    if (saving) return
    onSave({
      rawText: note,
      noIssue: false,
      items,
      // 하나라도 고쳤으면 고친 항목 앞 2개로 요약을 다시, 아니면 AI 요약 그대로
      summary: (edited
        ? items
            .slice(0, 2)
            .map((item) => item.text)
            .join(' · ')
        : draft.summary
      ).slice(0, HANDOVER_SUMMARY_MAX),
    })
  }

  /** 항목 글자: 누르면 그 자리에서 고치기 (note 모양이 쓴다) */
  const itemText = (i: number, item: HandoverDraftItem, className: string) =>
    editing?.index === i ? (
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
        maxLength={HANDOVER_ITEM_MAX}
        className={cn('min-w-0 flex-1 border-none bg-transparent p-0', className)}
      />
    ) : (
      <button
        type="button"
        onClick={() => startEdit(i, item.text)}
        className={cn('min-w-0 flex-1 text-left', className)}
      >
        {item.text}
      </button>
    )

  if (variant === 'note') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
          인수인계 남기기
        </h2>

        {/* 줄 노트 카드: 맨 위 날짜 · 매장 → (쓰기) 줄 그은 입력칸 / (정리 중) 뼈대 / (결과) 항목 줄 */}
        <div className="flex flex-col overflow-hidden rounded-3xl border border-line/60 bg-white">
          {noteMeta && (
            <span className="border-b border-line/60 px-5 py-3 text-[13px] font-medium text-muted-foreground tabular-nums">
              {noteMeta}
            </span>
          )}

          {stage === 'write' && (
            <>
              <textarea
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setDraftFail(null)
                }}
                placeholder="예) 우유 2팩 남았어요. 꽃집 사장님 라떼 외상 1잔"
                aria-label="인수인계 내용"
                maxLength={HANDOVER_TEXT_MAX}
                rows={6}
                // 글자 16px(아이폰 확대 방지) · 줄높이 24px. 글자 칸(content-box) 안에만 줄마다 아래쪽 옅은 가로줄(line 60%), 스크롤하면 줄도 같이 움직인다
                className="block min-h-36 w-full resize-none border-none bg-[linear-gradient(transparent_23px,color-mix(in_oklab,var(--line)_60%,transparent)_23px)] bg-size-[100%_24px] bg-local bg-clip-content bg-origin-content px-5 py-3 text-base leading-6 break-keep text-foreground outline-none placeholder:text-subtle"
              />
              <LengthHint length={note.length} max={HANDOVER_TEXT_MAX} className="px-5 pb-3" />
            </>
          )}

          {stage === 'loading' && (
            <div role="status" aria-busy="true" className="flex flex-col">
              {['w-3/4', 'w-1/2', 'w-2/3'].map((width) => (
                <span
                  key={width}
                  aria-hidden="true"
                  className="flex items-center gap-3 border-b border-line/60 px-5 py-3.5"
                >
                  <Skeleton shape="circle" className="h-6 w-10" />
                  <Skeleton shape="line" className={cn('h-4', width)} />
                </span>
              ))}
              <span className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                정리하고 있어요…
              </span>
            </div>
          )}

          {stage === 'done' && (
            <>
              <span className="border-b border-line/60 px-5 py-3 text-[13px] font-medium text-muted-foreground">
                {manual ? '직접 정리' : 'AI 정리 결과'} · 태그 · 글자를 누르면 고칠 수 있어요
              </span>
              <ul className="m-0 flex list-none flex-col p-0">
                {items.map((item, i) => {
                  const [bg, fg] = HANDOVER_TAG_PILL[item.tag]
                  const label = HANDOVER_TAG_LABEL[item.tag]
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => cycleTag(i)}
                        aria-label={`${label} 태그 · 눌러서 바꾸기`}
                        className="h-6 shrink-0 rounded-full px-2.5 text-xs font-bold"
                        style={{ background: bg, color: fg }}
                      >
                        {label}
                      </button>
                      {itemText(i, item, 'text-[15px] leading-6')}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {stage === 'write' && draftFail && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl bg-warm px-4 py-3 text-[13px] leading-[1.45] text-foreground"
          >
            <span>
              <strong className="font-bold">{draftFail}.</strong> 직접 나눠서 저장할 수 있어요
            </span>
            <div className="flex gap-2">
              <Button variant="white" size="sm" onClick={summarize}>
                다시 시도
              </Button>
              <Button variant="white" size="sm" onClick={writeManually}>
                직접 정리하기
              </Button>
            </div>
          </div>
        )}

        {stage === 'write' && (
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" disabled={saving} onClick={noIssue}>
              특이사항 없음
            </Button>
            <Button disabled={!note.trim()} onClick={summarize}>
              AI로 정리하기
            </Button>
          </div>
        )}

        {stage === 'done' && (
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" disabled={saving} onClick={() => setStage('write')}>
              고치기
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">인수인계 남기기</h2>

      {stage === 'write' && (
        <div className="flex flex-col gap-3">
          <Textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setDraftFail(null)
            }}
            placeholder="인수인계 내용"
            aria-label="인수인계 내용"
            maxLength={HANDOVER_TEXT_MAX}
          />
          <LengthHint length={note.length} max={HANDOVER_TEXT_MAX} className="-mt-1.5" />
          {draftFail && (
            <div
              role="alert"
              className="flex flex-col gap-2.5 rounded-[18px] bg-warm p-3.5 text-sm text-warm-foreground"
            >
              <span>
                <strong className="font-bold">{draftFail}.</strong> 직접 나눠서 저장할 수 있어요
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="white" size="md" onClick={summarize}>
                  다시 시도
                </Button>
                <Button variant="ink" size="md" onClick={writeManually}>
                  직접 정리하기
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button variant="soft" className="text-sm" disabled={saving} onClick={noIssue}>
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
          <span className="text-[13px] text-muted-foreground">
            {manual ? '직접 정리' : 'AI 정리 결과'} · 태그나 글자를 눌러 고쳐 주세요
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
                    maxLength={HANDOVER_ITEM_MAX}
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
            <Button variant="soft" disabled={saving} onClick={() => setStage('write')}>
              고치기
            </Button>
            <Button size="lg" className="h-[54px]" disabled={saving} onClick={save}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
