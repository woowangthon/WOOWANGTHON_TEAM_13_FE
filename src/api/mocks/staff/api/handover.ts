import {
  handoverDays,
  mockSummarize,
  type HandoverDay,
  type HandoverTag as MockTag,
} from '@/api/mocks/staff/handovers'
import { storeSchedules } from '@/api/mocks/staff/schedule'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/lib/authStore'
import { dayHandoverSummary } from '@/lib/api/handover'
import type {
  HandoverConfirmation,
  HandoverDaySummary,
  HandoverDraft,
  HandoverNote,
  HandoverNoteList,
  HandoverTag,
  NewHandoverNote,
  UserRef,
} from '@/lib/api/types'

/*
 * 가짜 서버: 인수인계 API (docs/07 6) — BE 연결 전까지 사용.
 * 처음 노트는 가짜 데이터(handovers.ts)에서 만들고, 등록 · 체크한 내용은 메모리에 둔다.
 */

const DRAFT_DELAY = 1200 // AI 정리 기다리는 시간 ("정리하고 있어요…")

const TAG: Record<MockTag, HandoverTag> = { 외상: 'credit', 재고: 'stock', 기타: 'etc' }

const notes = new Map<string, HandoverNote[]>() // storeId → 노트
let seq = 0

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pad = (n: number) => String(n).padStart(2, '0')
/** 2026-11-20 → "2026-11-20" (매장 시연 날짜 기준) */
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** 지금 로그인한 사람 (서버는 토큰으로 안다). 로그인 없이 볼 때는 시연 알바생 */
function currentUser(): UserRef {
  const me = useAuthStore.getState().me
  return me ? { userId: me.userId, name: me.nickname } : { userId: 'usr_jieun', name: '지은' }
}

/** 작성자 이름 → 가짜 근무표의 userId (홈이 근무표 직원 이름을 찾을 수 있게). '나'는 시연 알바생 */
function authorId(storeId: string, name: string) {
  const id = storeSchedules[storeId]?.workers.find((w) => w.name.startsWith(name))?.userId
  return id === 'me' ? 'usr_jieun' : (id ?? `usr_${name}`)
}

/** 가짜 데이터(handovers.ts)의 날짜별 인수인계 → 노트 */
function seed(storeId: string): HandoverNote[] {
  const { today } = findStaffStore(storeId)
  return Object.entries(handoverDays[storeId] ?? {}).flatMap(([day, value]) =>
    [value].flat().map((d, i) => toNote(storeId, today, Number(day), d, i)),
  )
}

function toNote(
  storeId: string,
  today: Date,
  day: number,
  d: HandoverDay,
  i: number,
): HandoverNote {
  const [name, time] = d.from.split(' · ')
  const createdAt = `${dateKey(new Date(today.getFullYear(), today.getMonth(), day))}T${time}:00+09:00`
  return {
    noteId: i === 0 ? `hnd_${storeId}_${day}` : `hnd_${storeId}_${day}_${i}`,
    author: { userId: authorId(storeId, name), name },
    createdAt,
    updatedAt: createdAt,
    rawText: d.items.map((item) => item.text).join('\n'),
    noIssue: d.items.length === 0,
    summary: d.summary,
    items: d.items.map((item) => ({
      itemId: item.id,
      tag: TAG[item.tag],
      text: item.text,
      checked: false,
      checkedBy: null,
      checkedAt: null,
    })),
  }
}

function storeNotes(storeId: string) {
  if (!notes.has(storeId)) notes.set(storeId, seed(storeId))
  return notes.get(storeId)!
}

/** GET /stores/{storeId}/handover-notes?date=2026-11-20 — 최신 순 */
export async function getHandoverNotes(storeId: string, date: string): Promise<HandoverNoteList> {
  const list = storeNotes(storeId)
    .filter((note) => note.createdAt.startsWith(date))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { date, notes: list }
}

/** GET /stores/{storeId}/handover-summary?date= — 가짜 서버는 AI 대신 노트 요약을 한 줄씩 모은다 (BE 와 같은 모양) */
export async function getHandoverDaySummary(
  storeId: string,
  date: string,
): Promise<HandoverDaySummary> {
  const { notes } = await getHandoverNotes(storeId, date)
  return { date, summary: dayHandoverSummary(notes) || null, noteCount: notes.length }
}

/** POST /stores/{storeId}/handover-drafts — 저장하지 않고 정리 결과만 */
export async function createHandoverDraft(_storeId: string, text: string): Promise<HandoverDraft> {
  if (!text.trim()) {
    throw new ApiError(422, {
      code: 'VALIDATION_ERROR',
      message: '내용을 입력해 주세요',
      detail: null,
    })
  }
  await wait(DRAFT_DELAY)
  const items = mockSummarize(text).map((item) => ({ tag: TAG[item.tag], text: item.text }))
  return {
    summary: items
      .slice(0, 2)
      .map((item) => item.text)
      .join(' · '),
    items,
  }
}

/** POST /stores/{storeId}/handover-notes — 매장 시연 날짜(오늘)로 저장 */
export async function createHandoverNote(
  storeId: string,
  body: NewHandoverNote,
): Promise<HandoverNote> {
  const { today } = findStaffStore(storeId)
  const now = new Date()
  const createdAt = `${dateKey(today)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+09:00`
  const id = ++seq
  const note: HandoverNote = {
    noteId: `hnd_new_${id}`,
    author: currentUser(),
    createdAt,
    updatedAt: createdAt,
    rawText: body.rawText,
    noIssue: body.noIssue,
    summary: body.noIssue ? '' : body.summary,
    items: body.noIssue
      ? []
      : body.items.map((item, i) => ({
          itemId: `itm_new_${id}_${i}`,
          tag: item.tag,
          text: item.text,
          checked: false,
          checkedBy: null,
          checkedAt: null,
        })),
  }
  storeNotes(storeId).push(note)
  return note
}

/** POST /stores/{storeId}/handover-notes/{noteId}/confirmations — 항목 하나 체크 · 해제 (docs/07 6-7 제안) */
export async function confirmHandoverItem(
  storeId: string,
  noteId: string,
  { itemId, checked }: HandoverConfirmation,
): Promise<HandoverNote> {
  const list = storeNotes(storeId)
  const index = list.findIndex((note) => note.noteId === noteId)
  const note = list[index]
  if (!note || !note.items.some((item) => item.itemId === itemId)) {
    throw new ApiError(404, {
      code: 'NOT_FOUND',
      message: '인수인계를 찾지 못했어요',
      detail: null,
    })
  }
  const at = new Date().toISOString()
  const updated: HandoverNote = {
    ...note,
    updatedAt: at,
    items: note.items.map((item) =>
      item.itemId === itemId
        ? {
            ...item,
            checked,
            checkedBy: checked ? currentUser() : null,
            checkedAt: checked ? at : null,
          }
        : item,
    ),
  }
  list[index] = updated
  return updated
}
