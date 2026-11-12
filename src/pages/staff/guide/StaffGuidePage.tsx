import {
  ArrowDown,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Coffee,
  House,
  MessagesSquare,
  Plus,
  Sparkles,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ChatMessage, HandoverItem as HandoverItemData, RecipeSummary } from '@/lib/api/types'
import { ChatBubble } from '@/pages/staff/chat/components/ChatBubble'
import { markStaffGuideSeen } from '@/pages/staff/guide/staffGuideSeen'
import { PersonInitial } from '@/pages/staff/schedule/components/PersonInitial'
import { personColor } from '@/pages/staff/schedule/personColor'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { GuideSlides, type GuideSlide } from '@/shared/guide/GuideSlides'
import { AiSummaryCard } from '@/shared/handover/AiSummaryCard'
import { HandoverList } from '@/shared/handover/HandoverList'
import { MEMO_CARD, MEMO_FOLD } from '@/shared/handover/memoCorner'
import { HANDOVER_TAG_LABEL, HANDOVER_TAG_PILL } from '@/shared/icons'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { cn } from '@/ui/utils'

// 알바 앱 사용법: 하단 탭 5칸을 한 장씩 (공용 틀 shared/guide/GuideSlides).
// 오는 길: 초대코드 입장 [시작하기] · 알바 홈 첫 진입(안 봤으면) → 끝나면 알바 홈 / 마이페이지 "앱 사용법" → 끝나면 마이페이지 (state.returnTo)
// 그림은 실제 부품을 가짜 데이터로 작게 줄여 그린다 (조작은 안 됨). 11/13~ UI 업그레이드에 맞춰 흰 바탕 · 로고 헤더 · 할 일 목록 · 줄 노트 · 파스텔 근무표

type Tab = 'home' | 'recipe' | 'write' | 'chat' | 'schedule'

const noop = () => {}

/**
 * 실제 화면을 작게: 휴대폰 화면 모양 + 아래 하단 탭 줄 (그 장의 탭만 강조).
 * 지금 알바 화면처럼 흰 바탕, header 면 위에 로고 헤더(왼쪽 매장 · 가운데 crewBean · 오른쪽 종 · 프로필)
 */
function Phone({ tab, header, children }: { tab: Tab; header?: boolean; children: ReactNode }) {
  return (
    // 화면이 낮으면(예: 360×640) 그림 칸만큼 줄어들고, 넘치는 아래는 흐리게 사라진다
    <div className="flex max-h-full w-[248px] flex-col overflow-hidden rounded-[30px] border-[5px] border-card bg-white shadow-float">
      <div className="relative h-[300px] min-h-0 shrink overflow-hidden px-2.5 pt-2.5">
        {/* 실제 크기로 그린 뒤 줄인다 (zoom 은 줄인 크기대로 자리를 잡는다) */}
        <div className="flex flex-col gap-3" style={{ zoom: 0.7 } as CSSProperties}>
          {header && <MiniHeader />}
          {children}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent" />
      </div>
      <MiniTabBar active={tab} />
    </div>
  )
}

const TABS: { key: Tab; label: string; icon: typeof House }[] = [
  { key: 'home', label: '홈', icon: House },
  { key: 'recipe', label: '레시피', icon: Coffee },
  { key: 'write', label: '인수인계', icon: Plus },
  { key: 'chat', label: 'AI 사수', icon: MessagesSquare },
  { key: 'schedule', label: '근무', icon: CalendarDays },
]

/** 하단 탭(ui/BottomNav)과 같은 모양을 작게 — BottomNav 는 화면에 고정되는 진짜 탭이라 그림으로 따로 그린다 */
function MiniTabBar({ active }: { active: Tab }) {
  return (
    <div className="grid grid-cols-5 items-center border-t border-line/60 bg-card px-1.5 py-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const on = key === active
        if (key === 'write') {
          return (
            <span key={key} className="flex justify-center">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full bg-brand text-white transition-transform',
                  on && 'scale-115 ring-[3px] ring-brand-soft',
                )}
              >
                <Icon className="size-[18px]" strokeWidth={2.4} />
              </span>
            </span>
          )
        }
        return (
          <span
            key={key}
            className={cn(
              'flex flex-col items-center gap-[3px] transition-transform',
              on ? 'scale-115 text-brand' : 'text-subtle',
            )}
          >
            <Icon className="size-[17px]" strokeWidth={on ? 2.5 : 1.8} />
            <span className={cn('text-[9px]', on ? 'font-extrabold' : 'font-medium')}>{label}</span>
          </span>
        )
      })}
    </div>
  )
}

/** 알바 헤더(StaffLayout)를 작게: 왼쪽 매장 · 가운데 로고 · 오른쪽 종 · 프로필 */
function MiniHeader() {
  return (
    <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <span className="flex h-10 items-center gap-0.5 justify-self-start rounded-full border border-line/60 bg-card pr-2.5 pl-3.5 text-[15px] font-bold">
        달빛 카페
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
      <span className="flex items-center gap-1">
        <img src="/logo-bean.png" alt="" width={117} height={128} className="h-8 w-auto" />
        <img src="/logo-crewbean.png" alt="" width={528} height={120} className="h-5 w-auto" />
      </span>
      <span className="flex items-center gap-2 justify-self-end">
        <span className="flex size-10 items-center justify-center rounded-full bg-card">
          <Bell aria-hidden="true" className="size-5" />
        </span>
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-base font-extrabold text-background">
          지
        </span>
      </span>
    </span>
  )
}

// ── 가짜 데이터 (그림용) ──

const item = (itemId: string, tag: HandoverItemData['tag'], text: string, checked = false) => ({
  itemId,
  tag,
  text,
  checked,
  checkedBy: null,
  checkedAt: null,
})

const recipe = (recipeId: string, name: string, category: string, photo: string) =>
  ({
    recipeId,
    name,
    category,
    temp: 'ICE',
    size: null,
    // 목록 카드의 "재료 3가지"
    ingredients: [
      { name: '샷', amount: '2' },
      { name: '물', amount: '200ml' },
      { name: '얼음', amount: '가득' },
    ],
    imageUrl: `/images/menu/${photo}.webp`,
    isNew: false,
    updatedAt: '',
  }) satisfies RecipeSummary

const message = (messageId: string, sender: ChatMessage['sender'], text: string, found = true) =>
  ({
    messageId,
    sender,
    text,
    answerType: null,
    // 찾은 답은 출처 카드, 못 찾은 답은 [사장님께 물어보기]
    sources:
      sender === 'ai' && found ? [{ kind: 'recipe' as const, id: 'r', title: '딸기라떼' }] : [],
    canAskOwner: sender === 'ai' && !found,
    ownerQuestion: null,
    createdAt: '',
  }) satisfies ChatMessage

function HomePicture() {
  return (
    <Phone tab="home" header>
      <span className="px-1 text-[26px] leading-[1.25] font-extrabold tabular-nums">11/20(금)</span>
      <div className="flex flex-col gap-3">
        <span className="px-1 text-[19px] font-bold">오늘의 인수인계</span>
        <AiSummaryCard
          from="2명이 남김"
          summary={'꽃집 외상 오늘 계산 · 딸기청 1병 남음\n원두 1봉 남음'}
          done={1}
          total={3}
        />
        {/* 알바 홈과 같은 할 일 목록 (카드 한 장 안 줄) */}
        <HandoverList
          variant="list"
          live
          items={[
            item('a', 'credit', '꽃집 사장님 아메리카노 1잔 · 오늘 계산'),
            item('b', 'stock', '딸기청 1병 남음', true),
          ]}
          meta={(it) => (it.itemId === 'a' ? '민수 · 14:50' : '도윤 · 08:05')}
          onToggle={noop}
        />
      </div>
    </Phone>
  )
}

function RecipePicture() {
  return (
    <Phone tab="recipe" header>
      <span className="px-1 text-[26px] leading-[1.25] font-extrabold">레시피</span>
      <CategoryTabs
        categories={[
          { name: '커피', count: 6 },
          { name: '라떼', count: 5 },
          { name: '에이드', count: 3 },
          { name: '티', count: 4 },
        ]}
        value="커피"
        onChange={noop}
      />
      <RecipeGrid
        recipes={[
          recipe('1', '아메리카노', '커피', 'americano'),
          recipe('2', '카페라떼', '커피', 'cafe-latte'),
          recipe('3', '콜드브루', '커피', 'cold-brew'),
          recipe('4', '아인슈페너', '커피', 'einspanner'),
        ]}
        getHref={() => '#'}
      />
    </Phone>
  )
}

/** 인수인계 남기기: 실제 시트(HandoverWriteForm variant="note")와 같은 메모지 카드(각진 모서리 · 오른쪽 위 접힌 면) — 쓴 글 → AI 정리 결과가 같은 카드 안에 */
function WritePicture() {
  const items = [
    item('w1', 'stock', '우유 2팩 남음'),
    item('w2', 'credit', '꽃집 사장님 라떼 1잔 · 내일 계산'),
  ]
  return (
    <Phone tab="write">
      <span className="px-1 text-[26px] leading-[1.25] font-extrabold">인수인계 남기기</span>
      <div className={MEMO_CARD}>
        <span aria-hidden="true" className={MEMO_FOLD} />
        <span className="border-b border-line/60 py-3 pr-10 pl-5 text-[13px] font-medium text-muted-foreground tabular-nums">
          11/20(금) · 달빛 카페
        </span>
        <p className="m-0 px-5 py-3 text-base leading-6 break-keep text-foreground">
          우유 두 팩 남았어요. 꽃집 사장님 라떼 한 잔 외상, 내일 계산하신대요
        </p>
        <span className="flex items-center gap-1.5 border-y border-line/60 px-5 py-3 text-[13px] font-medium text-muted-foreground">
          <ArrowDown aria-hidden="true" className="size-4 text-brand" />
          AI 정리 결과
        </span>
        {items.map((it) => {
          const [bg, fg] = HANDOVER_TAG_PILL[it.tag]
          return (
            <span
              key={it.itemId}
              className="flex items-start gap-3 border-b border-line/60 px-5 py-3 last:border-b-0"
            >
              <span
                className="flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold"
                style={{ background: bg, color: fg }}
              >
                {HANDOVER_TAG_LABEL[it.tag]}
              </span>
              <span className="text-[15px] leading-6">{it.text}</span>
            </span>
          )
        })}
      </div>
    </Phone>
  )
}

function ChatPicture() {
  return (
    <Phone tab="chat" header>
      <span className="flex items-center gap-1.5 px-1 text-[26px] leading-[1.25] font-extrabold">
        <Sparkles aria-hidden="true" className="size-5 text-brand" fill="currentColor" />
        AI 사수
      </span>
      <div className="flex flex-col gap-3 pt-1">
        {/* 매뉴얼에 없는 질문 → 찾지 못했어요 + [사장님께 물어보기] → 사장님 답변이 채팅에 도착 */}
        <ChatBubble
          message={message('q', 'staff', '손님이 우산 빌려 달래요')}
          ownerName="박"
          onAskOwner={noop}
        />
        <ChatBubble
          message={message('a', 'ai', '매뉴얼에서 찾지 못했어요. 지어내지 않을게요', false)}
          ownerName="박"
          onAskOwner={noop}
        />
        <ChatBubble
          message={message('o', 'owner', '창고 왼쪽 우산 빌려 드려요')}
          ownerName="박"
          onAskOwner={noop}
        />
      </div>
    </Phone>
  )
}

/** 근무표 그림의 사람들 (사람별 파스텔 색은 실제 근무표와 같은 personColor — 근무표 사람 목록 순서) */
const WORKERS = ['지은', '민수', '서연', '도윤', '사장'].map((name) => ({
  userId: name,
  memberId: null,
  name,
  role: name === '사장' ? ('owner' as const) : ('staff' as const),
}))
const colorOf = (name: string) => personColor(name, WORKERS)

/** 근무표 달력 한 주 (ScheduleMonth 와 같은 모양: 파스텔 바탕 + 글자색, 내 근무는 굵게) */
const WEEK = [
  {
    d: 16,
    shifts: [
      ['9', '민수'],
      ['18', '지은'],
    ],
  },
  {
    d: 17,
    shifts: [
      ['9', '민수'],
      ['15', '사장'],
    ],
  },
  {
    d: 18,
    shifts: [
      ['9', '민수'],
      ['18', '지은'],
    ],
  },
  {
    d: 19,
    shifts: [
      ['9', '민수'],
      ['15', '사장'],
    ],
  },
  {
    d: 20,
    shifts: [
      ['9', '서연'],
      ['18', '지은'],
    ],
  },
  {
    d: 21,
    shifts: [
      ['13', '서연'],
      ['18', '도윤'],
    ],
  },
  {
    d: 22,
    shifts: [
      ['13', '서연'],
      ['18', '민수'],
    ],
  },
] as const

function SchedulePicture() {
  return (
    <Phone tab="schedule" header>
      <section className="flex flex-col gap-2 rounded-3xl border border-line/60 bg-card px-2 pt-3 pb-2.5">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <span key={w} className={cn(i === 0 && 'text-destructive')}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {WEEK.map(({ d, shifts }) => (
            <span
              key={d}
              className={cn(
                'flex min-w-0 flex-col gap-[3px] border-t border-line/40 px-[2px] pt-1 pb-1.5',
                d === 20 && 'rounded-[10px] bg-background',
              )}
            >
              <span
                className={cn(
                  'flex size-[22px] items-center justify-center self-center rounded-full text-xs tabular-nums',
                  d === 20 ? 'bg-brand font-bold text-white' : 'font-semibold',
                )}
              >
                {d}
              </span>
              {shifts.map(([hour, name]) => {
                const [bg, fg] = colorOf(name)
                return (
                  <span
                    key={hour + name}
                    className={cn(
                      'flex flex-wrap gap-x-[3px] rounded-[4px] px-[2px] py-px text-[10px] leading-[1.3]',
                      name === '지은' ? 'font-extrabold' : 'font-medium',
                    )}
                    style={{ background: bg, color: fg }}
                  >
                    <span className="tabular-nums">{hour}</span>
                    <span>{name}</span>
                  </span>
                )
              })}
            </span>
          ))}
        </div>
      </section>
      {/* 고른 날 내 근무 카드: 이름 첫 글자 동그라미 · [⇄ 대타 요청 ›] (실제 근무표 날짜 목록과 같은 모양) */}
      <div className="flex flex-col gap-3 rounded-3xl border border-brand bg-card px-4 py-3.5 ring-1 ring-brand ring-inset">
        <span className="flex items-center gap-3">
          <PersonInitial name="지은" color={colorOf('지은')} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="text-base font-bold">지은</span>
              <span className="rounded-full bg-brand px-2 py-px text-[11px] font-bold text-white">
                나
              </span>
            </span>
            <span className="text-[13px] text-muted-foreground">마감</span>
          </span>
          <span className="text-[15px] font-bold tabular-nums">18:00 – 23:00</span>
        </span>
        <span className="flex justify-end border-t border-line/70 pt-2.5">
          <span className="flex h-8 items-center gap-1 rounded-full bg-brand-soft px-3 text-[13px] font-bold text-brand">
            <ArrowLeftRight aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            대타 요청
            <ChevronRight aria-hidden="true" className="-mr-1 size-3.5" strokeWidth={2.4} />
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between rounded-3xl border border-line/60 bg-card px-4 py-3.5">
        <span className="text-[13px] font-bold text-muted-foreground">11월 예상 급여</span>
        <span className="text-[19px] font-bold tabular-nums">681,120원</span>
      </div>
    </Phone>
  )
}

const SLIDES: GuideSlide[] = [
  {
    tab: '홈',
    title: '출근하면 인수인계부터 확인해요',
    body: '오늘 근무와 지난 근무자가 남긴 할 일을 체크해요',
    visual: <HomePicture />,
  },
  {
    tab: '레시피',
    title: '메뉴를 누르면 레시피가 바로 나와요',
    body: '포스기처럼 카테고리별로 찾아요. 매뉴얼도 여기 있어요',
    visual: <RecipePicture />,
  },
  {
    tab: '＋ 인수인계',
    title: '말하듯 쓰면 AI가 정리해 줘요',
    body: '퇴근 전에 인수인계를 남기면 다음 근무자가 봐요',
    visual: <WritePicture />,
  },
  {
    tab: 'AI 사수',
    title: '모르는 건 AI 사수에게 물어보세요',
    body: '매뉴얼에 없으면 지어내지 않고 사장님께 넘겨요',
    visual: <ChatPicture />,
  },
  {
    tab: '근무',
    title: '근무표 · 대타 · 예상 급여를 한 곳에서',
    body: '내 근무를 확인하고 대타를 부탁할 수 있어요',
    visual: <SchedulePicture />,
  },
]

export default function StaffGuidePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { store } = useCurrentStore()
  // 마이페이지에서 오면 마이페이지로, 그 밖(입장 · 홈 첫 진입)은 알바 홈으로
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/staff'
  const brand = { '--brand': store.color, '--brand-soft': store.soft } as CSSProperties

  const done = () => {
    markStaffGuideSeen()
    navigate(returnTo, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas" style={brand}>
      <div className="mx-auto w-full max-w-[460px]">
        <GuideSlides tone="white" slides={SLIDES} onDone={done} />
      </div>
    </div>
  )
}
